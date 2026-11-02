import { Head, router } from '@inertiajs/react'
import AppLayout from '~/layouts/AppLayout'
import StyledButton from '~/components/StyledButton'
import Alert from '~/components/Alert'
import useInternetStatus from '~/hooks/useInternetStatus'
import useServiceInstallationActivity from '~/hooks/useServiceInstallationActivity'
import InstallActivityFeed from '~/components/InstallActivityFeed'
import ActiveDownloads from '~/components/ActiveDownloads'
import StyledSectionHeader from '~/components/StyledSectionHeader'

export default function EasySetupWizardComplete() {
  const { isOnline } = useInternetStatus()
  const installActivity = useServiceInstallationActivity()

  return (
    <AppLayout>
      <Head title="Configuração rápida concluída" />
      {!isOnline && (
        <Alert
          title="Sem conexão com a internet"
          message="Parece que você não está conectado à internet. Instalar aplicativos e baixar conteúdo exige conexão com a internet."
          type="warning"
          variant="solid"
          className="mb-8"
        />
      )}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-surface-primary rounded-md shadow-md p-6">
          <StyledSectionHeader title="Atividade de instalação de aplicativos" className=" mb-4" />
          <InstallActivityFeed
            activity={installActivity}
            className="!shadow-none border-desert-stone-light border"
          />
          <ActiveDownloads withHeader />
          <Alert
            title="Rodando em segundo plano"
            message='Você pode sair desta página a qualquer momento — as instalações e os downloads continuam em segundo plano! A Biblioteca de informações (se instalada) pode ficar indisponível até que os downloads iniciais terminem.'
            type="info"
            variant="solid"
            className='mt-12'
          />
          <div className="flex justify-center mt-8 pt-4 border-t border-desert-stone-light">
            <div className="flex space-x-4">
              <StyledButton onClick={() => router.visit('/home')} icon="IconHome">
                Ir para o início
              </StyledButton>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
