import type { HttpContext } from '@adonisjs/core/http'
import { BrMedicineService } from '#services/br_medicine_service'

export default class MedicinesController {
  private service = new BrMedicineService()

  async index({ inertia }: HttpContext) {
    return inertia.render('medicines/index', {
      situations: this.service.situations(),
      info: this.service.info(),
    })
  }

  async show({ inertia, params, response }: HttpContext) {
    const medicine = this.service.find(Number(params.id))
    if (!medicine) return response.redirect('/medicamentos')
    return inertia.render('medicines/show', { medicine, info: this.service.info() })
  }

  async search({ request }: HttpContext) {
    const query = String(request.input('q', '')).slice(0, 100)
    const type = String(request.input('type', '')).slice(0, 40)
    return this.service.search(query, type ? { type } : {})
  }

  async situation({ params }: HttpContext) {
    return { groups: this.service.forSituation(String(params.slug)) }
  }
}
