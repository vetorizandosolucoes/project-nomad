# Modos, Jarvis e conexões online

O sistema funciona de dois jeitos: com capacidade máxima quando há internet e com o menor consumo possível quando não há. Você escolhe na tela inicial ou na tela do Jarvis.

| Modo | Quando usar | O que muda |
|---|---|---|
| **Automático** | No dia a dia | Usa o Online quando há internet e o Offline quando não há |
| **Online** | Para projetos e pesquisa | Modelo local mais forte, Jarvis ligado, GPT e voz disponíveis |
| **Offline** | Sem internet ou para poupar bateria | Modelo leve, Jarvis desligado, modelo liberado da placa de vídeo um minuto depois de responder |

Sem internet, o sistema sempre entra no Offline, mesmo que o Online esteja escolhido. Com internet, você pode forçar o Offline para gastar menos bateria.

---

## Jarvis

O Jarvis é um agente baseado no projeto [OpenJarvis](https://github.com/open-jarvis/OpenJarvis). Ele consulta a biblioteca deste sistema e a lista de medicamentos, faz contas e pode pesquisar na web. Respostas úteis podem ser guardadas com **Salvar na Base de conhecimento**, e a IA passa a consultá-las, inclusive sem internet.

Ele roda em um contêiner interno, sem porta aberta na rede, e só o painel fala com ele. Por segurança, ele **não** tem ferramentas que executam comandos ou mexem em arquivos. Por ser um modelo pequeno, ele pode errar: confira o que for importante.

As contas feitas com números na própria pergunta, como "12345 vezes 6789" ou "15% de 200", são calculadas pelo sistema, e não pela IA.

---

## GPT (OpenAI)

Com uma chave da API da OpenAI, o GPT aparece na lista de modelos do Assistente de IA. A busca na biblioteca continua local: o GPT só escreve a resposta.

- A API tem **chave e cobrança próprias**, separadas da assinatura do ChatGPT.
- As perguntas e os trechos consultados são **enviados à OpenAI**. Se a conversa for sensível, escolha um modelo local.
- Se a internet ou a OpenAI falharem, a IA local responde e avisa que foi ela.

---

## Voz (ElevenLabs)

Na tela do Jarvis, em **Conexões online**, cole sua chave da ElevenLabs, ouça as vozes da sua conta e escolha uma. Depois, ligue o ícone de som.

O texto falado é enviado à ElevenLabs e gasta os créditos da sua conta. Sem internet, o Jarvis usa a voz do navegador.

---

## Sobre as chaves

As chaves ficam criptografadas no servidor, e o sistema nunca as devolve ao navegador. Mas **o sistema não tem login**: qualquer pessoa na sua rede pode abrir o painel e usar o GPT e a voz na sua conta. Use em uma rede de confiança e remova as chaves quando não precisar delas.

---

## Modelos usados

Os modelos foram escolhidos em um teste com 18 perguntas de emergência e pela leitura das respostas:

- **Offline:** `gemma4:e2b`, que gastou tão pouca energia da placa de vídeo quanto o modelo mais leve e não inventou doses nas respostas testadas.
- **Online:** `qwen3:8b`, mais cuidadoso, porém mais lento.

Você pode escolher outro modelo na lista do Assistente de IA. Ao trocar de modo, a escolha volta ao modelo recomendado.

Nenhum desses modelos substitui um profissional. O sistema entrega contas, a data de hoje e os telefones de emergência do Brasil já prontos, mas o restante vem do modelo e pode ter erros.

## Aplicativo no Windows

O sistema pode ser instalado como aplicativo, com janela, ícone e entrada próprios no menu Iniciar. Na tela inicial, toque em **Instalar como aplicativo**. 

- **Vetorizando NOMAD:** abre o aplicativo. O sistema já liga junto com o Windows.
- **Ligar Vetorizando NOMAD:** liga o sistema depois de um desligamento e abre o aplicativo.
- **Desligar Vetorizando NOMAD:** desliga os serviços e o Ubuntu para poupar bateria. Pede confirmação, e o sistema só volta com o atalho **Ligar**.

Os atalhos de ligar e desligar são criados por `install/jarvis/wake/install_wake.sh`.

## Falar com o Jarvis de qualquer lugar

Diga "Jarvis" e faça uma pausa, como com a Alexa. Você ouve um sinal, e uma animação sem fundo aparece no canto da tela, por cima do que estiver aberto, sem tirar o foco do que você está fazendo. Fale: o que você diz vai aparecendo enquanto você fala, e ele responde em voz alta, com a legenda. Depois da resposta, ele fica ouvindo por alguns segundos; se ninguém falar, a animação some.

O Jarvis fica no ícone perto do relógio, mesmo com o aplicativo fechado. Pelo ícone, você abre o aplicativo, fala com ele, liga ou desliga a escuta, escolhe se quer ver o que você fala e a resposta, e finaliza tudo.

- **Interromper:** diga "Jarvis" enquanto ele fala, ou clique na animação para encerrar. Para encerrar por voz, diga "obrigado" ou "tchau".
- **Privacidade:** a palavra, a sua fala e a voz dele são processadas no próprio computador, e o áudio não sai dele. O texto da pergunta só sai quando você usa o GPT ou pede notícias, clima e cotações.
- **Quando funciona:** nos modos Online e Automático com internet. Dá para desligar na tela do Jarvis.
- **Emergências:** ele dá todos os passos essenciais, mas não substitui o SAMU (192).

## Personalidade e memória

Na tela do Jarvis, em **Personalidade e memória**, você escolhe o modo (Mordomo elegante, Amigável, Profissional, Engraçado, Futurista, Gênio da tecnologia, Assistente corporativo ou Coach motivacional), o nome dele, como ele chama você, o humor, a formalidade, o tamanho das respostas e a velocidade da voz. Em emergências, ele deixa o estilo de lado.

Também dá para pedir falando: "me chame de Ana", "fale mais devagar", "responda mais curto", "seja mais formal", "sem piadas" ou "mude para o modo futurista". O pedido vale para as próximas conversas. A palavra para chamar continua sendo "Jarvis", mesmo se você mudar o nome dele.

O Jarvis lembra de você entre as conversas:

- **Pedindo:** diga "lembre que..." para guardar, "esqueça que..." para apagar e "o que você sabe sobre mim?" para ouvir.
- **Sozinho:** quando você conta algo duradouro sobre si, como o nome, um gosto ou um projeto, ele pode guardar. Às vezes ele guarda errado, então vale conferir a lista.
- **Controle:** na mesma tela, você vê, adiciona e apaga tudo, ou desliga a memória.
- **Privacidade:** fica só neste computador. Saúde, senhas, documentos e dados financeiros não são guardados sozinhos. Com o GPT ligado, as memórias ligadas à pergunta vão junto para a OpenAI.

## Conversa por voz na tela

Na tela do Jarvis, toque em **Conversar por voz** e libere o microfone. Depois é só falar: ele responde em voz alta, em poucas frases. Para interromper, fale por cima ou toque no círculo. O círculo fica azul quando ouve, âmbar quando pensa e claro quando fala.

- **Precisa de internet:** a fala é reconhecida pelo serviço do navegador, então o áudio passa por esse serviço (Microsoft no Edge, Google no Chrome). Sem microfone ou sem esse serviço, dá para digitar na mesma tela.
- **Velocidade:** a resposta é falada frase a frase, enquanto é gerada. A primeira resposta pode demorar uns 15 s, enquanto o modelo carrega. Com a chave da OpenAI, a conversa usa o GPT, e as perguntas e os trechos consultados vão para a OpenAI. Sem a chave, usa o modelo local.
- **Notícias, clima e cotações:** ele consulta a internet na hora (Google Notícias, wttr.in e AwesomeAPI). Os termos da pergunta vão para esses serviços.
- **Voz:** com a chave da ElevenLabs e uma voz escolhida, ele fala com essa voz. Sem elas, usa a voz mais natural do navegador; no Edge, ela é online, e o texto passa pela Microsoft.
- **Emergências:** ele continua dando todos os passos essenciais, mesmo sendo uma conversa curta. Não substitui o SAMU (192).
