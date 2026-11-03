import { Head, Link } from '@inertiajs/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  IconBookmark,
  IconMicrophone,
  IconPlayerPlay,
  IconPlugConnected,
  IconRobot,
  IconSend,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react'
import AppLayout from '~/layouts/AppLayout'
import AiModeSwitch, { AI_STATUS_KEY, aiRequest, useAiStatus } from '~/components/AiModeSwitch'
import JarvisVoice from '~/components/JarvisVoice'

type Source = { title: string; date?: string; source?: string }
type Turn = { role: 'user' | 'assistant'; content: string; sources?: Source[] }
type Voice = { id: string; name: string; previewUrl: string | null; category: string | null }

const SPEAK_KEY = 'jarvis:speak'

function readSpeakPreference() {
  try {
    return localStorage.getItem(SPEAK_KEY) === 'true'
  } catch {
    return false
  }
}

/** The browser's voice needs no internet, so Jarvis can always answer out loud. */
function speakOffline(text: string) {
  if (!('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''))
  utterance.lang = 'pt-BR'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function KeyField({
  label,
  placeholder,
  onSave,
  saving,
}: {
  label: string
  placeholder: string
  onSave: (key: string) => void
  saving: boolean
}) {
  const [key, setKey] = useState('')
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault()
        if (key.trim()) onSave(key.trim())
        setKey('')
      }}
    >
      <input
        type="password"
        autoComplete="off"
        aria-label={label}
        value={key}
        onChange={(event) => setKey(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 border-b border-border-default bg-transparent px-1 py-1.5 text-sm text-text-primary focus:border-desert-green focus:outline-none"
      />
      <button type="submit" disabled={saving || !key.trim()} className="text-sm font-medium text-desert-green disabled:opacity-50">
        {saving ? 'Verificando...' : 'Salvar chave'}
      </button>
    </form>
  )
}

function Connections() {
  const queryClient = useQueryClient()
  const { data: status } = useAiStatus()
  const [error, setError] = useState<string | null>(null)
  const refresh = () => {
    setError(null)
    queryClient.invalidateQueries({ queryKey: AI_STATUS_KEY })
    queryClient.invalidateQueries({ queryKey: ['installedModels'] })
    queryClient.invalidateQueries({ queryKey: ['openai-models'] })
    queryClient.invalidateQueries({ queryKey: ['voices'] })
  }
  const fail = (failure: Error) => setError(failure.message)

  const openaiOn = !!status?.openai.configured
  const voiceOn = !!status?.voice.configured
  const online = status?.effective === 'online'

  const { data: models } = useQuery({
    queryKey: ['openai-models'],
    enabled: openaiOn && online,
    queryFn: () => aiRequest<{ models: string[] }>('GET', '/openai/models'),
  })
  const { data: voices } = useQuery({
    queryKey: ['voices'],
    enabled: voiceOn && online,
    queryFn: () => aiRequest<{ voices: Voice[] }>('GET', '/voice/voices'),
  })

  const saveOpenAi = useMutation({
    mutationFn: (key: string) => aiRequest('POST', '/openai/key', { key }),
    onSuccess: refresh,
    onError: fail,
  })
  const removeOpenAi = useMutation({ mutationFn: () => aiRequest('DELETE', '/openai/key'), onSuccess: refresh, onError: fail })
  const setModel = useMutation({
    mutationFn: (model: string) => aiRequest('PUT', '/openai/model', { model }),
    onSuccess: refresh,
    onError: fail,
  })
  const saveVoiceKey = useMutation({
    mutationFn: (key: string) => aiRequest('POST', '/voice/key', { key }),
    onSuccess: refresh,
    onError: fail,
  })
  const removeVoice = useMutation({ mutationFn: () => aiRequest('DELETE', '/voice/key'), onSuccess: refresh, onError: fail })
  const pickVoice = useMutation({
    mutationFn: (voice: Voice) => aiRequest('PUT', '/voice/voice', { id: voice.id, name: voice.name }),
    onSuccess: refresh,
    onError: fail,
  })

  return (
    <details className="border-b border-border-subtle py-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-text-secondary">
        <IconPlugConnected size={18} aria-hidden="true" />
        Conexões online: GPT e voz
      </summary>
      <div className="space-y-6 py-4 text-sm">
        {error && <p className="text-desert-red">{error}</p>}

        <section>
          <h2 className="font-semibold text-text-primary">GPT (OpenAI)</h2>
          <p className="mt-1 text-text-secondary">
            Usa a API da OpenAI, com chave e cobrança próprias, separadas da assinatura do ChatGPT. As perguntas e os
            trechos consultados são enviados à OpenAI. Sem internet, a IA local assume sozinha.
          </p>
          <div className="mt-2">
            {openaiOn ? (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Modelo do GPT"
                  value={status?.openai.model ?? ''}
                  onChange={(event) => setModel.mutate(event.target.value)}
                  className="rounded-md border border-border-default bg-surface-primary px-2 py-1 text-text-primary"
                >
                  {status?.openai.model && <option value={status.openai.model}>{status.openai.model}</option>}
                  {models?.models
                    .filter((model) => model !== status?.openai.model)
                    .map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                </select>
                <span className="text-text-muted">Aparece na lista de modelos do Assistente de IA.</span>
                <button type="button" onClick={() => removeOpenAi.mutate()} className="text-desert-red">
                  Remover chave
                </button>
              </div>
            ) : (
              <KeyField label="Chave da OpenAI" placeholder="Cole sua chave da OpenAI" saving={saveOpenAi.isPending} onSave={(key) => saveOpenAi.mutate(key)} />
            )}
          </div>
        </section>

        <section>
          <h2 className="font-semibold text-text-primary">Voz (ElevenLabs)</h2>
          <p className="mt-1 text-text-secondary">
            As respostas faladas são enviadas à ElevenLabs e gastam os créditos da sua conta. Sem internet, o Jarvis usa a
            voz offline do navegador.
          </p>
          <div className="mt-2">
            {voiceOn ? (
              <>
                <p className="text-text-secondary">
                  Voz atual: <strong className="text-text-primary">{status?.voice.voiceName ?? 'nenhuma'}</strong>
                  <button type="button" onClick={() => removeVoice.mutate()} className="ml-3 text-desert-red">
                    Remover chave
                  </button>
                </p>
                <ul className="mt-2 max-h-72 overflow-y-auto">
                  {voices?.voices.map((voice) => (
                    <li key={voice.id} className="flex items-center gap-2 border-b border-border-subtle py-1.5">
                      <button
                        type="button"
                        disabled={!voice.previewUrl}
                        aria-label={`Ouvir a voz ${voice.name}`}
                        onClick={() => voice.previewUrl && new Audio(voice.previewUrl).play()}
                        className="text-desert-green disabled:opacity-40"
                      >
                        <IconPlayerPlay size={18} />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-text-primary">{voice.name}</span>
                      {status?.voice.voiceId === voice.id ? (
                        <span className="text-xs font-semibold text-desert-green">Em uso</span>
                      ) : (
                        <button type="button" onClick={() => pickVoice.mutate(voice)} className="text-desert-green">
                          Usar esta voz
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {!online && <p className="mt-2 text-text-muted">A lista de vozes precisa de internet.</p>}
              </>
            ) : (
              <KeyField label="Chave da ElevenLabs" placeholder="Cole sua chave da ElevenLabs" saving={saveVoiceKey.isPending} onSave={(key) => saveVoiceKey.mutate(key)} />
            )}
          </div>
        </section>
      </div>
    </details>
  )
}

export default function JarvisPage({ available }: { available: boolean }) {
  const { data: status } = useAiStatus()
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [speak, setSpeak] = useState(readSpeakPreference)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [talking, setTalking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const online = status?.effective === 'online'

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [turns])

  const sayAnswer = async (text: string) => {
    if (!speak) return
    if (online && status?.voice.configured && status.voice.enabled) {
      try {
        const response = await fetch('/api/ai/voice/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (response.ok) {
          await new Audio(URL.createObjectURL(await response.blob())).play()
          return
        }
      } catch {
        // Falls through to the offline voice below.
      }
    }
    speakOffline(text)
  }

  const ask = useMutation({
    mutationFn: (messages: Turn[]) =>
      aiRequest<{ content: string; sources: Source[] }>(
        'POST',
        '/jarvis/chat',
        { messages: messages.map(({ role, content }) => ({ role, content })) }
      ),
    onSuccess: (data) => {
      setTurns((current) => [...current, { role: 'assistant', content: data.content, sources: data.sources }])
      sayAnswer(data.content)
    },
    onError: (error: Error) => {
      setTurns((current) => [...current, { role: 'assistant', content: `*${error.message}*` }])
    },
  })

  const send = () => {
    const content = input.trim()
    if (!content || ask.isPending) return
    const next: Turn[] = [...turns, { role: 'user', content }]
    setTurns(next)
    setInput('')
    ask.mutate(next)
  }

  const toggleSpeak = () => {
    const value = !speak
    setSpeak(value)
    if (!value) window.speechSynthesis?.cancel()
    try {
      localStorage.setItem(SPEAK_KEY, String(value))
    } catch {
      // The preference just won't survive a reload.
    }
  }

  /** Turns an answer into a knowledge base document, which the AI can use from then on. */
  const saveToKnowledge = useMutation({
    mutationFn: async (index: number) => {
      const question = turns[index - 1]?.content ?? 'Jarvis'
      const body = new FormData()
      const text = `# ${question}\n\n${turns[index].content}\n`
      body.append('file', new File([text], `jarvis-${question.slice(0, 40)}.md`, { type: 'text/markdown' }))
      const response = await fetch('/api/rag/upload', { method: 'POST', body })
      if (!response.ok) throw new Error('Não foi possível salvar.')
      return index
    },
    onSuccess: (index) => setSavedAt(index),
  })

  return (
    <AppLayout compact>
      <Head title="Jarvis" />
      {talking && (
        <JarvisVoice
          turns={turns}
          setTurns={setTurns}
          useCloudVoice={!!status?.voice.configured && !!status.voice.enabled}
          onClose={() => setTalking(false)}
        />
      )}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6">
        <div className="flex items-center gap-3">
          <IconRobot size={30} className="text-desert-green" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-text-primary">Jarvis</h1>
          {available && online && (
            <button
              type="button"
              onClick={() => setTalking(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-desert-green px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              <IconMicrophone size={18} aria-hidden="true" />
              Conversar por voz
            </button>
          )}
          <button
            type="button"
            onClick={toggleSpeak}
            aria-pressed={speak}
            title={speak ? 'Desligar a voz' : 'Ouvir as respostas'}
            aria-label={speak ? 'Desligar a voz' : 'Ouvir as respostas'}
            className={`${available && online ? '' : 'ml-auto '}text-text-secondary hover:text-desert-green`}
          >
            {speak ? <IconVolume size={22} /> : <IconVolumeOff size={22} />}
          </button>
        </div>
        <div className="mt-3">
          <AiModeSwitch />
        </div>
        <Connections />

        {!available ? (
          <p className="py-8 text-sm text-text-secondary">O serviço do Jarvis não está instalado neste sistema.</p>
        ) : status && !online ? (
          <p className="py-8 text-sm text-text-secondary">
            No modo Offline, o Jarvis fica desligado para poupar bateria. Use o{' '}
            <Link href="/chat" className="text-desert-green underline">
              Assistente de IA
            </Link>
            , que funciona sem internet.
          </p>
        ) : (
          <>
            <div className="flex-1 space-y-6 py-6" aria-live="polite">
              {turns.length === 0 && (
                <p className="text-text-secondary">
                  Pergunte, pesquise ou peça ajuda com um projeto. O Jarvis consulta a biblioteca deste sistema, faz contas
                  e pode procurar na web.
                </p>
              )}
              {turns.map((turn, index) =>
                turn.role === 'user' ? (
                  <p key={index} className="font-medium text-text-primary">
                    {turn.content}
                  </p>
                ) : (
                  <div key={index} className="border-l-2 border-desert-green pl-4">
                    <div className="prose prose-sm max-w-none text-text-primary dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content}</ReactMarkdown>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                      {turn.sources && turn.sources.length > 0 && (
                        <span>Fontes: {turn.sources.map((source) => source.title).join(', ')}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => saveToKnowledge.mutate(index)}
                        disabled={saveToKnowledge.isPending || savedAt === index}
                        className="inline-flex items-center gap-1 hover:text-desert-green disabled:opacity-60"
                      >
                        <IconBookmark size={14} aria-hidden="true" />
                        {savedAt === index ? 'Salvo na Base de conhecimento' : 'Salvar na Base de conhecimento'}
                      </button>
                    </div>
                  </div>
                )
              )}
              {ask.isPending && <p className="text-sm text-text-muted">O Jarvis está pensando...</p>}
              <div ref={endRef} />
            </div>

            <form
              className="sticky bottom-0 flex items-end gap-3 border-t border-border-subtle bg-surface-secondary/95 py-3"
              onSubmit={(event) => {
                event.preventDefault()
                send()
              }}
            >
              <textarea
                rows={1}
                value={input}
                aria-label="Mensagem para o Jarvis"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    send()
                  }
                }}
                placeholder="Fale com o Jarvis..."
                className="min-w-0 flex-1 resize-none border-0 bg-transparent py-1.5 text-lg text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <button type="submit" disabled={ask.isPending || !input.trim()} aria-label="Enviar" className="pb-2 text-desert-green disabled:opacity-40">
                <IconSend size={22} />
              </button>
            </form>
          </>
        )}
      </div>
    </AppLayout>
  )
}
