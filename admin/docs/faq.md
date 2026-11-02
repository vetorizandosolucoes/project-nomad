# Perguntas frequentes

## Perguntas gerais

### O que é este sistema?
É um servidor pessoal que dá acesso a conhecimento, educação e assistência de IA sem precisar de internet. Ele roda no seu próprio hardware, mantendo seus dados privados e sempre disponíveis. É baseado no Project NOMAD.

### Preciso de internet para usar?
Não, essa é a ideia. Depois que o conteúdo é baixado, tudo funciona offline. Só é preciso internet para:
- baixar novos conteúdos;
- atualizar o software;
- sincronizar as versões mais recentes da Wikipédia, dos mapas etc.

### Qual sistema operacional é necessário?
Linux baseado em Debian. **O Ubuntu 26.04 LTS é o recomendado e testado** para novas instalações.

O Ubuntu 24.04 LTS e o Debian 12 também são suportados, então não é preciso reinstalar se você já usa um deles. No Windows, siga o [guia do WSL2](https://www.projectnomad.us/install/wsl2) (em inglês), mantido pela comunidade.

O macOS e distribuições fora da família Debian, como Fedora ou Arch, não têm suporte oficial. Não é preciso ambiente gráfico, então o Ubuntu Server é uma boa opção se você se sente à vontade no terminal.

Para o passo a passo completo, incluindo a instalação do Ubuntu, veja o [guia de instalação](https://www.projectnomad.us/install) (em inglês).

### De qual hardware preciso?
O sistema foi pensado para hardware capaz, principalmente se você quer usar IA. Recomendado:
- CPU moderna com vários núcleos (o AMD Ryzen 7 com gráficos Radeon é o mais popular na comunidade)
- 16 GB de RAM ou mais (32 GB ou mais para o melhor desempenho de IA)
- SSD (o tamanho depende do conteúdo — mínimo de 500 GB, recomendado 1 TB ou mais)
- GPU NVIDIA ou AMD para respostas de IA mais rápidas

**Para recomendações detalhadas em três faixas de preço (US$ 150 a mais de US$ 1.000), veja o [guia de hardware](https://www.projectnomad.us/hardware) (em inglês).**

### De quanta RAM preciso?

**Sem o Assistente de IA, o sistema inteiro fica abaixo de 1 GB.** Medido em uma instalação em uso: Central de Comando 241 MB, MySQL 444 MB, Redis 9 MB, Kiwix 101 MB e índice da base de conhecimento 155 MB. Por isso 4 GB é um mínimo real, e não uma margem de segurança.

**O que varia é a IA, e depende do modelo.** O Ollama ocioso usa cerca de 1,2 GB, e um modelo precisa de memória próxima ao tamanho do download enquanto responde; um modelo de 8B, com cerca de 4,6 GB, pede mais ou menos isso a mais. **8 GB funcionam com um modelo pequeno, 16 GB são confortáveis, e 32 GB são o recomendado para modelos maiores.**

De onde vem essa memória depende do hardware. Com GPU dedicada, o modelo vai para a VRAM e não usa a RAM do sistema, então é a VRAM que limita os modelos possíveis. Com GPU integrada ou sem GPU, a memória sai da RAM do sistema, por isso um computador só com CPU precisa de mais RAM.

Se estiver usando WSL2 e tiver vários aplicativos instalados, pare os que não usa, para deixar memória livre para o Windows.

### De quanto armazenamento preciso?

**Para instalar o sistema: cerca de 5 GB, então deixe 10 GB livres.** Isso cobre a Central de Comando e o banco de dados, sem conteúdo. Com o Assistente de IA, o total chega a cerca de 25 GB, porque o Ollama e um modelo de uso geral são grandes.

Depois disso, depende do que você baixar:
- Wikipédia em português: de cerca de 145 MB até cerca de 19 GB, conforme o pacote
- Cursos da Khan Academy: cerca de 50 GB
- Referências médicas: cerca de 500 MB
- Mapa de um país: varia bastante (o Brasil completo tem cerca de 4,3 GB)
- Modelos de IA: de 10 a 40 GB, conforme o modelo

Comece pelo essencial e adicione mais conforme precisar.

---

## Perguntas sobre conteúdo

### Como adiciono mais conteúdo da Wikipédia?
1. Vá para o **Explorador de conteúdo**, em **Configurações**
2. Veja os pacotes da Wikipédia disponíveis
3. Selecione o pacote desejado e baixe

No Explorador de conteúdo você também encontra outros arquivos ZIM além da Wikipédia, com filtro por idioma.

### Como adiciono mais cursos?
1. Abra o **Kolibri**
2. Entre como administrador
3. Vá para **Device → Channels**
4. Veja e importe os canais disponíveis

### O conteúdo está atualizado?
Ele é tão atual quanto o último download. As versões da Wikipédia costumam ser renovadas todo mês. Veja as datas nos nomes ou nas descrições dos arquivos.

### Posso adicionar meus próprios arquivos?
Sim, com a Base de conhecimento. Envie PDFs, arquivos de texto e outros documentos à [Base de conhecimento](/knowledge-base), e a IA poderá consultá-los ao responder, usando busca semântica.

No Kiwix, o sistema usa arquivos ZIM padrão. No conteúdo educacional, o Kolibri usa seu próprio formato de canais.

### O que são os níveis das coleções?
Na Configuração rápida ou no Explorador de conteúdo, as coleções têm três níveis:
- **Essencial** — o conteúdo básico da categoria (menor download)
- **Padrão** — o Essencial mais conteúdo adicional útil
- **Completo** — tudo o que há na categoria (maior download)

Assim você equilibra a quantidade de conteúdo e o espaço usado.

### Por que há categorias marcadas "em inglês"?
Boa parte das coleções disponíveis só existe em inglês. A categoria **Biblioteca em português** reúne as opções em português.

---

## Perguntas sobre IA

### Como uso o chat de IA?
1. Vá para o [chat de IA](/chat) a partir da Central de Comando
2. Digite sua pergunta ou pedido
3. A IA responde em forma de conversa

A IA precisa estar instalada — ative-a na Configuração rápida ou instale-a pela [Loja de aplicativos](/supply-depot).

### Como envio documentos para a Base de conhecimento?
1. Vá para a **[Base de conhecimento →](/knowledge-base)**
2. Envie seus documentos (PDFs, arquivos de texto etc.)
3. Os documentos são processados e indexados automaticamente
4. Faça perguntas no chat de IA — ela consulta os documentos quando forem relevantes

Você também pode remover documentos de que não precisa mais.

A documentação do sistema é adicionada automaticamente à Base de conhecimento quando o Assistente de IA é instalado.

### O que é o benchmark do sistema?
Ele testa o desempenho do hardware e gera uma pontuação geral — uma média ponderada de CPU, memória, disco e IA. Você pode criar uma tag de construtor (uma identidade como "Tactical-Llama-1234") e compartilhar os resultados no [ranking da comunidade](https://benchmark.projectnomad.us).

Vá para o **[Benchmark do sistema →](/settings/benchmark)** para executar.

### O que é o acesso antecipado?
Ele permite receber versões candidatas, com recursos novos, antes da versão estável. Ative ou desative em **Configurações → Atualização do sistema**. Essas versões podem ter erros; se prefere estabilidade, fique no canal estável.

---

## Solução de problemas

### Um recurso não carrega ou mostra uma página em branco

**Tente o seguinte:**
1. Espere 30 segundos — alguns recursos demoram para iniciar
2. Recarregue a página (Ctrl+R ou Cmd+R)
3. Volte à Central de Comando e tente de novo
4. Em **Configurações → Sistema**, veja se o serviço está em execução
5. Tente reiniciar o serviço (Parar e depois Iniciar, na Loja de aplicativos)

### O mapa mostra uma área cinza ou em branco

Os mapas precisam de dados baixados. Se aparecer uma área em branco:
1. Vá para **Configurações → Gerenciador de mapas**
2. Baixe as regiões da sua área
3. Espere os downloads terminarem
4. Volte aos mapas e recarregue a página

### ERROR: Failed to load the XML library file '/data/kiwix-library.xml'

Em geral, isso significa que a Biblioteca de informações iniciou antes de o índice do Kiwix estar pronto.

Para recuperar:
1. Vá para a **[Loja de aplicativos](/supply-depot)**
2. Pare a **Biblioteca de informações (Kiwix)**
3. Espere de 10 a 15 segundos e inicie de novo
4. Se o erro continuar, use **Reinstalar à força** na mesma página

Depois, recarregue a página da Biblioteca de informações.

### As respostas da IA estão lentas

A IA local exige bastante poder de processamento. Para melhorar:
- **Adicione uma GPU** — uma GPU NVIDIA com o NVIDIA Container Toolkit pode deixar a IA de 10 a 20 vezes mais rápida, ou mais
- Feche outros programas no servidor
- Garanta boa refrigeração (o superaquecimento reduz o desempenho)
- Se possível, use um modelo de IA menor e mais rápido

### Como ativo a aceleração por GPU para a IA?

O sistema detecta GPUs NVIDIA automaticamente quando o NVIDIA Container Toolkit está instalado no computador. Para configurar:

1. **Instale uma GPU NVIDIA** no servidor (se ainda não houver)
2. **Instale o NVIDIA Container Toolkit** — siga o [guia oficial](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) (em inglês)
3. **Reinstale o Assistente de IA** — na [Loja de aplicativos](/supply-depot), encontre o Assistente de IA e use **Reinstalar à força**

O sistema detecta a GPU na instalação e configura a IA automaticamente. Você verá "NVIDIA container runtime detected" no progresso da instalação.

**Dica:** execute o [benchmark do sistema](/settings/benchmark) antes e depois para ver a diferença. Sistemas com GPU costumam passar de 100 tokens por segundo, contra 10 a 15 só com CPU.

### Adicionei ou troquei a GPU, mas a IA continua lenta

Ao adicionar ou trocar a GPU, é preciso reconfigurar o contêiner da IA:

1. Confira se o **NVIDIA Container Toolkit** está instalado no computador
2. Vá para a **[Loja de aplicativos](/supply-depot)**
3. Encontre o **Assistente de IA** e use **Reinstalar à força**

Isso recria o contêiner com suporte a GPU. Sem esse passo, a IA continua rodando só na CPU.

### Aparece um aviso de GPU inacessível

O sistema verifica se a GPU está realmente acessível dentro do contêiner da IA. Se ela foi detectada no computador, mas não funciona no contêiner, aparece um aviso nas páginas de informações do sistema e de configurações da IA. Clique em **Corrigir: reinstalar Assistente de IA** para recriar o contêiner com o acesso correto. Os modelos baixados são mantidos.

### O chat de IA não está disponível

O chat precisa do Assistente de IA instalado:
1. Vá para a **[Loja de aplicativos](/supply-depot)**
2. Instale o **Assistente de IA**
3. Espere a instalação terminar
4. O chat ficará disponível na tela inicial ou em [Chat](/chat)

### O envio para a Base de conhecimento travou

1. Veja se o Assistente de IA está em execução na **Loja de aplicativos**
2. Documentos grandes demoram — espere alguns minutos
3. Tente enviar um documento menor para confirmar que tudo funciona
4. Veja se há mensagens de erro em **Configurações → Sistema**

### O benchmark não é enviado ao ranking

Para compartilhar no ranking da comunidade:
- Execute um **benchmark completo** (não só o sistema ou só IA)
- O benchmark precisa ter resultados de IA (o Assistente de IA precisa estar instalado e funcionando)
- A pontuação precisa ser maior que a de envios anteriores do mesmo hardware

Se o envio falhar, leia os detalhes na mensagem de erro.

### "Service unavailable" ou erros de conexão

O serviço ainda pode estar iniciando. Espere 1 a 2 minutos e tente novamente.

Se o problema continuar:
1. Vá para a **Loja de aplicativos**
2. Encontre o serviço com problema
3. Clique em **Reiniciar**
4. Espere 30 segundos e tente novamente

### Os downloads travam ou falham

1. Verifique a sua internet
2. Em **Configurações**, veja o armazenamento disponível
3. Se estiver cheio, apague o conteúdo que não usa
4. Cancele o download travado e tente novamente

### O servidor não inicia

Se não conseguir acessar a Central de Comando:
1. Confira se o computador está ligado
2. Verifique a conexão de rede
3. Tente acessar diretamente pelo IP do servidor
4. Se tiver acesso ao terminal, veja os registros do servidor

### Esqueci a senha do Kolibri

As senhas do Kolibri são gerenciadas à parte:
1. Se você é administrador, pode redefinir senhas no gerenciamento de usuários do Kolibri
2. Se esqueceu a senha de administrador, talvez seja preciso redefini-la pela linha de comando

---

## Atualizações e manutenção

### Como atualizo o sistema?
Veja o **[guia de atualizações](/docs/updates)**. Atenção: esta versão personalizada usa uma imagem local do painel, e a atualização pelo sistema pode não se aplicar a ela ou trazer de volta a versão original, em inglês.

### Devo atualizar com frequência?
Sim, enquanto tiver internet. As atualizações trazem correções de erros, novos recursos, melhorias de segurança e de desempenho.

### O sistema pode se atualizar sozinho?
Sim. Software, aplicativos e conteúdo podem se atualizar sozinhos. As atualizações automáticas **vêm desativadas**: você ativa o que quiser em **Configurações → Atualização do sistema** (e, nos aplicativos, em cada um na Loja de aplicativos). Elas só rodam na janela de horário escolhida, depois das verificações de segurança, e nunca aplicam versões principais.

### Como atualizo o conteúdo (Wikipédia etc.)?
O conteúdo é atualizado separadamente do software:
1. Vá para o **Gerenciador de conteúdo** ou o **Explorador de conteúdo**
2. Veja se há versões mais novas do conteúdo instalado
3. Baixe as versões atualizadas

Você também pode ativar as **atualizações automáticas de conteúdo** — veja o [guia de atualizações](/docs/updates).

Dica: novas versões da Wikipédia saem aproximadamente todo mês.

### O que acontece se uma atualização falhar?
O sistema foi feito para se recuperar. Se uma atualização falhar:
1. A versão anterior deve continuar funcionando
2. Tente de novo mais tarde
3. Veja as mensagens de erro em **Configurações → Sistema**

### Manutenção pela linha de comando

Para resolver problemas avançados ou quando a interface não abre, há scripts em `/opt/project-nomad`:

**Iniciar todos os serviços:**
```bash
sudo bash /opt/project-nomad/start_nomad.sh
```

**Parar todos os serviços:**
```bash
sudo bash /opt/project-nomad/stop_nomad.sh
```

**Atualizar a Central de Comando:**
```bash
sudo bash /opt/project-nomad/update_nomad.sh
```
*Observação: isso atualiza só a Central de Comando, não os aplicativos. Atualize os aplicativos pela interface. Nesta versão personalizada, veja o aviso no [guia de atualizações](/docs/updates) antes de usar.*

**Desinstalar:**
```bash
curl -fsSL https://raw.githubusercontent.com/Crosstalk-Solutions/project-nomad/refs/heads/main/install/uninstall_nomad.sh -o uninstall_nomad.sh
sudo bash uninstall_nomad.sh
```
*Atenção: isso não pode ser desfeito. Todos os dados serão apagados.*

---

## Privacidade e segurança

### Meus dados são privados?
Sim. O sistema roda totalmente no seu hardware. Suas pesquisas, conversas com a IA e dados de uso não saem do servidor.

### Outras pessoas podem acessar meu servidor?
Por padrão, o sistema fica acessível na rede local, e não tem login: qualquer pessoa na mesma rede pode acessá-lo. Em redes públicas, adote medidas adicionais de segurança e não exponha o servidor diretamente à internet.

### A IA envia dados para algum lugar?
Não. A IA roda totalmente no local. Suas conversas não são enviadas a nenhum serviço externo.

---

## Mais ajuda

### A IA pode ajudar
Faça uma pergunta no [chat de IA](/chat). A IA local responde sobre muitos assuntos, inclusive problemas técnicos, e também pode consultar a documentação do sistema na Base de conhecimento.

### Consulte a documentação
Você já está nela. Use o menu para encontrar outros assuntos.

### Participe da comunidade
Peça ajuda a outras pessoas no **[Discord do projeto original](https://discord.com/invite/crosstalksolutions)** (em inglês).

### Notas de versão
Veja o que mudou em cada versão: **[notas de versão](/docs/release-notes)** (em inglês).
