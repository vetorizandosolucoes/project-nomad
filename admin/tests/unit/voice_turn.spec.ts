/**
 * Pure functions only — no MySQL, Redis, Qdrant, or Ollama needed:
 *   npm run test:unit
 */
import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { isBargeIn, isEcho, pickVoice, takeSentences, textForSpeech } from '../../app/utils/voice_turn.js'
import {
  asksDateOrTime,
  isSmallTalk,
  pickSpokenModel,
  spokenDate,
  spokenPrompt,
  urgentSpokenPrompt,
} from '../../app/utils/jarvis.js'
import { firstAidNote, hasSelfHarmRisk } from '../../app/utils/health_lookup.js'
import { cityInQuestion, classifyLookup, newsQuery, parseHeadlines } from '../../app/utils/web_lookup.js'

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

test('finished sentences come out while the rest of the text is still arriving', () => {
  assert.deepEqual(takeSentences('Ligue para o SAMU agora. Depois fi'), {
    sentences: ['Ligue para o SAMU agora.'],
    rest: 'Depois fi',
  })
  assert.deepEqual(takeSentences('São 83.810.205 pessoas'), { sentences: [], rest: 'São 83.810.205 pessoas' })
  assert.deepEqual(takeSentences('1. Ligue para o SAMU imediatamente. Fique'), {
    sentences: ['1. Ligue para o SAMU imediatamente.'],
    rest: 'Fique',
  })
  assert.deepEqual(takeSentences('Oi! Tudo bem com você hoje? '), {
    sentences: ['Oi! Tudo bem com você hoje?'],
    rest: '',
  })
})

test('the most human Brazilian voice is preferred', () => {
  const voices = [
    { name: 'Microsoft Maria Desktop', lang: 'pt-BR' },
    { name: 'Microsoft Francisca Online (Natural)', lang: 'pt-BR' },
    { name: 'Microsoft Antonio Online (Natural)', lang: 'pt-BR' },
    { name: 'Microsoft Duarte Online (Natural)', lang: 'pt-PT' },
  ]
  assert.equal(pickVoice(voices)?.name, 'Microsoft Antonio Online (Natural)')
  assert.equal(pickVoice(voices.slice(0, 2))?.name, 'Microsoft Francisca Online (Natural)')
  assert.equal(pickVoice(voices.slice(0, 1))?.name, 'Microsoft Maria Desktop')
  assert.equal(pickVoice([{ name: 'Zira', lang: 'en-US' }]), null)
})

test('questions whose answer changes are looked up', () => {
  assert.equal(classifyLookup('E de saber as notícias do Brasil.'), 'news')
  assert.equal(classifyLookup('Quem ganhou o jogo do Flamengo?'), 'news')
  assert.equal(classifyLookup('Vai chover amanhã em Piracicaba?'), 'weather')
  assert.equal(classifyLookup('Como tá o tempo?'), 'weather')
  assert.equal(classifyLookup('Quanto tá o dólar hoje?'), 'money')
  assert.equal(classifyLookup('Por que o céu é azul?'), null)
  assert.equal(classifyLookup('Como funciona um motor elétrico?'), null)
  assert.equal(classifyLookup('Quanto é 12 vezes 12?'), null)
})

test('a request for news keeps only what it is about', () => {
  assert.equal(newsQuery('E de saber as notícias do Brasil.'), null)
  assert.equal(newsQuery('Quais as últimas notícias?'), null)
  assert.equal(newsQuery('Me fala as notícias sobre energia solar no Brasil'), 'energia solar brasil')
})

test('headlines are read from the feed', () => {
  const rss = '<channel><title>Feed</title><item><title>Chuva &amp; vento em SP - G1</title></item><item><title><![CDATA[Outra]]></title></item></channel>'
  assert.deepEqual(parseHeadlines(rss), ['Chuva & vento em SP - G1', 'Outra'])
  assert.deepEqual(parseHeadlines(rss, 1), ['Chuva & vento em SP - G1'])
  assert.deepEqual(parseHeadlines('<html>erro</html>'), [])
})

test('the city is found in a question about the weather', () => {
  assert.equal(cityInQuestion('Vai chover amanhã em Piracicaba?'), 'Piracicaba')
  assert.equal(cityInQuestion('Como está o tempo em São Paulo hoje?'), 'São Paulo')
  assert.equal(cityInQuestion('Como tá o tempo?'), null)
})

test('a greeting skips the library, a real question does not', () => {
  assert.equal(isSmallTalk('Oi, tudo bem com você?'), true)
  assert.equal(isSmallTalk('Boa noite, Jarvis'), true)
  assert.equal(isSmallTalk('Oi, me explica como funciona um motor elétrico trifásico'), false)
  assert.equal(isSmallTalk('Fui picado por uma cobra'), false)
})

test('the spoken model never falls back to an embedding model', () => {
  assert.equal(pickSpokenModel(['gemma4:e2b', 'qwen3:8b']), 'qwen3:8b')
  assert.equal(pickSpokenModel(['nomic-embed-text:v1.5', 'llama3:8b']), 'llama3:8b')
  assert.equal(pickSpokenModel(['nomic-embed-text:v1.5']), null)
})

test('the spoken prompt asks for short answers but never shortens an emergency', () => {
  const now = new Date('2026-11-03T22:30:00Z')
  assert.match(spokenPrompt(now), /três frases/)
  assert.match(spokenPrompt(now), /Nunca invente/)
  assert.match(urgentSpokenPrompt(now), /não encurte/)
  assert.doesNotMatch(urgentSpokenPrompt(now), /três frases/)
})

test('the date is given in Portuguese and in Brazilian time', () => {
  assert.match(spokenDate(new Date('2026-11-04T01:30:00Z')), /terça-feira, 3 de novembro de 2026.*22:30/)
  assert.equal(asksDateOrTime('Que dia é hoje?'), true)
  assert.equal(asksDateOrTime('Que horas são?'), true)
  assert.equal(asksDateOrTime('Como funciona um motor?'), false)
})

test('veiled ways of saying it count as a crisis, everyday complaints do not', () => {
  assert.equal(hasSelfHarmRisk('Não aguento mais, quero desaparecer.'), true)
  assert.equal(hasSelfHarmRisk('Quero morrer'), true)
  assert.equal(hasSelfHarmRisk('Não aguento mais esse trânsito'), false)
  assert.equal(hasSelfHarmRisk('Quero sumir com esse vírus do computador'), true)
})

test('a burn gets the first-aid fact, a burnt lamp does not', () => {
  assert.match(firstAidNote('Queimei a mão com óleo quente, e agora?') ?? '', /nunca água morna/)
  assert.match(firstAidNote('Como tratar uma queimadura?') ?? '', /fria/)
  assert.equal(firstAidNote('Queimou a lâmpada da sala'), null)
})
