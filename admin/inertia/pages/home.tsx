import {
  IconBolt,
  IconBox,
  IconHelp,
  IconMapRoute,
  IconPill,
  IconSettings,
  IconWifiOff,
} from '@tabler/icons-react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '~/layouts/AppLayout'
import { getServiceLink } from '~/lib/navigation'
import { ServiceSlim } from '../../types/services'
import DynamicIcon, { DynamicIconName } from '~/components/DynamicIcon'
import { useUpdateAvailable } from '~/hooks/useUpdateAvailable'
import { useSystemSetting } from '~/hooks/useSystemSetting'
import {
  useBenchmarkRerunBanner,
  BENCHMARK_RERUN_BANNER_QUERY_KEY,
} from '~/hooks/useBenchmarkRerunBanner'
import { useQueryClient } from '@tanstack/react-query'
import api from '~/lib/api'
import Alert from '~/components/Alert'
import WhatsNewBanner from '~/components/WhatsNewBanner'
import { SERVICE_NAMES } from '../../constants/service_names'
import LinkTileModal from '~/components/LinkTileModal'
import { IconPlus, IconPencil, IconTrash, IconExternalLink, IconSearch } from '@tabler/icons-react'
import classNames from 'classnames'
import { useState } from 'react'
import { linkTileColor } from '../../constants/link_tile_colors'

// Maps is a Core Capability (display_order: 4)
const MAPS_ITEM = {
  label: 'Mapas',
  to: '/maps',
  target: '',
  description: 'Ver mapas offline',
  icon: <IconMapRoute size={48} />,
  installed: true,
  displayOrder: 4,
  poweredBy: null,
}

// Drug Reference + "When to use what" — offline medical reference tiles.
// icon and displayOrder here are a reasonable default; both are open for the
// maintainer to re-pick to fit the dashboard's ordering conventions.
const DRUG_REFERENCE_ITEM = {
  label: 'Referência de medicamentos',
  to: '/drug-reference',
  target: '',
  description: 'Bulas de medicamentos offline. Pesquise pelo nome do remédio ou pelo sintoma',
  icon: <IconPill size={48} />,
  installed: true,
  displayOrder: 5,
  poweredBy: null,
}

// System items shown after all apps
const SYSTEM_ITEMS = [
  {
    label: 'Configuração rápida',
    to: '/easy-setup',
    target: '',
    description:
      'Não sabe por onde começar? Use o assistente para configurar rapidamente seu sistema!',
    icon: <IconBolt size={48} />,
    installed: true,
    displayOrder: 50,
    poweredBy: null,
  },
  {
    label: 'Loja de aplicativos',
    to: '/supply-depot',
    target: '',
    description: 'Veja e instale aplicativos selecionados, ou adicione seu próprio contêiner Docker',
    icon: <IconBox size={48} />,
    installed: true,
    displayOrder: 51,
    poweredBy: null,
  },
  {
    label: 'Documentação',
    to: '/docs/home',
    target: '',
    description: 'Leia os manuais e guias do Vetorizando Soluções',
    icon: <IconHelp size={48} />,
    installed: true,
    displayOrder: 52,
    poweredBy: null,
  },
  {
    label: 'Configurações',
    to: '/settings/system',
    target: '',
    description: 'Configure as opções do seu sistema',
    icon: <IconSettings size={48} />,
    installed: true,
    displayOrder: 53,
    poweredBy: null,
  },
]

interface DashboardItem {
  label: string
  to: string
  target: string
  description: string
  icon: React.ReactNode
  installed: boolean
  displayOrder: number
  poweredBy: string | null
  /** Set only for user-added link tiles, which render differently and can be edited. */
  linkTile?: ServiceSlim
}

export default function Home(props: {
  system: {
    services: ServiceSlim[]
  }
  // Server-computed: true when the offline FDA drug dataset is installed or
  // installing (curated Medicine tier). Gates the two medical-reference tiles
  // below so they only appear once the data exists.
  drugReferenceInstalled: boolean
}) {
  const items: DashboardItem[] = []
  const updateInfo = useUpdateAvailable();
  const rerunBanner = useBenchmarkRerunBanner()
  const queryClient = useQueryClient()
  const { aiAssistantName } = usePage<{ aiAssistantName: string }>().props

  // Link tile management. `editingTile` null with the modal open means "create".
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [editingTile, setEditingTile] = useState<ServiceSlim | null>(null)
  // Deleting a tile is not undoable and the tiles are user-entered, so the trash
  // icon arms a confirm rather than deleting on the first click.
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const refreshServices = () => router.reload({ only: ['system'] })

  const handleDeleteTile = async (serviceName: string) => {
    const result = await api.deleteLinkTile(serviceName)
    setPendingDelete(null)
    if (!result?.success) {
      setLinkError('Não foi possível remover este link.')
      return
    }
    refreshServices()
  }


  const handleDismissRerunBanner = async () => {
    await api.updateSetting('benchmark.rerunBannerDismissed', true)
    queryClient.invalidateQueries({ queryKey: BENCHMARK_RERUN_BANNER_QUERY_KEY })
  }

  // Check if user has visited Easy Setup
  const { data: easySetupVisited } = useSystemSetting({
    key: 'ui.hasVisitedEasySetup'
  })
  const shouldHighlightEasySetup = easySetupVisited?.value ? String(easySetupVisited.value) !== 'true' : false

  // Add installed services (non-dependency services only). Link tiles are user-added
  // shortcuts with no container behind them, so they are collected separately below
  // and rendered with their own treatment.
  props.system.services
    .filter(
      (service) =>
        service.installed && (service.ui_location || service.custom_url) && !service.is_link_tile
    )
    .forEach((service) => {
      items.push({
        // Inject custom AI Assistant name if this is the chat service
        label: service.service_name === SERVICE_NAMES.OLLAMA && aiAssistantName ? aiAssistantName : (service.friendly_name || service.service_name),
        to:
          service.ui_location || service.custom_url
            ? getServiceLink(service.ui_location || '', service.custom_url)
            : '#',
        target: '_blank',
        description:
          service.description ||
          `Acessar o aplicativo ${service.friendly_name || service.service_name}`,
        icon: service.icon ? (
          <DynamicIcon icon={service.icon as DynamicIconName} className="!size-12" />
        ) : (
          <IconWifiOff size={48} />
        ),
        installed: service.installed,
        displayOrder: service.display_order ?? 100,
        poweredBy: service.powered_by ?? null,
      })
    })

  // User-added link tiles: shortcuts to things NOMAD does not manage.
  props.system.services
    .filter((service) => service.is_link_tile && service.custom_url)
    .forEach((service) => {
      items.push({
        label: service.friendly_name || service.service_name,
        to: getServiceLink('', service.custom_url),
        target: '_blank',
        description: service.description || 'Abre em uma nova aba',
        icon: <DynamicIcon icon={service.icon as DynamicIconName} className="!size-12" />,
        installed: true,
        displayOrder: service.display_order ?? 90,
        poweredBy: null,
        linkTile: service,
      })
    })

  // Add Maps as a Core Capability
  items.push(MAPS_ITEM)

  // Add the offline medical-reference tiles only once the FDA drug dataset is
  // installed (or installing) via the curated Medicine tier. Both tiles read the
  // same drug_labels table, so they gate together off one server-computed flag.
  if (props.drugReferenceInstalled) {
    items.push(DRUG_REFERENCE_ITEM)
  }

  // Add system items
  items.push(...SYSTEM_ITEMS)

  // Sort all items by display order
  items.sort((a, b) => a.displayOrder - b.displayOrder)

  // Search across names and descriptions, then split apps from system shortcuts.
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  const term = normalize(query.trim())
  const visibleItems = term
    ? items.filter((item) => normalize(`${item.label} ${item.description}`).includes(term))
    : items
  const appItems = visibleItems.filter((item) => item.displayOrder < 50 || item.displayOrder > 53)
  const systemItems = visibleItems.filter((item) => item.displayOrder >= 50 && item.displayOrder <= 53)

  const renderTile = (item: DashboardItem) => {
    const isEasySetup = item.label === 'Configuração rápida'
    const shouldHighlight = isEasySetup && shouldHighlightEasySetup

    const isLinkTile = Boolean(item.linkTile)
    // A flat surface color read as a stark white card next to the filled
    // app tiles. Tint from the brand palette instead, user-chosen.
    const tileColor = linkTileColor(item.linkTile?.link_color)

    // Link tiles are deliberately not styled like managed apps: outlined
    // rather than filled, with an external-link marker. If they looked the
    // same, users would expect Start/Stop/Update and file bugs when those
    // controls are not there.
    const tileContent = (
      <div
        className={classNames(
          'relative flex h-full cursor-pointer items-start gap-3 rounded-xl p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md',
          isLinkTile
            ? `border-2 border-dashed ${tileColor.border} ${tileColor.bg} text-text-primary`
            : 'border border-border-subtle bg-surface-primary text-text-primary shadow-sm hover:border-desert-green'
        )}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-desert-green-lighter text-desert-green [&_svg]:!size-6">
          {item.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-base font-semibold">{item.label}</span>
            {isLinkTile && (
              <span
                className={`shrink-0 ${tileColor.marker}`}
                title="Um atalho que você adicionou. O sistema não gerencia este item."
              >
                <IconExternalLink size={14} />
              </span>
            )}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-sm text-text-secondary">{item.description}</span>
          {item.poweredBy && (
            <span className="mt-1 block text-xs text-text-muted">Com tecnologia de {item.poweredBy}</span>
          )}
        </span>
        {shouldHighlight && (
          <span className="absolute -top-2 right-3 rounded-full bg-desert-orange-light px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
            Comece aqui!
          </span>
        )}
      </div>
    )

    if (isLinkTile) {
      const tile = item.linkTile!
      const confirming = pendingDelete === tile.service_name

      return (
        <div key={item.label} className="group relative">
          <a href={item.to} target="_blank" rel="noopener noreferrer" className="block h-full">
            {tileContent}
          </a>

          {confirming ? (
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleDeleteTile(tile.service_name)}
                className="rounded bg-desert-red px-2 py-1 text-xs font-medium text-white hover:brightness-110"
              >
                Remover
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded border border-border-default bg-surface-primary px-2 py-1 text-xs text-text-secondary hover:bg-surface-secondary"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setEditingTile(tile)
                  setLinkModalOpen(true)
                }}
                title="Editar este link"
                aria-label="Editar este link"
                className="rounded p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
              >
                <IconPencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(tile.service_name)}
                title="Remover este link"
                aria-label="Remover este link"
                className="rounded p-1 text-text-muted hover:bg-surface-secondary hover:text-desert-red"
              >
                <IconTrash size={16} />
              </button>
            </div>
          )}
        </div>
      )
    }

    return item.target === '_blank' ? (
      <a key={item.label} href={item.to} target="_blank" rel="noopener noreferrer" className="block">
        {tileContent}
      </a>
    ) : (
      <Link key={item.label} href={item.to} className="block">
        {tileContent}
      </Link>
    )
  }

  return (
    <AppLayout>
      <Head title="Central de Comando" />
      {
        updateInfo?.updateAvailable && (
          <div className='flex justify-center items-center p-4 w-full'>
            <Alert
              title="Há uma atualização disponível!"
              type="info-inverted"
              variant="solid"
              className="w-full"
              buttonProps={{
                variant: 'primary',
                children: 'Ir para configurações',
                icon: 'IconSettings',
                onClick: () => router.visit('/settings/update'),
              }}
            />
          </div>
        )
      }
      <WhatsNewBanner />
      {
        rerunBanner?.show && (
          <div className='flex justify-center items-center px-4 pt-4 w-full'>
            <Alert
              title="Seu benchmark pode ser recalculado com o Score v2"
              message="Atualizamos o sistema de pontuação do benchmark. Execute o benchmark de novo para obter um resultado Score v2 atualizado no ranking da comunidade."
              type="info-inverted"
              variant="solid"
              className="w-full"
              dismissible
              onDismiss={handleDismissRerunBanner}
              buttonProps={{
                variant: 'primary',
                children: 'Executar o benchmark de novo',
                icon: 'IconRefresh',
                onClick: () => router.visit('/settings/benchmark'),
              }}
            />
          </div>
        )
      }
      <div className="px-4 pt-6 pb-2 sm:flex sm:items-end sm:justify-between sm:gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Central de Comando</h1>
          <p className="mt-1 text-sm text-text-secondary">Seus aplicativos e conteúdos, disponíveis mesmo sem internet.</p>
        </div>
        <div className="relative mt-3 sm:mt-0 sm:w-80">
          <IconSearch size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar aplicativo..."
            aria-label="Buscar aplicativo"
            className="w-full rounded-lg border border-border-default bg-surface-primary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-desert-green focus:outline-none"
          />
        </div>
      </div>

      {appItems.length > 0 && (
        <section aria-label="Aplicativos" className="px-4 pt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Aplicativos</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{appItems.map(renderTile)}</div>
        </section>
      )}

      {systemItems.length > 0 && (
        <section aria-label="Sistema" className="px-4 pt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Sistema</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{systemItems.map(renderTile)}</div>
        </section>
      )}

      {visibleItems.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-text-muted">Nenhum aplicativo encontrado para essa busca.</p>
      )}

      {!term && (
        <div className="px-4 pt-3 pb-6">
          <button
            type="button"
            onClick={() => {
              setEditingTile(null)
              setLinkModalOpen(true)
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-default px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-desert-green hover:text-text-primary"
          >
            <IconPlus size={18} aria-hidden="true" />
            Adicionar um link
            <span className="hidden font-normal text-text-muted sm:inline">— um atalho para outro endereço da sua rede</span>
          </button>
        </div>
      )}

      {linkError && (
        <div className="px-4 pb-4">
          <Alert title={linkError} type="error" variant="solid" className="w-full" />
        </div>
      )}

      <LinkTileModal
        open={linkModalOpen}
        tile={editingTile}
        onClose={() => setLinkModalOpen(false)}
        onSaved={() => {
          setLinkModalOpen(false)
          refreshServices()
        }}
        showError={(msg) => setLinkError(msg)}
      />
    </AppLayout>
  )
}
