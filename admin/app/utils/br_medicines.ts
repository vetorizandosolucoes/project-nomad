/**
 * Pure helpers over the list of medicines sold in Brazil (collections/medicamentos_br.json,
 * built from the CMED/Anvisa price list). Shared with the frontend, so no Node imports.
 */

export type BrMedicine = {
  id: number
  name: string
  substance: string
  lab: string
  class: string
  type: string
  tarja: string
  hospital: boolean
  registry: string
  presentations: string[]
}

export type SubstanceGroup = {
  substance: string
  tarja: string
  products: Array<{ id: number; name: string; type: string }>
}

/**
 * Situations mapped to the therapeutic class codes on the CMED list. A situation
 * groups what is used for it. It is not a recommendation for any one person.
 */
const SITUATION_CLASSES: Record<string, string[]> = {
  'pain': ['N2B'],
  'headache': ['N2B', 'N2C'],
  'muscle-joint-pain': ['M1A1', 'M1A3', 'M2A', 'M3B'],
  'fever': ['N2B'],
  'menstrual-cramps': ['A3A', 'A3D', 'G2X1'],
  'cough': ['R5C', 'R5D'],
  'nasal-congestion': ['R1A7', 'R1B'],
  'sore-throat': ['R2A'],
  'common-cold': ['R5A'],
  'allergic-reaction': ['R6A'],
  'heartburn': ['A2A1', 'A2A4', 'A2A6', 'A2B1', 'A2B2'],
  'indigestion': ['A9A', 'A3F'],
  'nausea-vomiting': ['A4A', 'A3F'],
  'diarrhea': ['A7F', 'A7G', 'A7H'],
  'constipation': ['A6A'],
  'motion-sickness': ['A4A9', 'N7C'],
  'gas': ['A2A2', 'A2A4'],
  'wounds-cuts': ['D3A9', 'D8A1', 'D6A'],
  'burns': ['D3A9'],
  'insect-bites-stings': ['D4A', 'R6A'],
  'skin-rash-itch': ['D4A', 'D7A'],
  'poison-ivy': ['D4A', 'D7A'],
  'fungal-infection': ['D1A1'],
  'dry-skin': ['D2A'],
  'acne': ['D10A'],
  'eye-irritation': ['S1K1', 'S1G5'],
  'earache': ['S2A', 'S2C', 'S2D1'],
  'canker-sores': ['A1A3', 'D6D1'],
  'toothache': ['N2B', 'A1A3'],
  'sleeplessness': ['N5B5'],
  'dehydration': ['A7G'],
  'hemorrhoids': ['C5A'],
  'yeast-infection': ['G1B'],
  'pinworm': ['P1B'],
  'eye-allergy': ['S1G1', 'S1G2', 'S1G3'],
}

/** Anti-inflammatories sit in a class far too broad to include whole for these situations. */
const SITUATION_SUBSTANCES: Record<string, string[]> = {
  'pain': ['IBUPROFENO', 'NAPROXENO'],
  'headache': ['IBUPROFENO', 'NAPROXENO'],
  'fever': ['IBUPROFENO'],
  'menstrual-cramps': ['IBUPROFENO', 'NAPROXENO', 'ÁCIDO MEFENÂMICO'],
  'toothache': ['IBUPROFENO'],
}

/** Salts the list writes before the active substance ("MALEATO DE ENALAPRIL"). */
const SALT_PREFIX =
  /^(ACETATO|BESILATO|BROMIDRATO|BUTILBROMETO|CITRATO|CLORIDRATO|FOSFATO|FUMARATO|MALEATO|MESILATO|NITRATO|SUCCINATO|SULFATO|TARTARATO) DE /

const COMMON_ANALGESICS = ['paracetamol', 'dipirona', 'acetilsalicilico']

const TARJA_STRICTNESS = ['Sem Tarja', '', 'Vermelha', 'Vermelha sob restrição', 'Preta']

const SEARCH_LIMIT = 60

export function normalizeMedicineText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function classCode(medicine: Pick<BrMedicine, 'class'>): string {
  return medicine.class.split(' - ')[0].trim()
}

export function isCombination(substance: string): boolean {
  return substance.includes(';')
}

/** "MALEATO DE ENALAPRIL" and "DIPIRONA MONOIDRATADA" as people say them. */
export function substanceKey(substance: string): string {
  const main = substance.split(';')[0].trim().toUpperCase().replace(SALT_PREFIX, '')
  return normalizeMedicineText(main).split(' ')[0]
}

export function tarjaLabel(tarja: string): string {
  if (tarja === 'Sem Tarja') return 'Sem tarja'
  if (tarja === 'Vermelha') return 'Tarja vermelha'
  if (tarja === 'Vermelha sob restrição') return 'Tarja vermelha, sob restrição'
  if (tarja === 'Preta') return 'Tarja preta'
  return 'Tarja não informada'
}

export function searchMedicines(
  medicines: BrMedicine[],
  query: string,
  filters: { type?: string } = {}
): { results: BrMedicine[]; total: number } {
  const tokens = normalizeMedicineText(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return { results: [], total: 0 }

  const phrase = tokens.join(' ')
  const scored: Array<{ medicine: BrMedicine; score: number }> = []
  for (const medicine of medicines) {
    if (filters.type && medicine.type !== filters.type) continue
    const name = normalizeMedicineText(medicine.name)
    const substance = normalizeMedicineText(medicine.substance)
    const haystack = `${name} ${substance} ${normalizeMedicineText(medicine.lab)} ${normalizeMedicineText(medicine.class)}`
    if (!tokens.every((token) => haystack.includes(token))) continue

    let score = 5
    if (name === phrase) score = 0
    else if (name.startsWith(phrase)) score = 1
    else if (substance === phrase) score = 2
    else if (` ${substance} `.includes(` ${phrase} `)) score = 3
    else if (name.includes(phrase)) score = 4
    scored.push({ medicine, score: score + (medicine.hospital ? 10 : 0) })
  }

  scored.sort((a, b) => a.score - b.score || a.medicine.name.localeCompare(b.medicine.name, 'pt-BR'))
  return { results: scored.slice(0, SEARCH_LIMIT).map((entry) => entry.medicine), total: scored.length }
}

export function hasSituation(slug: string): boolean {
  return slug in SITUATION_CLASSES
}

/**
 * A group shows the strictest label among its products, since one substance can be sold
 * both ways. Saying "no label" for all of them could suggest no prescription is needed.
 */
function stricterTarja(a: string, b: string): string {
  return TARJA_STRICTNESS.indexOf(a) >= TARJA_STRICTNESS.indexOf(b) ? a : b
}

/** Single substances first, then the most widely sold. */
export function groupBySubstance(medicines: BrMedicine[]): SubstanceGroup[] {
  const groups = new Map<string, SubstanceGroup>()
  for (const medicine of medicines) {
    const group = groups.get(medicine.substance) ?? {
      substance: medicine.substance,
      tarja: medicine.tarja,
      products: [],
    }
    group.tarja = stricterTarja(group.tarja, medicine.tarja)
    group.products.push({ id: medicine.id, name: medicine.name, type: medicine.type })
    groups.set(medicine.substance, group)
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(isCombination(a.substance)) - Number(isCombination(b.substance)) ||
      b.products.length - a.products.length ||
      a.substance.localeCompare(b.substance, 'pt-BR')
  )
}

/** The list files a few unrelated products under N2B, such as prometazine. */
function isCommonAnalgesic(medicine: BrMedicine): boolean {
  const substance = normalizeMedicineText(medicine.substance)
  return COMMON_ANALGESICS.some((name) => substance.includes(name))
}

/** Leaves out hospital-only and black-label products, which nobody picks for a symptom. */
export function medicinesForSituation(medicines: BrMedicine[], slug: string): SubstanceGroup[] {
  const classes = SITUATION_CLASSES[slug]
  if (!classes) return []
  const substances = SITUATION_SUBSTANCES[slug] ?? []
  return groupBySubstance(
    medicines.filter((medicine) => {
      if (medicine.hospital || medicine.tarja === 'Preta') return false
      if (substances.includes(medicine.substance)) return true
      const code = classCode(medicine)
      if (!classes.some((prefix) => code.startsWith(prefix))) return false
      return !code.startsWith('N2B') || isCommonAnalgesic(medicine)
    })
  )
}

/** Asked about one substance, its combinations (with tramadol, codeine...) are not the answer. */
export function preferSingleSubstances(medicines: BrMedicine[]): BrMedicine[] {
  const single = medicines.filter((medicine) => !isCombination(medicine.substance))
  return single.length > 0 ? single : medicines
}

/** Medicines named in a question, by active substance or by commercial name. */
export function medicinesNamedIn(
  medicines: BrMedicine[],
  question: string,
  opts: { includeProductNames: boolean }
): BrMedicine[] {
  const text = ` ${normalizeMedicineText(question)} `
  return medicines.filter((medicine) => {
    const key = substanceKey(medicine.substance)
    if (key.length >= 5 && text.includes(` ${key} `)) return true
    if (!opts.includeProductNames) return false
    const name = normalizeMedicineText(medicine.name)
    return name.length >= 5 && text.includes(` ${name} `)
  })
}
