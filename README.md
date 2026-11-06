<p align="center">
  <img src="docs/img/banner.svg" alt="jira-dev-agent" width="100%" />
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A522-339933?logo=node.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="Fastify" src="https://img.shields.io/badge/Fastify-4-000000?logo=fastify&logoColor=white">
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-privado-fb8c3c">
</p>

> Ferramenta **local** que reúne, numa tela só, as notificações do Jira, o controle de horas, um agente de desenvolvimento com IA e o code review. Cada ação que mexe em código passa pela sua aprovação.

> As imagens abaixo usam **dados fictícios** (projeto `ACME`, pessoas e tasks inventadas) só para ilustrar o uso.

---

## O que é e por que

No dia a dia o desenvolvedor fica **pulando entre ferramentas**: Jira, editor, cronômetro, IA no terminal, GitHub no navegador. Cada troca custa tempo e atenção.

O **jira-dev-agent** junta tudo num **cockpit local**. E, ao contrário da maioria dos agentes de IA que fazem tudo sozinhos, aqui a regra é o **seu controle**: a IA mostra o que está fazendo e **espera o seu OK** antes de qualquer alteração.

---

## O fluxo completo — da notificação ao PR

Tudo começa na aba **Notificações**. A partir de um aviso, uma coisa puxa a outra — e você só precisa aprovar o que mexe em código. Passo a passo:

1. **Chega uma mudança no Jira** (novo status, um comentário, uma task nova) e ela aparece no feed.
2. Você clica em **Enviar ao agente**. Nesse clique acontecem duas coisas sozinhas: o **cronômetro liga** (aba Horas) e a task **abre no chat do Agente** já com todo o contexto da issue.
3. No **chat**, o agente faz o levantamento, te explica o plano e **vai codando — mas pede sua permissão antes de cada alteração**. Você acompanha tudo em tempo real, e a cada resposta ele fecha com um resumo **Feito / Falta / Status**, então você nunca fica perdido.
4. Quando o trabalho está pronto, você manda **finalizar**. O agente **pede uma última confirmação** e, com o seu "sim", fecha a task de ponta a ponta sem você precisar fazer nada manual:
   - **commita** as mudanças aprovadas,
   - **abre o Pull Request**,
   - **move a task no Jira** (para Code Review / concluído),
   - **comenta a resolução** na própria issue,
   - e **lança as horas** trabalhadas no Jira.
5. **Code review é a mesma ideia.** Quando *você* é quem revisa, clica em **Enviar ao review**: o agente lê o *Change Set* (sua branch × a branch base), roda as checagens e te dá um **veredito** (passou ou precisa de ajuste). Dali, com um clique, você **aprova/mergeia o PR** e **move o status** no Jira.

Resumindo: **você decide, o agente faz o trabalho chato e te mostra cada passo** — da primeira notificação até o PR aberto e as horas lançadas, sem sair desta tela.

> **Por que não é 100% automático?** Tecnicamente, dá para deixar esse agente totalmente autônomo — ele recebe a notificação, desenvolve, commita, abre o PR e fecha a task sozinho, sem ninguém no meio. **Foi uma decisão não fazer assim (ainda).** A proposta aqui é *aumentar a produtividade sem abrir mão do controle*: a IA faz o trabalho pesado, mas quem mexe em código só avança com o seu OK, e você revisa cada etapa. Isso evita erros passando direto e mantém você no comando. A automação total fica como um próximo passo possível — ligável quando a confiança no fluxo estiver madura.

---

## Funcionalidades

### 🔔 Notificações — a base de tudo

O feed do seu Jira em tempo real: mudanças de status, comentários, troca de responsável e novas issues — mostrando **quem fez** cada coisa e o **épico/pai** da task. É daqui que tudo parte: em cada item você pode **Enviar ao agente** ou **Enviar ao review** (o que já liga o cronômetro e abre a task na aba certa), **marcar como lida** ou **excluir**.

<img src="docs/img/feat-notificacoes.svg" alt="Aba Notificações" width="100%" />

### ⏱ Horas — timesheet automático

Conta o tempo de trabalho **pela branch do git** (ex.: `feature/ACME-312`), descontando ociosidade. Você inicia/para a sessão, e ao **commitar** na branch da task as horas são **lançadas no Jira** sozinhas.

<img src="docs/img/feat-horas.svg" alt="Aba Horas" width="100%" />

### 🤖 Agente de desenvolvimento — chat com portões

Uma conversa ao vivo, como no Claude Code, só que nesta tela: o agente **lê o código**, mostra **o que está fazendo** (arquivos que lê, comandos que roda), explica o plano e **pede sua permissão antes de editar ou commitar**. Ele responde no padrão **Feito / Falta / Status** e segue o `AGENT.md` + o `CLAUDE.md` do repositório.

<img src="docs/img/feat-agente.svg" alt="Aba Agente (chat)" width="100%" />

No começo da task, o agente faz um **levantamento detalhado** — lê o código envolvido (sem alterar nada), aponta a causa e propõe um plano objetivo, e só começa a codar depois do seu OK:

<img src="docs/img/feat-agente-inicio.svg" alt="Agente fazendo o levantamento da task" width="100%" />

Na hora de fechar, você manda o agente **finalizar** e ele executa tudo no chat — commit, push, abre o PR, move a task no Jira e lança as horas — terminando com o resumo **Feito / Falta / Status**:

<img src="docs/img/feat-agente-finalizar.svg" alt="Agente finalizando a task" width="100%" />

### 🔍 Code Review — revisão automática

Um agente **read-only** que revisa o *Change Set* (sua branch × a branch base), roda as skills de revisão (segurança, arquitetura, testes, impacto…) e entrega os **findings com severidade** e um **veredito**. Dali você pode **analisar / aprovar o PR** e **mover o status** no Jira.

<img src="docs/img/feat-review.svg" alt="Aba Code Review" width="100%" />

---

## Como funciona

Um **cockpit local**: um backend (Node/TypeScript) que fala com o seu Jira, o seu git e a IA, e uma tela (React).

```mermaid
flowchart LR
  subgraph PC["Sua máquina"]
    UI["Tela (React)"] <--> API["Backend (Fastify)"]
    API <--> GIT["Seu repositório git"]
    API <--> IA["Claude (Agent SDK)"]
  end
  API <--> JIRA["Jira Cloud (sua conta)"]
```

Tudo nasce na aba **Notificações** e cascateia para as outras:

```mermaid
flowchart TD
  N["🔔 Notificações"] -->|Enviar ao agente| A["🤖 Agente"]
  N -->|Enviar ao review| R["🔍 Code Review"]
  N -->|liga o cronômetro| H["⏱ Horas"]
  A -->|ao commitar| H
```

No agente, o trabalho mecânico de git/Jira é automático; **o que mexe em código pede seu OK**:

```mermaid
flowchart LR
  P["Levantamento"] -->|seu OK| S["Inicia task<br/>(branch + status)"]
  S --> D["Propõe diff"]
  D -->|seu OK| C["Commit"]
  C --> PR["Abre PR"]
  PR --> J["Move no Jira + horas"]
  classDef gate fill:#3a2912,stroke:#fb8c3c,color:#ffd3ae;
  classDef auto fill:#123020,stroke:#4fd08a,color:#a7f3d0;
  class P,D,C gate
  class S,PR,J auto
```

---

## Como clonar e usar (em qualquer máquina)

> Pré-requisitos: **git**, **nvm**, e uma conta no **Jira Cloud**. Para a IA, uma assinatura do **Claude**.

```sh
# 1. clonar
git clone <url-do-seu-repositorio> jira-dev-agent
cd jira-dev-agent

# 2. Node 22 (não afeta o Node dos seus outros projetos)
nvm install 22
nvm use 22

# 3. dependências (backend e tela)
npm install
npm --prefix web install

# 4. configuração
cp .env.example .env
#   edite o .env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN

# 5. (opcional) ligar a IA do agente
npm install -g @anthropic-ai/claude-code
claude setup-token
#   cole o token em CLAUDE_CODE_OAUTH_TOKEN no .env

# 6. rodar
npm start
```

Abra **http://127.0.0.1:7788**. Pronto.

> `npm start` monta a tela e sobe o servidor juntos. Para desenvolver com recarga automática: `npm run dev` (backend) e `npm --prefix web run dev` (tela), em dois terminais.

## Configuração (`.env`)

| Variável | Para quê |
|---|---|
| `JIRA_BASE_URL` | URL do seu Jira (`https://suaempresa.atlassian.net`) |
| `JIRA_EMAIL` | seu e-mail Atlassian |
| `JIRA_API_TOKEN` | token do Jira (Atlassian → Security → API tokens) |
| `JIRA_JQL` | o que acompanhar (padrão: suas tasks) |
| `CLAUDE_CODE_OAUTH_TOKEN` | token do `claude setup-token` (habilita o agente) |
| `TIMESHEET_REPOS` | caminhos dos seus repos locais, separados por vírgula |
| `AUTO_LOG_ON_COMMIT` | `1` lança as horas no Jira ao commitar |
| `PORT` | porta do app (padrão `7788`) |

Também dá para conectar o Jira pela **tela** (botão *Conexão*), sem editar arquivo.

## Instruções do agente (`AGENT.md`)

O arquivo **`AGENT.md`** na raiz guia como o agente age e se comunica — inclui o padrão **Feito / Falta / Status** e a sequência de fechamento de uma task. Edite pela tela (botão *Instruções*) ou no arquivo. O `CLAUDE.md` de cada repositório também é respeitado.

## Privacidade

Tudo roda **na sua máquina**. Credenciais ficam no `.env` local e os dados coletados em `./data/` — ambos **fora do git**. Nada é enviado a terceiros além do seu próprio Jira e da API do Claude (quando você usa o agente).

## Stack

**Backend:** Node 22, TypeScript, Fastify, Zod · **Frontend:** React 18, Vite, React Query, Framer Motion · **IA:** Claude Agent SDK · **Integrações:** Jira REST API, git, GitHub CLI (`gh`).
