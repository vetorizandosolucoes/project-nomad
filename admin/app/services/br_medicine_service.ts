import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  hasSituation,
  medicinesForSituation,
  searchMedicines,
  type BrMedicine,
  type SubstanceGroup,
} from '../utils/br_medicines.js'
import { CONDITIONS_FILE } from '../data/conditions.js'
import { parseConditionsFile } from '../../util/conditions.js'

type MedicinesFile = { version: string; soldColumn: string; source: string; medicines: BrMedicine[] }

let cached: MedicinesFile | null = null

function load(): MedicinesFile {
  if (!cached) {
    const path = join(process.cwd(), 'collections', 'medicamentos_br.json')
    cached = JSON.parse(readFileSync(path, 'utf8')) as MedicinesFile
  }
  return cached
}

export type MedicineSituation = { slug: string; label: string; category: string }

/**
 * Medicines sold in Brazil, from the file bundled with the app. Kept in memory, not
 * in MySQL: it is small, read-only and has to work with nothing installed.
 */
export class BrMedicineService {
  all(): BrMedicine[] {
    return load().medicines
  }

  info() {
    const { version, soldColumn, source, medicines } = load()
    return { version, soldColumn, source, total: medicines.length }
  }

  search(query: string, filters: { type?: string } = {}) {
    return searchMedicines(this.all(), query, filters)
  }

  find(id: number): BrMedicine | null {
    return this.all().find((medicine) => medicine.id === id) ?? null
  }

  situations(): MedicineSituation[] {
    return parseConditionsFile(CONDITIONS_FILE)
      .conditions.filter((condition) => hasSituation(condition.slug))
      .map(({ slug, label, category }) => ({ slug, label, category }))
      .filter((situation) => this.forSituation(situation.slug).length > 0)
  }

  forSituation(slug: string): SubstanceGroup[] {
    return medicinesForSituation(this.all(), slug)
  }
}
