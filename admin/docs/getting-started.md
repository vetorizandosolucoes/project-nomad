# Primeiros passos

Este guia ajuda você a aproveitar ao máximo o seu servidor.

---

## Requisitos do sistema

Se o sistema já está rodando, pode pular esta seção. Ela serve para quando você planeja um segundo servidor, muda de hardware ou ajuda outra pessoa a instalar.

### Sistema operacional

O sistema roda em Linux baseado em Debian.

| Nível de suporte | Sistema operacional |
|---|---|
| **Recomendado** | Ubuntu 26.04 LTS |
| **Também suportado** | Ubuntu 24.04 LTS, Debian 12 |
| **Suporte da comunidade** | Windows via WSL2, outros derivados do Debian |

O Ubuntu 26.04 LTS é a versão testada e recomendada para novas instalações. Se você já usa o 24.04 LTS ou o Debian 12, não precisa reinstalar, pois ambos continuam suportados.

O Ubuntu Desktop é a opção mais amigável para quem vem do Windows ou do macOS. O Ubuntu Server funciona igualmente bem se você se sente à vontade no terminal, já que tudo é acessado pelo navegador e não é preciso ter ambiente gráfico.

O macOS e distribuições fora da família Debian, como Fedora ou Arch, não têm suporte oficial.

### Hardware

O sistema em si é leve. O que define os requisitos é o conteúdo e as ferramentas que você instala, e se quer rodar IA localmente.

**Mínimo, sem IA local:**

- Processador dual-core de 2 GHz
- 4 GB de RAM
- 5 GB livres em disco, mais o espaço do conteúdo que você baixar

**Recomendado, com IA local:**

- AMD Ryzen 7 ou Intel Core i7, ou superior
- 32 GB de RAM
- NVIDIA RTX 3060 ou equivalente da AMD; mais VRAM permite rodar modelos maiores
- 250 GB ou mais livres em disco, de preferência SSD

A internet estável só é necessária durante a instalação. Depois disso, o sistema foi feito para funcionar totalmente offline.

### Sobre os drivers de GPU

O instalador configura o Docker e o NVIDIA Container Toolkit, mas **não** instala o driver da GPU. Ele precisa estar no computador antes.

No Ubuntu, o jeito mais fácil é marcar **"Install third-party drivers for graphics and Wi-Fi hardware"** durante a instalação. Se você não marcou ou adicionou a GPU depois, instale o driver e use **Reinstalar à força** no Assistente de IA, na [Loja de aplicativos](/supply-depot), para que ele passe a ser usado.

Sem GPU, o Assistente de IA continua funcionando, mas roda na CPU, o que é bem mais lento.

---

## Configuração rápida

Se é a primeira vez que você usa o sistema, a Configuração rápida ajuda a deixar tudo pronto.

**[Abrir a Configuração rápida →](/easy-setup)**

![Configuração rápida — etapa 1: escolha os recursos](/docs/easy-setup-step1.webp)

O assistente passa por estas etapas:
1. **Aplicativos** — escolha o que ativar: Biblioteca de informações, Assistente de IA e Plataforma de educação
2. **Mapas** — selecione regiões para os mapas offline
3. **Conteúdo** — escolha coleções nos níveis Essencial, Padrão ou Completo

![Níveis de conteúdo — Essencial, Padrão e Completo](/docs/easy-setup-tiers.webp)
4. **Revisar** — confirme suas escolhas e inicie os downloads

Dependendo do que você selecionou, os downloads podem demorar. Você pode acompanhar o progresso nas configurações, continuar usando o que já está instalado ou deixar o servidor ligado durante a noite nos downloads grandes.

---

## Conheça as ferramentas

### Biblioteca de informações — conhecimento offline (Kiwix)

A Biblioteca de informações guarda versões compactadas de sites e referências que funcionam sem internet.

**O que pode incluir:**
- Wikipédia em português (até completa)
- Referências médicas e guias de primeiros socorros
- Guias práticos e informações de sobrevivência
- Livros, dicionário e materiais de estudo

**Como usar:**
1. Clique em **Biblioteca de informações** na tela inicial ou na [Loja de aplicativos](/supply-depot)
2. Escolha uma coleção (como a Wikipédia)
3. Pesquise ou navegue como em um site comum

---

### Plataforma de educação — cursos offline (Kolibri)

A Plataforma de educação oferece cursos completos que funcionam offline.

**O que pode incluir:**
- Cursos em vídeo da Khan Academy
- Matemática, ciências, leitura e mais
- Acompanhamento do progresso dos alunos
- Conteúdo para todas as idades

**Como usar:**
1. Clique em **Plataforma de educação** na tela inicial ou na [Loja de aplicativos](/supply-depot)
2. Entre ou crie uma conta de aluno
3. Escolha um curso e comece a estudar

**Dica:** o Kolibri aceita vários usuários. Crie uma conta para cada pessoa da família para acompanhar o progresso individual.

---

### Assistente de IA — chat integrado

![Interface do chat de IA](/docs/ai-chat.webp)

O sistema tem um chat de IA integrado, com tecnologia do Ollama. Ele roda totalmente no seu servidor: não precisa de internet e não envia dados para lugar nenhum.

**O que ele faz:**
- Responde a perguntas sobre qualquer assunto
- Explica conceitos complexos de forma simples
- Ajuda a escrever e revisar textos
- Consulta os documentos enviados à Base de conhecimento
- Ajuda a gerar ideias e resolver problemas

**Como usar:**
1. Clique no botão de chat na Central de Comando ou vá para o [chat](/chat)
2. Digite sua pergunta ou pedido
3. A IA responde em forma de conversa

**Dica:** seja específico. Em vez de "fale sobre plantas", tente "quais hortaliças crescem bem na sombra?".

**Observação:** o Assistente de IA precisa estar instalado. Ative-o na Configuração rápida ou instale-o pela [Loja de aplicativos](/supply-depot).

**Aceleração por GPU:** se o servidor tem GPU NVIDIA, o instalador configura o suporte para você (ele instala o [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) e configura o Docker automaticamente). Basta ter o driver NVIDIA no computador. Com GPU, as respostas ficam muito mais rápidas (de 10 a 20 vezes). Se adicionar uma GPU depois, vá à [Loja de aplicativos](/supply-depot) e use **Reinstalar à força** no Assistente de IA.

---

### Base de conhecimento — IA que consulta seus documentos

![Tela de envio da Base de conhecimento](/docs/knowledge-base.webp)

A Base de conhecimento permite enviar documentos para a IA consultar ao responder. Ela usa busca semântica (RAG com Qdrant) para encontrar as informações relevantes nos seus arquivos.

**Tipos de arquivo aceitos:**
- PDFs, arquivos de texto e outros formatos de documento
- A documentação do sistema é carregada automaticamente quando o Assistente de IA é instalado

**Como usar:**
1. Vá para a **[Base de conhecimento →](/knowledge-base)**
2. Envie seus documentos (PDFs, arquivos de texto etc.)
3. Os documentos são processados e indexados automaticamente
4. Faça perguntas no chat de IA — ela consulta os documentos quando forem relevantes
5. Remova os documentos de que não precisa mais — eles são apagados do índice e do armazenamento local

**Exemplos de uso:**
- Enviar planos de emergência para consulta rápida em uma crise
- Carregar manuais técnicos e procedimentos para locais de trabalho sem internet
- Adicionar guias de currículo para ensino em casa
- Guardar artigos para trabalhos acadêmicos

---

### Mapas — navegação offline

![Visualizador de mapas offline](/docs/maps.webp)

Veja mapas sem internet. Baixe as regiões de que precisa antes de ficar offline.

**Como usar:**
1. Clique em **Mapas** na Central de Comando
2. Navegue arrastando e aproximando o mapa
3. Procure locais pelas coordenadas e pelos marcadores salvos

**Para adicionar mais regiões:**
1. Vá para **Configurações → Gerenciador de mapas**
2. Clique em **Escolher países** e selecione os países de que precisa, como o Brasil
3. Inicie o download

**Dica:** baixe os mapas das áreas para onde você viaja com frequência e também das regiões vizinhas.

**[Abrir os mapas →](/maps)**

---

## Como gerenciar o servidor

### Adicionar mais conteúdo

Você pode adicionar conteúdo a qualquer momento:

- **Mais aplicativos:** Configurações → Loja de aplicativos
- **Mais referências:** Explorador de conteúdo ou Gerenciador de conteúdo
- **Mais regiões de mapa:** Configurações → Gerenciador de mapas
- **Mais conteúdo educacional:** pelo navegador de conteúdo do próprio Kolibri

### Seletor da Wikipédia

![Explorador de conteúdo — pacotes da Wikipédia e coleções selecionadas](/docs/content-explorer.webp)

O sistema tem uma ferramenta própria para escolher e baixar pacotes da Wikipédia, oferecidos aqui em português.

**Como usar:**
1. Vá para o **[Explorador de conteúdo →](/settings/zim/remote-explorer)**
2. Veja os pacotes disponíveis, com o tamanho de cada um
3. Selecione e baixe o pacote desejado

**Observação:** escolher outro pacote da Wikipédia substitui a versão baixada antes. Só uma seleção fica ativa por vez.

### Benchmark do sistema

![Benchmark do sistema com pontuação e tag de construtor](/docs/benchmark.webp)

Teste o desempenho do hardware e compare com a comunidade.

**Como usar:**
1. Vá para o **[Benchmark do sistema →](/settings/benchmark)**
2. Escolha o tipo: completo, só o sistema ou só IA
3. Veja a pontuação geral (uma média ponderada de CPU, memória, disco e IA)
4. Crie uma tag de construtor (uma identidade, como "Tactical-Llama-1234")
5. Compartilhe os resultados no [ranking da comunidade](https://benchmark.projectnomad.us)

**Observação:** só benchmarks completos, com dados de IA, podem ir para o ranking da comunidade.

### Manter tudo atualizado

Enquanto tiver internet, verifique atualizações de tempos em tempos. Veja como funciona no **[guia de atualizações](/docs/updates)**, inclusive os cuidados desta versão personalizada.

O conteúdo (Wikipédia, mapas etc.) é atualizado separadamente do software.

### Acompanhar a saúde do sistema

1. Vá para **Configurações → Sistema**
2. Veja o uso de CPU, memória e armazenamento
3. Confira o tempo ligado e o status do sistema

---

## Dicas para melhores resultados

### Antes de ficar offline

- **Atualize tudo** — software e conteúdo
- **Baixe o que precisa** — mapas, referências e conteúdo educacional
- **Teste** — confira se tudo funciona enquanto ainda há internet para resolver problemas

### Gerenciar o armazenamento

O armazenamento é limitado. Priorize:
- o conteúdo que você vai usar de verdade;
- referências importantes (saúde, emergências);
- mapas da sua região;
- conteúdo educacional adequado às suas necessidades.

Veja o uso de armazenamento em **Configurações → Sistema**.

### Como obter ajuda

- **Documentação:** você está nela agora
- **Assistente de IA:** faça uma pergunta no [chat de IA](/chat)
- **Notas de versão:** veja as novidades de cada versão (em inglês)

---

## Próximos passos

Tudo pronto. Experimente:

1. **Pesquisar algo** — procure um assunto na Biblioteca de informações
2. **Aprender algo** — comece um curso na Plataforma de educação
3. **Fazer uma pergunta** — converse com a IA no [chat](/chat)
4. **Explorar os mapas** — encontre o seu bairro
5. **Enviar um documento** — adicione um PDF à [Base de conhecimento](/knowledge-base) e pergunte sobre ele à IA

Aproveite o seu servidor de conhecimento offline!
