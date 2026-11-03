/**
 * Pure functions only — no MySQL, Redis, Qdrant, or Ollama needed:
 *   npm run test:unit
 */
import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { solveArithmetic } from '../../app/utils/quick_math.js'

test('multiplication in words and symbols gets the exact result', () => {
  assert.deepEqual(solveArithmetic('Quanto é 12345 vezes 6789?'), ['12.345 × 6.789 = 83.810.205'])
  assert.deepEqual(solveArithmetic('12 x 3'), ['12 × 3 = 36'])
  assert.deepEqual(solveArithmetic('12*3'), ['12 × 3 = 36'])
})

test('operators follow their precedence', () => {
  assert.deepEqual(solveArithmetic('2 + 3 * 4'), ['2 + 3 × 4 = 14'])
  assert.deepEqual(solveArithmetic('10 menos 2 mais 1'), ['10 - 2 + 1 = 9'])
  assert.deepEqual(solveArithmetic('100 dividido por 8'), ['100 ÷ 8 = 12,5'])
})

test('Brazilian number formats are read correctly', () => {
  assert.deepEqual(solveArithmetic('1.500 x 2'), ['1.500 × 2 = 3.000'])
  assert.deepEqual(solveArithmetic('2,5 x 4'), ['2,5 × 4 = 10'])
})

test('percentages are solved', () => {
  assert.deepEqual(solveArithmetic('Quanto é 15% de 200?'), ['15% de 200 = 30'])
})

test('dates, ranges and plain numbers are not math', () => {
  assert.deepEqual(solveArithmetic('Nasci em 12/10/2026'), [])
  assert.deepEqual(solveArithmetic('de 8-10 anos'), [])
  assert.deepEqual(solveArithmetic('tenho 30 anos e 2 filhos'), [])
  assert.deepEqual(solveArithmetic('ligue 192'), [])
  assert.deepEqual(solveArithmetic('Copa de 2050'), [])
})

test('division by zero gives no result instead of Infinity', () => {
  assert.deepEqual(solveArithmetic('5 / 0'), [])
})
