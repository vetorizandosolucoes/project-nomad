const STOP_WORDS = new Set(['pare', 'para', 'chega', 'silencio', 'cancela', 'cancelar', 'espera', 'jarvis'])

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
    .replace(/\s+/g, ' ')
    .trim()
}

/** Browsers cut one long utterance short, so the offline voice speaks a sentence at a time. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[\p{L}\p{N}]/u.test(sentence))
}
