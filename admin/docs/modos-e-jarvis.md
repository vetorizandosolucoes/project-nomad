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

## Programa para Windows

O atalho **Vetorizando NOMAD**, na Área de Trabalho e no menu Iniciar, liga o sistema e abre tudo em uma janela própria. Ele fica como um ícone perto do relógio:

- **Abrir:** abre a janela, ligando o sistema se precisar.
- **Desligar o sistema:** desliga os serviços e o Ubuntu para poupar bateria. O sistema só volta quando você abrir o programa de novo.
- **Fechar este ícone:** tira o ícone, e o sistema continua ligado.

O programa precisa do sistema já instalado neste computador. Para recriá-lo, rode `install/windows/build.ps1`.

## Conversa por voz

Na tela do Jarvis, toque em **Conversar por voz** e libere o microfone. Depois é só falar: ele responde em voz alta, em poucas frases. Para interromper, fale por cima ou toque no círculo. O círculo fica azul quando ouve, âmbar quando pensa e claro quando fala.

- **Precisa de internet:** a fala é reconhecida pelo serviço do navegador, então o áudio passa por esse serviço (Microsoft no Edge, Google no Chrome). Sem microfone ou sem esse serviço, dá para digitar na mesma tela.
- **Velocidade:** com a chave da OpenAI, a conversa falada usa o GPT, e as perguntas e os trechos consultados vão para a OpenAI. Sem a chave, usa o modelo local.
- **Voz:** com a chave da ElevenLabs e uma voz escolhida, ele fala com essa voz. Sem elas, usa a voz do navegador.
- **Emergências:** ele continua dando todos os passos essenciais, mesmo sendo uma conversa curta. Não substitui o SAMU (192).
