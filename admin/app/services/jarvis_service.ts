import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { AiConnectionsService, ConnectionError } from '#services/ai_connections_service'
import { DockerService } from '#services/docker_service'
import { OllamaService } from '#services/ollama_service'
import { RagPipelineService } from '#services/rag_pipeline_service'
import KVStore from '#models/kv_store'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js'
import type { OllamaChatMessage } from '../../types/ollama.js'
import { cleanJarvisAnswer, jarvisSystemPrompt, keepChatRoles, pickJarvisModel } from '../utils/jarvis.js'
import { buildCitations } from '../utils/rag_prompt.js'
import type { EffectiveAiMode } from '../utils/ai_modes.js'

const CONTAINER_NAME = 'nomad_jarvis'
const CHAT_TIMEOUT_MS = 300_000
const MAX_ANSWER_TOKENS = 1024
const MAX_SPOKEN_ANSWER_TOKENS = 500

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

  /** A spoken conversation can't wait on a local model, so it uses GPT when there is a key. */
  private async askCloud(messages: Array<{ role: string; content: string }>): Promise<{ content: string; model: string } | null> {
    const model = await this.connections.usableCloudModel()
    if (!model) return null
    try {
      let content = ''
      for await (const chunk of this.connections.streamOpenAi(model, messages as ChatCompletionMessageParam[])) {
        content += chunk.message.content
      }
      return content.trim() ? { content: content.trim(), model } : null
    } catch (error) {
      logger.warn(`[Jarvis] GPT failed, using the local model: ${error instanceof Error ? error.message : error}`)
      return null
    }
  }

  async chat(rawMessages: unknown[], { spoken = false }: { spoken?: boolean } = {}) {
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
    const messages = [{ role: 'system', content: jarvisSystemPrompt(spoken) }, ...trace.messages]
    const sources = buildCitations(trace.injected)

    if (spoken) {
      const answer = await this.askCloud(messages)
      if (answer) return { ...answer, sources }
    }

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
        body: JSON.stringify({ model, messages, max_tokens: spoken ? MAX_SPOKEN_ANSWER_TOKENS : MAX_ANSWER_TOKENS }),
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
      sources,
    }
  }
}
