import { DateTime } from 'luxon'
import { BaseModel, column, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { MemoryKind, MemorySource } from '../utils/jarvis_memory.js'

export default class JarvisMemory extends BaseModel {
  static table = 'jarvis_memories'
  static namingStrategy = new SnakeCaseNamingStrategy()

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare kind: MemoryKind

  @column()
  declare content: string

  @column()
  declare source: MemorySource

  @column({
    serializeAs: null,
    prepare: (value: number[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? (JSON.parse(value) as number[]) : null),
  })
  declare embedding: number[] | null

  @column.dateTime()
  declare last_used_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
}
