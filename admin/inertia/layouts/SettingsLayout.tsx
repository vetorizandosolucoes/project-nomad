import {
  IconAdjustments,
  IconArrowBigUpLines,
  IconBox,
  IconChartBar,
  IconCode,
  IconDashboard,
  IconFolder,
  IconGavel,
  IconHeart,
  IconMapRoute,
  IconMovie,
  IconSettings,
  IconWand,
  IconZoom
} from '@tabler/icons-react'
import { usePage } from '@inertiajs/react'
import StyledSidebar from '~/components/StyledSidebar'
import { getServiceLink } from '~/lib/navigation'
import useServiceInstalledStatus from '~/hooks/useServiceInstalledStatus'
import useCreatorPacks from '~/hooks/useCreatorPacks'
import { SERVICE_NAMES } from '../../constants/service_names'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { aiAssistantName } = usePage<{ aiAssistantName: string }>().props
  const aiAssistantInstallStatus = useServiceInstalledStatus(SERVICE_NAMES.OLLAMA)
  // Only show the Creator Packs entry on builds that can actually install packs
  // (release-injected key present) — a fork built from source has no key.
  const { configured: creatorPacksConfigured } = useCreatorPacks()

  const navigation = [
    ...(aiAssistantInstallStatus.isInstalled ? [{ name: aiAssistantName, href: '/settings/models', icon: IconWand, current: false }] : []),
    { name: 'Loja de aplicativos', href: '/supply-depot', icon: IconBox, current: false },
    { name: 'Benchmark', href: '/settings/benchmark', icon: IconChartBar, current: false },
    { name: 'Explorador de conteúdo', href: '/settings/zim/remote-explorer', icon: IconZoom, current: false },
    { name: 'Gerenciador de conteúdo', href: '/settings/zim', icon: IconFolder, current: false },
    ...(creatorPacksConfigured ? [{ name: 'Pacotes de criadores', href: '/settings/creator-packs', icon: IconMovie, current: false }] : []),
    { name: 'Gerenciador de mapas', href: '/settings/maps', icon: IconMapRoute, current: false },
    {
      name: 'Registros e métricas',
      href: getServiceLink('9999'),
      icon: IconDashboard,
      current: false,
      target: '_blank',
    },
    {
      name: 'Verificar atualizações',
      href: '/settings/update',
      icon: IconArrowBigUpLines,
      current: false,
    },
    { name: 'Sistema', href: '/settings/system', icon: IconSettings, current: false },
    { name: 'Avançado', href: '/settings/advanced', icon: IconAdjustments, current: false },
    { name: 'Referência da API', href: '/reference', icon: IconCode, current: false },
    { name: 'Apoie o projeto', href: '/settings/support', icon: IconHeart, current: false },
    { name: 'Avisos legais', href: '/settings/legal', icon: IconGavel, current: false },
  ]

  return (
    <div className="min-h-screen flex flex-row bg-surface-secondary/90">
      <StyledSidebar title="Configurações" items={navigation} />
      {children}
    </div>
  )
}
