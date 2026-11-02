import { Head } from '@inertiajs/react'
import SettingsLayout from '~/layouts/SettingsLayout'

export default function LegalPage() {
  return (
    <SettingsLayout>
      <Head title="Avisos legais" />
      <div className="xl:pl-72 w-full">
        <main className="px-4 py-6 md:px-8 max-w-4xl">
          <h1 className="text-4xl font-semibold mb-8">Avisos legais</h1>

          {/* License Agreement */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Contrato de licença</h2>
            <p className="text-text-primary mb-3">Copyright 2024-2026 Crosstalk Solutions, LLC</p>
            <p className="text-text-primary mb-3">
              Licensed under the Apache License, Version 2.0 (the &quot;License&quot;);
              you may not use this file except in compliance with the License.
              You may obtain a copy of the License at
            </p>
            <p className="text-text-primary mb-3">
              <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.apache.org/licenses/LICENSE-2.0</a>
            </p>
            <p className="text-text-primary">
              Unless required by applicable law or agreed to in writing, software
              distributed under the License is distributed on an &quot;AS IS&quot; BASIS,
              WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
              See the License for the specific language governing permissions and
              limitations under the License.
            </p>
          </section>

          {/* Third-Party Software */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Atribuição de software de terceiros</h2>
            <p className="text-text-primary mb-4">
              Este sistema é baseado no Project NOMAD&trade; e integra os seguintes projetos de código aberto. Agradecemos aos seus desenvolvedores e comunidades:
            </p>
            <ul className="space-y-3 text-text-primary">
              <li>
                <strong>Kiwix</strong> - Leitor offline de Wikipédia e outros conteúdos (licença GPL-3.0)
                <br />
                <a href="https://kiwix.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://kiwix.org</a>
              </li>
              <li>
                <strong>Kolibri</strong> - Plataforma de aprendizado offline da Learning Equality (licença MIT)
                <br />
                <a href="https://learningequality.org/kolibri" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://learningequality.org/kolibri</a>
              </li>
              <li>
                <strong>Ollama</strong> - Execução local de grandes modelos de linguagem (licença MIT)
                <br />
                <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://ollama.com</a>
              </li>
              <li>
                <strong>CyberChef</strong> - Ferramentas de análise e codificação de dados do GCHQ (licença Apache 2.0)
                <br />
                <a href="https://github.com/gchq/CyberChef" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://github.com/gchq/CyberChef</a>
              </li>
              <li>
                <strong>FlatNotes</strong> - Aplicativo de anotações auto-hospedado (licença MIT)
                <br />
                <a href="https://github.com/dullage/flatnotes" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://github.com/dullage/flatnotes</a>
              </li>
              <li>
                <strong>Qdrant</strong> - Mecanismo de busca vetorial para a base de conhecimento da IA (licença Apache 2.0)
                <br />
                <a href="https://github.com/qdrant/qdrant" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://github.com/qdrant/qdrant</a>
              </li>
            </ul>
          </section>

          {/* Privacy Statement */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Declaração de privacidade</h2>
            <p className="text-text-primary mb-3">
              O Project NOMAD foi criado com a privacidade como princípio central:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-primary">
              <li><strong>Sem telemetria:</strong> O sistema não coleta, transmite nem armazena dados de uso, análises ou telemetria.</li>
              <li><strong>Local primeiro:</strong> todos os seus dados, conteúdos baixados, conversas com a IA e anotações ficam no seu dispositivo.</li>
              <li><strong>Sem contas obrigatórias:</strong> o sistema funciona sem contas de usuário ou autenticação por padrão.</li>
              <li><strong>Rede opcional:</strong> a conexão com a internet só é necessária para baixar conteúdo ou atualizações. Todos os recursos instalados funcionam totalmente offline.</li>
            </ul>
          </section>

          {/* Conteúdo Disclaimer */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Aviso sobre o conteúdo</h2>
            <p className="text-text-primary mb-3">
              O Project NOMAD oferece ferramentas para baixar e acessar conteúdo de terceiros, incluindo Wikipédia, Wikibooks, referências médicas, plataformas educacionais e outros recursos públicos.
            </p>
            <p className="text-text-primary mb-3">
              A Crosstalk Solutions, LLC não cria, controla, verifica nem garante a precisão, a integridade ou a confiabilidade do conteúdo de terceiros. A inclusão de um conteúdo não significa endosso.
            </p>
            <p className="text-text-primary">
              Cabe a quem usa avaliar a adequação e a precisão do conteúdo que baixa e utiliza.
            </p>
          </section>

          {/* Medical Disclaimer */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Aviso sobre informações médicas e de emergência</h2>
            <p className="text-text-primary mb-3">
              Parte do conteúdo disponível inclui referências médicas, guias de primeiros socorros e informações de preparação para emergências. Esse conteúdo é apenas informativo.
            </p>
            <p className="text-text-primary mb-3 font-semibold">
              Estas informações NÃO substituem aconselhamento, diagnóstico ou tratamento médico profissional.
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-primary mb-3">
              <li>Sempre procure orientação de profissionais de saúde qualificados sobre condições médicas.</li>
              <li>Nunca ignore a orientação médica profissional nem adie buscá-la por causa de algo que você leu no conteúdo offline.</li>
              <li>Em uma emergência médica, ligue imediatamente para o serviço de emergência, se disponível.</li>
              <li>As informações médicas podem ficar desatualizadas. Sempre que possível, confirme dados importantes em fontes profissionais atuais.</li>
            </ul>
          </section>

          {/* Data Storage Notice */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Armazenamento de dados</h2>
            <p className="text-text-primary mb-3">
              Todos os dados do sistema ficam armazenados localmente no seu dispositivo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-primary">
              <li><strong>Pasta de instalação:</strong> /opt/project-nomad</li>
              <li><strong>Conteúdo baixado:</strong> /opt/project-nomad/storage</li>
              <li><strong>Dados do aplicativo:</strong> armazenados em volumes do Docker no seu sistema</li>
            </ul>
            <p className="text-text-primary mt-3">
              Você mantém controle total sobre seus dados. Desinstalar o sistema ou apagar estas pastas remove permanentemente todos os dados associados.
            </p>
          </section>

        </main>
      </div>
    </SettingsLayout>
  )
}
