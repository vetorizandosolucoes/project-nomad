import { useState } from 'react'
import Footer from '~/components/Footer'
import ChatButton from '~/components/chat/ChatButton'
import ChatModal from '~/components/chat/ChatModal'
import useServiceInstalledStatus from '~/hooks/useServiceInstalledStatus'
import { SERVICE_NAMES } from '../../constants/service_names'
import { Link } from '@inertiajs/react'
import {
  IconApps,
  IconBook,
  IconHome,
  IconMapRoute,
  IconSettings,
} from '@tabler/icons-react'
import classNames from 'classnames'

const NAV_ITEMS = [
  { label: 'Início', href: '/home', match: '/home', icon: IconHome },
  { label: 'Aplicativos', href: '/supply-depot', match: '/supply-depot', icon: IconApps },
  { label: 'Mapas', href: '/maps', match: '/maps', icon: IconMapRoute },
  { label: 'Documentação', href: '/docs/home', match: '/docs', icon: IconBook },
  { label: 'Configurações', href: '/settings/system', match: '/settings', icon: IconSettings },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
  /** Kept for existing callers: every page now shares the same compact top bar. */
  compact?: boolean
}) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const aiAssistantInstalled = useServiceInstalledStatus(SERVICE_NAMES.OLLAMA)
  const path = window.location.pathname

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-primary/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-2.5">
          <Link href="/home" className="flex shrink-0 items-center gap-2.5">
            <img src="/vetorizando-icon.png" alt="" className="h-9 w-auto object-contain" />
            <span className="hidden text-sm font-semibold leading-tight text-text-primary sm:block">
              Vetorizando Soluções
              <span className="block text-xs font-normal text-text-muted">Central de Comando</span>
            </span>
          </Link>
          <nav aria-label="Navegação principal" className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const active = path.startsWith(item.match)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={classNames(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-desert-green text-white'
                      : 'text-text-secondary hover:bg-desert-green-lighter hover:text-text-primary'
                  )}
                >
                  <item.icon size={18} aria-hidden="true" />
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="sr-only md:hidden">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1">{children}</main>
      <Footer />

      {aiAssistantInstalled && !path.startsWith('/jarvis') && (
        <>
          <ChatButton onClick={() => setIsChatOpen(true)} />
          <ChatModal open={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </>
      )}
    </div>
  )
}
