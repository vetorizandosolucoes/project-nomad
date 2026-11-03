import { useEffect, useState } from 'react'
import { IconDownload } from '@tabler/icons-react'

type InstallPrompt = Event & { prompt: () => Promise<void> }

// Module level: the browser may fire this before the component mounts, and fires it only once.
let pendingPrompt: InstallPrompt | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    pendingPrompt = event as InstallPrompt
    listeners.forEach((listener) => listener())
  })
  window.addEventListener('appinstalled', () => {
    pendingPrompt = null
    listeners.forEach((listener) => listener())
  })
}

/** Only appears in a browser that can install the system as an app, and hides once installed. */
export default function InstallAppButton() {
  const [canInstall, setCanInstall] = useState(pendingPrompt !== null)

  useEffect(() => {
    const update = () => setCanInstall(pendingPrompt !== null)
    listeners.add(update)
    update()
    return () => {
      listeners.delete(update)
    }
  }, [])

  if (!canInstall) return null
  return (
    <button
      type="button"
      onClick={() => pendingPrompt?.prompt()}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-desert-green hover:underline"
    >
      <IconDownload size={16} aria-hidden="true" />
      Instalar como aplicativo
    </button>
  )
}
