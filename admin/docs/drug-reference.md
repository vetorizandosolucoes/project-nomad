# Medicamentos

A aba **Medicamentos** é uma lista offline dos medicamentos comercializados no Brasil. Ela vem pronta com o sistema, sem nada para instalar, e funciona sem internet.

> **Isto é informação de saúde, não aconselhamento médico.** A lista mostra o que existe à venda, mas não diz qual medicamento é adequado para você. Ela não substitui médico, farmacêutico ou enfermeiro. Em uma emergência, ligue para o SAMU (192).

---

## De onde vêm os dados

A base é a **lista de preços de medicamentos da CMED/Anvisa**, versão publicada em 09/10/2026. Entram só os produtos que a lista marca como comercializados em 2025, o que dá cerca de 6.300 produtos.

Alguns itens vendidos podem não aparecer, porque a lista cobre os medicamentos com preço regulado pela CMED. Produtos de notificação simplificada e homeopáticos, por exemplo, ficam de fora.

---

## O que você encontra

Para cada produto, a lista traz:

- nome comercial e princípio ativo;
- laboratório e número do registro na Anvisa;
- tipo: genérico, similar, novo, específico, biológico ou fitoterápico;
- tarja e se o uso é restrito a hospitais;
- classe terapêutica e apresentações.

**A lista não traz o texto das bulas**, então não há dose nem avisos aqui. Leia a bula que acompanha o produto ou fale com um farmacêutico. A página de cada produto tem um link para procurar a bula no Bulário Eletrônico da Anvisa, que precisa de internet.

---

## Como usar

### Pesquisar

Digite o nome comercial, o princípio ativo, o laboratório ou a classe, como "dipirona", "Advil" ou "antialérgico". Acentos e maiúsculas não fazem diferença, e você pode filtrar pelo tipo.

### Por situação

Escolha uma situação, como febre, azia ou diarreia, para ver os princípios ativos da classe terapêutica correspondente e os produtos de cada um. Produtos de uso hospitalar e de tarja preta ficam de fora.

Esse agrupamento foi feito a partir das classes terapêuticas e não passou por revisão clínica. Ele serve para saber o que existe e conversar com um profissional, não para escolher um tratamento.

---

## No chat de IA

Quando você pergunta sobre um sintoma ou medicamento, a IA consulta esta lista e cita a fonte. Ela lista as opções, mas não escolhe por você nem informa doses, porque o sistema não tem as bulas. Se a mensagem descrever uma possível emergência, ela orienta a procurar atendimento em vez de citar medicamentos.

A IA pode errar. Confira a fonte e leia a bula.

---

## Como atualizar

A lista é um arquivo que acompanha o sistema, e a CMED publica versões novas ao longo do ano. Para atualizar, é preciso gerar o arquivo de novo com o script `admin/scripts/build_br_medicines.py` e reconstruir a imagem.
