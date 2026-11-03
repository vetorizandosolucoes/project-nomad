import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import classNames from '~/lib/classNames'
import type { AiMode, EffectiveAiMode } from '../../app/utils/ai_modes'

export type AiStatus = {
  mode: AiMode
  effective: EffectiveAiMode
  hasInternet: boolean
  jarvisInstalled: boolean
  openai: { configured: boolean; model: string | null }
  voice: { configured: boolean; enabled: boolean; voiceId: string | null; voiceName: string | null; wakeEnabled: boolean }
}

export const AI_STATUS_KEY = ['ai-status']

export async function aiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/ai${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message ?? 'Não foi possível concluir.')
  return data
}

export function useAiStatus() {
  return useQuery({
    queryKey: AI_STATUS_KEY,
    queryFn: () => aiRequest<AiStatus>('GET', '/status'),
    refetchInterval: 60_000,
  })
}

const OPTIONS: Array<{ value: AiMode; label: string; hint: string }> = [
  { value: 'auto', label: 'Automático', hint: 'Máximo com internet, econômico sem ela' },
  { value: 'online', label: 'Online', hint: 'Capacidade máxima' },
  { value: 'offline', label: 'Offline', hint: 'Menor consumo de bateria' },
]

export default function AiModeSwitch() {
  const queryClient = useQueryClient()
  const { data: status } = useAiStatus()
  const setMode = useMutation({
    mutationFn: (mode: AiMode) => aiRequest('PUT', '/mode', { mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_STATUS_KEY })
      queryClient.invalidateQueries({ queryKey: ['installedModels'] })
    },
  })

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm" role="group" aria-label="Modo da IA">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.hint}
          aria-pressed={status?.mode === option.value}
          disabled={setMode.isPending}
          onClick={() => setMode.mutate(option.value)}
          className={classNames(
            'row-link rounded-md px-2.5 py-1',
            status?.mode === option.value
              ? 'bg-desert-green text-white'
              : 'text-text-secondary hover:bg-desert-green-lighter/60'
          )}
        >
          {option.label}
        </button>
      ))}
      {status && (
        <span className="ml-2 text-text-muted">
          {status.effective === 'online' ? 'Agora: capacidade máxima' : 'Agora: economia de bateria'}
        </span>
      )}
    </div>
  )
}
