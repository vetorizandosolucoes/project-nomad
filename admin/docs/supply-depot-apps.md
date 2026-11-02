# Aplicativos da Loja

A Loja de aplicativos é onde você instala aplicativos extras no sistema, além das ferramentas integradas. Cada aplicativo roda no próprio contêiner, totalmente offline, e mostra um botão **Abrir** quando a instalação termina.

Esta página traz o que você precisa saber para começar a usar cada aplicativo *neste sistema*: se há login, quais são as credenciais padrão, onde ficam os arquivos e o que é preciso ter em mãos. Ela não ensina a usar os aplicativos em si. Cada um é um projeto de código aberto com documentação própria, indicada em cada seção. A tela de cada aplicativo é do próprio projeto e pode estar em inglês; vários deles têm opção de idioma nas configurações.

Sobre logins: alguns aplicativos têm contas próprias. Quando um deles pede login, indicamos as credenciais iniciais e se você deve alterá-las.

---

## Como gerenciar os aplicativos

Cada aplicativo instalado tem um menu **Gerenciar** no cartão. Nele você pode usar:

- **Documentação** — abre as instruções daquele aplicativo (as mesmas seções desta página).
- **Editar** — altera portas, volumes, variáveis de ambiente e limites de memória e CPU. Funciona também nos aplicativos do catálogo, não só nos personalizados. Suas alterações são mescladas à configuração existente, então opções avançadas (como o acesso à GPU do Assistente de IA) são mantidas, e um aplicativo editado deixa de ser substituído pelas atualizações do catálogo.
- **Registros** e **Estatísticas** — mostram ao vivo os registros do aplicativo e o uso de memória e CPU, úteis quando algo não funciona bem.
- **Atualizar** e **Desinstalar** — baixa a versão mais recente ou remove o aplicativo (com a opção de apagar também a imagem). Se o novo contêiner de uma atualização não iniciar, o sistema volta automaticamente para a versão que funcionava.

**Ver a versão instalada:** cada cartão mostra a versão ao lado do nome (por exemplo, `Kiwix · 3.7.0`). Quando há uma versão mais nova, aparece um aviso de atualização no cartão.

**Links personalizados de "Abrir":** por padrão, o botão **Abrir** aponta para o aplicativo no endereço do próprio sistema. Se você usa proxy reverso ou DNS local e prefere um endereço mais amigável (por exemplo, `https://jellyfin.minharede.net`), use **Gerenciar › Definir URL personalizada**. O link original fica guardado, então você pode voltar a ele, e a alteração continua valendo depois das atualizações.

**Atualizar aplicativos automaticamente:** os aplicativos instalados podem se atualizar sozinhos. A opção tem dois níveis — uma chave geral em **Configurações → Atualização do sistema** e uma chave em cada aplicativo — e só atualizações menores e correções são aplicadas automaticamente. Veja o [guia de atualizações](/docs/updates).

---

## Como usar seu próprio aplicativo

Além do catálogo, a Loja pode rodar **seu próprio contêiner Docker** como um aplicativo gerenciado. Clique em **Adicionar aplicativo personalizado** e informe:

- a **imagem** a baixar (por exemplo, `ghcr.io/owner/app:1.2.3`);
- o **mapeamento de portas**, os **volumes**, as **variáveis de ambiente** e os **limites de memória e CPU** necessários.

Enquanto você preenche, o sistema faz uma verificação em tempo real e avisa sobre conflitos de porta ou configurações arriscadas. Alguns avisos (um registro não confiável ou uma tag `:latest`, que não permite acompanhar versões) são apenas alertas, e você pode escolher instalar mesmo assim; configurações realmente inseguras são bloqueadas.

Depois de instalado, um aplicativo personalizado se comporta como os outros: tem o mesmo menu **Gerenciar**, mostra a versão no cartão e pode receber atualizações automáticas. O sistema protege o acesso a pastas do computador e limita registros e estatísticas aos próprios contêineres, para que o aplicativo não alcance mais do que você liberou.

> Um aplicativo personalizado é de sua responsabilidade. O sistema o executa, mas não oferece instruções nem suporte para programas fora do catálogo. Consulte a documentação do próprio projeto.

---

## Stirling PDF {% #stirling-pdf %}

Uma caixa de ferramentas completa para PDFs, no seu próprio hardware. Junte e divida arquivos, converta de e para PDF, comprima, gire, adicione ou remova senhas, faça OCR de documentos digitalizados para torná-los pesquisáveis, assine, carimbe e oculte trechos. São mais de 50 ferramentas e, como tudo roda localmente, seus documentos não saem do sistema.

**Site oficial:** [stirlingpdf.com](https://stirlingpdf.com) · **Código-fonte:** [github.com/Stirling-Tools/Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF)

**Na primeira vez:** ele abre direto nas ferramentas, sem login. O Stirling foi configurado para pular a tela de login, já que é uma ferramenta pessoal na sua rede. Você verá "Guest" no canto inferior esquerdo, o que é normal.

**Atenção, ele demora para iniciar:** o Stirling PDF é um grande aplicativo Java. Depois de instalar, espere de 30 a 60 segundos até ele carregar. Ele também usa bastante memória (cerca de 1 GB).

**Quer proteger com senha?** Se preferir que o Stirling exija login (por exemplo, se várias pessoas usam o sistema), ative assim:

1. Na Loja de aplicativos, encontre o Stirling PDF e clique em **Gerenciar > Editar**.
2. Em **Variáveis de ambiente**, troque `SECURITY_ENABLELOGIN=false` por `SECURITY_ENABLELOGIN=true`.
3. Salve. O sistema recria o aplicativo, e a tela de login volta.

No primeiro login depois disso, use o usuário `admin` e a senha `stirling`. O Stirling pedirá logo para definir sua própria senha. Essa é a única forma de reativar o login: o menu de configurações do Stirling exige estar logado, então é preciso usar a tela Editar do sistema.

**Seus dados:** as configurações ficam na pasta `storage/stirling-pdf`. Os PDFs são enviados para a operação e baixados de volta para o seu dispositivo. O Stirling não é uma biblioteca de longo prazo, então não guarda seus documentos.

**De onde vêm os PDFs:** o Stirling trabalha com arquivos do dispositivo que você está usando (notebook, celular ou tablet). Você abre um PDF do seu computador, trabalha nele e baixa o resultado. Ele não acessa arquivos guardados em outras partes do sistema, como a pasta de livros, a Base de conhecimento ou o Navegador de arquivos. Se o PDF já estiver no sistema, baixe-o primeiro (pelo Navegador de arquivos, por exemplo) e depois abra a cópia no Stirling.

**Funciona offline:** todas as ferramentas de PDF rodam localmente. Alguns recursos usam internet e não funcionam desconectados: a importação do Google Drive e os links do rodapé. O OCR vem só com inglês instalado, e adicionar outros idiomas (como o português) precisa de conexão.

## Navegador de arquivos {% #file-browser %}

Um gerenciador de arquivos pelo navegador. Navegue por pastas, envie e baixe arquivos, crie pastas, renomeie, mova e apague, sem instalar nada no computador. É uma forma prática de colocar e tirar arquivos do sistema sem usar a linha de comando.

**Site oficial:** [filebrowser.org](https://filebrowser.org) · **Código-fonte:** [github.com/filebrowser/filebrowser](https://github.com/filebrowser/filebrowser)

**Na primeira vez:** aparece uma tela de login. Entre com o usuário `admin` e a senha `nomad`. **Troque essa senha imediatamente.** Ela é igual em todas as instalações, e qualquer pessoa na sua rede que a conheça pode entrar. Clique na engrenagem de configurações, abra as configurações de perfil e defina uma nova senha.

Ao contrário da maioria dos aplicativos aqui, o Navegador de arquivos mantém o login de propósito, porque pode renomear e apagar arquivos reais.

**O que você vê:** as pastas de conteúdo do sistema, em um só lugar:

- **books** - e-books, inclusive os que você quer ler no Calibre-Web
- **maps** - dados de mapas baixados
- **media** - vídeos, músicas e fotos, inclusive os que você quer no Jellyfin
- **zim** - conteúdo offline baixado, como a Wikipédia e outras bibliotecas
- **kb_uploads** - documentos adicionados à Base de conhecimento

Você pode enviar, baixar, renomear, mover e apagar dentro dessas pastas, e o que colocar no nível principal também fica salvo. As pastas internas dos aplicativos (modelos de IA, índice de pesquisa, cofre de senhas) ficam de fora de propósito, para que você não as apague sem querer.

> **Cuidado ao apagar:** o que você apaga aqui some de verdade, não há lixeira. O conteúdo baixado pode ser baixado de novo, mas um livro ou vídeo que você mesmo adicionou é perdido. Apague com o mesmo cuidado que teria no seu computador.

**Funciona offline:** totalmente. Ele roda só no sistema e não acessa a internet.

## Calibre-Web {% #calibre-web %}

Um leitor e gerenciador de biblioteca de e-books pelo navegador. Leia livros, organize por autor, série e etiquetas, e envie para um Kindle ou outro leitor. Ele usa a pasta de livros do sistema, então toda a biblioteca fica no dispositivo.

**Site oficial:** [github.com/janeczku/calibre-web](https://github.com/janeczku/calibre-web)

**Na primeira vez:** o Calibre-Web precisa de uma biblioteca, e o sistema cria uma vazia na instalação. O processo, feito uma única vez, é:

1. Abra o Calibre-Web. Ele mostra a tela **Database Configuration**.
2. No campo **Location of Calibre Database**, digite `/books` e clique em **Save**. Aparecerá "Database Settings updated", e sua biblioteca (vazia) abre.
3. Pronto. Sua biblioteca já pode ser preenchida.

Se ele pedir login, o padrão é `admin` / `admin123`. **Troque essa senha** ao entrar (clique em `admin` no canto superior direito e depois em Edit). Ela é igual em todas as instalações.

**Como adicionar livros:** o envio pela página vem desativado. Para ativar, vá em **Admin** (canto superior direito) e edite a configuração básica para permitir envios; aparecerá um botão Upload. Você também pode colocar os e-books direto na pasta de livros pelo Navegador de arquivos e usar o "scan" do Calibre-Web para encontrá-los.

**Seus dados:** a biblioteca fica na pasta `books` (a mesma do Navegador de arquivos). Fazer backup dessa pasta salva toda a coleção.

**Funciona offline:** ler e gerenciar a biblioteca funciona totalmente offline. Só o "fetch metadata", que busca capas e descrições na internet, não funciona desconectado.

## Ferramentas de TI {% #it-tools %}

Uma coleção de mais de 100 pequenos utilitários: geradores de hash, codificadores base64 e de URL, formatadores de JSON e SQL, geradores de UUID, criador de QR code, conversores de cor e muito mais. Tudo roda localmente, sem internet.

**Site oficial:** [it-tools.tech](https://it-tools.tech) · **Código-fonte:** [github.com/CorentinTh/it-tools](https://github.com/CorentinTh/it-tools)

**Na primeira vez:** abre direto nas ferramentas, sem login, conta ou configuração. Escolha uma ferramenta na barra lateral.

**Seus dados:** não há nada para gerenciar. Ele não guarda nada no sistema entre as sessões.

**Funciona offline:** todas as ferramentas rodam no navegador, a partir da cópia no sistema, e continuam funcionando offline.

## Excalidraw {% #excalidraw %}

Um quadro branco virtual para diagramas e esboços em estilo desenhado à mão. Desenhe caixas, setas e formas livres, adicione textos e imagens, e monte um fluxograma, um diagrama de rede ou uma ideia em segundos.

**Site oficial:** [excalidraw.com](https://excalidraw.com) · **Código-fonte:** [github.com/excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)

**Na primeira vez:** abre direto em uma tela em branco, sem login, conta ou configuração. Escolha uma forma na barra de ferramentas e comece. Você verá um aviso de que o trabalho fica salvo no navegador, o que leva ao ponto mais importante.

**Onde ficam os desenhos (leia esta parte):** esta versão do Excalidraw não guarda nada no sistema. O desenho fica salvo no navegador que você está usando, naquele dispositivo. Por isso:

- O desenho **não é compartilhado entre dispositivos**. O que você desenha no notebook não aparece no celular.
- Se você **limpar os dados do navegador** ou usar uma janela anônima, o desenho é perdido. Não há cópia no sistema.
- Então, **salve seu trabalho em um arquivo.** No menu (canto superior esquerdo), salve em um arquivo `.excalidraw` e guarde em um lugar seguro, como uma pasta acessível pelo Navegador de arquivos. Para retomar, use a opção de abrir e carregue o arquivo. É a única forma de guardar um desenho a longo prazo ou levá-lo para outro dispositivo.

**Seus dados:** como tudo fica no navegador, não há pastas nem credenciais para gerenciar.

**Funciona offline:** o quadro funciona offline: é possível desenhar, editar e salvar sem internet. Três observações:

- **A fonte de estilo manuscrito vem da internet.** Offline, o Excalidraw usa uma fonte comum. Os desenhos não são afetados, só a fonte na tela.
- **O Excalidraw envia estatísticas anônimas de uso quando o sistema está online.** Os criadores incluem uma contagem básica de acessos (pelo serviço Simple Analytics), que registra que o aplicativo foi aberto. Ela não vê seus desenhos e não funciona offline, mas é bom saber que existe.
- **Alguns botões são recursos da nuvem que não funcionam aqui.** "Live collaboration", "Sign up" e "Excalidraw+" apontam para o serviço pago dos criadores e precisam de internet. O mesmo vale para a galeria **Library** de formas.

## Homebox {% #homebox %}

Um sistema de inventário doméstico para controlar tudo o que você tem. Organize itens por local e etiqueta, anexe fotos, registre números de série, preços de compra, garantias e recibos, e encontre tudo pela pesquisa. É útil para seguros, garantias e para saber o que você tem e onde está.

**Site oficial:** [homebox.software](https://homebox.software) · **Código-fonte:** [github.com/sysadminsmedia/homebox](https://github.com/sysadminsmedia/homebox)

**Na primeira vez:** o Homebox abre uma tela de login, mas você ainda não tem conta, então crie uma. Clique em **Register** e preencha:

- **seu e-mail** (usado como nome de usuário);
- **seu nome**;
- **uma senha** (o Homebox mede a força da senha e só permite o cadastro com uma senha forte).

Clique em **Register** e entre com o e-mail e a senha. A primeira conta criada é a **dona** deste Homebox. Não há credenciais padrão para trocar.

**Outras pessoas usam o sistema?** Por padrão, qualquer pessoa que acesse o Homebox pode criar uma conta. Para impedir novos cadastros depois de criar a sua:

1. Crie primeiro a sua conta de dono.
2. Na Loja de aplicativos, encontre o Homebox e clique em **Gerenciar > Editar**.
3. Em **Variáveis de ambiente**, adicione `HBOX_OPTIONS_ALLOW_REGISTRATION=false`.
4. Salve. O sistema recria o aplicativo, e o botão Register deixa de criar contas. Você continua entrando normalmente.

**Seus dados:** tudo fica na pasta `storage/homebox`, em um único arquivo de banco de dados (mais as fotos e os recibos anexados). Fazer backup dessa pasta salva todo o inventário.

**Funciona offline:** totalmente. O Homebox guarda tudo localmente e não rastreia o uso. Só os links do cabeçalho (GitHub, Discord, site do projeto) precisam de internet.

## Vaultwarden {% #vaultwarden %}

Um gerenciador de senhas privado, que roda no seu sistema. É compatível com o Bitwarden, então você guarda logins, notas seguras e dados de cartão em um cofre criptografado, e acessa pelas extensões e aplicativos oficiais do Bitwarden, apontando para o seu servidor em vez da nuvem de outra empresa.

**Site oficial:** [bitwarden.com](https://bitwarden.com) (aplicativos e extensões) · **Código-fonte:** [github.com/dani-garcia/vaultwarden](https://github.com/dani-garcia/vaultwarden)

**Na primeira vez, você verá um aviso de segurança, e isso é esperado:** um gerenciador de senhas só roda em conexão segura (HTTPS), então o sistema configura o HTTPS automaticamente. Como o servidor é um dispositivo privado, e não um site público, ele usa um certificado autoassinado, e os navegadores mostram um aviso na primeira vez. Parece alarmante, mas é normal em um dispositivo da sua rede. Para passar por ele uma vez:

1. Clique em **Abrir** no cartão do Vaultwarden. O navegador mostra algo como *"Sua conexão não é particular"* ou *"Não seguro"*.
2. Clique em **Avançado** e depois em **Continuar para (endereço do seu servidor)**. Em alguns navegadores, o botão diz "Continuar" ou "Aceitar o risco".
3. O cofre do Vaultwarden abre. O navegador lembra a escolha, então o aviso não aparece de novo naquele dispositivo.

**Como criar o cofre:** na página de login, clique em **Create account** e defina um **e-mail** e uma **senha mestra**.

> **A senha mestra não pode ser recuperada.** O Vaultwarden não tem recuperação de senha, de propósito, porque nunca vê a sua senha. Se você a esquecer, o cofre e tudo o que há nele ficam bloqueados para sempre. Escolha uma senha forte que não vá perder e considere anotá-la em um lugar físico seguro.

**Outras pessoas usam o sistema?** Por padrão, qualquer pessoa que acesse o Vaultwarden pode criar uma conta (cada conta é separada e criptografada). Para impedir novos cadastros depois de criar a sua:

1. Crie primeiro a sua conta.
2. Na Loja de aplicativos, encontre o Vaultwarden e clique em **Gerenciar > Editar**.
3. Em **Variáveis de ambiente**, adicione `SIGNUPS_ALLOWED=false`.
4. Salve. O sistema recria o aplicativo e desativa novos cadastros; as contas existentes continuam funcionando.

**Como usar no celular e no navegador:** instale o aplicativo ou a extensão oficial do Bitwarden e, na tela de login, escolha **auto-hospedado** (ou "Server URL") e informe `https://(endereço do seu servidor):8480`. Alguns aplicativos de celular são mais rígidos com certificados autoassinados e podem recusar a conexão; o cofre web, aberto pelo sistema, sempre funciona.

**Seus dados:** o cofre criptografado fica na pasta `storage/vaultwarden`. Fazer backup dessa pasta salva tudo. (O painel de administração fica desativado, a menos que você defina um token de administrador.)

**Funciona offline:** totalmente, e com privacidade. O Vaultwarden roda só no sistema e não se comunica com ninguém. Os aplicativos e extensões do Bitwarden também guardam uma cópia local, então leem suas senhas mesmo com o servidor ou o celular offline.

## Jellyfin {% #jellyfin %}

Seu próprio servidor de mídia. Aponte o Jellyfin para uma pasta de filmes, séries, músicas e fotos, e ele organiza tudo com capas e detalhes e transmite para navegador, celular, tablet, smart TV ou os aplicativos do Jellyfin. É uma alternativa privada e offline aos grandes serviços de streaming, para a mídia que você já tem.

**Site oficial:** [jellyfin.org](https://jellyfin.org) · **Código-fonte:** [github.com/jellyfin/jellyfin](https://github.com/jellyfin/jellyfin)

**Na primeira vez, há um assistente de configuração**, com poucas telas:

1. **Idioma** - escolha o idioma (há português) e clique em Next.
2. **Crie a conta de administrador** - informe usuário e senha. Essa é a conta principal do servidor, então use uma senha de verdade e guarde-a. (Depois você pode adicionar outros usuários no painel, inclusive com limites para crianças.)
3. **Adicione sua mídia** - clique em **Add Media Library** e escolha um tipo de conteúdo. Para facilitar, o sistema já criou uma pasta para cada tipo dentro da pasta de mídia, então basta apontar cada biblioteca para a pasta certa:
   - Biblioteca **Movies** → pasta `Movies`
   - Biblioteca **Shows** → pasta `TV Shows`
   - Biblioteca **Music** → pasta `Music`
   - Biblioteca **Photos** → pasta `Photos`

   **Aponte cada biblioteca para a própria pasta, e não para a pasta `media` inteira.** Isso é importante: se uma biblioteca apontar para `media` (que contém todas as outras) e outra para `Music`, o Jellyfin vê os mesmos arquivos duas vezes, considera um "caminho duplicado", e suas músicas podem não aparecer, sem nenhum aviso. Você também pode pular esta etapa e adicionar bibliotecas depois, no painel.
4. **Metadados, acesso remoto e conclusão** - aceite o padrão nas telas restantes e conclua. Depois, entre com a conta que acabou de criar.

**Como adicionar mídia:** coloque os arquivos na subpasta certa da pasta **media** (a mesma do Navegador de arquivos): filmes em **Movies**, séries em **TV Shows**, músicas em **Music** (uma pasta por álbum funciona bem) e imagens em **Photos**. O mais fácil é enviar pelo Navegador de arquivos e depois clicar em **Scan Library** no Jellyfin. Ele lê subpastas, então uma pasta de álbum em **Music** vira um álbum. Nomes claros também ajudam (por exemplo, `Nome do Filme (2020).mp4`), para ele encontrar a capa e os detalhes certos.

**Seus dados:** a mídia fica em `storage/media`. As configurações, as contas e as capas baixadas ficam em `storage/jellyfin`. Seus arquivos nunca são alterados; o Jellyfin só os lê.

**Funciona offline:** assistir à sua mídia funciona totalmente offline. Só a **busca de metadados** usa internet: ao adicionar um filme ou série, o Jellyfin tenta baixar capa, descrição e elenco. Offline, os itens aparecem com o nome simples e sem capa, mas tocam normalmente. Quando voltar a ficar online, uma nova varredura preenche o que faltou.

> **Sobre o desempenho:** o Jellyfin reproduz a maioria dos arquivos sem esforço, mas, se o formato de um vídeo não for aceito pelo seu dispositivo, ele precisa convertê-lo em tempo real ("transcodificação"), o que exige muito do processador. O sistema não configura aceleração por placa de vídeo para isso, então vídeos muito grandes ou de alta resolução podem travar em um computador modesto. Arquivos em um formato bem aceito (como MP4/H.264) evitam a conversão.

## Meshtastic Web {% #meshtastic-web %}

Um painel de controle pelo navegador para dispositivos [Meshtastic](https://meshtastic.org). O Meshtastic é um sistema de mensagens por rádio de longo alcance, fora da rede: rádios LoRa pequenos e baratos formam a própria rede em malha e enviam textos e localização por quilômetros, sem celular, internet ou mensalidade. Este aplicativo serve para configurar os rádios e ler e enviar mensagens em uma tela grande.

**Site oficial:** [meshtastic.org](https://meshtastic.org) · **Código-fonte:** [github.com/meshtastic/web](https://github.com/meshtastic/web)

**É preciso ter um rádio Meshtastic.** Este aplicativo é só o painel de controle. Sozinho, ele mostra "No devices connected", porque o trabalho é feito pelo dispositivo físico e pela rede de outros rádios.

**Na primeira vez:** abre direto, sem login. Clique em **New Connection** e você verá três formas de conectar o rádio:

- **HTTP** - conecta a um rádio que já está no seu Wi-Fi, digitando o IP. **É o método a usar neste sistema** (veja abaixo).
- **Bluetooth** - pareia com um rádio próximo.
- **Serial** - conecta a um rádio ligado à porta USB.

**Detalhe importante (Bluetooth e Serial precisam de HTTPS):** os navegadores só permitem Bluetooth ou USB em páginas com conexão segura (HTTPS). O sistema serve o Meshtastic Web por HTTP simples, então **Bluetooth e Serial não conectam**. O que funciona é o **HTTP**: coloque o rádio na mesma rede Wi-Fi e conecte pelo IP. Se precisar parear por USB ou Bluetooth, use o aplicativo oficial de celular ou o site do Meshtastic.

**Seus dados:** não há nada para configurar ou guardar no sistema. As configurações ficam no próprio rádio, e as preferências do aplicativo ficam no navegador.

**Funciona offline:** totalmente, que é a ideia do Meshtastic. Só os links do rodapé precisam de internet.

## Plataforma de educação (Kolibri) {% #kolibri %}

Uma plataforma completa de aprendizado offline, da Learning Equality. O Kolibri reúne videoaulas, exercícios e leituras em canais estruturados, organiza em turmas e aulas, acompanha o progresso dos alunos e funciona sem internet. Foi feito para escolas e estudantes em lugares com pouca ou nenhuma conexão.

**Site oficial:** [learningequality.org/kolibri](https://learningequality.org/kolibri) · **Código-fonte:** [github.com/learningequality/kolibri](https://github.com/learningequality/kolibri)

**Na primeira vez, há um assistente rápido.** O Kolibri tem interface em português: escolha o idioma, o tipo de instituição e crie a **conta de administrador** (o superusuário de todo o dispositivo, então use uma senha de verdade e guarde-a). Depois, importe o conteúdo em forma de **canais**.

**Como importar conteúdo:** abra **Device → Channels → Import** e baixe canais do Kolibri Studio (online) ou importe de um disco local ou de outro dispositivo com Kolibri. Há muita coisa disponível, inclusive em português; importe só o necessário, pois os canais podem ser grandes.

**Como migrar da Plataforma de educação (versão 1):** versões anteriores traziam um Kolibri bem mais antigo (a imagem `treehouses/kolibri:0.12.8`). A versão 2 é um Kolibri mais novo e oficial, e é instalada **do zero**: canais e dados de alunos antigos **não** são levados automaticamente, porque as duas versões guardam dados de formas muito diferentes. Para importar seus canais:

1. Instale a "Plataforma de educação (versão 2)" pelo catálogo (ela roda junto com a antiga, em outra porta).
2. Abra a nova, passe pelo assistente e, no menu lateral, vá para **Device > Channels > Import**. Escolha "Local network or internet" e depois "Add new device". Informe o IP do servidor com a porta da plataforma antiga (8300 por padrão, por exemplo `http://192.168.1.36:8300`), dê um nome, clique em "Add" e depois em "Continue".
3. Selecione canais específicos da plataforma antiga, ou "Select entire channels instead" para importar tudo. Clique em "Import" para iniciar.
4. Quando tudo estiver copiado, desinstale a plataforma antiga pelo cartão dela (que tem a etiqueta **antigo**). É recomendável remover também a imagem e o volume de dados para liberar espaço, mas você pode mantê-los por um tempo, por segurança.

**Seus dados:** canais, turmas e progresso dos alunos ficam na pasta `storage/kolibri-gen2`. Fazer backup dessa pasta salva todo o Kolibri.

**Funciona offline:** totalmente, depois de importar o conteúdo. Só a importação de canais do Kolibri Studio usa internet.

## MeshCore Web {% #meshcore-web %}

Um cliente pelo navegador para rádios [MeshCore](https://meshcore.io). O MeshCore é outra opção de mensagens LoRa em malha, parecida com o Meshtastic: pequenos rádios formam a própria rede e enviam textos e localização por quilômetros, sem celular, internet ou mensalidade. Se você ainda não usa equipamentos MeshCore, o Meshtastic é o ponto de partida mais comum.

**Site oficial:** [meshcore.io](https://meshcore.io) · **Código-fonte:** [github.com/aXistem-dev/meshcore-web](https://github.com/aXistem-dev/meshcore-web) (uma versão empacotada do cliente MeshCore de Liam Cottle)

**É preciso ter um rádio MeshCore.** Como no Meshtastic, este aplicativo é só o painel de controle.

**Na primeira vez, você verá um aviso de segurança, e isso é esperado:** o MeshCore se conecta ao rádio por USB ou Bluetooth, e os navegadores só permitem isso em páginas com HTTPS. Por isso, o sistema serve este aplicativo por HTTPS com um certificado autoassinado, e os navegadores avisam na primeira vez. Para passar por ele uma vez:

1. Clique em **Abrir** no cartão do MeshCore Web. O navegador mostra algo como *"Sua conexão não é particular"* ou *"Não seguro"*.
2. Clique em **Avançado** e depois em **Continuar para (endereço do seu servidor)**. Em alguns navegadores, o botão diz "Continuar" ou "Aceitar o risco".
3. O MeshCore Web abre. O navegador lembra a escolha naquele dispositivo.

**Como conectar o rádio:** use **Chrome ou Edge**, que têm o melhor suporte a USB e Bluetooth pelo navegador. Ligue o rádio ao computador que você está usando (USB) ou deixe-o perto (Bluetooth) e conecte pelo aplicativo. O rádio se conecta **ao computador que você está usando**, e não ao servidor. Alguns celulares são mais rígidos com certificados autoassinados e podem recusar a conexão; o Chrome ou o Edge em um computador são os mais confiáveis.

**Seus dados:** não há nada para configurar ou guardar no sistema. As configurações ficam no rádio, e as preferências ficam no navegador.

**Funciona offline:** totalmente. O aplicativo fala com o rádio direto por USB ou Bluetooth, nunca pela internet.

## Biblioteca traduzida {% #offline-translation %}

Permite ler a Biblioteca de informações em outro idioma. Ao abrir um artigo, aparece no topo uma barra **Translate this page**, com um botão para cada idioma instalado e **Original** para voltar. Sua escolha continua valendo ao navegar para outros artigos.

**Por que usar isto em vez do Assistente de IA:** o Assistente de IA também traduz, mas isto é cerca de 1.600 vezes mais rápido no mesmo computador e não precisa de placa de vídeo. Também é mais cuidadoso com nomes próprios.

**Como escolher os idiomas:** francês, espanhol e alemão vêm configurados. **Para ler artigos em inglês em português, adicione `pt` à lista.** Para adicionar ou remover idiomas:

1. Na **Loja de aplicativos**, abra o menu **Gerenciar** da Biblioteca traduzida e escolha **Editar**.
2. Em **Variáveis de ambiente**, encontre `TRANSLATE_LANGS=fr,es,de`.
3. Altere a lista de códigos, separados por vírgula. Por exemplo, `TRANSLATE_LANGS=pt,es` deixa português e espanhol na lista.
4. Clique em **Salvar**. O aplicativo reinicia, baixa os novos idiomas e adiciona um botão para cada um na barra.

Adicionar um idioma precisa de internet, e cada um ocupa de cerca de 45 MB a 140 MB. Os idiomas já baixados continuam funcionando offline. Remover um código da lista não remove um idioma já baixado; ele continua em `storage/translate/models`, com seu botão.

Estes 50 idiomas estão disponíveis. O chinês ainda não está.

| Idioma | Código |
|---|---|
| Africâner | `af` |
| Árabe | `ar` |
| Basco | `eu` |
| Bengali | `bn` |
| Bósnio | `bs` |
| Búlgaro | `bg` |
| Catalão | `ca` |
| Croata | `hr` |
| Tcheco | `cs` |
| Dinamarquês | `da` |
| Holandês | `nl` |
| Estoniano | `et` |
| Finlandês | `fi` |
| Francês | `fr` |
| Galego | `gl` |
| Alemão | `de` |
| Grego | `el` |
| Guzerate | `gu` |
| Hebraico | `he` |
| Hindi | `hi` |
| Húngaro | `hu` |
| Islandês | `is` |
| Indonésio | `id` |
| Italiano | `it` |
| Japonês | `ja` |
| Canarês | `kn` |
| Coreano | `ko` |
| Letão | `lv` |
| Lituano | `lt` |
| Malaio | `ms` |
| Malaiala | `ml` |
| Marati | `mr` |
| Norueguês | `nb` |
| Persa | `fa` |
| Polonês | `pl` |
| Português | `pt` |
| Romeno | `ro` |
| Russo | `ru` |
| Sérvio | `sr` |
| Eslovaco | `sk` |
| Esloveno | `sl` |
| Espanhol | `es` |
| Sueco | `sv` |
| Tâmil | `ta` |
| Telugu | `te` |
| Tailandês | `th` |
| Turco | `tr` |
| Ucraniano | `uk` |
| Urdu | `ur` |
| Vietnamita | `vi` |

**O primeiro início precisa de internet.** Os modelos de idioma são baixados na primeira execução. Depois disso, tudo funciona offline. Se instalar sem conexão, o aplicativo inicia e a biblioteca funciona, mas sem tradução até os modelos serem baixados.

**O que não é traduzido:** tabelas e quadros informativos, o título da página na aba do navegador e os resultados de pesquisa do Kiwix. A pesquisa também continua no idioma original, então procure em inglês e traduza o artigo encontrado.

**Dois botões de idioma:** a barra de ferramentas da biblioteca tem um globo que muda os *menus* ao redor da página. A barra deste aplicativo muda o *artigo*. São coisas diferentes, e ficam próximas.

**Precisão:** esta é uma tradução automática e literal. Ela é muito boa para entender o sentido de um artigo. Tenha cuidado com termos médicos ou de segurança, em que a palavra certa em outro idioma muitas vezes não é a tradução literal.

**Seus dados:** os modelos de idioma ficam em `storage/translate/models`. Nada do que você lê é guardado ou enviado.

**Funciona offline:** sim, depois que os modelos forem baixados.
