import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class DocsReindex extends BaseCommand {
  static commandName = 'docs:reindex'
  static description = 'Replace the indexed copy of the bundled docs in the knowledge base'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { RagService } = await import('#services/rag_service')
    const ragService = await this.app.container.make(RagService)
    const result = await ragService.reindexNomadDocs()

    if (result.success) {
      this.logger.success(result.message)
    } else {
      this.logger.error(result.message)
    }
    // The queue connections opened to dispatch the jobs would keep the process alive.
    process.exit(result.success ? 0 : 1)
  }
}
