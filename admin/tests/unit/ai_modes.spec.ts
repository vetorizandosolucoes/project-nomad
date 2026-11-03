/**
 * Pure functions only — no MySQL, Redis, Qdrant, or Ollama needed:
 *   npm run test:unit
 */
import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  chatModelIds,
  cloudModelId,
  isCloudModel,
  keepAliveForMode,
  modelDisplayName,
  orderLocalModels,
  parseAiMode,
  resolveEffectiveMode,
} from '../../app/utils/ai_modes.js'

test('an unknown stored mode falls back to automatic', () => {
  assert.equal(parseAiMode('online'), 'online')
  assert.equal(parseAiMode('offline'), 'offline')
  assert.equal(parseAiMode(null), 'auto')
  assert.equal(parseAiMode('turbo'), 'auto')
})

test('no internet always means offline, even when online was chosen', () => {
  assert.equal(resolveEffectiveMode('online', false), 'offline')
  assert.equal(resolveEffectiveMode('auto', false), 'offline')
  assert.equal(resolveEffectiveMode('auto', true), 'online')
  assert.equal(resolveEffectiveMode('online', true), 'online')
})

test('offline can be forced with internet available, to save battery', () => {
  assert.equal(resolveEffectiveMode('offline', true), 'offline')
})

test('offline releases the GPU soon and online leaves the default', () => {
  assert.equal(keepAliveForMode('offline'), '1m')
  assert.equal(keepAliveForMode('online'), null)
})

test('cloud models are recognized and named for people', () => {
  assert.equal(isCloudModel('openai:gpt-x'), true)
  assert.equal(isCloudModel('gemma3:4b'), false)
  assert.equal(cloudModelId('openai:gpt-x'), 'gpt-x')
  assert.equal(modelDisplayName('openai:gpt-x'), 'GPT online: gpt-x')
  assert.equal(modelDisplayName('gemma3:4b'), 'gemma3:4b')
})

test('each mode puts its preferred local model first', () => {
  const models = [{ name: 'outro' }, { name: 'gemma3:4b' }, { name: 'qwen3:8b' }]
  assert.equal(orderLocalModels(models, 'offline')[0].name, 'gemma3:4b')
  assert.equal(orderLocalModels(models, 'online')[0].name, 'qwen3:8b')
  assert.equal(orderLocalModels(models, 'online').at(-1)?.name, 'outro')
})


test('only chat models from the OpenAI list are offered', () => {
  assert.deepEqual(
    chatModelIds(['gpt-a', 'text-embedding-3', 'gpt-a-audio', 'gpt-image-1', 'whisper-1', 'o3', 'gpt-a-realtime']),
    ['o3', 'gpt-a']
  )
})
