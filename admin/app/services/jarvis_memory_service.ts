import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import JarvisMemory from '#models/jarvis_memory'
import KVStore from '#models/kv_store'
import { OllamaService } from '#services/ollama_service'
import { EMBEDDING_MODEL_NAME } from '../../constants/ollama.js'
import {
  EXTRACTION_PROMPT,
  EXTRACTION_SCHEMA,
  isSameMemory,
  isSensitive,
  mayContainMemory,
  parseExtraction,
  pickRelevant,
  similarity,
  type MemoryKind,
  type MemorySource,
} from '../utils/jarvis_memory.js'

const EXTRACTION_MAX_TOKENS = 200
const FORGET_SCORE = 0.6

/**
 * What Jarvis remembers between conversations. It stays in this system's own database, and the
 * person can read, correct and erase all of it on the Jarvis page.
 */
@inject()
export class JarvisMemoryService {
  constructor(private ollama: OllamaService) {}

  async isEnabled(): Promise<boolean> {
    return (await KVStore.getValue('jarvis.memoryEnabled')) ?? true
  }

  async setEnabled(enabled: boolean) {
    await KVStore.setValue('jarvis.memoryEnabled', enabled)
  }

  private async embed(text: string): Promise<number[] | null> {
    try {
      const { embeddings } = await this.ollama.embed(EMBEDDING_MODEL_NAME, [text])
      return embeddings[0] ?? null
    } catch (error) {
      logger.warn(`[JarvisMemory] Could not embed: ${error instanceof Error ? error.message : error}`)
      return null
    }
  }

  list() {
    return JarvisMemory.query().orderBy('created_at', 'desc')
  }

  /** Keeps one memory, replacing a saved one that says the same thing. */
  async add(kind: MemoryKind, content: string, source: MemorySource) {
    const embedding = await this.embed(content)
    const existing = await JarvisMemory.all()
    const same = existing.find(
      (memory) => (kind === 'name' && memory.kind === 'name') || isSameMemory(memory.embedding, embedding)
    )
    if (same) {
      same.merge({ kind, content, source, embedding })
      return same.save()
    }
    return JarvisMemory.create({ kind, content, source, embedding })
  }

  async remove(id: number): Promise<boolean> {
    const memory = await JarvisMemory.find(id)
    if (!memory) return false
    await memory.delete()
    return true
  }

  async clear() {
    await JarvisMemory.query().delete()
  }

  /** For "esqueça que eu moro em Piracicaba". Returns what was erased. */
  async forget(subject: string): Promise<string | null> {
    const question = await this.embed(subject)
    if (!question) return null
    const best = (await JarvisMemory.all())
      .filter((memory) => memory.embedding)
      .map((memory) => ({ memory, score: similarity(memory.embedding!, question) }))
      .sort((a, b) => b.score - a.score)[0]
    if (!best || best.score < FORGET_SCORE) return null
    await best.memory.delete()
    return best.memory.content
  }

  async relevantTo(question: string) {
    // A failure here costs the answer a little context, and must never cost the answer itself.
    try {
      if (!(await this.isEnabled())) return []
      const memories = await JarvisMemory.all()
      if (memories.length === 0) return []
      const picked = pickRelevant(memories, await this.embed(question))
      if (picked.length > 0) {
        await JarvisMemory.query()
          .whereIn('id', picked.map((memory) => memory.id))
          .update({ last_used_at: DateTime.now().toSQL({ includeOffset: false }) })
      }
      return picked
    } catch (error) {
      logger.warn(`[JarvisMemory] Could not read: ${error instanceof Error ? error.message : error}`)
      return []
    }
  }

  /** Runs after the answer: never makes anyone wait, and a failure only means nothing was saved. */
  async learnFrom(question: string, model: string, numCtx: number | undefined, keepAlive: string) {
    if (!mayContainMemory(question) || isSensitive(question) || !(await this.isEnabled())) return
    try {
      const response = await this.ollama.chat({
        model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: question },
        ],
        // The same as the answer's: a different size would make Ollama load the model all over again.
        numCtx,
        keepAlive,
        numPredict: EXTRACTION_MAX_TOKENS,
        temperature: 0,
        think: false,
        thinkingCapable: await this.ollama.checkModelHasThinking(model),
        format: EXTRACTION_SCHEMA,
      })
      for (const memory of parseExtraction(response.message.content)) {
        await this.add(memory.kind, memory.content, 'auto')
      }
    } catch (error) {
      logger.warn(`[JarvisMemory] Could not learn: ${error instanceof Error ? error.message : error}`)
    }
  }
}
