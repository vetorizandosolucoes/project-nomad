/**
 * Pure functions only — no MySQL, Redis, Qdrant, or Ollama needed:
 *   npm run test:unit
 */
import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { isBargeIn, isEcho, splitSentences, textForSpeech } from '../../app/utils/voice_turn.js'
import { jarvisSystemPrompt } from '../../app/utils/jarvis.js'

const ANSWER = 'A capital do Brasil é Brasília, que fica no Distrito Federal.'

test('the microphone hearing Jarvis himself is an echo, not an interruption', () => {
  assert.equal(isEcho('capital do brasil é brasília', ANSWER), true)
  assert.equal(isBargeIn('capital do brasil é brasília', ANSWER), false)
  assert.equal(isBargeIn('Distrito Federal', ANSWER), false)
})

test('a different sentence interrupts him', () => {
  assert.equal(isBargeIn('qual é a previsão do tempo', ANSWER), true)
})

test('a single word interrupts only if it is a stop word he is not saying', () => {
  assert.equal(isBargeIn('chega', ANSWER), true)
  assert.equal(isBargeIn('silêncio', ANSWER), true)
  assert.equal(isBargeIn('banana', ANSWER), false)
  assert.equal(isBargeIn('para', 'Ligue para o SAMU.'), false)
  assert.equal(isBargeIn('', ANSWER), false)
})

test('formatting does not reach the voice', () => {
  assert.equal(
    textForSpeech('## Passos\n\n1. **Ligue** para o [SAMU](http://x.y)\n- Fique `calmo`'),
    'Passos Ligue para o SAMU Fique calmo'
  )
  assert.equal(textForSpeech('Veja:\n```js\nx = 1\n```\nPronto.'), 'Veja: Pronto.')
})

test('text is split into sentences without breaking numbers', () => {
  assert.deepEqual(splitSentences('Ligue 192. Fique calmo! Tudo bem?'), ['Ligue 192.', 'Fique calmo!', 'Tudo bem?'])
  assert.deepEqual(splitSentences('São 83.810.205 pessoas'), ['São 83.810.205 pessoas'])
  assert.deepEqual(splitSentences('...'), [])
})

test('the spoken prompt asks for short answers but never shortens an emergency', () => {
  const written = jarvisSystemPrompt(false)
  const spoken = jarvisSystemPrompt(true)
  assert.ok(spoken.startsWith(written))
  assert.match(spoken, /três frases/)
  assert.match(spoken, /emergência/)
  assert.doesNotMatch(written, /três frases/)
})
