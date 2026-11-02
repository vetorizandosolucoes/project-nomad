# Complementos da comunidade

O Project NOMAD vem com um conjunto selecionado de ferramentas e conteúdo, e a comunidade criou complementos com pacotes de conteúdo offline especializados. São projetos de terceiros, não mantidos pela equipe do NOMAD. Instale por sua conta e envie erros ou pedidos ao repositório do próprio complemento.

Criou um complemento? Abra uma issue no [repositório do Project NOMAD no GitHub](https://github.com/Crosstalk-Solutions/project-nomad/issues/new) ou use o [formulário de contato do projectnomad.us](https://www.projectnomad.us/contact) para que ele seja avaliado para esta página. Os complementos listados aqui estão em inglês.

---

## Pacotes de conteúdo ZIM

Os pacotes ZIM adicionam material de referência offline à sua biblioteca do Kiwix. Em geral, eles trazem um script `install.sh` que baixa o material de origem, cria um arquivo ZIM com o `zimwriterfs` e o registra no contêiner do Kiwix em execução.

### Manuais de campo militares dos EUA

**Repositório:** [github.com/jrsphoto/ZIM-military-field-manuals](https://github.com/jrsphoto/ZIM-military-field-manuals)

Cerca de 180 manuais de campo militares dos EUA, em domínio público, sobre medicina de campo, sobrevivência, primeiros socorros em combate, leitura de mapas e mais. Vêm em um ZIM pesquisável, que entra na sua biblioteca do Kiwix.

O ZIM final tem cerca de 2 GB. O processo baixa cerca de 2 GB de PDFs de origem do archive.org.

### Arquivo de programação do W3Schools

**Repositório:** [github.com/kennethbrewer3/ZIM-w3schools-offline](https://github.com/kennethbrewer3/ZIM-w3schools-offline)

Uma cópia offline completa dos tutoriais de programação do W3Schools: HTML, CSS, JavaScript, Python, SQL e mais. É boa para aprender a programar, consultar sintaxe ou ensinar programação sem internet.

O ZIM final tem cerca de 700 MB. O processo baixa cerca de 6 GB de arquivos de origem de um espelho no GitHub.

---

## Como instalar um complemento

Cada complemento tem suas instruções, mas a maioria dos pacotes ZIM segue o mesmo formato:

1. Clone o repositório do complemento no computador do servidor, por SSH.
2. Veja no README as dependências de compilação. A maioria precisa de `git`, `python3`, `unzip` e `zim-tools`.
3. Execute o `install.sh` com a opção `--deploy`, indicando o caminho da biblioteca do Kiwix (`/opt/project-nomad/storage/zim`) e o nome do contêiner do Kiwix (`nomad_kiwix_server`).
4. O script cria o ZIM, copia para a biblioteca, registra no Kiwix e reinicia o contêiner.

Quando o script terminar, o novo conteúdo aparece na Biblioteca de informações na próxima vez que ela for carregada.

A primeira compilação pode levar de alguns minutos a mais de uma hora, conforme o tamanho do complemento e a CPU do computador.

---

## Sobre o suporte

Esses complementos são criados e mantidos pela comunidade. Se houver problema em um script de instalação ou no conteúdo de um ZIM, abra uma issue no repositório do complemento, e não no do Project NOMAD.
