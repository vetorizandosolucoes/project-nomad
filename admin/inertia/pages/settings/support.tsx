import { Head } from '@inertiajs/react'
import { IconExternalLink } from '@tabler/icons-react'
import SettingsLayout from '~/layouts/SettingsLayout'

export default function SupportPage() {
  return (
    <SettingsLayout>
      <Head title="Apoie o projeto" />
      <div className="xl:pl-72 w-full">
        <main className="px-4 py-6 md:px-8 max-w-4xl">
          <h1 className="text-4xl font-semibold mb-4">Apoie o projeto</h1>
          <p className="text-text-muted mb-10 text-lg">
            Este sistema é baseado no Project NOMAD, 100% gratuito e de código aberto — sem assinaturas nem cobranças. Se quiser ajudar o projeto original a continuar, veja algumas formas de apoiar.
          </p>

          {/* Ko-fi */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-3">Pague um café para nós</h2>
            <p className="text-text-muted mb-4">
              Cada contribuição ajuda a financiar o desenvolvimento, os custos de servidor e novos pacotes de conteúdo do Project NOMAD. Até uma pequena doação faz diferença.
            </p>
            <a
              href="https://ko-fi.com/crosstalk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5E5B] hover:bg-[#e54e4b] text-white font-semibold rounded-lg transition-colors"
            >
              Apoie no Ko-fi
              <IconExternalLink size={18} />
            </a>
          </section>

          {/* Rogue Support */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-3">Precisa de ajuda com a sua rede doméstica?</h2>
            <a
              href="https://rogue.support"
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-4 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img
                src="/rogue-support-banner.webp"
                alt="Rogue Support — Conquiste sua rede doméstica"
                className="w-full"
              />
            </a>
            <p className="text-text-muted mb-4">
              O Rogue Support é um serviço de consultoria de redes para usuários domésticos, ligado ao projeto original — ajuda especializada quando você precisar.
            </p>
            <a
              href="https://rogue.support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
            >
              Visite o Rogue.Support
              <IconExternalLink size={16} />
            </a>
          </section>

          {/* Other Ways to Help */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-3">Outras formas de ajudar</h2>
            <ul className="space-y-2 text-text-muted">
              <li>
                <a
                  href="https://github.com/Crosstalk-Solutions/project-nomad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Dê uma estrela ao projeto no GitHub
                </a>
                {' '}— isso ajuda mais pessoas a conhecer o projeto
              </li>
              <li>
                <a
                  href="https://github.com/Crosstalk-Solutions/project-nomad/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Relate erros e sugira recursos
                </a>
                {' '}— cada relato melhora o projeto
              </li>
              <li>Compartilhe com alguém que possa usar — a indicação boca a boca é a melhor divulgação</li>
              <li>
                <a
                  href="https://discord.com/invite/crosstalksolutions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Entre na comunidade do Discord
                </a>
                {' '}— converse, mostre sua configuração e ajude outras pessoas
              </li>
            </ul>
          </section>

        </main>
      </div>
    </SettingsLayout>
  )
}
