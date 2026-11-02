import { useState } from 'react'
import Alert from '~/components/Alert'
import StyledModal from '~/components/StyledModal'
import Input from '~/components/inputs/Input'
import { useNotifications } from '~/context/NotificationContext'
import { useModals } from '~/context/ModalContext'
import api from '~/lib/api'
import type { GpuHealthStatus } from '../../types/system'

const DISMISS_KEY = 'nomad:gpu-banner-dismissed'
const HSA_OVERRIDE_PATTERN = /^\d{1,2}\.\d{1,2}\.\d{1,2}$/

/**
 * Banner for gpuHealth.status === 'passthrough_failed'.
 *
 * NVIDIA, and AMD whose container differs from what a reinstall would create, get
 * the one-click reinstall. AMD whose container already matches gets an HSA override
 * prompt instead: reinstalling it rebuilds the same CPU-bound container (#1344).
 */
export default function GpuPassthroughAlert({
  gpuHealth,
  assistantName,
  className,
}: {
  gpuHealth: GpuHealthStatus | undefined
  assistantName: string
  className?: string
}) {
  const { addNotification } = useNotifications()
  const { openModal, closeAllModals } = useModals()
  const [reinstalling, setReinstalling] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true'
    } catch {
      return false
    }
  })

  if (gpuHealth?.status !== 'passthrough_failed' || dismissed) return null

  const isAmd = gpuHealth.gpuVendor === 'amd'
  const needsHsaOverride = isAmd && gpuHealth.amdReinstallWouldChange === false

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, 'true')
    } catch {}
  }

  const reinstall = async () => {
    setReinstalling(true)
    try {
      const response = await api.forceReinstallService('nomad_ollama')
      if (!response || !response.success) {
        throw new Error(response?.message || 'A reinstalação forçada falhou')
      }
      addNotification({
        message: `${assistantName} está sendo reinstalado com suporte a GPU. Esta página será recarregada em instantes.`,
        type: 'success',
      })
      try {
        localStorage.removeItem(DISMISS_KEY)
      } catch {}
      setTimeout(() => window.location.reload(), 5000)
    } catch (error) {
      addNotification({
        message: `Não foi possível reinstalar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        type: 'error',
      })
      setReinstalling(false)
    }
  }

  const openReinstallModal = () => {
    openModal(
      <StyledModal
        title={`Reinstalar ${assistantName}?`}
        onConfirm={() => {
          closeAllModals()
          reinstall()
        }}
        onCancel={closeAllModals}
        open={true}
        confirmText="Reinstalar"
        cancelText="Cancelar"
      >
        <p className="text-text-primary">
          Isso vai recriar o contêiner de {assistantName} com suporte a GPU ativado. Os modelos baixados são mantidos. O serviço fica indisponível por alguns instantes durante a reinstalação.
        </p>
      </StyledModal>,
      'gpu-health-force-reinstall-modal'
    )
  }

  const openHsaOverrideModal = () => {
    openModal(
      <HsaOverrideModal
        gpuHealth={gpuHealth}
        assistantName={assistantName}
        onCancel={closeAllModals}
        onSaved={() => {
          closeAllModals()
          reinstall()
        }}
      />,
      'gpu-health-hsa-override-modal'
    )
  }

  const vendorName = isAmd ? 'AMD' : 'NVIDIA'
  const message = needsHsaOverride
    ? `Seu sistema tem uma GPU AMD, mas ${assistantName} está rodando só na CPU. Reinstalar não resolve: a GPU${gpuHealth.amdGfxTarget ? ` (${gpuHealth.amdGfxTarget})` : ''} não está na lista de suporte do ROCm e precisa de uma substituição de versão GFX.`
    : `Seu sistema tem uma GPU ${vendorName}, mas ${assistantName} não consegue acessá-la. A IA está rodando só na CPU, o que é bem mais lento.`

  return (
    <Alert
      type="warning"
      variant="bordered"
      title={`GPU inacessível para ${assistantName}`}
      message={message}
      className={className}
      dismissible={true}
      onDismiss={handleDismiss}
      buttonProps={{
        children: needsHsaOverride ? 'Corrigir: definir substituição GFX' : `Corrigir: reinstalar ${assistantName}`,
        icon: needsHsaOverride ? 'IconTool' : 'IconRefresh',
        variant: 'action',
        size: 'sm',
        onClick: needsHsaOverride ? openHsaOverrideModal : openReinstallModal,
        loading: reinstalling,
        disabled: reinstalling,
      }}
    />
  )
}

function HsaOverrideModal({
  gpuHealth,
  assistantName,
  onCancel,
  onSaved,
}: {
  gpuHealth: GpuHealthStatus
  assistantName: string
  onCancel: () => void
  onSaved: () => void
}) {
  const { addNotification } = useNotifications()
  const [value, setValue] = useState(gpuHealth.suggestedHsaOverride ?? '')
  const [saving, setSaving] = useState(false)
  const valid = HSA_OVERRIDE_PATTERN.test(value.trim())

  const save = async () => {
    setSaving(true)
    try {
      const response = await api.updateSetting('ai.amdHsaOverride', value.trim())
      // catchInternal already notified on a request failure and returned undefined.
      if (!response) {
        setSaving(false)
        return
      }
      if (!response.success) throw new Error(response.message)
      onSaved()
    } catch (error) {
      addNotification({
        message: `Não foi possível salvar a substituição da GFX: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        type: 'error',
      })
      setSaving(false)
    }
  }

  return (
    <StyledModal
      title="Definir substituição GFX da AMD"
      onConfirm={save}
      onCancel={onCancel}
      open={true}
      confirmText="Salvar e reinstalar"
      cancelText="Cancelar"
      confirmLoading={saving}
      confirmDisabled={!valid || saving}
    >
      <div className="space-y-4 text-text-primary">
        <p>
          O ROCm traz kernels de GPU para uma lista fixa de chips AMD. GPUs Radeon integradas fora dessa lista rodam na CPU, a menos que o ROCm as trate como um chip compatível, o que é definido em HSA_OVERRIDE_GFX_VERSION.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Radeon 780M / 760M (gfx1103): 11.0.0</li>
          <li>Radeon 680M / 660M e outras iGPUs RDNA 2 (gfx1031 a gfx1036): 10.3.0</li>
        </ul>
        <p className="text-sm text-text-secondary">
          GPU detectada: {gpuHealth.amdGfxTarget ?? 'não informada pelo Ollama'}. Substituição atual:{' '}
          {gpuHealth.currentHsaOverride ?? 'none'}.
          {gpuHealth.suggestedHsaOverride
            ? ` Recomendado para esta GPU: ${gpuHealth.suggestedHsaOverride}.`
            : ''}
        </p>
        <Input
          name="amdHsaOverride"
          label="Substituição da versão GFX"
          placeholder="11.0.0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={value.trim() !== '' && !valid}
          helpText={`Salvar recria o contêiner de ${assistantName} com esta substituição. Os modelos baixados são mantidos.`}
        />
      </div>
    </StyledModal>
  )
}
