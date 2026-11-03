import { inject } from '@adonisjs/core'
import encryption from '@adonisjs/core/services/encryption'
import logger from '@adonisjs/core/services/logger'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js'
import KVStore from '#models/kv_store'
import { SystemService } from '#services/system_service'
import {
  chatModelIds,
  parseAiMode,
  resolveEffectiveMode,
  type AiMode,
  type EffectiveAiMode,
} from '../utils/ai_modes.js'

const ELEVENLABS_API = 'https://api.elevenlabs.io'
const ELEVENLABS_MODEL = 'eleven_multilingual_v2'
const MAX_SPEECH_CHARS = 1500
const INTERNET_CACHE_MS = 30_000
// The page pings every 10 s, so a window that closed abruptly doesn't hold the listener off for long.
const CONVERSATION_PING_TIMEOUT_MS = 25_000

type SecretKey = 'ai.openaiKey' | 'voice.elevenLabsKey'

let internetCache: { value: boolean; expiresAt: number } | null = null
let lastConversationPing = 0

export class ConnectionError extends Error {}

/**
 * The online services: OpenAI for answers, ElevenLabs for voice, and which mode the system
 * is in. Keys are encrypted at rest, and their KV entries stay out of SETTINGS_KEYS so the
 * generic settings API can neither read nor overwrite them. Nothing here returns a key.
 */
@inject()
export class AiConnectionsService {
  constructor(private systemService: SystemService) {}

  private async secret(key: SecretKey): Promise<string | null> {
    const stored = await KVStore.getValue(key)
    if (!stored) return null
    return encryption.decrypt<string>(stored) ?? null
  }

  private async hasInternet(): Promise<boolean> {
    if (internetCache && Date.now() < internetCache.expiresAt) return internetCache.value
    const value = await this.systemService.getInternetStatus().catch(() => false)
    internetCache = { value, expiresAt: Date.now() + INTERNET_CACHE_MS }
    return value
  }

  async mode(): Promise<{ mode: AiMode; effective: EffectiveAiMode; hasInternet: boolean }> {
    const mode = parseAiMode(await KVStore.getValue('ai.mode'))
    const hasInternet = await this.hasInternet()
    const effective = resolveEffectiveMode(mode, hasInternet)

    // The chat reopens on the last model used, which would keep the strong model running
    // on battery. When the mode really changes, it goes back to the model that suits it.
    if ((await KVStore.getValue('ai.lastEffectiveMode')) !== effective) {
      await KVStore.setValue('ai.lastEffectiveMode', effective)
      await KVStore.clearValue('chat.lastModel')
    }
    return { mode, effective, hasInternet }
  }

  async setMode(mode: AiMode) {
    await KVStore.setValue('ai.mode', mode)
    return this.mode()
  }

  async status() {
    const [openaiKey, elevenLabsKey, mode] = await Promise.all([
      KVStore.getValue('ai.openaiKey'),
      KVStore.getValue('voice.elevenLabsKey'),
      this.mode(),
    ])
    return {
      ...mode,
      openai: {
        configured: !!openaiKey,
        model: (await KVStore.getValue('ai.openaiModel')) ?? null,
      },
      voice: {
        configured: !!elevenLabsKey,
        enabled: (await KVStore.getValue('voice.enabled')) ?? false,
        voiceId: (await KVStore.getValue('voice.elevenLabsVoiceId')) ?? null,
        voiceName: (await KVStore.getValue('voice.elevenLabsVoiceName')) ?? null,
        wakeEnabled: await this.wakeEnabled(),
      },
    }
  }

  // ---------------------------------------------------- Listening for "Jarvis"

  async wakeEnabled(): Promise<boolean> {
    return (await KVStore.getValue('voice.wakeEnabled')) ?? true
  }

  async setWakeEnabled(enabled: boolean) {
    await KVStore.setValue('voice.wakeEnabled', enabled)
  }

  noteConversation(open: boolean) {
    lastConversationPing = open ? Date.now() : 0
  }

  /** Asked every few seconds by the listener in Ubuntu, which holds the microphone only on a yes. */
  async shouldListen(): Promise<boolean> {
    if (Date.now() - lastConversationPing < CONVERSATION_PING_TIMEOUT_MS) return false
    if (!(await this.wakeEnabled())) return false
    return (await this.mode()).effective === 'online'
  }

  // ---------------------------------------------------------------- OpenAI

  private async openai(): Promise<OpenAI> {
    const apiKey = await this.secret('ai.openaiKey')
    if (!apiKey) throw new ConnectionError('A chave da OpenAI não foi configurada.')
    return new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 })
  }

  private describeOpenAiError(error: unknown): ConnectionError {
    const status = error instanceof OpenAI.APIError ? error.status : undefined
    if (status === 401) return new ConnectionError('A OpenAI recusou esta chave.')
    if (status === 429) return new ConnectionError('A conta da OpenAI está sem créditos ou no limite de uso.')
    return new ConnectionError('Não foi possível falar com a OpenAI. Verifique a internet.')
  }

  async listOpenAiModels(): Promise<string[]> {
    const client = await this.openai()
    try {
      const page = await client.models.list()
      return chatModelIds(page.data.map((model) => model.id))
    } catch (error) {
      throw this.describeOpenAiError(error)
    }
  }

  /** Checks the key against OpenAI before keeping it, so a typo fails right here. */
  async saveOpenAiKey(apiKey: string): Promise<string[]> {
    try {
      const page = await new OpenAI({ apiKey, timeout: 20_000, maxRetries: 0 }).models.list()
      const models = chatModelIds(page.data.map((model) => model.id))
      await KVStore.setValue('ai.openaiKey', encryption.encrypt(apiKey))
      const current = await KVStore.getValue('ai.openaiModel')
      if (models.length > 0 && (!current || !models.includes(current))) {
        await KVStore.setValue('ai.openaiModel', models[0])
      }
      return models
    } catch (error) {
      throw this.describeOpenAiError(error)
    }
  }

  async setOpenAiModel(model: string) {
    await KVStore.setValue('ai.openaiModel', model)
  }

  async removeOpenAiKey() {
    await KVStore.clearValue('ai.openaiKey')
    await KVStore.clearValue('ai.openaiModel')
  }

  /** The cloud model the chat should offer right now, or null if it can't be used. */
  async usableCloudModel(): Promise<string | null> {
    const { effective } = await this.mode()
    if (effective !== 'online' || !(await KVStore.getValue('ai.openaiKey'))) return null
    return (await KVStore.getValue('ai.openaiModel')) ?? null
  }

  async *streamOpenAi(
    model: string,
    messages: ChatCompletionMessageParam[],
    signal?: AbortSignal
  ): AsyncGenerator<{ message: { content: string }; done: boolean; done_reason?: string }> {
    const client = await this.openai()
    const stream = await client.chat.completions.create({ model, messages, stream: true }, { signal })
    for await (const chunk of stream) {
      const choice = chunk.choices[0]
      if (!choice) continue
      yield {
        message: { content: choice.delta?.content ?? '' },
        done: choice.finish_reason !== null && choice.finish_reason !== undefined,
        ...(choice.finish_reason ? { done_reason: choice.finish_reason } : {}),
      }
    }
  }

  // ------------------------------------------------------------ ElevenLabs

  private async elevenLabsFetch(path: string, init?: RequestInit): Promise<Response> {
    const apiKey = await this.secret('voice.elevenLabsKey')
    if (!apiKey) throw new ConnectionError('A chave da ElevenLabs não foi configurada.')
    return this.elevenLabsFetchWith(apiKey, path, init)
  }

  private async elevenLabsFetchWith(apiKey: string, path: string, init?: RequestInit): Promise<Response> {
    let response: Response
    try {
      response = await fetch(`${ELEVENLABS_API}${path}`, {
        ...init,
        signal: AbortSignal.timeout(30_000),
        headers: { 'xi-api-key': apiKey, ...(init?.headers ?? {}) },
      })
    } catch {
      throw new ConnectionError('Não foi possível falar com a ElevenLabs. Verifique a internet.')
    }
    if (response.status === 401) throw new ConnectionError('A ElevenLabs recusou esta chave.')
    if (!response.ok) {
      logger.warn(`[ElevenLabs] ${path} respondeu ${response.status}`)
      throw new ConnectionError('A ElevenLabs não conseguiu atender ao pedido. Verifique seu plano e seus créditos.')
    }
    return response
  }

  async saveElevenLabsKey(apiKey: string) {
    await this.elevenLabsFetchWith(apiKey, '/v2/voices?page_size=1')
    await KVStore.setValue('voice.elevenLabsKey', encryption.encrypt(apiKey))
  }

  async removeElevenLabsKey() {
    await KVStore.clearValue('voice.elevenLabsKey')
    await KVStore.clearValue('voice.elevenLabsVoiceId')
    await KVStore.clearValue('voice.elevenLabsVoiceName')
    await KVStore.setValue('voice.enabled', false)
  }

  async listVoices() {
    const response = await this.elevenLabsFetch('/v2/voices?page_size=100&sort=name&sort_direction=asc')
    const data = (await response.json()) as {
      voices: Array<{
        voice_id: string
        name?: string
        preview_url?: string | null
        category?: string
        labels?: Record<string, string>
      }>
    }
    return data.voices.map((voice) => ({
      id: voice.voice_id,
      name: voice.name ?? voice.voice_id,
      previewUrl: voice.preview_url ?? null,
      category: voice.category ?? null,
      labels: voice.labels ?? {},
    }))
  }

  async setVoice(voiceId: string, voiceName: string) {
    await KVStore.setValue('voice.elevenLabsVoiceId', voiceId)
    await KVStore.setValue('voice.elevenLabsVoiceName', voiceName)
    await KVStore.setValue('voice.enabled', true)
  }

  async setVoiceEnabled(enabled: boolean) {
    await KVStore.setValue('voice.enabled', enabled)
  }

  /** Returns MP3 audio. Capped because every character spends the account's credits. */
  async speak(text: string): Promise<ArrayBuffer> {
    const voiceId = await KVStore.getValue('voice.elevenLabsVoiceId')
    if (!voiceId) throw new ConnectionError('Escolha uma voz primeiro.')
    const response = await this.elevenLabsFetch(
      `/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, MAX_SPEECH_CHARS), model_id: ELEVENLABS_MODEL }),
      }
    )
    return response.arrayBuffer()
  }
}
