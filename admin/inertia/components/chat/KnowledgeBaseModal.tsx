import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import FileUploader from '~/components/file-uploader'
import StyledButton from '~/components/StyledButton'
import type { DynamicIconName } from '~/lib/icons'
import StyledSectionHeader from '~/components/StyledSectionHeader'
import StyledTable from '~/components/StyledTable'
import { useNotifications } from '~/context/NotificationContext'
import api from '~/lib/api'
import {
  groupAndSortKbFiles,
  UNCATEGORIZED_COLLECTION_KEY,
  type KbFileGroup,
  type KbFileSort,
  type KbFileSortKey,
} from '~/lib/kb_file_grouping'
import type { KbIngestStateValue } from '../../../types/kb_ingest_state'
import { formatBytes } from '~/lib/util'
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconEye,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from '@tabler/icons-react'
import { useModals } from '~/context/ModalContext'
import StyledModal from '../StyledModal'
import ActiveEmbedJobs from '~/components/ActiveEmbedJobs'
import { SERVICE_NAMES } from '../../../constants/service_names'
import CollectionsManager from './CollectionsManager'
import { KB_COLLECTIONS } from '../../../constants/kb_collections'
import CollectionCombobox from './CollectionCombobox'
import Switch from '~/components/inputs/Switch'

interface KnowledgeBaseModalProps {
  aiAssistantName?: string
  onClose: () => void
}

// File extensions the in-browser viewer can render. Must stay in sync with
// `RagService.VIEWABLE_TEXT_EXTENSIONS` -- anything outside this set falls back
// to Download.
const VIEWABLE_EXTENSIONS = new Set([
  'md',
  'txt',
  'csv',
  'json',
  'yaml',
  'yml',
  'toml',
  'xml',
  'html',
])

function isViewableExtension(filename: string): boolean {
  const ext = filename.split('.').at(-1)?.toLowerCase() ?? ''
  return VIEWABLE_EXTENSIONS.has(ext)
}

function renderSortHeader(
  label: string,
  key: KbFileSortKey,
  sort: KbFileSort,
  setSort: (s: KbFileSort) => void
): React.ReactNode {
  const active = sort.key === key
  const Icon = !active
    ? IconArrowsSort
    : sort.direction === 'asc'
      ? IconSortAscending
      : IconSortDescending
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-left hover:text-text-primary transition-colors"
      onClick={() => {
        if (!active) {
          setSort({ key, direction: 'asc' })
        } else {
          setSort({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
        }
      }}
    >
      <span>{label}</span>
      <Icon
        size={14}
        className={active ? 'text-text-primary' : 'text-text-muted'}
        aria-hidden="true"
      />
    </button>
  )
}

/**
 * Compact label for the per-row ingestion state. Files that exist in Qdrant
 * with no `kb_ingest_state` row (`state === null`) are legacy/pre-RFC-883
 * installs whose chunks are real, so we display them as "Indexed" rather than
 * surfacing the absent-row detail. Admin-docs group has no pill (the "Managed
 * by NOMAD" message in the action column carries the same signal).
 */
function renderStatePill(record: KbFileGroup): React.ReactNode {
  if (record.bucket === 'admin_docs') return null
  const effective: KbIngestStateValue = record.state ?? 'indexed'

  const base = 'inline-flex items-center text-xs font-medium rounded px-2 py-0.5 border'
  switch (effective) {
    case 'indexed':
      return (
        <span
          className={`${base} text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/40 dark:border-green-800`}
        >
          Indexado
        </span>
      )
    case 'pending_decision':
    case 'browse_only':
      return (
        <span className={`${base} text-text-secondary bg-surface-secondary border-border-subtle`}>
          Não indexado
        </span>
      )
    case 'failed':
      return (
        <span
          className={`${base} text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800`}
        >
          Falhou
        </span>
      )
    case 'stalled':
      return (
        <span
          className={`${base} text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800`}
        >
          Travado
        </span>
      )
  }
}

type RowAction =
  | { kind: 'index'; label: string; force: boolean; variant: 'primary'; icon: DynamicIconName }
  | { kind: 'reembed'; label: string; force: true; variant: 'secondary'; icon: DynamicIconName }

/**
 * Pick the single adaptive per-row action button. Returns null when no action
 * makes sense for the current state (e.g. healthy indexed file with no
 * warnings -- bulk Re-embed All covers that case). `hasWarnings` lets us
 * surface a Re-embed affordance specifically when a file *looks* indexed but
 * has zero chunks or a stalled-mid-ingestion warning attached.
 */
function pickRowAction(record: KbFileGroup, hasWarnings: boolean): RowAction | null {
  if (record.bucket === 'admin_docs') return null
  const effective: KbIngestStateValue = record.state ?? 'indexed'
  switch (effective) {
    case 'indexed':
      return hasWarnings
        ? {
            kind: 'reembed',
            label: 'Recalcular',
            force: true,
            variant: 'secondary',
            icon: 'IconRefreshAlert',
          }
        : null
    case 'pending_decision':
      return {
        kind: 'index',
        label: 'Indexar',
        force: false,
        variant: 'primary',
        icon: 'IconDownload',
      }
    case 'browse_only':
      return {
        kind: 'index',
        label: 'Indexar',
        force: true,
        variant: 'primary',
        icon: 'IconDownload',
      }
    case 'failed':
    case 'stalled':
      return { kind: 'index', label: 'Tentar novamente', force: true, variant: 'primary', icon: 'IconRefresh' }
  }
}

export default function KnowledgeBaseModal({
  aiAssistantName = 'Assistente de IA',
  onClose,
}: KnowledgeBaseModalProps) {
  const { addNotification } = useNotifications()
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadCollection, setUploadCollection] = useState<string>('')
  const [collectionFilter, setCollectionFilter] = useState<string>('All')
  const [manageCollectionsOpen, setManageCollectionsOpen] = useState(false)
  const [confirmDeleteSource, setConfirmDeleteSource] = useState<string | null>(null)
  const [confirmReembed, setConfirmReembed] = useState<{
    source: string
    displayName: string
  } | null>(null)
  const [bulkMode, setBulkMode] = useState<null | 'reembed' | 'reset'>(null)
  const [resetTyped, setResetTyped] = useState('')
  const [sort, setSort] = useState<KbFileSort>({ key: 'name', direction: 'asc' })
  // KB-collection group keys (see UNCATEGORIZED_COLLECTION_KEY) whose member
  // files are currently expanded into individual rows. Collapsed by default
  // so grouping actually declutters the panel.
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [viewerSource, setViewerSource] = useState<string | null>(null)
  const fileUploaderRef = useRef<React.ComponentRef<typeof FileUploader>>(null)
  const { openModal, closeModal } = useModals()
  const queryClient = useQueryClient()

  const [isStartingQdrant, setIsStartingQdrant] = useState(false)

  const { data: healthStatus } = useQuery({
    queryKey: ['qdrantHealth'],
    queryFn: () => api.checkRAGHealth(),
    refetchInterval: isStartingQdrant ? 3_000 : 30_000,
  })
  const qdrantOffline = healthStatus?.online === false

  useEffect(() => {
    if (!qdrantOffline) setIsStartingQdrant(false)
  }, [qdrantOffline])

  const { data: storedFiles = [], isLoading: isLoadingFiles } = useQuery({
    queryKey: ['storedFiles'],
    queryFn: () => api.getStoredRAGFiles(),
    select: (data) => data || [],
  })

  const { data: knownCollections = [] } = useQuery({
    queryKey: ['kbCollections'],
    queryFn: () => api.getKnowledgeCollections(),
    select: (data) => data?.collections ?? [],
  })

  const comboboxOptions = useMemo(() => {
    return Array.from(new Set([...KB_COLLECTIONS, ...knownCollections])).sort()
  }, [knownCollections])

  // Per-file conditional warnings (RFC #883 section 6). `ok: false` means the
  // computation itself failed (Qdrant/DB/FS) -- distinct from `ok: true` with
  // an empty map, which means everything is healthy. We surface the failure
  // explicitly so a silent backend failure doesn't masquerade as health.
  const { data: warningsResult } = useQuery({
    queryKey: ['kbFileWarnings'],
    queryFn: () => api.getKbFileWarnings(),
    refetchInterval: 30_000,
  })
  const fileWarnings = warningsResult?.warnings ?? {}
  const warningsUnavailable = warningsResult !== undefined && warningsResult.ok === false

  // Global auto-index policy. KVStore returns `null` for an unset key, which
  // we treat as 'Always' for backward compatibility with installs that predate
  // this UI. The user can opt into Manual mode from the toggle below.
  const { data: ingestPolicySetting } = useQuery({
    queryKey: ['ingestPolicy'],
    queryFn: () => api.getSetting('rag.defaultIngestPolicy'),
  })
  const ingestPolicy: 'Always' | 'Manual' =
    ingestPolicySetting?.value === 'Manual' ? 'Manual' : 'Always'

  const updateIngestPolicyMutation = useMutation({
    mutationFn: (policy: 'Always' | 'Manual') =>
      api.updateSetting('rag.defaultIngestPolicy', policy),
    onSuccess: (_data, policy) => {
      queryClient.invalidateQueries({ queryKey: ['ingestPolicy'] })
      addNotification({
        type: 'success',
        message:
          policy === 'Always'
            ? 'Novos conteúdos serão indexados automaticamente para a IA.'
            : 'Novos conteúdos aguardarão sua autorização para serem indexados.',
      })
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        message: error?.message || 'Não foi possível atualizar a política de indexação.',
      })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadDocument(file, uploadCollection || undefined),
  })

  const updateCollectionMutation = useMutation({
    mutationFn: ({ source, collection }: { source: string; collection: string }) =>
      api.updateFileCollection(source, collection || null),
    onSuccess: (data) => {
      addNotification({ type: 'success', message: data?.message || 'Coleção atualizada.' })
      queryClient.invalidateQueries({ queryKey: ['storedFiles'] })
      queryClient.invalidateQueries({ queryKey: ['kbCollections'] })
    },
    onError: (error: any) => {
      addNotification({ type: 'error', message: error?.message || 'Não foi possível atualizar a coleção.' })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ source, active }: { source: string; active: boolean }) =>
      api.setFileActive(source, active),
    onSuccess: (data) => {
      addNotification({ type: 'success', message: data?.message || 'Estado de ativação atualizado.' })
      queryClient.invalidateQueries({ queryKey: ['storedFiles'] })
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        message: error?.message || 'Não foi possível atualizar o estado de ativação.',
      })
    },
  })

  const toggleCollectionActiveMutation = useMutation({
    mutationFn: ({ collection, active }: { collection: string | null; active: boolean }) =>
      api.setKnowledgeCollectionActive(collection, active),
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        message: data?.message || 'Estado de ativação da coleção atualizado.',
      })
      queryClient.invalidateQueries({ queryKey: ['storedFiles'] })
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        message: error?.message || 'Não foi possível atualizar o estado de ativação da coleção.',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (source: string) => api.deleteRAGFile(source),
    onSuccess: () => {
      addNotification({ type: 'success', message: 'Arquivo removido da base de conhecimento.' })
      setConfirmDeleteSource(null)
      queryClient.invalidateQueries({ queryKey: ['storedFiles'] })
    },
    onError: (error: any) => {
      addNotification({ type: 'error', message: error?.message || 'Não foi possível excluir o arquivo.' })
      setConfirmDeleteSource(null)
    },
  })

  const embedMutation = useMutation({
    mutationFn: ({ source, force }: { source: string; force: boolean }) =>
      api.embedSingleRAGFile(source, force),
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        message: data?.message || 'Arquivo adicionado à fila de embeddings.',
      })
      setConfirmReembed(null)
      queryClient.invalidateQueries({ queryKey: ['storedFiles'] })
      queryClient.invalidateQueries({ queryKey: ['embed-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['kbFileWarnings'] })
    },
    onError: (error: any) => {
      addNotification({ type: 'error', message: error?.message || 'Não foi possível adicionar o arquivo à fila.' })
      setConfirmReembed(null)
    },
  })

  const cleanupFailedMutation = useMutation({
    mutationFn: () => api.cleanupFailedEmbedJobs(),
    onSuccess: (data) => {
      addNotification({ type: 'success', message: data?.message || 'Tarefas com falha removidas.' })
      queryClient.invalidateQueries({ queryKey: ['failedEmbedJobs'] })
    },
    onError: (error: any) => {
      addNotification({ type: 'error', message: error?.message || 'Não foi possível limpar as tarefas.' })
    },
  })

  const cancelAllMutation = useMutation({
    mutationFn: () => api.cancelAllEmbedJobs(),
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        message: data?.message || 'Todas as tarefas de embeddings foram canceladas.',
      })
      queryClient.invalidateQueries({ queryKey: ['embed-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['failedEmbedJobs'] })
      queryClient.invalidateQueries({ queryKey: ['storedFiles'] })
      queryClient.invalidateQueries({ queryKey: ['kbFileWarnings'] })
    },
    onError: (error: any) => {
      addNotification({ type: 'error', message: error?.message || 'Não foi possível cancelar as tarefas.' })
    },
  })

  const startQdrantMutation = useMutation({
    mutationFn: () => api.affectService(SERVICE_NAMES.QDRANT, 'start'),
    onSuccess: () => {
      setIsStartingQdrant(true)
      queryClient.invalidateQueries({ queryKey: ['qdrantHealth'] })
    },
    onError: (error: any) => {
      addNotification({ type: 'error', message: error?.message || 'Não foi possível iniciar o Qdrant.' })
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => api.syncRAGStorage(),
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        message:
          data?.message ||
          'Armazenamento sincronizado com sucesso. Se novos arquivos foram encontrados, eles foram enviados para processamento.',
      })
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        message: error?.message || 'Não foi possível sincronizar o armazenamento',
      })
    },
  })

  const reembedMutation = useMutation({
    mutationFn: () => api.reembedAllRAG(),
    onSuccess: (data) => {
      addNotification({
        type: data?.success ? 'success' : 'error',
        message: data?.message || 'Recálculo concluído.',
      })
      queryClient.invalidateQueries({ queryKey: ['storedFiles'] })
      queryClient.invalidateQueries({ queryKey: ['embed-jobs'] })
      setBulkMode(null)
      setResetTyped('')
    },
    onError: () => {
      addNotification({ type: 'error', message: 'Não foi possível recalcular os embeddings da base de conhecimento.' })
      setBulkMode(null)
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => api.resetAndRebuildRAG(),
    onSuccess: (data) => {
      addNotification({
        type: data?.success ? 'success' : 'error',
        message: data?.message || 'Reinicialização concluída.',
      })
      queryClient.invalidateQueries({ queryKey: ['storedFiles'] })
      queryClient.invalidateQueries({ queryKey: ['embed-jobs'] })
      setBulkMode(null)
      setResetTyped('')
    },
    onError: () => {
      addNotification({ type: 'error', message: 'Não foi possível reinicializar a base de conhecimento.' })
      setBulkMode(null)
    },
  })

  const bulkBusy = reembedMutation.isPending || resetMutation.isPending

  const handleUpload = async () => {
    if (files.length === 0) return
    setIsUploading(true)
    let successCount = 0
    const failedNames: string[] = []

    for (const file of files) {
      try {
        await uploadMutation.mutateAsync(file)
        successCount++
      } catch (error: any) {
        failedNames.push(file.name)
      }
    }

    setIsUploading(false)
    setFiles([])
    fileUploaderRef.current?.clear()
    queryClient.invalidateQueries({ queryKey: ['embed-jobs'] })

    if (successCount > 0) {
      addNotification({
        type: 'success',
        message: `${successCount} ${successCount > 1 ? 'arquivos enviados' : 'arquivo enviado'} para processamento.`,
      })
    }
    for (const name of failedNames) {
      addNotification({ type: 'error', message: `Não foi possível enviar: ${name}` })
    }
  }

  const toggleCollectionExpanded = (key: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleConfirmCancelAll = () => {
    openModal(
      <StyledModal
        title="Cancelar todas as tarefas de embeddings?"
        onConfirm={() => {
          cancelAllMutation.mutate()
          closeModal('confirm-cancel-all-modal')
        }}
        onCancel={() => closeModal('confirm-cancel-all-modal')}
        open={true}
        confirmText="Cancelar todas as tarefas"
        cancelText="Manter tarefas"
        confirmVariant="danger"
      >
        <p className="text-text-primary">
          Isso para <strong>toda</strong> tarefa de embeddings — inclusive as em andamento ou travadas — e limpa a fila de processamento. Os arquivos enviados dessas tarefas são apagados, então você precisará reenviar o que ainda quiser indexar. Arquivos já processados não são afetados. Tem certeza de que quer continuar?
        </p>
      </StyledModal>,
      'confirm-cancel-all-modal'
    )
  }

  const handleConfirmSync = () => {
    openModal(
      <StyledModal
        title="Confirmar sincronização?"
        onConfirm={() => {
          syncMutation.mutate()
          closeModal('confirm-sync-modal')
        }}
        onCancel={() => closeModal('confirm-sync-modal')}
        open={true}
        confirmText="Confirmar sincronização"
        cancelText="Cancelar"
        confirmVariant="primary"
      >
        <p className="text-text-primary">
          Isso verifica as pastas de armazenamento em busca de novos arquivos e os coloca na fila de processamento. É útil se você adicionou arquivos manualmente ou quer garantir que tudo esteja atualizado. O uso de recursos pode aumentar temporariamente se houver arquivos novos. Tem certeza de que quer continuar?
        </p>
      </StyledModal>,
      'confirm-sync-modal'
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm transition-opacity">
      {/* 6xl, not 5xl: the Active column added ~57px and put the table back over the
          modal width, which is the exact defect #1198 fixed (the Delete button falls
          off the right edge at every viewport). Measured on NOMAD3: table 1018px
          against 961px of usable width at 5xl. */}
      <div className="bg-surface-primary rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border-subtle shrink-0">
          <h2 className="text-2xl font-semibold text-text-primary">Base de conhecimento</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
          >
            <IconX className="h-6 w-6 text-text-muted" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {qdrantOffline && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm dark:bg-red-950 dark:border-red-800 dark:text-red-300 flex items-center justify-between gap-4">
              <span>
                <strong>Base de conhecimento indisponível:</strong> o banco de vetores Qdrant está offline.
              </span>
              <StyledButton
                variant="danger"
                size="sm"
                onClick={() => startQdrantMutation.mutate()}
                loading={startQdrantMutation.isPending || isStartingQdrant}
                disabled={startQdrantMutation.isPending || isStartingQdrant}
              >
                {isStartingQdrant ? 'Iniciando…' : 'Iniciar Qdrant'}
              </StyledButton>
            </div>
          )}
          <div className="bg-surface-primary rounded-lg border shadow-md overflow-hidden">
            <div className="p-6">
              <FileUploader
                ref={fileUploaderRef}
                minFiles={1}
                maxFiles={5}
                onUpload={(uploadedFiles) => {
                  setFiles(Array.from(uploadedFiles))
                }}
              />
              <div className="flex justify-center items-center gap-4 my-6">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  Coleção:
                  <CollectionCombobox
                    value={uploadCollection}
                    onChange={setUploadCollection}
                    options={comboboxOptions}
                    className="w-48"
                  />
                </label>
                <StyledButton
                  variant="primary"
                  size="lg"
                  icon="IconUpload"
                  onClick={handleUpload}
                  disabled={files.length === 0 || isUploading || qdrantOffline}
                  loading={isUploading}
                >
                  Enviar
                </StyledButton>
              </div>
            </div>
            <div className="border-t bg-surface-primary p-6">
              <h3 className="text-lg font-semibold text-desert-green mb-4">
                Por que enviar documentos para a sua Base de conhecimento?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-desert-green text-white flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-desert-stone-dark">
                      {aiAssistantName} Integração com a Base de conhecimento
                    </p>
                    <p className="text-sm text-desert-stone">
                      Quando você envia documentos para a Base de conhecimento, o sistema processa o conteúdo e o deixa acessível para {aiAssistantName}. Assim,{' '}
                      {aiAssistantName} pode consultar os seus documentos durante as conversas e dar respostas mais precisas e personalizadas com base nos dados enviados.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-desert-green text-white flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-desert-stone-dark">
                      Processamento de documentos com OCR
                    </p>
                    <p className="text-sm text-desert-stone">
                      O sistema tem reconhecimento óptico de caracteres (OCR) integrado, que extrai texto de documentos em imagem, como PDFs digitalizados ou fotos. Assim, mesmo documentos fora de um formato de texto padrão podem ser processados e ficar acessíveis para a IA.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-desert-green text-white flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-desert-stone-dark">
                      Integração com a Biblioteca de informações
                    </p>
                    <p className="text-sm text-desert-stone">
                      O sistema encontra e extrai automaticamente o conteúdo salvo na Biblioteca de informações (se instalada), deixando-o disponível para{' '}
                      {aiAssistantName} sem etapas adicionais.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="my-8 p-4 rounded-lg border border-border-subtle bg-surface-secondary">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[14rem]">
                <p className="text-sm font-medium text-text-primary">
                  Indexar automaticamente o novo conteúdo para a IA?
                </p>
                <p className="text-xs text-text-muted mt-1">
                  O conteúdo indexado costuma ocupar de 5 a 10 vezes o tamanho original no disco. As mudanças valem para o conteúdo adicionado depois de alterar esta opção.
                </p>
              </div>
              <div
                role="radiogroup"
                aria-label="Política de indexação"
                className="inline-flex rounded-md overflow-hidden border border-border-subtle"
              >
                {(['Always', 'Manual'] as const).map((option) => {
                  const isActive = ingestPolicy === option
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => !isActive && updateIngestPolicyMutation.mutate(option)}
                      disabled={updateIngestPolicyMutation.isPending}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-desert-green text-white'
                          : 'bg-surface-primary text-text-secondary hover:bg-surface-tertiary'
                      } ${updateIngestPolicyMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="my-8">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <StyledSectionHeader title="Fila de processamento" className="!mb-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <StyledButton
                  variant="danger"
                  size="md"
                  icon="IconTrash"
                  onClick={() => cleanupFailedMutation.mutate()}
                  loading={cleanupFailedMutation.isPending}
                  disabled={cleanupFailedMutation.isPending || qdrantOffline}
                >
                  Limpar falhas
                </StyledButton>
                <StyledButton
                  variant="danger"
                  size="md"
                  icon="IconPlayerStop"
                  onClick={handleConfirmCancelAll}
                  loading={cancelAllMutation.isPending}
                  disabled={cancelAllMutation.isPending}
                  title="Para e limpa todas as tarefas de embeddings, em qualquer estado, inclusive as travadas ou em andamento. Apaga os arquivos enviados dessas tarefas."
                >
                  Cancelar todas as tarefas
                </StyledButton>
              </div>
            </div>
            <ActiveEmbedJobs withHeader={false} />
          </div>

          <div className="my-12">
            <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
              <StyledSectionHeader title="Arquivos da Base de conhecimento" className="!mb-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  Pesquisar em:
                  <select
                    value={collectionFilter}
                    onChange={(e) => setCollectionFilter(e.target.value)}
                    className="rounded border border-border-subtle bg-surface-primary px-3 py-2 text-text-primary"
                  >
                    <option value="All">Todas</option>
                    {knownCollections.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value={UNCATEGORIZED_COLLECTION_KEY}>Sem categoria</option>
                  </select>
                </label>
                <StyledButton
                  variant="secondary"
                  size="md"
                  icon="IconSettings"
                  onClick={() => setManageCollectionsOpen(true)}
                >
                  Gerenciar coleções
                </StyledButton>
                <StyledButton
                  variant="danger"
                  size="md"
                  icon="IconAlertTriangle"
                  onClick={() => {
                    setResetTyped('')
                    setBulkMode('reset')
                  }}
                  disabled={isUploading || qdrantOffline || bulkBusy}
                  loading={resetMutation.isPending}
                  title="Apaga toda a coleção de embeddings e recalcula tudo do zero. Remove permanentemente os vetores de arquivos que não estão mais no disco. Ação destrutiva: exige digitar RESET para confirmar."
                >
                  Reinicializar e reconstruir
                </StyledButton>
                <StyledButton
                  variant="secondary"
                  size="md"
                  icon="IconRefreshAlert"
                  onClick={() => setBulkMode('reembed')}
                  disabled={isUploading || qdrantOffline || bulkBusy || storedFiles.length === 0}
                  loading={reembedMutation.isPending}
                  title="Recalcula os embeddings de todos os arquivos no disco, substituindo os vetores arquivo por arquivo. Os vetores de arquivos que não estão mais no disco são mantidos. Use se o divisor de texto ou o modelo de embeddings mudou."
                >
                  Recalcular tudo
                </StyledButton>
                <StyledButton
                  variant="secondary"
                  size="md"
                  icon="IconRefresh"
                  onClick={handleConfirmSync}
                  disabled={syncMutation.isPending || isUploading || qdrantOffline || bulkBusy}
                  loading={syncMutation.isPending || isUploading}
                  title="Verifica o armazenamento em busca de novos arquivos e coloca na fila os que ainda não têm embeddings. Pode ser usado a qualquer momento; não mexe no conteúdo já processado."
                >
                  Sincronizar armazenamento
                </StyledButton>
              </div>
            </div>
            {warningsUnavailable && (
              <div className="mb-4 inline-flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
                <span aria-hidden="true">⚠</span>
                <span>Avisos de arquivos indisponíveis — não foi possível ler o estado do armazenamento. Tentando novamente…</span>
              </div>
            )}
            <StyledTable<KbFileGroup>
              className="font-semibold"
              rowLines={true}
              columns={[
                {
                  accessor: 'source',
                  title: renderSortHeader('Nome do arquivo', 'name', sort, setSort),
                  render(record) {
                    if (record.isCollectionHeader) {
                      const key = record.collection ?? UNCATEGORIZED_COLLECTION_KEY
                      const expanded = expandedCollections.has(key)
                      return (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 font-semibold text-text-primary hover:text-desert-green transition-colors"
                          onClick={() => toggleCollectionExpanded(key)}
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <IconChevronDown
                              size={16}
                              className="text-text-muted"
                              aria-hidden="true"
                            />
                          ) : (
                            <IconChevronRight
                              size={16}
                              className="text-text-muted"
                              aria-hidden="true"
                            />
                          )}
                          {record.displayName}
                        </button>
                      )
                    }
                    const warnings = fileWarnings[record.source] ?? []
                    const pill = renderStatePill(record)
                    return (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-text-primary">{record.displayName}</span>
                        {(pill || warnings.length > 0) && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {pill}
                            {warnings.map((w, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 self-start text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded px-2 py-0.5"
                              >
                                <span aria-hidden="true">⚠</span>
                                {w.kind === 'zero_chunks' && (
                                  <span>
                                    Nenhum trecho processado — este arquivo não tem texto. O Assistente de IA não pode consultá-lo.
                                  </span>
                                )}
                                {w.kind === 'partial_stall' && (
                                  <span>
                                    Apenas {w.chunksEmbedded.toLocaleString()} de aprox.{' '}
                                    {w.chunksExpected.toLocaleString()} trechos processados — a indexação pode ter travado.
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  },
                },
                {
                  accessor: 'size',
                  title: renderSortHeader('Tamanho', 'size', sort, setSort),
                  className: 'whitespace-nowrap',
                  render(record) {
                    if (record.bucket === 'admin_docs' || record.size === null) {
                      return <span className="text-text-muted">—</span>
                    }
                    return <span className="text-text-secondary">{formatBytes(record.size)}</span>
                  },
                },
                {
                  accessor: 'uploadedAt',
                  title: renderSortHeader('Enviado em', 'uploadedAt', sort, setSort),
                  className: 'whitespace-nowrap',
                  render(record) {
                    if (record.bucket === 'admin_docs' || !record.uploadedAt) {
                      return <span className="text-text-muted">—</span>
                    }
                    const d = new Date(record.uploadedAt)
                    return (
                      <span className="text-text-secondary" title={d.toISOString()}>
                        {d.toLocaleDateString()}
                      </span>
                    )
                  },
                },
                {
                  accessor: 'collection',
                  title: 'Coleção',
                  className: 'whitespace-nowrap',
                  noTruncate: true,
                  render(record) {
                    if (record.bucket === 'admin_docs' || record.isCollectionHeader) {
                      return <span className="text-text-muted">—</span>
                    }
                    const isSaving =
                      updateCollectionMutation.isPending &&
                      updateCollectionMutation.variables?.source === record.source
                    return (
                      <CollectionCombobox
                        value={record.collection ?? ''}
                        onChange={(val) =>
                          updateCollectionMutation.mutate({
                            source: record.source,
                            collection: val,
                          })
                        }
                        options={comboboxOptions}
                        disabled={isSaving}
                        className="w-40"
                      />
                    )
                  },
                },
                {
                  accessor: 'active',
                  title: 'Ativo',
                  render(record) {
                    if (record.bucket === 'admin_docs') {
                      return <span className="text-text-muted">—</span>
                    }
                    if (record.isCollectionHeader) {
                      const isSaving =
                        toggleCollectionActiveMutation.isPending &&
                        toggleCollectionActiveMutation.variables?.collection === record.collection
                      return (
                        <Switch
                          checked={record.collectionActiveState === 'all-active'}
                          indeterminate={record.collectionActiveState === 'mixed'}
                          onChange={(val) =>
                            toggleCollectionActiveMutation.mutate({
                              collection: record.collection,
                              active: val,
                            })
                          }
                          disabled={isSaving}
                        />
                      )
                    }
                    const isSaving =
                      toggleActiveMutation.isPending &&
                      toggleActiveMutation.variables?.source === record.source
                    return (
                      <Switch
                        checked={record.active}
                        onChange={(val) =>
                          toggleActiveMutation.mutate({ source: record.source, active: val })
                        }
                        disabled={isSaving}
                      />
                    )
                  },
                },
                {
                  accessor: 'source',
                  title: '',
                  render(record) {
                    if (record.bucket === 'admin_docs') {
                      return (
                        <div className="flex justify-end">
                          <span className="text-sm text-text-muted italic">Gerenciado pelo sistema</span>
                        </div>
                      )
                    }
                    if (record.isCollectionHeader) {
                      return null
                    }

                    const isConfirming = confirmDeleteSource === record.source
                    const isDeleting =
                      deleteMutation.isPending && confirmDeleteSource === record.source
                    if (isConfirming) {
                      return (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm text-text-secondary">
                            Remover da base de conhecimento?
                          </span>
                          <StyledButton
                            variant="danger"
                            size="sm"
                            onClick={() => deleteMutation.mutate(record.source)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Excluindo…' : 'Confirmar'}
                          </StyledButton>
                          <StyledButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeleteSource(null)}
                            disabled={isDeleting}
                          >
                            Cancelar
                          </StyledButton>
                        </div>
                      )
                    }

                    const warnings = fileWarnings[record.source] ?? []
                    const action = pickRowAction(record, warnings.length > 0)
                    const actionPendingForThisRow =
                      embedMutation.isPending && embedMutation.variables?.source === record.source

                    const canView =
                      record.isUserUpload &&
                      isViewableExtension(record.displayName) &&
                      record.size !== null
                    const canDownload = record.isUserUpload && record.size !== null

                    return (
                      <div className="flex justify-end items-center gap-2">
                        {action && (
                          <StyledButton
                            variant={action.variant}
                            size="sm"
                            icon={action.icon}
                            onClick={() => {
                              if (action.kind === 'reembed') {
                                setConfirmReembed({
                                  source: record.source,
                                  displayName: record.displayName,
                                })
                              } else {
                                embedMutation.mutate({ source: record.source, force: action.force })
                              }
                            }}
                            disabled={
                              qdrantOffline || deleteMutation.isPending || embedMutation.isPending
                            }
                            loading={actionPendingForThisRow}
                          >
                            {action.label}
                          </StyledButton>
                        )}
                        {canView && (
                          <StyledButton
                            variant="ghost"
                            size="sm"
                            icon="IconEye"
                            onClick={() => setViewerSource(record.source)}
                          >
                            Ver
                          </StyledButton>
                        )}
                        {canDownload && (
                          <StyledButton
                            variant="ghost"
                            size="sm"
                            icon="IconDownload"
                            onClick={() => {
                              window.location.href = `/api/rag/files/download?source=${encodeURIComponent(record.source)}`
                            }}
                          >
                            Baixar
                          </StyledButton>
                        )}
                        <StyledButton
                          variant="danger"
                          size="sm"
                          icon="IconTrash"
                          onClick={() => setConfirmDeleteSource(record.source)}
                          disabled={deleteMutation.isPending || embedMutation.isPending}
                          loading={
                            deleteMutation.isPending && confirmDeleteSource === record.source
                          }
                        >
                          Excluir
                        </StyledButton>
                      </div>
                    )
                  },
                },
              ]}
              data={groupAndSortKbFiles(
                collectionFilter === 'All'
                  ? storedFiles
                  : storedFiles.filter((f) =>
                      collectionFilter === UNCATEGORIZED_COLLECTION_KEY
                        ? f.collection === null
                        : f.collection === collectionFilter
                    ),
                sort,
                expandedCollections
              )}
              loading={isLoadingFiles}
            />
          </div>
        </div>
      </div>

      {bulkMode === 'reembed' && (
        <StyledModal
          title="Recalcular todos os documentos?"
          open={true}
          confirmText={reembedMutation.isPending ? 'Recalculando…' : 'Recalcular tudo'}
          cancelText="Cancelar"
          confirmVariant="primary"
          confirmLoading={reembedMutation.isPending}
          onConfirm={() => reembedMutation.mutate()}
          onCancel={() => setBulkMode(null)}
        >
          <div className="text-text-primary text-sm space-y-3 text-left">
            <p>
              Isso reprocessa todos os documentos da sua base de conhecimento — cerca de
              <strong>
                {' '}
                {storedFiles.length} arquivo{storedFiles.length === 1 ? '' : 's'}
              </strong>
              . Para cada arquivo, o sistema apaga os embeddings existentes no Qdrant e cria uma nova tarefa com o divisor de texto e o modelo de embeddings atuais.
            </p>
            <div className="rounded border border-border-subtle bg-surface-secondary p-3">
              <p className="font-semibold mb-1">Para que serve</p>
              <p className="text-text-secondary">
                Use quando o modelo de embeddings ou a divisão de texto mudar, ou se suspeitar que os vetores estão desatualizados. Os arquivos no disco <em>não</em> são apagados, e os pontos órfãos cujo arquivo de origem não existe mais continuam intactos (veja
                <em> Reinicializar e reconstruir </em>se quiser começar totalmente do zero).
              </p>
            </div>
            <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-3 text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-1">Atenção</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  A geração de embeddings {storedFiles.length} arquivo{storedFiles.length === 1 ? '' : 's'} pode demorar bastante, principalmente em PDFs grandes ou arquivos ZIM.
                </li>
                <li>
                  Em sistemas sem aceleração por GPU, espere uso alto de CPU durante todo o processo.
                </li>
                <li>
                  Os resultados de pesquisa da Base de conhecimento podem ficar incompletos até o recálculo terminar.
                </li>
                <li>
                  Se já houver tarefas em andamento, esta ação será recusada — espere a fila esvaziar.
                </li>
              </ul>
            </div>
          </div>
        </StyledModal>
      )}

      {bulkMode === 'reset' && (
        <StyledModal
          title="Reinicializar e reconstruir a base de conhecimento?"
          open={true}
          confirmText={resetMutation.isPending ? 'Reinicializando…' : 'Apagar e reconstruir'}
          cancelText="Cancelar"
          confirmVariant="danger"
          confirmLoading={resetMutation.isPending}
          onConfirm={() => {
            if (resetTyped === 'RESET') resetMutation.mutate()
          }}
          onCancel={() => {
            setBulkMode(null)
            setResetTyped('')
          }}
        >
          <div className="text-text-primary text-sm space-y-3 text-left">
            <p>
              Isso vai <strong>apagar permanentemente todos os pontos</strong> da coleção
              <code> nomad_knowledge_base </code>do Qdrant e reconstruir a partir dos
              <strong>
                {' '}
                {storedFiles.length} arquivo{storedFiles.length === 1 ? '' : 's'}
              </strong>{' '}
              que estão no disco. A coleção é apagada e recriada, e todos os arquivos voltam para a fila.
            </p>
            <div className="rounded border border-border-subtle bg-surface-secondary p-3">
              <p className="font-semibold mb-1">Em que isso difere de Recalcular tudo</p>
              <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                <li>
                  <strong>Recalcular tudo</strong> substitui os vetores arquivo por arquivo. Os pontos órfãos (vetores cujo arquivo de origem foi apagado do disco) são mantidos.
                </li>
                <li>
                  <strong>Reinicializar e reconstruir</strong> apaga a coleção inteira. Os pontos órfãos são <strong>perdidos para sempre</strong>. Depois disso, só os arquivos que estão no disco existirão no Qdrant.
                </li>
              </ul>
            </div>
            <div className="rounded border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 text-red-900 dark:text-red-200">
              <p className="font-semibold mb-1">Esta ação é destrutiva e não pode ser desfeita</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  A pesquisa na Base de conhecimento ficará vazia até o processamento terminar (pode levar horas em sistemas só com CPU).
                </li>
                <li>
                  Por alguns segundos durante a reinicialização, a coleção do Qdrant não existe — perguntas no chat nesse intervalo podem retornar o erro "collection not found". Evite usar o chat até a reconstrução começar.
                </li>
                <li>
                  Se já houver tarefas em andamento, esta ação será recusada — espere a fila esvaziar.
                </li>
              </ul>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Digite <code>RESET</code> para confirmar:
              </label>
              <input
                type="text"
                value={resetTyped}
                onChange={(e) => setResetTyped(e.target.value)}
                placeholder="RESET"
                autoFocus
                className="w-full rounded border border-border-subtle bg-surface-primary px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {resetTyped.length > 0 && resetTyped !== 'RESET' && (
                <p className="text-xs text-red-600 mt-1">
                  Digite RESET exatamente assim (maiúsculas, sem espaços) para ativar o botão de confirmar.
                </p>
              )}
            </div>
          </div>
        </StyledModal>
      )}

      {confirmReembed && (
        <StyledModal
          title="Recalcular este arquivo?"
          open={true}
          confirmText={embedMutation.isPending ? 'Adicionando à fila…' : 'Recalcular'}
          cancelText="Cancelar"
          confirmVariant="primary"
          confirmLoading={embedMutation.isPending}
          onConfirm={() => embedMutation.mutate({ source: confirmReembed.source, force: true })}
          onCancel={() => setConfirmReembed(null)}
        >
          <div className="text-text-primary text-sm space-y-3 text-left">
            <p>
              Isso apaga os embeddings existentes de{' '}
              <strong>{confirmReembed.displayName}</strong> e cria uma nova tarefa. O arquivo no disco não é alterado.
            </p>
            <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-3 text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-1">Atenção</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Em arquivos ZIM grandes isso pode demorar bastante, principalmente em sistemas só com CPU.
                </li>
                <li>
                  Os resultados de pesquisa que usavam este arquivo ficarão incompletos até o novo processamento terminar.
                </li>
                <li>
                  Se já houver uma tarefa em andamento para este arquivo, o recálculo será recusado — espere ela terminar.
                </li>
              </ul>
            </div>
          </div>
        </StyledModal>
      )}

      {viewerSource && (
        <FileViewerModal source={viewerSource} onClose={() => setViewerSource(null)} />
      )}

      {manageCollectionsOpen && (
        <CollectionsManager onClose={() => setManageCollectionsOpen(false)} />
      )}
    </div>
  )
}

function FileViewerModal({ source, onClose }: { source: string; onClose: () => void }) {
  const { data, isLoading, isFetched } = useQuery({
    queryKey: ['rag', 'file-content', source],
    queryFn: () => api.getFileContent(source),
    staleTime: 60_000,
  })

  // Title falls back to the trailing path segment so the modal still has a
  // useful header while the fetch is in-flight or if it failed.
  const fallbackName = source.split(/[/\\]/).at(-1) ?? source
  const title = data?.fileName ?? fallbackName
  // `catchInternal` swallows errors and resolves to undefined, surfacing a
  // toast -- so the "couldn't load" branch is gated on a finished-but-empty
  // fetch rather than on react-query's `isError`.
  const showError = isFetched && !data

  return (
    <StyledModal
      title={title}
      open={true}
      onClose={onClose}
      onCancel={onClose}
      cancelText="Fechar"
      large
    >
      <div className="text-left text-sm">
        {isLoading && <div className="text-text-secondary">Carregando…</div>}
        {showError && (
          <div className="text-amber-700 dark:text-amber-300">
            Não foi possível carregar o arquivo. Ele pode ter sido movido ou o tipo não pode ser visualizado.
          </div>
        )}
        {data && (
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded border border-border-subtle bg-surface-secondary p-3 font-mono text-xs text-text-primary">
            {data.content}
          </pre>
        )}
      </div>
    </StyledModal>
  )
}
