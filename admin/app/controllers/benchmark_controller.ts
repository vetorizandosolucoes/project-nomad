import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { BenchmarkService } from '#services/benchmark_service'
import { runBenchmarkValidator, submitBenchmarkValidator } from '#validators/benchmark'
import { RunBenchmarkJob } from '#jobs/run_benchmark_job'
import type { BenchmarkType } from '../../types/benchmark.js'
import { randomUUID } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class BenchmarkController {
  constructor(private benchmarkService: BenchmarkService) {}

  /**
   * Start a benchmark run (async via job queue, or sync if specified)
   */
  async run({ request, response }: HttpContext) {
    const payload = await request.validateUsing(runBenchmarkValidator)
    const benchmarkType: BenchmarkType = payload.benchmark_type || 'full'
    const runSync = request.input('sync') === 'true' || request.input('sync') === true

    // Check if a benchmark is already running
    const status = this.benchmarkService.getStatus()
    if (status.status !== 'idle') {
      return response.status(409).send({
        success: false,
        error: 'Já há um benchmark em execução',
        current_benchmark_id: status.benchmarkId,
      })
    }

    // Run synchronously if requested (useful for local dev without Redis)
    if (runSync) {
      try {
        let result
        switch (benchmarkType) {
          case 'full':
            result = await this.benchmarkService.runFullBenchmark()
            break
          case 'system':
            result = await this.benchmarkService.runSystemBenchmarks()
            break
          case 'ai':
            result = await this.benchmarkService.runAIBenchmark()
            break
          default:
            result = await this.benchmarkService.runFullBenchmark()
        }
        return response.send({
          success: true,
          benchmark_id: result.benchmark_id,
          nomad_score: result.nomad_score,
          result,
        })
      } catch (error) {
        logger.error({ err: error }, '[BenchmarkController] Benchmark run failed')
        return response.status(500).send({
          success: false,
          error: 'Ocorreu um erro interno ao executar o benchmark.',
        })
      }
    }

    // Generate benchmark ID and dispatch job (async)
    const benchmarkId = randomUUID()
    const { job, created } = await RunBenchmarkJob.dispatch({
      benchmark_id: benchmarkId,
      benchmark_type: benchmarkType,
      include_ai: benchmarkType === 'full' || benchmarkType === 'ai',
    })

    return response.status(201).send({
      success: true,
      job_id: job?.id || benchmarkId,
      benchmark_id: benchmarkId,
      message: created
        ? `Benchmark ${benchmarkType} iniciado`
        : 'Essa tarefa de benchmark já existe',
    })
  }

  /**
   * Run a system-only benchmark (CPU, memory, disk)
   */
  async runSystem({ response }: HttpContext) {
    const status = this.benchmarkService.getStatus()
    if (status.status !== 'idle') {
      return response.status(409).send({
        success: false,
        error: 'Já há um benchmark em execução',
      })
    }

    const benchmarkId = randomUUID()
    await RunBenchmarkJob.dispatch({
      benchmark_id: benchmarkId,
      benchmark_type: 'system',
      include_ai: false,
    })

    return response.status(201).send({
      success: true,
      benchmark_id: benchmarkId,
      message: 'Benchmark do sistema iniciado',
    })
  }

  /**
   * Run an AI-only benchmark
   */
  async runAI({ response }: HttpContext) {
    const status = this.benchmarkService.getStatus()
    if (status.status !== 'idle') {
      return response.status(409).send({
        success: false,
        error: 'Já há um benchmark em execução',
      })
    }

    const benchmarkId = randomUUID()
    await RunBenchmarkJob.dispatch({
      benchmark_id: benchmarkId,
      benchmark_type: 'ai',
      include_ai: true,
    })

    return response.status(201).send({
      success: true,
      benchmark_id: benchmarkId,
      message: 'Benchmark de IA iniciado',
    })
  }

  /**
   * Get all benchmark results
   */
  async results({}: HttpContext) {
    const results = await this.benchmarkService.getAllResults()
    return {
      results,
      total: results.length,
    }
  }

  /**
   * Get the latest benchmark result
   */
  async latest({}: HttpContext) {
    const result = await this.benchmarkService.getLatestResult()
    if (!result) {
      return { result: null }
    }
    return { result }
  }

  /**
   * Get a specific benchmark result by ID
   */
  async show({ params, response }: HttpContext) {
    const result = await this.benchmarkService.getResultById(params.id)
    if (!result) {
      return response.status(404).send({
        error: 'Resultado do benchmark não encontrado',
      })
    }
    return { result }
  }

  /**
   * Submit benchmark results to central repository
   */
  async submit({ request, response }: HttpContext) {
    const payload = await request.validateUsing(submitBenchmarkValidator)
    const anonymous = request.input('anonymous') === true || request.input('anonymous') === 'true'

    try {
      const submitResult = await this.benchmarkService.submitToRepository(payload.benchmark_id, anonymous)
      return response.send({
        success: true,
        repository_id: submitResult.repository_id,
        percentile: submitResult.percentile,
      })
    } catch (error) {
      // Pass through the status code from the service if available, otherwise default to 400
      const statusCode = (error as any).statusCode || 400
      logger.error({ err: error }, '[BenchmarkController] Benchmark submit failed')

      // Surface a clear, actionable reason to the UI instead of a generic failure.
      // The rate limiter (429) is the most common cause, so name it explicitly;
      // otherwise pass through the underlying detail (repository error or a service
      // validation message) and fall back to a safe generic only when we have none.
      let errorMessage: string
      if (statusCode === 429) {
        errorMessage = 'You can only submit one benchmark per hour. Please wait a bit and try again.'
      } else {
        errorMessage =
          (error as any).detail || (error as any).message || 'Failed to submit benchmark results.'
      }

      return response.status(statusCode).send({
        success: false,
        error: errorMessage,
      })
    }
  }

  /**
   * Update builder tag for a benchmark result
   */
  async updateBuilderTag({ request, response }: HttpContext) {
    const benchmarkId = request.input('benchmark_id')
    const builderTag = request.input('builder_tag')

    if (!benchmarkId) {
      return response.status(400).send({
        success: false,
        error: 'benchmark_id is required',
      })
    }

    const result = await this.benchmarkService.getResultById(benchmarkId)
    if (!result) {
      return response.status(404).send({
        success: false,
        error: 'Resultado do benchmark não encontrado',
      })
    }

    // Validate builder tag format if provided
    if (builderTag) {
      const tagPattern = /^[A-Za-z]+-[A-Za-z]+-\d{4}$/
      if (!tagPattern.test(builderTag)) {
        return response.status(400).send({
          success: false,
          error: 'Formato de tag inválido. Esperado: Palavra-Palavra-0000',
        })
      }
    }

    result.builder_tag = builderTag || null
    await result.save()

    return response.send({
      success: true,
      builder_tag: result.builder_tag,
    })
  }

  /**
   * Get comparison stats from central repository
   */
  async comparison({}: HttpContext) {
    const stats = await this.benchmarkService.getComparisonStats()
    return { stats }
  }

  /**
   * Get current benchmark status
   */
  async status({}: HttpContext) {
    return this.benchmarkService.getStatus()
  }

  /**
   * Whether to show the dashboard "re-run under Score v2" banner
   */
  async rerunBanner({}: HttpContext) {
    return { show: await this.benchmarkService.shouldShowRerunBanner() }
  }

  /**
   * Get benchmark settings
   */
  async settings({}: HttpContext) {
    const { default: BenchmarkSetting } = await import('#models/benchmark_setting')
    return await BenchmarkSetting.getAllSettings()
  }

  /**
   * Update benchmark settings
   */
  async updateSettings({ request, response }: HttpContext) {
    const { default: BenchmarkSetting } = await import('#models/benchmark_setting')
    const body = request.body()

    if (body.allow_anonymous_submission !== undefined) {
      await BenchmarkSetting.setValue(
        'allow_anonymous_submission',
        body.allow_anonymous_submission ? 'true' : 'false'
      )
    }

    return response.send({
      success: true,
      settings: await BenchmarkSetting.getAllSettings(),
    })
  }
}
