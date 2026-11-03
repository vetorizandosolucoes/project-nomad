const STOP_WORDS = new Set(['pare', 'para', 'chega', 'silencio', 'cancela', 'cancelar', 'espera', 'jarvis'])

const MIN_SENTENCE_CHARS = 12

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** Share of what the microphone heard that is also in what Jarvis is saying. */
function overlapWithAnswer(heard: string[], answer: string): number {
  if (heard.length === 0) return 0
  const said = new Set(words(answer))
  return heard.filter((word) => said.has(word)).length / heard.length
}

/** On speakers the microphone hears Jarvis too. A heard phrase made of his words is an echo. */
export function isEcho(heard: string, answer: string): boolean {
  return overlapWithAnswer(words(heard), answer) >= 0.7
}

/** Whether what was heard while Jarvis speaks is the person cutting in, not his own voice. */
export function isBargeIn(heard: string, answer: string): boolean {
  const heardWords = words(heard)
  if (heardWords.length === 1) {
    return STOP_WORDS.has(heardWords[0]) && !words(answer).includes(heardWords[0])
  }
  return heardWords.length >= 2 && !isEcho(heard, answer)
}

/** What a reader sees as formatting, a voice would read aloud as symbols. */
export function textForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{1,6}|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/[*_#`>|~]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Cuts the finished sentences off a text that is still arriving, so speech can start right
 * away. "1." and "Dr." aren't sentences: a piece has to be long enough to stand on its own.
 */
export function takeSentences(text: string): { sentences: string[]; rest: string } {
  const sentences: string[] = []
  let start = 0
  for (const match of text.matchAll(/[.!?…]+\s+/g)) {
    const end = match.index + match[0].length
    const piece = text.slice(start, end).trim()
    if (piece.length >= MIN_SENTENCE_CHARS && !/^\d+[.)]$/.test(piece)) {
      sentences.push(piece)
      start = end
    }
  }
  return { sentences, rest: text.slice(start) }
}

const VOICE_PREFERENCE = [/ant[oô]nio.*(natural|online)/i, /(natural|online)/i, /google/i, /ant[oô]nio/i]

/** Edge's online "Natural" voices sound like a person; the older ones sound like a machine. */
export function pickVoice<T extends { name: string; lang: string }>(voices: T[]): T | null {
  const portuguese = voices.filter((voice) => /^pt[-_]BR/i.test(voice.lang))
  for (const preferred of VOICE_PREFERENCE) {
    const found = portuguese.find((voice) => preferred.test(voice.name))
    if (found) return found
  }
  return portuguese[0] ?? null
}
