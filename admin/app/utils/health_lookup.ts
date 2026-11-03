/**
 * Pure helpers for recognizing a health question. This maps it to curated conditions
 * by plain phrase matching, with no model call, so it costs nothing on other questions.
 */

/** Portuguese phrases for each curated condition slug (compared without accents). */
const CONDITION_TERMS: Record<string, string[]> = {
  'pain': ['dor', 'dores', 'analgesico', 'analgesicos', 'doendo', 'dolorido'],
  'headache': ['dor de cabeca', 'dores de cabeca', 'cefaleia', 'enxaqueca'],
  'muscle-joint-pain': [
    'dor muscular',
    'dores musculares',
    'dor nas costas',
    'dor nas articulacoes',
    'dor nas juntas',
    'artrite',
    'lombalgia',
    'torcicolo',
  ],
  'fever': ['febre', 'antitermico', 'antitermicos'],
  'menstrual-cramps': ['colica', 'colicas', 'colica menstrual', 'colicas menstruais'],
  'cough': ['tosse', 'tossindo'],
  'nasal-congestion': ['nariz entupido', 'congestao nasal', 'descongestionante'],
  'sore-throat': ['dor de garganta', 'garganta inflamada'],
  'common-cold': ['resfriado', 'resfriada', 'gripe', 'gripado', 'gripada'],
  'allergic-reaction': [
    'alergia',
    'alergias',
    'alergico',
    'alergica',
    'antialergico',
    'antialergicos',
    'antihistaminico',
    'urticaria',
  ],
  'heartburn': ['azia', 'queimacao no estomago', 'refluxo', 'antiacido', 'antiacidos'],
  'indigestion': ['ma digestao', 'indigestao', 'dor de estomago', 'dor no estomago'],
  'nausea-vomiting': ['nausea', 'nauseas', 'vomito', 'vomitos', 'vomitando', 'enjoo', 'enjoado', 'enjoada'],
  'diarrhea': ['diarreia', 'intestino solto'],
  'constipation': ['prisao de ventre', 'intestino preso', 'constipacao', 'laxante', 'laxantes'],
  'motion-sickness': ['enjoo de movimento', 'enjoo de viagem', 'enjoo no carro', 'enjoo no onibus', 'enjoo no barco'],
  'gas': ['gases', 'inchaco abdominal', 'barriga inchada'],
  'wounds-cuts': ['ferida', 'feridas', 'ferimento', 'ferimentos', 'machucado', 'corte na', 'corte no', 'cortei'],
  'burns': ['queimadura', 'queimaduras', 'queimei'],
  'insect-bites-stings': ['picada', 'picadas', 'picada de inseto', 'mordida de inseto'],
  'skin-rash-itch': ['coceira', 'erupcao', 'brotoeja', 'assadura'],
  'poison-ivy': ['hera venenosa'],
  'fungal-infection': ['micose', 'micoses', 'pe de atleta', 'frieira'],
  'dry-skin': ['pele seca', 'pele rachada'],
  'acne': ['acne', 'espinha', 'espinhas'],
  'eye-irritation': ['olho seco', 'olhos secos', 'olhos irritados', 'irritacao nos olhos'],
  'earache': ['dor de ouvido'],
  'canker-sores': ['afta', 'aftas', 'herpes labial'],
  'toothache': ['dor de dente'],
  'sleeplessness': ['insonia', 'dificuldade para dormir'],
  'dehydration': ['desidratacao', 'desidratado', 'desidratada', 'soro caseiro'],
  'hemorrhoids': ['hemorroida', 'hemorroidas'],
  'yeast-infection': ['candidiase'],
  'pinworm': ['oxiuros', 'verme', 'vermes', 'lombriga'],
  'cold-sore-lip': ['labio rachado', 'labios rachados'],
  'eye-allergy': ['alergia nos olhos', 'alergia no olho'],
}

/** Situations that need urgent care. They get that guidance instead of an OTC list. */
const RED_FLAG_TERMS = [
  'dor no peito',
  'falta de ar',
  'dificuldade para respirar',
  'nao consigo respirar',
  'desmaio',
  'desmaiou',
  'inconsciente',
  'convulsao',
  'avc',
  'derrame',
  'infarto',
  'sangramento intenso',
  'sangrando muito',
  'overdose',
  'intoxicacao',
  'envenenamento',
  'picado por uma cobra',
  'picada por uma cobra',
  'picada de cobra',
  'mordido por uma cobra',
  'picado por um escorpiao',
  'picada de escorpiao',
  'picada de aranha',
]

const SELF_HARM_TERMS = ['suicidio', 'me matar', 'tirar minha vida', 'me machucar', 'nao quero mais viver']

const MEDICINE_INTENT_TERMS = [
  'remedio',
  'remedios',
  'medicamento',
  'medicamentos',
  'tomar',
  'tomei',
  'tomando',
  'dose',
  'bula',
  'comprimido',
  'comprimidos',
  'farmacia',
  'generico',
  'para que serve',
  'serve para',
]

export function normalizeHealthText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function containsPhrase(normalized: string, phrase: string): boolean {
  return ` ${normalized} `.includes(` ${phrase} `)
}

export function hasRedFlag(text: string): boolean {
  const normalized = normalizeHealthText(text)
  return RED_FLAG_TERMS.some((term) => containsPhrase(normalized, term))
}

export function hasSelfHarmRisk(text: string): boolean {
  const normalized = normalizeHealthText(text)
  return SELF_HARM_TERMS.some((term) => containsPhrase(normalized, term))
}

/**
 * Product names can be ordinary words, so they only count once the question is clearly
 * about a medicine. A bare name counts too: it is what someone types to look one up.
 */
export function asksAboutMedicine(text: string): boolean {
  const normalized = normalizeHealthText(text)
  return (
    !normalized.includes(' ') ||
    MEDICINE_INTENT_TERMS.some((term) => containsPhrase(normalized, term))
  )
}

/**
 * Curated condition slugs named in the text, most specific first. The longest phrases
 * claim their words first, so "dor de cabeça" is a headache and not also generic pain.
 */
export function matchConditionSlugs(text: string): string[] {
  let remaining = ` ${normalizeHealthText(text)} `
  const candidates = Object.entries(CONDITION_TERMS)
    .flatMap(([slug, terms]) => terms.map((term) => ({ slug, term })))
    .sort((a, b) => b.term.length - a.term.length)

  const slugs: string[] = []
  for (const { slug, term } of candidates) {
    const padded = ` ${term} `
    if (!remaining.includes(padded)) continue
    remaining = remaining.split(padded).join('  ')
    if (!slugs.includes(slug)) slugs.push(slug)
  }
  return slugs
}

/** Cut at a word boundary so an excerpt never ends in half a word. */
export function excerpt(text: string | null | undefined, maxChars: number): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxChars) return clean
  const cut = clean.slice(0, maxChars)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`
}

