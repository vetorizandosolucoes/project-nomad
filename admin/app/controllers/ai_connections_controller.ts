import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { AiConnectionsService, ConnectionError } from '#services/ai_connections_service'
import { JarvisService } from '#services/jarvis_service'
import { parseAiMode } from '../utils/ai_modes.js'

@inject()
export default class AiConnectionsController {
  constructor(
    private connections: AiConnectionsService,
    private jarvis: JarvisService
  ) {}

  /** Runs an action that talks to an online service, turning its failures into a 502. */
  private async guarded<T>(response: HttpContext['response'], action: () => Promise<T>) {
    try {
      return await action()
    } catch (error) {
      if (error instanceof ConnectionError) {
        return response.status(502).send({ message: error.message })
      }
      throw error
    }
  }

  async page({ inertia }: HttpContext) {
    return inertia.render('jarvis', { available: this.jarvis.isInstalled() })
  }

  async status() {
    const status = await this.connections.status()
    // Called by the home screen, so a change of connection also reaches the container.
    await this.jarvis.syncWithMode(status.effective)
    return { ...status, jarvisInstalled: this.jarvis.isInstalled() }
  }

  async setMode({ request }: HttpContext) {
    const mode = await this.connections.setMode(parseAiMode(request.input('mode')))
    await this.jarvis.syncWithMode(mode.effective)
    return mode
  }

  async saveOpenAiKey({ request, response }: HttpContext) {
    const key = String(request.input('key', '')).trim()
    if (!key) return response.status(422).send({ message: 'Cole a chave da OpenAI.' })
    return this.guarded(response, async () => ({ models: await this.connections.saveOpenAiKey(key) }))
  }

  async removeOpenAiKey() {
    await this.connections.removeOpenAiKey()
    return { success: true }
  }

  async openAiModels({ response }: HttpContext) {
    return this.guarded(response, async () => ({ models: await this.connections.listOpenAiModels() }))
  }

  async setOpenAiModel({ request, response }: HttpContext) {
    const model = String(request.input('model', '')).trim()
    if (!model) return response.status(422).send({ message: 'Escolha um modelo.' })
    await this.connections.setOpenAiModel(model)
    return { success: true }
  }

  async saveVoiceKey({ request, response }: HttpContext) {
    const key = String(request.input('key', '')).trim()
    if (!key) return response.status(422).send({ message: 'Cole a chave da ElevenLabs.' })
    return this.guarded(response, async () => {
      await this.connections.saveElevenLabsKey(key)
      return { success: true }
    })
  }

  async removeVoiceKey() {
    await this.connections.removeElevenLabsKey()
    return { success: true }
  }

  async voices({ response }: HttpContext) {
    return this.guarded(response, async () => ({ voices: await this.connections.listVoices() }))
  }

  async setVoice({ request, response }: HttpContext) {
    const id = String(request.input('id', '')).trim()
    const name = String(request.input('name', '')).trim()
    if (!id) return response.status(422).send({ message: 'Escolha uma voz.' })
    await this.connections.setVoice(id, name || id)
    return { success: true }
  }

  async setVoiceEnabled({ request }: HttpContext) {
    await this.connections.setVoiceEnabled(request.input('enabled') === true)
    return { success: true }
  }

  async speak({ request, response }: HttpContext) {
    const text = String(request.input('text', '')).trim()
    if (!text) return response.status(422).send({ message: 'Nada para falar.' })
    return this.guarded(response, async () => {
      const audio = await this.connections.speak(text)
      response.header('Content-Type', 'audio/mpeg')
      return response.send(Buffer.from(audio))
    })
  }

  async jarvisChat({ request, response }: HttpContext) {
    const messages = request.input('messages')
    if (!Array.isArray(messages) || messages.length === 0) {
      return response.status(422).send({ message: 'Envie uma mensagem.' })
    }
    return this.guarded(response, () => this.jarvis.chat(messages))
  }
}
