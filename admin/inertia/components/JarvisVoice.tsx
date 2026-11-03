import { useCallback, useEffect, useRef, useState } from 'react'
import { IconMicrophone, IconMicrophoneOff, IconSend, IconX } from '@tabler/icons-react'
import JarvisReactor, { type ReactorState } from '~/components/JarvisReactor'
import { isBargeIn, isEcho, pickVoice, takeSentences, textForSpeech } from '../../app/utils/voice_turn'

export type VoiceTurn = { role: 'user' | 'assistant'; content: string; sources?: { title: string }[] }

type TalkEvent = {
  lookup?: 'news' | 'weather' | 'money'
  delta?: string
  sources?: { title: string }[]
  error?: string
}

const ECHO_WINDOW_MS = 2500
// Past this, a conversation nobody asked to keep going stops sending the room's audio out.
const HANDS_FREE_IDLE_MS = 45_000
// While the pings keep coming, the listener in Ubuntu lets go of the microphone.
const CONVERSATION_PING_MS = 10_000

const GREETINGS = ['Oi, pode falar.', 'Pode falar.', 'Tô ouvindo.', 'Pois não?']

// Said at once, because a lookup takes a few seconds and silence feels like nothing happened.
const LOOKUP_REPLIES = {
  news: 'Deixa eu dar uma olhada no que tá rolando.',
  weather: 'Vou ver aqui como tá o tempo.',
  money: 'Vou conferir a cotação de agora.',
}

const STATUS: Record<ReactorState, string> = {
  idle: 'Microfone desligado',
  listening: 'Ouvindo',
  thinking: 'Só um instante',
  speaking: 'Falando',
}

// Minimal types: the browser's speech recognition isn't in the TypeScript DOM library.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}

function createRecognition(): Recognition | null {
  const source = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  const Constructor = source.SpeechRecognition ?? source.webkitSpeechRecognition
  return Constructor ? new Constructor() : null
}

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed': 'O navegador não liberou o microfone. Libere o acesso ou digite abaixo.',
  'service-not-allowed': 'Este navegador não permite o reconhecimento de voz. Digite abaixo.',
  'network': 'O reconhecimento de voz do navegador não respondeu. Digite abaixo.',
  'audio-capture': 'Nenhum microfone foi encontrado. Digite abaixo.',
}

export default function JarvisVoice({
  turns,
  setTurns,
  useCloudVoice,
  handsFree,
  onClose,
}: {
  turns: VoiceTurn[]
  setTurns: (turns: VoiceTurn[]) => void
  useCloudVoice: boolean
  handsFree: boolean
  onClose: () => void
}) {
  const [state, setState] = useState<ReactorState>('idle')
  const [heard, setHeard] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [caption, setCaption] = useState('')
  const [micActive, setMicActive] = useState(false)

  const stateRef = useRef<ReactorState>('idle')
  const turnsRef = useRef(turns)
  const micOn = useRef(false)
  const closed = useRef(false)
  const askId = useRef(0)
  const lastAnswer = useRef('')
  const recognition = useRef<Recognition | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const micStream = useRef<MediaStream | null>(null)
  const micAnalyser = useRef<AnalyserNode | null>(null)
  const voiceAnalyser = useRef<AnalyserNode | null>(null)
  const forgetAnswer = useRef<number | undefined>(undefined)
  const queue = useRef<string[]>([])
  const pumping = useRef(false)
  const streamDone = useRef(false)
  const answerRequest = useRef<AbortController | null>(null)
  const stopPlayback = useRef<(() => void) | null>(null)
  const answerSoFar = useRef('')
  turnsRef.current = turns

  const changeState = useCallback((next: ReactorState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const setMic = useCallback((on: boolean) => {
    micOn.current = on
    setMicActive(on)
  }, [])

  const restingState = useCallback((): ReactorState => (micOn.current ? 'listening' : 'idle'), [])

  const silence = useCallback(() => {
    window.clearTimeout(forgetAnswer.current)
    queue.current = []
    streamDone.current = false
    answerRequest.current?.abort()
    answerRequest.current = null
    window.speechSynthesis?.cancel()
    audio.current?.pause()
    audio.current = null
    stopPlayback.current?.()
    stopPlayback.current = null
    voiceAnalyser.current = null
  }, [])

  /**
   * After an interruption the history keeps only what really got said. A question left without
   * an answer would make the model answer it again along with the next one.
   */
  const settleHistory = useCallback(() => {
    const history = turnsRef.current
    if (history[history.length - 1]?.role !== 'user') return
    const settled: VoiceTurn[] = answerSoFar.current.trim()
      ? [...history, { role: 'assistant', content: answerSoFar.current }]
      : history.slice(0, -1)
    answerSoFar.current = ''
    turnsRef.current = settled
    setTurns(settled)
  }, [setTurns])

  /** Stops whatever is under way and goes back to listening. */
  const interrupt = useCallback(() => {
    askId.current++
    silence()
    settleHistory()
    changeState(restingState())
  }, [changeState, restingState, settleHistory, silence])

  const playWithBrowser = useCallback(
    (sentence: string) =>
      new Promise<void>((resolve) => {
        if (!('speechSynthesis' in window)) return resolve()
        // A system with no voice installed may never report the end of the speech.
        const watchdog = window.setTimeout(resolve, sentence.length * 150 + 4000)
        const done = () => {
          window.clearTimeout(watchdog)
          resolve()
        }
        const utterance = new SpeechSynthesisUtterance(sentence)
        const voice = pickVoice(window.speechSynthesis.getVoices())
        if (voice) utterance.voice = voice
        utterance.lang = 'pt-BR'
        utterance.rate = 1.05
        utterance.onend = done
        utterance.onerror = done
        stopPlayback.current = done
        window.speechSynthesis.speak(utterance)
      }),
    []
  )

  const playWithElevenLabs = useCallback(async (sentence: string, id: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/ai/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence }),
      })
      if (!response.ok) return false
      const url = URL.createObjectURL(await response.blob())
      if (id !== askId.current) return true

      const player = new Audio(url)
      audio.current = player
      const context = audioContext.current
      if (context) {
        const analyser = context.createAnalyser()
        analyser.fftSize = 256
        const source = context.createMediaElementSource(player)
        source.connect(analyser)
        analyser.connect(context.destination)
        voiceAnalyser.current = analyser
      }
      await new Promise<void>((resolve, reject) => {
        player.onended = () => resolve()
        player.onerror = () => reject(new Error('audio'))
        stopPlayback.current = resolve
        player.play().catch(reject)
      })
      URL.revokeObjectURL(url)
      return true
    } catch {
      return false
    }
  }, [])

  /** Speaks the queue in order. New sentences join it while the answer is still being generated. */
  const pump = useCallback(async () => {
    if (pumping.current) return
    pumping.current = true
    const id = askId.current
    while (id === askId.current && queue.current.length > 0) {
      const sentence = queue.current.shift()!
      changeState('speaking')
      const played = useCloudVoice && (await playWithElevenLabs(sentence, id))
      if (!played && id === askId.current) await playWithBrowser(sentence)
    }
    pumping.current = false

    if (queue.current.length > 0) {
      pump()
    } else if (id === askId.current && streamDone.current) {
      silence()
      changeState(restingState())
      // His last words can still reach the recognizer for a moment, but after that a question
      // that happens to share his words has to count as a question.
      forgetAnswer.current = window.setTimeout(() => {
        lastAnswer.current = ''
      }, ECHO_WINDOW_MS)
    }
  }, [changeState, playWithBrowser, playWithElevenLabs, restingState, silence, useCloudVoice])
  const pumpRef = useRef(pump)
  pumpRef.current = pump

  const enqueue = useCallback((text: string) => {
    const sentence = textForSpeech(text)
    if (!/[\p{L}\p{N}]/u.test(sentence)) return
    lastAnswer.current = `${lastAnswer.current} ${sentence}`
    queue.current.push(sentence)
    pumpRef.current()
  }, [])

  const ask = useCallback(
    async (content: string) => {
      const question = content.trim()
      if (!question) return
      const id = ++askId.current
      silence()
      settleHistory()
      setHeard('')
      setNotice(null)
      setCaption('')
      lastAnswer.current = ''
      const next: VoiceTurn[] = [...turnsRef.current, { role: 'user', content: question }]
      turnsRef.current = next
      setTurns(next)
      changeState('thinking')

      const request = new AbortController()
      answerRequest.current = request
      let answer = ''
      let pending = ''
      let sources: VoiceTurn['sources'] = []
      try {
        const response = await fetch('/api/ai/jarvis/talk', {
          method: 'POST',
          signal: request.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: next.map(({ role, content: text }) => ({ role, content: text })) }),
        })
        if (!response.ok || !response.body) throw new Error('Não consegui responder agora.')

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
        let buffer = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done || id !== askId.current) break
          buffer += value
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            const event = JSON.parse(line) as TalkEvent
            if (event.error) throw new Error(event.error)
            if (event.lookup) enqueue(LOOKUP_REPLIES[event.lookup])
            if (event.sources) sources = event.sources
            if (event.delta) {
              answer += event.delta
              answerSoFar.current = answer
              pending += event.delta
              setCaption(textForSpeech(answer))
              const { sentences, rest } = takeSentences(pending)
              pending = rest
              sentences.forEach(enqueue)
            }
          }
        }
        if (id !== askId.current || closed.current) return

        if (!answer.trim()) throw new Error('Não consegui responder agora.')
        enqueue(pending)
        const withAnswer: VoiceTurn[] = [...next, { role: 'assistant', content: answer, sources }]
        turnsRef.current = withAnswer
        setTurns(withAnswer)
        answerSoFar.current = ''
        streamDone.current = true
        pumpRef.current()
      } catch (error) {
        if (id !== askId.current || closed.current) return
        setNotice(error instanceof Error ? error.message : 'Não consegui responder agora.')
        silence()
        settleHistory()
        changeState(restingState())
      }
    },
    [changeState, enqueue, restingState, setTurns, settleHistory, silence]
  )

  const askRef = useRef(ask)
  const interruptRef = useRef(interrupt)
  askRef.current = ask
  interruptRef.current = interrupt

  const startRecognition = useCallback(() => {
    const listener = createRecognition()
    if (!listener) {
      setMic(false)
      setNotice('Este navegador não reconhece voz. Use o Edge ou o Chrome, ou digite abaixo.')
      changeState('idle')
      return
    }
    listener.lang = 'pt-BR'
    listener.continuous = true
    listener.interimResults = true
    listener.onresult = (event) => {
      let finalText = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interim += result[0].transcript
      }

      if (stateRef.current === 'speaking' || stateRef.current === 'thinking') {
        const said = stateRef.current === 'speaking' ? lastAnswer.current : ''
        if (isBargeIn(`${finalText} ${interim}`, said)) interruptRef.current()
        else return
      }
      if (finalText.trim()) {
        // The tail of his own answer can arrive just after he stops.
        if (isEcho(finalText, lastAnswer.current)) return setHeard('')
        askRef.current(finalText)
      } else {
        setHeard(interim)
      }
    }
    listener.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setMic(false)
      setNotice(RECOGNITION_ERRORS[event.error] ?? 'O reconhecimento de voz falhou. Digite abaixo.')
      if (stateRef.current === 'listening') changeState('idle')
    }
    // The browser ends recognition after a silence, so it restarts for as long as the mic is on.
    listener.onend = () => {
      if (micOn.current && !closed.current) {
        try {
          listener.start()
        } catch {
          setMic(false)
        }
      }
    }
    recognition.current = listener
    listener.start()
  }, [changeState, setMic])

  const stopMicrophone = useCallback(() => {
    setMic(false)
    recognition.current?.abort()
    recognition.current = null
    micStream.current?.getTracks().forEach((track) => track.stop())
    micStream.current = null
    micAnalyser.current = null
  }, [setMic])

  const startMicrophone = useCallback(async () => {
    setNotice(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice('O microfone só funciona abrindo o sistema pelo próprio computador. Digite abaixo.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      if (closed.current) return stream.getTracks().forEach((track) => track.stop())
      micStream.current = stream
      const context = audioContext.current
      if (context) {
        const analyser = context.createAnalyser()
        analyser.fftSize = 256
        context.createMediaStreamSource(stream).connect(analyser)
        micAnalyser.current = analyser
      }
      setMic(true)
      startRecognition()
      if (stateRef.current === 'idle' && micOn.current) changeState('listening')
    } catch {
      setNotice(RECOGNITION_ERRORS['not-allowed'])
    }
  }, [changeState, setMic, startRecognition])

  useEffect(() => {
    closed.current = false
    audioContext.current = new AudioContext()
    startMicrophone()
    // Best effort: if it fails, the first answer just takes longer.
    fetch('/api/ai/jarvis/warm', { method: 'POST' }).catch(() => {})
    window.speechSynthesis?.getVoices()
    return () => {
      closed.current = true
      askId.current++
      silence()
      stopMicrophone()
      audioContext.current?.close()
      audioContext.current = null
    }
  }, [silence, startMicrophone, stopMicrophone])

  useEffect(() => {
    const report = (open: boolean) =>
      fetch('/api/ai/jarvis/conversation', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open }),
      }).catch(() => {})
    report(true)
    const ping = window.setInterval(() => report(true), CONVERSATION_PING_MS)
    return () => {
      window.clearInterval(ping)
      report(false)
    }
  }, [])

  useEffect(() => {
    if (!handsFree) return
    streamDone.current = true
    enqueue(GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
  }, [enqueue, handsFree])

  useEffect(() => {
    if (!handsFree || state === 'thinking' || state === 'speaking') return
    const timer = window.setTimeout(onClose, HANDS_FREE_IDLE_MS)
    return () => window.clearTimeout(timer)
  }, [handsFree, heard, onClose, state])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggleMicrophone = () => {
    if (micOn.current) {
      stopMicrophone()
      setHeard('')
      if (stateRef.current === 'listening') changeState('idle')
    } else {
      startMicrophone()
    }
  }

  const buffer = useRef(new Uint8Array(128))
  const readLevels = useCallback((levels: Float32Array) => {
    const current = stateRef.current
    const analyser = current === 'speaking' ? voiceAnalyser.current : current === 'listening' ? micAnalyser.current : null
    if (analyser) {
      analyser.getByteFrequencyData(buffer.current)
      // Mirrored, and only the lower half of the spectrum, where speech is.
      const half = levels.length / 2
      for (let i = 0; i < half; i++) {
        const value = buffer.current[Math.floor((i / half) * 48)] / 255
        levels[i] = value
        levels[levels.length - 1 - i] = value
      }
      return
    }
    // The browser's voice can't be measured, so the bars imitate speech.
    if (current === 'speaking') {
      const time = performance.now() / 1000
      for (let i = 0; i < levels.length; i++) {
        levels[i] = 0.3 + 0.25 * Math.sin(time * 9 + i * 0.7) * Math.sin(time * 3.1 + i * 0.23)
      }
    }
  }, [])

  const lastUser = [...turns].reverse().find((turn) => turn.role === 'user')?.content

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Conversa por voz com o Jarvis"
      className="fixed inset-0 z-50 flex flex-col text-white"
      style={{ background: 'radial-gradient(circle at 50% 42%, #0a2a4a 0%, #04121f 55%, #01060c 100%)' }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-sky-200/70">Jarvis</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleMicrophone}
            aria-label={micActive ? 'Desligar o microfone' : 'Ligar o microfone'}
            title={micActive ? 'Desligar o microfone' : 'Ligar o microfone'}
            className="rounded-full p-2 text-sky-100 hover:bg-white/10"
          >
            {micActive ? <IconMicrophone size={22} /> : <IconMicrophoneOff size={22} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar a conversa por voz"
            title="Fechar (Esc)"
            className="rounded-full p-2 text-sky-100 hover:bg-white/10"
          >
            <IconX size={22} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => (state === 'speaking' || state === 'thinking' ? interrupt() : toggleMicrophone())}
        aria-label={state === 'speaking' || state === 'thinking' ? 'Interromper o Jarvis' : 'Ligar ou desligar o microfone'}
        className="min-h-0 w-full flex-1 focus:outline-none"
      >
        <JarvisReactor state={state} readLevels={readLevels} />
      </button>

      <div className="mx-auto w-full max-w-2xl px-4 pb-4 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-200/70" aria-live="polite">
          {STATUS[state]}
        </p>
        <div className="mt-3 max-h-40 overflow-y-auto" aria-live="polite">
          {state === 'listening' && heard ? (
            <p className="text-lg text-sky-100">{heard}</p>
          ) : (
            <>
              {lastUser && <p className="text-sm text-sky-200/70">{lastUser}</p>}
              {caption && <p className="mt-1 text-lg leading-snug text-white">{caption}</p>}
            </>
          )}
        </div>
        {notice && <p className="mt-2 text-sm text-amber-300">{notice}</p>}
        <form
          className="mt-3 flex items-center gap-2 border-b border-sky-200/30"
          onSubmit={(event) => {
            event.preventDefault()
            ask(typed)
            setTyped('')
          }}
        >
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            aria-label="Digite para o Jarvis"
            placeholder="Ou digite aqui..."
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-base text-white placeholder:text-sky-200/50 focus:outline-none focus:ring-0"
          />
          <button type="submit" disabled={!typed.trim()} aria-label="Enviar" className="p-1 text-sky-100 disabled:opacity-40">
            <IconSend size={20} />
          </button>
        </form>
      </div>
    </div>
  )
}
