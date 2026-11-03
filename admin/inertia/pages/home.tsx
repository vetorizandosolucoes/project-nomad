import {
  IconBolt,
  IconBox,
  IconHelp,
  IconMapRoute,
  IconPill,
  IconRobot,
  IconSettings,
  IconWifiOff,
} from '@tabler/icons-react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '~/layouts/AppLayout'
import { getServiceLink } from '~/lib/navigation'
import { ServiceSlim } from '../../types/services'
import DynamicIcon, { DynamicIconName } from '~/components/DynamicIcon'
import { useSystemSetting } from '~/hooks/useSystemSetting'
import {
  useBenchmarkRerunBanner,
  BENCHMARK_RERUN_BANNER_QUERY_KEY,
} from '~/hooks/useBenchmarkRerunBanner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '~/lib/api'
import Alert from '~/components/Alert'
import WhatsNewBanner from '~/components/WhatsNewBanner'
import { SERVICE_NAMES } from '../../constants/service_names'
import LinkTileModal from '~/components/LinkTileModal'
import { IconArrowRight, IconExternalLink, IconPencil, IconPlus, IconSearch, IconSparkles, IconTrash } from '@tabler/icons-react'
import classNames from 'classnames'
import { useEffect, useRef, useState } from 'react'
import AiModeSwitch, { useAiStatus } from '~/components/AiModeSwitch'
import useInternetStatus from '~/hooks/useInternetStatus'
import useServiceInstalledStatus from '~/hooks/useServiceInstalledStatus'
import { tarjaLabel, type BrMedicine } from '../../app/utils/br_medicines'
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
  label: 'Medicamentos',
  to: '/medicamentos',
  target: '',
  description: 'Medicamentos comercializados no Brasil. Pesquise pelo nome, princípio ativo ou situação',
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

/** One line of the list: an app, a medicine, or the question for the AI. */
interface ResultRow {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  href: string
  external?: boolean
  item?: DashboardItem
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

function greeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Boa noite'
  if (hour < 12) return 'Bom dia'
  return hour < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function Home(props: {
  system: {
    services: ServiceSlim[]
  }
}) {
  const items: DashboardItem[] = []
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // The rows arrive with a stagger on load only. While typing they must just be there.
  const enteringRef = useRef(true)
  const { isOnline } = useInternetStatus()
  const { data: aiStatus } = useAiStatus()
  const aiInstalled = useServiceInstalledStatus(SERVICE_NAMES.OLLAMA)

  useEffect(() => {
    enteringRef.current = false
    // Not on touch screens, where this would pop the keyboard over the list.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 150)
    return () => clearTimeout(timer)
  }, [query])

  const { data: medicines } = useQuery({
    queryKey: ['home-medicines', debouncedQuery],
    enabled: debouncedQuery.length >= 3,
    placeholderData: (previous) => (debouncedQuery.length >= 3 ? previous : undefined),
    queryFn: async () => {
      const response = await fetch(`/api/medicamentos/search?q=${encodeURIComponent(debouncedQuery)}`, {
        headers: { Accept: 'application/json' },
      })
      return (await response.json()) as { results: BrMedicine[]; total: number }
    },
  })

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

  items.push(DRUG_REFERENCE_ITEM)

  // The agent shows up once its service exists on this machine.
  if (aiStatus?.jarvisInstalled) {
    items.push({
      label: 'Jarvis',
      to: '/jarvis',
      target: '',
      description: 'Agente que pesquisa, calcula e ajuda em projetos. Fica ligado no modo Online',
      icon: <IconRobot />,
      installed: true,
      displayOrder: 1,
      poweredBy: 'OpenJarvis',
    })
  }

  // Add system items
  items.push(...SYSTEM_ITEMS)

  // Sort all items by display order
  items.sort((a, b) => a.displayOrder - b.displayOrder)

  // Search across names and descriptions, then split apps from system shortcuts.
  const term = normalize(query.trim())
  const visibleItems = term
    ? items.filter((item) => normalize(`${item.label} ${item.description}`).includes(term))
    : items
  const appItems = visibleItems.filter((item) => item.displayOrder < 50 || item.displayOrder > 53)
  const systemItems = visibleItems.filter((item) => item.displayOrder >= 50 && item.displayOrder <= 53)

  // What typing offers besides apps: the question itself, and matching medicines.
  const trimmed = query.trim()
  const askRow: ResultRow | null =
    trimmed && aiInstalled
      ? {
          key: 'ask',
          label: `Perguntar à IA: “${trimmed}”`,
          description: 'Responde com a biblioteca e a lista de medicamentos, sem internet',
          icon: <IconSparkles />,
          href: `/chat?pergunta=${encodeURIComponent(trimmed)}`,
        }
      : null
  const medicineRows: ResultRow[] = (medicines?.results ?? []).slice(0, 3).map((medicine) => ({
    key: `medicine-${medicine.id}`,
    label: medicine.name,
    description: `${medicine.substance.replace(/;/g, ' + ')} · ${tarjaLabel(medicine.tarja)}`,
    icon: <IconPill />,
    href: `/medicamentos/${medicine.id}`,
  }))
  const allMedicinesRow: ResultRow | null =
    (medicines?.total ?? 0) > 3
      ? {
          key: 'medicines-all',
          label: `Ver os ${medicines!.total.toLocaleString('pt-BR')} resultados em Medicamentos`,
          description: 'Com filtro por tipo',
          icon: <IconPill />,
          href: `/medicamentos?q=${encodeURIComponent(trimmed)}`,
        }
      : null

  const toRow = (item: DashboardItem): ResultRow => ({
    key: item.label,
    label: item.label,
    description: item.description,
    icon: item.icon,
    href: item.to,
    external: item.target === '_blank',
    item,
  })
  const appRows = appItems.map(toRow)
  const systemRows = systemItems.map(toRow)
  const medicineGroup = allMedicinesRow ? [...medicineRows, allMedicinesRow] : medicineRows
  // A question goes first; a word that names something shows that something first.
  const looksLikeQuestion = trimmed.includes('?') || trimmed.split(/\s+/).length >= 3
  const nothingNamed = appRows.length + systemRows.length + medicineGroup.length === 0
  const askFirst = looksLikeQuestion || nothingNamed
  const flatRows: ResultRow[] = term
    ? [
        ...(askFirst && askRow ? [askRow] : []),
        ...appRows,
        ...medicineGroup,
        ...systemRows,
        ...(!askFirst && askRow ? [askRow] : []),
      ]
    : []
  const activeRow = flatRows[Math.min(activeIndex, flatRows.length - 1)]

  const openRow = (row: ResultRow) => {
    if (row.external) window.open(row.href, '_blank', 'noopener,noreferrer')
    else router.visit(row.href)
  }

  const handleSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (flatRows.length === 0) return
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) => (index + step + flatRows.length) % flatRows.length)
    } else if (event.key === 'Enter' && activeRow) {
      event.preventDefault()
      openRow(activeRow)
    } else if (event.key === 'Escape') {
      setQuery('')
    }
  }

  const renderRow = (row: ResultRow, index: number) => {
    const item = row.item
    const tile = item?.linkTile
    const isEasySetup = item?.label === 'Configuração rápida'
    const active = term !== '' && row === activeRow
    const staggerClass = enteringRef.current && !term ? 'row-in' : ''
    const rowClass = classNames(
      'row-link flex items-center gap-4 border-b border-border-subtle px-2 py-3.5 text-left text-text-primary hover:bg-desert-green-lighter/50',
      active && 'bg-desert-green-lighter/70'
    )
    const content = (
      <>
        <span
          className={classNames(
            'flex shrink-0 items-center text-desert-green [&_svg]:!size-6',
            tile && linkTileColor(tile.link_color).marker
          )}
        >
          {row.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{row.label}</span>
            {tile && <IconExternalLink size={14} className="shrink-0 text-text-muted" aria-label="Atalho seu" />}
            {isEasySetup && shouldHighlightEasySetup && (
              <span className="shrink-0 text-xs font-semibold text-desert-orange">Comece aqui</span>
            )}
          </span>
          <span
            className="block truncate text-sm text-text-secondary"
            title={item?.poweredBy ? `Com tecnologia de ${item.poweredBy}` : undefined}
          >
            {row.description}
          </span>
        </span>
        <IconArrowRight size={18} aria-hidden="true" className="row-arrow shrink-0 text-desert-green" />
      </>
    )

    const link = row.external ? (
      <a href={row.href} target="_blank" rel="noopener noreferrer" data-active={active} className={rowClass}>
        {content}
      </a>
    ) : (
      <Link href={row.href} data-active={active} className={rowClass}>
        {content}
      </Link>
    )

    return (
      <li
        key={row.key}
        className={classNames('group relative', staggerClass)}
        style={{ '--row-index': Math.min(index, 12) } as React.CSSProperties}
        onMouseEnter={term ? () => setActiveIndex(flatRows.indexOf(row)) : undefined}
      >
        {link}
        {tile && (
          <div className="absolute right-8 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {pendingDelete === tile.service_name ? (
              <>
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
                  className="rounded bg-surface-primary px-2 py-1 text-xs text-text-secondary hover:bg-surface-secondary"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <AppLayout>
      <Head title="Central de Comando" />
      <WhatsNewBanner />
      {rerunBanner?.show && (
        <div className="flex w-full items-center justify-center px-4 pt-4">
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
      )}

      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:pt-12">
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          {greeting()}
          <span aria-hidden="true">·</span>
          <span
            className={classNames('size-2 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-desert-orange')}
            aria-hidden="true"
          />
          {isOnline ? 'Conectado à internet' : 'Sem internet, e tudo aqui continua funcionando'}
        </p>

        <label className="mt-3 flex items-center gap-3 border-b-2 border-border-default pb-2 transition-colors focus-within:border-desert-green">
          <IconSearch size={26} aria-hidden="true" className="shrink-0 text-text-muted" />
          <span className="sr-only">Buscar ou perguntar</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleSearchKey}
            placeholder="Do que você precisa?"
            className="w-full !rounded-none border-0 bg-transparent p-0 text-2xl font-semibold text-text-primary placeholder:font-normal placeholder:text-text-muted focus:outline-none focus:ring-0 sm:text-3xl"
          />
        </label>
        {!term && (
          <p className="mt-2 text-sm text-text-muted">
            Digite um aplicativo, um medicamento ou uma pergunta para a IA.
          </p>
        )}
        {!term && (
          <div className="mt-3">
            <AiModeSwitch />
          </div>
        )}

        {term ? (
          <div className="mt-4">
            {flatRows.length > 0 ? (
              <ul aria-label="Resultados">{flatRows.map(renderRow)}</ul>
            ) : (
              <p className="py-10 text-center text-sm text-text-muted">Nada encontrado para essa busca.</p>
            )}
            <p className="mt-3 hidden text-xs text-text-muted sm:block">
              ↑ ↓ para escolher · Enter para abrir · Esc para limpar
            </p>
          </div>
        ) : (
          <>
            <ul aria-label="Aplicativos" className="mt-6 grid grid-cols-1 gap-x-10 md:grid-cols-2">
              {appRows.map(renderRow)}
            </ul>
            <nav aria-label="Sistema" className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {systemItems.map((item) => (
                <Link key={item.label} href={item.to} className="text-text-secondary hover:text-desert-green">
                  {item.label}
                  {item.label === 'Configuração rápida' && shouldHighlightEasySetup && (
                    <span className="ml-1.5 text-xs font-semibold text-desert-orange">Comece aqui</span>
                  )}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEditingTile(null)
                  setLinkModalOpen(true)
                }}
                className="flex items-center gap-1 text-text-secondary hover:text-desert-green"
              >
                <IconPlus size={15} aria-hidden="true" />
                Adicionar um link
              </button>
            </nav>
          </>
        )}

        {linkError && (
          <div className="pt-4">
            <Alert title={linkError} type="error" variant="solid" className="w-full" />
          </div>
        )}
      </div>

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
