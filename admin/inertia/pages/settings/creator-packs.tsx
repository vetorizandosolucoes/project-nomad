import { Head } from '@inertiajs/react'
import SettingsLayout from '~/layouts/SettingsLayout'
import CreatorPacksSection from '~/components/CreatorPacksSection'
import ActiveDownloads from '~/components/ActiveDownloads'
import useCreatorPacks from '~/hooks/useCreatorPacks'

export default function CreatorPacksPage() {
  const { configured } = useCreatorPacks()

  return (
    <SettingsLayout>
      <Head title="Pacotes de criadores" />
      <div className="xl:pl-72 w-full">
        <main className="px-4 py-6 md:px-8">
          <h1 className="text-4xl font-semibold mb-2">Pacotes de criadores</h1>
          <p className="text-text-muted mb-4">
            Instale coleções de vídeos de criadores. Os pacotes são baixados em segundo plano e reproduzidos offline pelo Kiwix.
          </p>

          {configured ? (
            <>
              <CreatorPacksSection allowUninstall />
              <div className="mt-10">
                <ActiveDownloads filetype="zim" withHeader />
              </div>
            </>
          ) : (
            <p className="text-text-muted mt-4">
              Os pacotes de criadores não estão disponíveis nesta versão.
            </p>
          )}
        </main>
      </div>
    </SettingsLayout>
  )
}
