import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'jarvis_memories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('kind', 20).notNullable()
      table.text('content').notNullable()
      // 'user' when it was asked for in so many words, 'auto' when Jarvis noticed it.
      table.string('source', 10).notNullable()
      // There will only ever be hundreds of these, so comparing in memory is enough
      // and they stay out of the knowledge base's vector collection.
      table.text('embedding', 'mediumtext').nullable()
      table.timestamp('last_used_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
