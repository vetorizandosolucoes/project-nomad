export const MEMORY_KINDS = ['name', 'preference', 'project', 'goal', 'fact'] as const
export type MemoryKind = (typeof MEMORY_KINDS)[number]
export type MemorySource = 'user' | 'auto'
export type ExtractedMemory = { kind: MemoryKind; content: string }

const MAX_CONTENT_CHARS = 300
const MAX_PER_MESSAGE = 3
const RELEVANT_SCORE = 0.55
const SAME_MEMORY_SCORE = 0.9

function plain(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function similarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0
}

export function isSameMemory(a: number[] | null, b: number[] | null): boolean {
  return !!a && !!b && similarity(a, b) >= SAME_MEMORY_SCORE
}

type Ranked = { kind: MemoryKind; content: string; embedding: number[] | null }

/** The person's name always comes along; the rest only when it relates to the question. */
export function pickRelevant<T extends Ranked>(memories: T[], question: number[] | null, limit = 5): T[] {
  const names = memories.filter((memory) => memory.kind === 'name').slice(-1)
  const related = question
    ? memories
        .filter((memory) => memory.kind !== 'name' && memory.embedding)
        .map((memory) => ({ memory, score: similarity(memory.embedding!, question) }))
        .filter(({ score }) => score >= RELEVANT_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ memory }) => memory)
    : []
  return [...names, ...related]
}

export function memoryPrompt(memories: Array<{ content: string }>): string | null {
  if (memories.length === 0) return null
  const lines = memories.map((memory) => `- ${memory.content}`).join('\n')
  return `O que você lembra sobre a pessoa, de conversas anteriores. Use só quando ajudar a resposta, com naturalidade, sem listar nem dizer que consultou uma memória. Se algo parecer desatualizado, pergunte.\n${lines}`
}

/** Guarded in code, because a small model can't be trusted to leave these out on its own. */
export function isSensitive(text: string): boolean {
  return /senha|password|token|chave|\bpin\b|cpf|\brg\b|cartao|cvv|conta bancaria|\bpix\b|remedio|medicamento|doenca|diagnostico|depressao|ansiedade|suicid|me matar|\bdose\b|tratamento/.test(
    plain(text)
  )
}

/** "Lembre que eu moro em Piracicaba" is an order: it's kept word for word, with no model involved. */
export function rememberCommand(text: string): string | null {
  const match = text
    .trim()
    .match(/^(?:jarvis[,\s]+)?(?:por favor[,\s]+)?(?:lembre|lembra|grave|guarde|anote)(?:[- ]se)?(?:\s+(?:que|de que|disso:?))\s+(.+)$/i)
  const content = match?.[1].replace(/[.!?\s]+$/, '').trim()
  return content ? content.slice(0, MAX_CONTENT_CHARS) : null
}

export function forgetCommand(text: string): string | null {
  const match = text
    .trim()
    .match(/^(?:jarvis[,\s]+)?(?:por favor[,\s]+)?(?:esqueca|esqueça|esquece|apague|apaga)\s+(?:(?:de\s+)?que\s+|sobre\s+|o que\s+)?(.+)$/i)
  const content = match?.[1].replace(/[.!?\s]+$/, '').trim()
  return content || null
}

export function asksWhatItKnows(text: string): boolean {
  return /(o que|oque) (voce|vc) (sabe|lembra) (sobre|de) mim/.test(plain(text))
}

/**
 * Most sentences say nothing lasting about the person, and asking the model about each one would
 * keep the graphics card busy for nothing.
 */
export function mayContainMemory(text: string): boolean {
  const normalized = plain(text)
  if (normalized.split(/\s+/).length < 3 || normalized.endsWith('?')) return false
  return /\b(me chamo|meu nome|eu sou|sou (engenheir|estudante|tecnic|professor|medic)|moro|trabalho|estudo|gosto|prefiro|adoro|odeio|detesto|nao gosto|meu projeto|minha empresa|estou (fazendo|criando|desenvolvendo|construindo)|quero (aprender|criar|comprar|terminar)|meu objetivo|minha meta)\b/.test(
    normalized
  )
}

export const EXTRACTION_PROMPT = `Você recebe uma frase dita por uma pessoa ao assistente dela. Extraia somente fatos duradouros que essa pessoa afirmou sobre si mesma e que valham a pena lembrar em conversas futuras.

Tipos: "name" (o nome dela), "preference" (gostos e preferências), "project" (projetos em andamento), "goal" (objetivos), "fact" (outros fatos duradouros, como cidade ou profissão).

Regras:
- Use apenas o que está escrito. Não deduza nem complete.
- Escreva em terceira pessoa, em uma frase curta. Exemplo: "Gosta de eletrônica."
- Ignore pedidos, perguntas e assuntos passageiros.
- Nunca guarde saúde, remédios, senhas, documentos ou dados financeiros.
- Sem nada a guardar, responda {"memories": []}.`

export const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    memories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: [...MEMORY_KINDS] },
          content: { type: 'string' },
        },
        required: ['kind', 'content'],
      },
    },
  },
  required: ['memories'],
}

export function parseExtraction(raw: string): ExtractedMemory[] {
  try {
    const memories = (JSON.parse(raw) as { memories?: unknown }).memories
    if (!Array.isArray(memories)) return []
    return memories
      .filter((item): item is ExtractedMemory => {
        const { kind, content } = (item ?? {}) as Partial<ExtractedMemory>
        return MEMORY_KINDS.includes(kind as MemoryKind) && typeof content === 'string' && content.trim().length > 2
      })
      .map(({ kind, content }) => ({ kind, content: content.trim().slice(0, MAX_CONTENT_CHARS) }))
      .filter(({ content }) => !isSensitive(content))
      .slice(0, MAX_PER_MESSAGE)
  } catch {
    return []
  }
}
