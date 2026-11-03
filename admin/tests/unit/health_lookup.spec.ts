/**
 * Pure functions only — no MySQL, Redis, Qdrant, or Ollama needed:
 *   npm run test:unit
 */
import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { asksAboutMedicine, excerpt, hasRedFlag, hasSelfHarmRisk, matchConditionSlugs } from '../../app/utils/health_lookup.js'
import {
  classCode,
  groupBySubstance,
  medicinesForSituation,
  medicinesNamedIn,
  preferSingleSubstances,
  searchMedicines,
  substanceKey,
  tarjaLabel,
  type BrMedicine,
} from '../../app/utils/br_medicines.js'

function medicine(overrides: Partial<BrMedicine>): BrMedicine {
  return {
    id: 1,
    name: 'PRODUTO',
    substance: 'SUBSTANCIA',
    lab: 'LAB',
    class: 'N2B2 - ANALGÉSICOS',
    type: 'Similar',
    tarja: 'Sem Tarja',
    hospital: false,
    registry: '1',
    presentations: [],
    ...overrides,
  }
}

const LIST = [
  medicine({ id: 1, name: 'NOVALGINA', substance: 'DIPIRONA MONOIDRATADA' }),
  medicine({ id: 2, name: 'DIPIRONA', substance: 'DIPIRONA', type: 'Genérico', lab: 'EMS' }),
  medicine({ id: 3, name: 'ANADOR PRT', substance: 'PARACETAMOL;CAFEÍNA' }),
  medicine({ id: 4, name: 'ALIVIUM', substance: 'IBUPROFENO', class: 'M1A1 - ANTIRREUMÁTICOS' }),
  medicine({ id: 5, name: 'DIPIRONA HOSP', substance: 'DIPIRONA', hospital: true }),
  medicine({ id: 6, name: 'FORTE', substance: 'CLORIDRATO DE TRAMADOL', class: 'N2B1 - X', tarja: 'Preta' }),
  medicine({ id: 7, name: 'LOSAR', substance: 'LOSARTANA POTÁSSICA', class: 'C9C - ANTAGONISTAS', tarja: 'Vermelha' }),
]

test('the most specific condition wins over generic pain', () => {
  assert.deepEqual(matchConditionSlugs('Estou com dor de cabeça forte'), ['headache'])
  assert.deepEqual(matchConditionSlugs('dor nas costas'), ['muscle-joint-pain'])
})

test('a medicine class maps to its condition, with or without accents', () => {
  assert.deepEqual(matchConditionSlugs('qual analgesico'), ['pain'])
  assert.deepEqual(matchConditionSlugs('Qual ANALGÉSICO?'), ['pain'])
  assert.deepEqual(matchConditionSlugs('preciso de um antitérmico'), ['fever'])
})

test('words inside other words and unrelated questions do not match', () => {
  assert.deepEqual(matchConditionSlugs('como configurar o servidor'), [])
  assert.deepEqual(matchConditionSlugs('corte de energia no bairro'), [])
  assert.deepEqual(matchConditionSlugs('capital do Brasil'), [])
})

test('red flags are detected so they never become a list of medicines', () => {
  assert.equal(hasRedFlag('estou com dor no peito'), true)
  assert.equal(hasRedFlag('Falta de ar e tontura'), true)
  assert.equal(hasRedFlag('Fui picado por uma cobra'), true)
  assert.equal(hasRedFlag('ele cobra caro'), false)
  assert.equal(hasRedFlag('dor de cabeça leve'), false)
})

test('product names only count when the question is about a medicine', () => {
  assert.equal(asksAboutMedicine('Alivium'), true)
  assert.equal(asksAboutMedicine('para que serve o Alivium'), true)
  assert.equal(asksAboutMedicine('procuro um forte na cidade'), false)
})

test('substances resolve without their salt or form', () => {
  assert.equal(substanceKey('MALEATO DE ENALAPRIL'), 'enalapril')
  assert.equal(substanceKey('DIPIRONA MONOIDRATADA'), 'dipirona')
  assert.equal(substanceKey('PARACETAMOL;CAFEÍNA'), 'paracetamol')
})

test('a substance is found in a sentence, and a product name only when allowed', () => {
  const byName = (question: string, includeProductNames: boolean) =>
    medicinesNamedIn(LIST, question, { includeProductNames }).map((item) => item.id)
  assert.deepEqual(byName('qual a dose de dipirona?', false), [1, 2, 5])
  assert.deepEqual(byName('procuro um forte na cidade', false), [])
  assert.deepEqual(byName('posso tomar alivium', true), [4])
})

test('search ignores accents and puts exact names first and hospital use last', () => {
  const { results, total } = searchMedicines(LIST, 'dipirona')
  assert.equal(total, 3)
  assert.deepEqual(results.map((item) => item.id), [2, 1, 5])
  assert.deepEqual(searchMedicines(LIST, 'CAFEINA').results.map((item) => item.id), [3])
  assert.deepEqual(searchMedicines(LIST, '   ').results, [])
})

test('search filters by product type', () => {
  assert.deepEqual(searchMedicines(LIST, 'dipirona', { type: 'Genérico' }).results.map((item) => item.id), [2])
})

test('situations leave out hospital use and black label, and add listed substances', () => {
  const groups = medicinesForSituation(LIST, 'pain')
  assert.deepEqual(groups.map((group) => group.substance), [
    'DIPIRONA',
    'DIPIRONA MONOIDRATADA',
    'IBUPROFENO',
    'PARACETAMOL;CAFEÍNA',
  ])
  assert.deepEqual(groups[0].products.map((product) => product.id), [2])
})

test('a product misfiled under analgesics stays out of pain and fever', () => {
  const list = [medicine({ id: 8, substance: 'CLORIDRATO DE PROMETAZINA', class: 'N2B - ANALGÉSICOS' }), ...LIST]
  assert.equal(
    medicinesForSituation(list, 'fever').some((group) => group.substance.includes('PROMETAZINA')),
    false
  )
})

test('a group shows the strictest label among its products', () => {
  const [group] = groupBySubstance([
    medicine({ id: 1, substance: 'IBUPROFENO', tarja: 'Sem Tarja' }),
    medicine({ id: 2, substance: 'IBUPROFENO', tarja: 'Vermelha' }),
  ])
  assert.equal(group.tarja, 'Vermelha')
})

test('asking about one substance leaves out its combinations', () => {
  const named = medicinesNamedIn(LIST, 'dose de paracetamol', { includeProductNames: false })
  assert.deepEqual(preferSingleSubstances(named).map((item) => item.id), [3])
  const list = [...LIST, medicine({ id: 9, substance: 'PARACETAMOL' })]
  const both = medicinesNamedIn(list, 'dose de paracetamol', { includeProductNames: false })
  assert.deepEqual(preferSingleSubstances(both).map((item) => item.id), [9])
})

test('self-harm is told apart from a medical emergency', () => {
  assert.equal(hasSelfHarmRisk('quero me matar'), true)
  assert.equal(hasSelfHarmRisk('dor no peito'), false)
})

test('an unknown situation returns nothing', () => {
  assert.deepEqual(medicinesForSituation(LIST, 'nao-existe'), [])
})

test('groups list single substances before combinations', () => {
  const groups = groupBySubstance([LIST[2], LIST[1]])
  assert.deepEqual(groups.map((group) => group.substance), ['DIPIRONA', 'PARACETAMOL;CAFEÍNA'])
})

test('class code and label color read from the list format', () => {
  assert.equal(classCode({ class: 'N2B2 - ANALGÉSICOS' }), 'N2B2')
  assert.equal(tarjaLabel('Vermelha'), 'Tarja vermelha')
  assert.equal(tarjaLabel(''), 'Tarja não informada')
})

test('excerpts cut at a word boundary', () => {
  assert.equal(excerpt('um  dois\ntres', 50), 'um dois tres')
  assert.equal(excerpt('palavra grande demais', 12), 'palavra…')
  assert.equal(excerpt(null, 10), '')
})
