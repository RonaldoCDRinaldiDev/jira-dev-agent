# Modelo de critérios de aceite para cards do Jira

Modelo recomendado para escrever os critérios de aceite dos cards. Ele é reconhecido pelo agente de Validação de Requisitos, que transforma cada resultado esperado (`Então`) em um requisito verificável.

O modelo não é obrigatório: cards fora dele também são validados, mas com menos precisão.

---

## Como escrever

- Um cenário por comportamento. Evite juntar vários comportamentos no mesmo cenário.
- `Dado` descreve o contexto (quem é o usuário, em que tela está, que dados existem).
- `Quando` descreve uma única ação.
- `Então` descreve o resultado que precisa ser observado. Use `E` para resultados adicionais do mesmo cenário.
- Escreva valores exatos: números, limites, nomes de campos, perfis e códigos de resposta.
- Coloque entre aspas os textos que devem aparecer exatamente como escritos (mensagens, rótulos, títulos).
- Inclua os cenários de erro e de lista vazia, não só o caminho feliz.
- Diga em qual frente o comportamento é implementado quando não for óbvio (Front-end, Back-end ou ambos). Cada repositório é validado separadamente.
- Liste o que não faz parte do card em "Fora do escopo".
- Se houver protótipo ou print, cite-o no card e cole a imagem ao executar a validação, informando o tipo (`esperado` ou `implementado`).

Evite termos que não podem ser verificados, como "adequado", "rápido", "amigável" ou "igual ao sistema antigo", sem dizer o que isso significa.

---

## Modelo

```text
Chave: <PROJETO-000>
Título: <título curto do card>

História:
Como <papel>, quero <objetivo>, para <benefício>.

Critérios de aceite:

Cenário 1: <nome curto do comportamento>
  Dado <contexto>
  Quando <ação>
  Então <resultado esperado>
  E <outro resultado esperado>

Cenário 2: <nome curto do comportamento>
  Dado <contexto>
  Quando <ação>
  Então <resultado esperado>

Regras de negócio:
- <regra com valores exatos>

Mensagens:
- <situação>: "<texto exato da mensagem>"

Frente:
- <Front-end | Back-end | Ambos>

Protótipos e prints:
- <descrição de cada imagem que será colada na validação>

Fora do escopo:
- <o que não será feito neste card>
```

---

## Exemplo

```text
Chave: PROJ-123
Título: Listagem de fornecedores de serviço com filtro por tipo

História:
Como administrador, quero listar os fornecedores de serviço e filtrá-los por tipo, para encontrar rapidamente quem atende a cada evento.

Critérios de aceite:

Cenário 1: Listagem ordenada
  Dado que sou um administrador na tela "Cadastro de Serviço"
  Quando a tela é carregada
  Então a lista é exibida ordenada por nome, em ordem alfabética crescente
  E são exibidos 20 itens por página

Cenário 2: Filtro por tipo de serviço
  Dado que existem fornecedores de tipos diferentes
  Quando seleciono um tipo no filtro "Tipo de serviço"
  Então somente os fornecedores desse tipo são exibidos

Cenário 3: Lista vazia
  Dado que nenhum prestador corresponde ao filtro
  Quando aplico o filtro
  Então é exibida a mensagem "Nenhum prestador encontrado"

Cenário 4: Acesso negado
  Dado que sou um usuário sem o perfil de administrador
  Quando acesso a tela "Cadastro de Serviço"
  Então sou redirecionado para a página inicial

Mensagens:
- Lista vazia: "Nenhum prestador encontrado"

Frente:
- Front-end (a ordenação e o filtro usam parâmetros já existentes da API)

Protótipos e prints:
- Imagem 1 (esperado): protótipo da listagem com o filtro no topo

Fora do escopo:
- Exportação da lista para Excel
```
