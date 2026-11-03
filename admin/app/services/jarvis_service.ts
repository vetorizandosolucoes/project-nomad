import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { AiConnectionsService, ConnectionError } from '#services/ai_connections_service'
import { DockerService } from '#services/docker_service'
import { JarvisMemoryService } from '#services/jarvis_memory_service'
import { OllamaService } from '#services/ollama_service'
import { RagPipelineService } from '#services/rag_pipeline_service'
import KVStore from '#models/kv_store'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js'
import type { OllamaChatMessage } from '../../types/ollama.js'
import {
  asksDateOrTime,
  cleanJarvisAnswer,
  CRISIS_OPENING,
  isSmallTalk,
  JARVIS_IDENTITY,
  keepChatRoles,
  pickJarvisModel,
  pickSpokenModel,
  spokenDate,
  spokenPrompt,
  urgentSpokenPrompt,
} from '../utils/jarvis.js'
import { hasRedFlag, hasSelfHarmRisk } from '../utils/health_lookup.js'
import { asksWhatItKnows, forgetCommand, isSensitive, memoryPrompt, rememberCommand } from '../utils/jarvis_memory.js'
import { greetingFor, normalizePersona, parsePersona, preferenceCommand, type Persona } from '../utils/jarvis_persona.js'
import { classifyLookup, lookUp, type LookupKind } from '../utils/web_lookup.js'
import { buildCitations } from '../utils/rag_prompt.js'
import type { EffectiveAiMode } from '../utils/ai_modes.js'

const CONTAINER_NAME = 'nomad_jarvis'
const CHAT_TIMEOUT_MS = 300_000
const MAX_ANSWER_TOKENS = 1024
const MAX_SPOKEN_ANSWER_TOKENS = 400
const MAX_SPOKEN_HISTORY = 12
const SPOKEN_TOP_K = 3
const RECENT_QUESTIONS_FOR_RISK = 3
// Loading a model takes 10 to 15 s, so it stays in memory during a conversation. Not much longer:
// it holds about 2 GB of RAM, and calling Jarvis starts loading it again before the first question.
const SPOKEN_KEEP_ALIVE = '5m'

export type TalkEvent =
  | { lookup: LookupKind }
  | { delta: string }
  | { done: true; model: string; sources: ReturnType<typeof buildCitations> }

/**
 * The Jarvis agent (OpenJarvis), running in its own container and reachable only from here.
 * The browser never sees its address or key. This side finds what the system knows and
 * hands it over as context, so the agent reasons on top of the local library.
 */
@inject()
export class JarvisService {
  constructor(
    private connections: AiConnectionsService,
    private docker: DockerService,
    private memory: JarvisMemoryService,
    private ollama: OllamaService,
    private pipeline: RagPipelineService
  ) {}

  isInstalled(): boolean {
    return !!process.env.JARVIS_URL && !!process.env.OPENJARVIS_API_KEY
  }

  private container() {
    return this.docker.docker.getContainer(CONTAINER_NAME)
  }

  /** Online it runs; offline it stops, because a process that isn't there uses no battery. */
  async syncWithMode(mode: EffectiveAiMode): Promise<void> {
    if (!this.isInstalled()) return
    try {
      const { State } = await this.container().inspect()
      if (mode === 'online' && !State.Running) await this.container().start()
      if (mode === 'offline' && State.Running) await this.container().stop()
    } catch (error) {
      logger.warn(`[Jarvis] Could not sync the container: ${error instanceof Error ? error.message : error}`)
    }
  }

  private async waitUntilHealthy(): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const healthy = await fetch(`${process.env.JARVIS_URL}/health`, { signal: AbortSignal.timeout(2000) })
        .then((response) => response.ok)
        .catch(() => false)
      if (healthy) return
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    throw new ConnectionError('O Jarvis não respondeu. Tente de novo em instantes.')
  }

  async persona(): Promise<Persona> {
    return parsePersona(await KVStore.getValue('jarvis.persona'))
  }

  async savePersona(value: unknown): Promise<Persona> {
    const persona = normalizePersona(value)
    await KVStore.setValue('jarvis.persona', JSON.stringify(persona))
    return persona
  }

  async greeting(): Promise<string | null> {
    const hour = Number(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit' }))
    return greetingFor(await this.persona(), hour)
  }

  /** What's said in so many words doesn't go through a model, so it can't be misunderstood. */
  private async memoryOrder(question: string): Promise<string | null> {
    const preference = preferenceCommand(question)
    if (preference) {
      await this.savePersona({ ...(await this.persona()), ...preference.patch })
      return preference.reply
    }
    const remember = rememberCommand(question)
    if (remember) {
      if (isSensitive(remember)) {
        return 'Isso eu prefiro não guardar sozinho. Se quiser mesmo, adicione na tela do Jarvis.'
      }
      await this.memory.add('fact', remember, 'user')
      return 'Pode deixar, vou lembrar disso.'
    }
    const forget = forgetCommand(question)
    if (forget) {
      const erased = await this.memory.forget(forget)
      return erased ? `Pronto, esqueci: ${erased}` : 'Não encontrei nada parecido na minha memória.'
    }
    if (asksWhatItKnows(question)) {
      const known = await this.memory.list().limit(8)
      return known.length > 0
        ? `O que eu lembro: ${known.map((memory) => memory.content).join(' ')}`
        : 'Ainda não guardei nada sobre você.'
    }
    return null
  }

  private async spokenModel(): Promise<string> {
    const installed = await this.ollama.getModels()
    const model = pickSpokenModel(installed.map((entry) => entry.name))
    if (!model) throw new ConnectionError('Nenhum modelo de IA instalado para o Jarvis.')
    return model
  }

  /** Called when the conversation opens, so the first answer doesn't wait for the model to load. */
  async warmUp() {
    const model = await this.spokenModel()
    // With a different context size Ollama would load the model all over again for the question.
    const { numCtx } = await this.pipeline.buildPrompt([{ role: 'user', content: '' }], model, { skipRetrieval: true })
    const stream = await this.ollama.chatStream({
      model,
      messages: [],
      think: false,
      thinkingCapable: await this.ollama.checkModelHasThinking(model),
      numCtx,
      keepAlive: SPOKEN_KEEP_ALIVE,
    })
    for await (const _ of stream) {
      // Only the loading matters.
    }
  }

  /**
   * The spoken conversation goes straight to the model, without the agent: its loop and the
   * model's reasoning were what kept people waiting. It streams, so speech can start at once.
   */
  async *talk(rawMessages: unknown[], signal: AbortSignal): AsyncGenerator<TalkEvent> {
    const { effective } = await this.connections.mode()
    if (effective !== 'online') {
      throw new ConnectionError('No modo Offline, o Jarvis fica desligado para poupar bateria. Use o Assistente de IA.')
    }

    const conversation = keepChatRoles(rawMessages).slice(-MAX_SPOKEN_HISTORY)
    const questions = conversation.filter((message) => message.role === 'user').map((message) => message.content)
    const question = questions.at(-1) ?? ''
    const now = new Date()

    // A crisis doesn't end with the sentence that revealed it, so recent questions count too.
    const crisis = questions.slice(-RECENT_QUESTIONS_FOR_RISK).some(hasSelfHarmRisk)
    const urgent = crisis || hasRedFlag(question)
    const model = await this.spokenModel()

    if (!urgent) {
      const order = await this.memoryOrder(question)
      if (order) {
        yield { delta: order }
        yield { done: true, model, sources: [] }
        return
      }
    }

    const system: OllamaChatMessage[] = [
      { role: 'system', content: urgent ? urgentSpokenPrompt(now) : spokenPrompt(now, await this.persona()) },
    ]
    if (!urgent) {
      const remembered = memoryPrompt(await this.memory.relevantTo(question))
      if (remembered) system.push({ role: 'system', content: remembered })
    }
    if (hasSelfHarmRisk(question)) yield { delta: CRISIS_OPENING }

    // Small models only obey what sits right next to the question.
    if (asksDateOrTime(question)) {
      conversation[conversation.length - 1] = {
        role: 'user',
        content: `${question}\n\n[${spokenDate(now)} Responda com esta informação.]`,
      }
    }

    const kind = urgent ? null : classifyLookup(question)
    if (kind) {
      yield { lookup: kind }
      system.push({ role: 'system', content: await lookUp(kind, question) })
    }

    const ragEnabled = (await KVStore.getValue('rag.enabled')) ?? true
    const trace = await this.pipeline.buildPrompt([...system, ...conversation] as OllamaChatMessage[], model, {
      // Live data answers a lookup, and passages from the library would only get in its way.
      skipRetrieval: !urgent && (!ragEnabled || !!kind || isSmallTalk(question)),
      skipQueryRewrite: true,
      relevanceCheckModel: null,
      topK: SPOKEN_TOP_K,
    })
    const sources = buildCitations(trace.injected)

    const cloudModel = await this.connections.usableCloudModel()
    let usedModel = model
    let answered = false
    if (cloudModel) {
      try {
        const stream = this.connections.streamOpenAi(cloudModel, trace.messages as ChatCompletionMessageParam[], signal)
        for await (const chunk of stream) {
          if (!chunk.message.content) continue
          answered = true
          usedModel = cloudModel
          yield { delta: chunk.message.content }
        }
      } catch (error) {
        if (signal.aborted || answered) throw error
        logger.warn(`[Jarvis] GPT failed, using the local model: ${error instanceof Error ? error.message : error}`)
      }
    }

    if (!answered) {
      const stream = await this.ollama.chatStream({
        model,
        messages: trace.messages as ChatCompletionMessageParam[],
        think: false,
        thinkingCapable: await this.ollama.checkModelHasThinking(model),
        numCtx: trace.numCtx,
        numPredict: MAX_SPOKEN_ANSWER_TOKENS,
        keepAlive: SPOKEN_KEEP_ALIVE,
        signal,
      })
      for await (const chunk of stream) {
        if (chunk.message.content) yield { delta: chunk.message.content }
      }
    }
    yield { done: true, model: usedModel, sources }

    if (!crisis && !urgent) void this.memory.learnFrom(question, model, trace.numCtx, SPOKEN_KEEP_ALIVE)
  }

  async chat(rawMessages: unknown[]) {
    if (!this.isInstalled()) throw new ConnectionError('O Jarvis não está instalado neste sistema.')

    const { effective } = await this.connections.mode()
    if (effective !== 'online') {
      throw new ConnectionError('No modo Offline, o Jarvis fica desligado para poupar bateria. Use o Assistente de IA.')
    }

    const installed = await this.ollama.getModels()
    const model = pickJarvisModel(installed.map((entry) => entry.name))
    if (!model) throw new ConnectionError('Nenhum modelo de IA instalado para o Jarvis.')

    const ragEnabled = (await KVStore.getValue('rag.enabled')) ?? true
    const trace = await this.pipeline.buildPrompt(keepChatRoles(rawMessages) as OllamaChatMessage[], model, {
      skipRetrieval: !ragEnabled,
    })
    const messages = [{ role: 'system', content: JARVIS_IDENTITY }, ...trace.messages]

    await this.syncWithMode('online')
    await this.waitUntilHealthy()

    let response: Response
    try {
      response = await fetch(`${process.env.JARVIS_URL}/v1/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENJARVIS_API_KEY}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: MAX_ANSWER_TOKENS }),
      })
    } catch (error) {
      logger.warn(`[Jarvis] Request failed: ${error instanceof Error ? error.message : error}`)
      throw new ConnectionError('O Jarvis demorou demais para responder.')
    }
    if (!response.ok) {
      logger.warn(`[Jarvis] Responded ${response.status}`)
      throw new ConnectionError('O Jarvis não conseguiu responder agora.')
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return {
      content: cleanJarvisAnswer(data.choices?.[0]?.message?.content ?? ''),
      model,
      sources: buildCitations(trace.injected),
    }
  }
}
