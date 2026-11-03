export const PERSONA_MODES = ['classic', 'friendly', 'professional', 'funny', 'futuristic', 'genius', 'executive', 'coach'] as const
export type PersonaMode = (typeof PERSONA_MODES)[number]

export type Persona = {
  mode: PersonaMode
  name: string
  // How to call the person, such as a name or "senhor". Empty means no form of address.
  address: string
  humor: number // 0 to 3
  formality: number // 0 to 2
  detail: number // 0 to 2
  voiceSpeed: number // 0 to 2
  greets: boolean
  // Captions on the floating animation: what the person says and what Jarvis answers.
  showHeard: boolean
  showAnswer: boolean
}

export const DEFAULT_PERSONA: Persona = {
  mode: 'classic',
  name: 'Jarvis',
  address: '',
  humor: 1,
  formality: 1,
  detail: 1,
  voiceSpeed: 1,
  greets: true,
  showHeard: true,
  showAnswer: true,
}

const MAX_ADDRESS_CHARS = 40
const MAX_NAME_CHARS = 30

const MODES: Record<PersonaMode, string> = {
  classic:
    'Você é elegante, confiante e levemente irônico, como um mordomo britânico brilhante: sempre um passo à frente, com comentários sutis e nunca exagerados.',
  friendly: 'Você é um amigo inteligente: acolhedor, direto e fácil de conversar.',
  professional: 'Você é um consultor profissional: objetivo, preciso e sem rodeios.',
  funny: 'Você é divertido e espirituoso: faz piadas rápidas sem atrapalhar a resposta.',
  futuristic: 'Você é uma inteligência futurista: precisa, serena e com um toque de ficção científica no jeito de falar.',
  genius: 'Você é um gênio da tecnologia: vai ao detalhe técnico, com exemplos concretos e entusiasmo por engenharia.',
  executive: 'Você é um assistente corporativo: organiza, prioriza e sempre aponta o próximo passo.',
  coach: 'Você é um coach motivacional: encoraja de verdade, sem clichês, e transforma o objetivo em um próximo passo concreto.',
}

const HUMOR = [
  'Não faça piadas.',
  'Use humor raramente, só quando surgir com naturalidade.',
  'Use humor leve com alguma frequência.',
  'Use bastante humor, sem deixar de responder.',
]

const FORMALITY = [
  'Use linguagem informal do dia a dia.',
  'Use linguagem natural, nem formal nem informal.',
  'Use linguagem formal e educada.',
]

const DETAIL = [
  'Responda em no máximo duas frases curtas, a não ser que peçam detalhes.',
  'Responda em uma a três frases curtas. Se a pessoa pedir detalhes, aprofunde.',
  'Responda com detalhe, em até seis frases, com um exemplo quando ajudar.',
]

function clamp(value: unknown, max: number, fallback: number): number {
  const number = typeof value === 'number' ? Math.round(value) : Number.NaN
  return Number.isNaN(number) ? fallback : Math.min(Math.max(number, 0), max)
}

/** Whatever is stored or sent gets through here, so the prompt only ever sees valid values. */
export function normalizePersona(value: unknown): Persona {
  const input = (value ?? {}) as Partial<Persona>
  return {
    mode: PERSONA_MODES.includes(input.mode as PersonaMode) ? (input.mode as PersonaMode) : DEFAULT_PERSONA.mode,
    name:
      typeof input.name === 'string' && input.name.trim()
        ? input.name.replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_NAME_CHARS)
        : DEFAULT_PERSONA.name,
    address: typeof input.address === 'string' ? input.address.replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_ADDRESS_CHARS) : '',
    humor: clamp(input.humor, HUMOR.length - 1, DEFAULT_PERSONA.humor),
    formality: clamp(input.formality, FORMALITY.length - 1, DEFAULT_PERSONA.formality),
    detail: clamp(input.detail, DETAIL.length - 1, DEFAULT_PERSONA.detail),
    voiceSpeed: clamp(input.voiceSpeed, 2, DEFAULT_PERSONA.voiceSpeed),
    greets: typeof input.greets === 'boolean' ? input.greets : DEFAULT_PERSONA.greets,
    showHeard: typeof input.showHeard === 'boolean' ? input.showHeard : DEFAULT_PERSONA.showHeard,
    showAnswer: typeof input.showAnswer === 'boolean' ? input.showAnswer : DEFAULT_PERSONA.showAnswer,
  }
}

export function parsePersona(stored: string | null): Persona {
  try {
    return normalizePersona(stored ? JSON.parse(stored) : null)
  } catch {
    return DEFAULT_PERSONA
  }
}

export function detailRule(persona: Persona): string {
  return DETAIL[persona.detail]
}

export function personaStyle(persona: Persona): string {
  const address = persona.address
    ? `Chame a pessoa de "${persona.address}", de vez em quando, sem repetir em toda frase.`
    : ''
  return [MODES[persona.mode], HUMOR[persona.humor], FORMALITY[persona.formality], address].filter(Boolean).join(' ')
}

/** Said when the name is called. Short, because the person is about to speak. */
export function greetingFor(persona: Persona, hour: number, random: () => number = Math.random): string | null {
  if (!persona.greets) return null
  const part = hour < 5 || hour >= 18 ? 'Boa noite' : hour < 12 ? 'Bom dia' : 'Boa tarde'
  const to = persona.address ? `, ${persona.address}` : ''
  const options =
    persona.mode === 'classic' || persona.mode === 'executive'
      ? [`Sim${to}?`, `Às ordens${to}.`, `Pois não${to}?`]
      : persona.mode === 'professional'
        ? [`${part}${to}.`, `Pois não${to}?`]
        : [`Oi${to}, pode falar.`, `Tô ouvindo${to}.`, `Pode falar${to}.`]
  return options[Math.floor(random() * options.length)]
}

const MODE_WORDS: Array<[RegExp, PersonaMode]> = [
  [/mordomo|classico|elegante/, 'classic'],
  [/amigavel|amigo/, 'friendly'],
  [/profissional/, 'professional'],
  [/engracado|divertido/, 'funny'],
  [/futurista/, 'futuristic'],
  [/genio|tecnologic/, 'genius'],
  [/executivo|corporativo/, 'executive'],
  [/coach|motivacional/, 'coach'],
]

const OPENING = /^(?:jarvis[,\s]+)?(?:por favor[,\s]+)?/

/** "Me chame de Ana" and "fale mais devagar" become settings, so they hold in every conversation. */
export function preferenceCommand(text: string): { patch: Partial<Persona>; reply: string } | null {
  const original = text.trim().replace(/[.!?\s]+$/, '')
  const said = original
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(OPENING, '')

  const called = original.match(/(?:^|[,\s])(?:me chame|me chama|pode me chamar)\s+de\s+(.+)$/i)
  if (called && /^(?:pode )?(?:me chame|me chama|me chamar)/.test(said)) {
    const address = called[1].trim().slice(0, MAX_ADDRESS_CHARS)
    return { patch: { address }, reply: `Combinado, ${address}.` }
  }

  const mode = said.match(/^(?:mude para|muda para|troque para|ativar?|use|fique n?o)?\s*(?:o\s+)?(?:modo|personalidade)\s+(.+)$/)
  if (mode) {
    const found = MODE_WORDS.find(([words]) => words.test(mode[1]))
    return found ? { patch: { mode: found[1] }, reply: 'Pronto, já mudei meu jeito.' } : null
  }

  const rules: Array<[RegExp, Partial<Persona>, string]> = [
    [/^(?:fale|fala|responda|seja) (?:de forma )?mais formal/, { formality: 2 }, 'Perfeitamente. Serei mais formal a partir de agora.'],
    [/^(?:fale|fala|responda|seja) (?:de forma )?mais informal/, { formality: 0 }, 'Fechou, vou falar mais à vontade.'],
    [/^(?:responda|fale|fala|seja) mais (?:curto|breve|resumido|direto|objetivo)/, { detail: 0 }, 'Certo, vou ser mais breve.'],
    [/^(?:responda|fale|fala|seja) (?:com )?mais (?:detalhado|detalhes)/, { detail: 2 }, 'Combinado, vou explicar com mais detalhes.'],
    [/^(?:fale|fala) mais devagar/, { voiceSpeed: 0 }, 'Claro, vou falar mais devagar.'],
    [/^(?:fale|fala) mais rapido/, { voiceSpeed: 2 }, 'Tá bom, vou acelerar um pouco.'],
    [/^(?:sem piadas|pare com as piadas|nao faca piadas)/, { humor: 0 }, 'Entendido, nada de piadas.'],
    [/^(?:seja|fale) mais engracado|^(?:use|faca) mais humor/, { humor: 3 }, 'Pode deixar, vou caprichar no humor.'],
  ]
  const rule = rules.find(([pattern]) => pattern.test(said))
  return rule ? { patch: rule[1], reply: rule[2] } : null
}
