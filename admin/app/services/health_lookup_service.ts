import logger from '@adonisjs/core/services/logger'
import { BrMedicineService } from '#services/br_medicine_service'
import { ConditionService } from '#services/condition_service'
import type { RetrievedChunk } from '../../types/rag.js'
import { affirmativeRemediesEnabled } from '../utils/affirmative_remedies.js'
import {
  groupBySubstance,
  medicinesForSituation,
  medicinesNamedIn,
  preferSingleSubstances,
  tarjaLabel,
  type SubstanceGroup,
} from '../utils/br_medicines.js'
import {
  asksAboutMedicine,
  excerpt,
  hasRedFlag,
  hasSelfHarmRisk,
  matchConditionSlugs,
} from '../utils/health_lookup.js'

const MAX_SUBSTANCES = 5
const MAX_PRODUCT_EXAMPLES = 6

export type HealthLookupResult = { chunks: RetrievedChunk[]; urgency: 'none' | 'medical' | 'self-harm' }

/**
 * Finds the medicines sold in Brazil that bear on a question, so the chat can answer
 * from them instead of only from the vector search, which can't reach them. Returns
 * null for questions that aren't about health.
 */
export class HealthLookupService {
  private medicines = new BrMedicineService()
  private conditionService = new ConditionService()

  async lookup(question: string, previousQuestions: string[] = []): Promise<HealthLookupResult | null> {
    if (hasSelfHarmRisk(question)) return { chunks: [], urgency: 'self-harm' }
    if (hasRedFlag(question)) return { chunks: [], urgency: 'medical' }

    const all = this.medicines.all()
    const named = preferSingleSubstances(
      medicinesNamedIn(all, question, { includeProductNames: asksAboutMedicine(question) })
    )

    let slugs = matchConditionSlugs(question)
    // "qual analgésico?" after "estou com dor de cabeça" is about the headache.
    if (slugs.length === 0 || (slugs.length === 1 && slugs[0] === 'pain')) {
      const earlier = matchConditionSlugs(previousQuestions.join(' ')).filter((slug) => slug !== 'pain')
      if (earlier.length > 0) slugs = earlier
    }

    if (named.length === 0 && slugs.length === 0) return null

    const groups = named.length > 0 ? groupBySubstance(named) : medicinesForSituation(all, slugs[0])
    const chunks = groups.slice(0, MAX_SUBSTANCES).map((group) => this.substanceChunk(group))
    if (slugs.length > 0) {
      const remedies = await this.remediesChunk(slugs[0])
      if (remedies) chunks.push(remedies)
    }
    return { chunks, urgency: 'none' }
  }

  private substanceChunk(group: SubstanceGroup): RetrievedChunk {
    const substance = group.substance.replace(/;/g, ' + ')
    const names = [...new Set(group.products.map((product) => product.name))]
    const types = [...new Set(group.products.map((product) => product.type))]
    return {
      text: [
        `Princípio ativo: ${substance}.`,
        `Tarja: ${tarjaLabel(group.tarja)}.`,
        `Tipos à venda: ${types.join(', ')}.`,
        `Exemplos de produtos comercializados no Brasil: ${names.slice(0, MAX_PRODUCT_EXAMPLES).join(', ')}.`,
      ].join(' '),
      score: 1,
      metadata: {
        article_title: `Medicamentos no Brasil: ${substance}`,
        archive_date: this.medicines.info().version,
        source: `/medicamentos?q=${encodeURIComponent(group.substance.split(';')[0])}`,
      },
    }
  }

  /** Stays behind the same gate as the rest of the app: unreviewed guidance is opt-in. */
  private async remediesChunk(slug: string): Promise<RetrievedChunk | null> {
    if (!(await affirmativeRemediesEnabled())) return null

    const remedies = this.conditionService
      .listRemedies()
      .filter((remedy) => remedy.conditions.includes(slug))
      .sort((a, b) => Number(b.kind === 'self-care') - Number(a.kind === 'self-care'))
      .slice(0, 3)
    if (remedies.length === 0) return null

    const text = remedies
      .map((remedy) =>
        [
          `${remedy.name}: ${excerpt(remedy.uses, 180)}`,
          remedy.how && `Como: ${excerpt(remedy.how, 140)}`,
          remedy.cautions && `Cuidados: ${excerpt(remedy.cautions, 160)}`,
        ]
          .filter(Boolean)
          .join(' ')
      )
      .join('\n')
    return {
      text,
      score: 1,
      metadata: { article_title: 'Remédios caseiros e naturais', source: '/medicamentos' },
    }
  }

  /** Never lets a lookup problem take the chat down with it. */
  async lookupSafely(question: string, previousQuestions: string[] = []): Promise<HealthLookupResult | null> {
    try {
      return await this.lookup(question, previousQuestions)
    } catch (error) {
      logger.warn(`[HealthLookup] Lookup failed: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }
}
