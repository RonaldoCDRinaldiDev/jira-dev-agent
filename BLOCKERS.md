# Bloqueios e dependências — jira-dev-agent

Status: fundação + agente (portões) + efeitos git + polling portados e testados.
O que falta para RODAR na sua máquina está abaixo.

---

## 🔴 Bloqueios (precisam de você / de uma decisão)

### 1. Node 14 na sua máquina — CRÍTICO
Seu Mac está com `node 14.0.0 / npm 6.14.4`. O projeto exige **Node ≥ 20**:
- `@anthropic-ai/claude-agent-sdk` (o "cérebro") exige Node ≥ 18.14
- `tsx`, `fastify`, `vite` (frontend futuro) exigem Node ≥ 18/20

O Node 14 é do seu projeto de trabalho. **Isso NÃO é bloqueio** — resolve com nvm.

- **(A) nvm (recomendado, você já usa):** o nvm mantém o 14 E o 20 lado a lado e
  troca por terminal/pasta. Seu projeto de trabalho continua no 14; este projeto
  usa o 20 (fixado em `.nvmrc`). Instalar o 20 não remove o 14.
  ```sh
  nvm install 20
  nvm use 20       # só neste terminal/pasta
  ```
- **(B) Rodar em outra máquina / servidor:** se preferir não ter o 20 na máquina.
- **(C) Re-arquitetar para Node 14:** desnecessário se (A) funcionar. Grande
  esforço e o Agent SDK ainda não roda in-process no 14.

➡️ Recomendo (A). Resolvido isso, o ambiente destrava.

### 2. CLI `claude` não instalado
`claude setup-token` falhou com `command not found: claude`. Para o modo
"assinatura" (sua conta), o CLI do Claude Code precisa estar instalado.
- Alternativa 1: instalar o Claude Code (tem instalador standalone).
- Alternativa 2 (para testar rápido): usar `ANTHROPIC_API_KEY` no `.env` em vez
  do token de assinatura — cobrado por token, mas destrava o teste sem o CLI.

### 3. Rodar comandos na sua máquina — só você
Meu "terminal" é outro computador (Linux, na nuvem). Eu **crio e edito arquivos**
na sua pasta, mas não consigo executar `npm`, `node`, `claude` ou login no
navegador no seu Mac. Esses passos são seus.

### 4. Credenciais do Jira
Preencher no `.env`: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
(o token do Jira é gerado em Atlassian → Security → API tokens; é diferente do
token do Claude).

### 5. Confidencialidade / IP antes de publicar no git pessoal
O código já está limpo de qualquer dado da empresa (verificado). Mas, como nasceu
de uma ferramenta de trabalho, vale confirmar com a empresa antes de publicar.

### 6. `gh` CLI (para abrir PR automático)
A ação de abrir PR usa o GitHub CLI (`gh`). Precisa estar instalado e autenticado
na máquina onde o agente roda.

---

## 📦 Dependências (o que o ambiente precisa ter)

| Item | Para quê | Obrigatório? |
|------|----------|--------------|
| Node ≥ 20 + npm | rodar tudo | Sim |
| `@anthropic-ai/claude-agent-sdk` | o agente (cérebro) | Sim (p/ IA) |
| git | efeitos de código (branch, diff, commit) | Sim |
| `gh` (GitHub CLI) autenticado | abrir PR | Só p/ PR |
| Jira Cloud + API token | notificações, timesheet, status, horas | Sim |
| `claude setup-token` **ou** `ANTHROPIC_API_KEY` | autenticar o agente | Sim (p/ IA) |

---

## 🟡 Pendências de desenvolvimento (comigo — não dependem de você)

- [ ] Testar Agent SDK (plano/diff reais) de ponta a ponta — depende do token (#2)
- [ ] Testar efeitos de Jira (mover status, lançar horas) contra o Jira real
- [ ] Testar review (`gh` PRs) com PRs reais + `gh` autenticado
- [ ] Encadear PR automático após o commit aprovado
- [ ] UI do fluxo do agente no React (botões de aprovar/recusar os portões)
- [ ] UI do timesheet no React (aba Horas)
- [ ] **Onboarding / login** (tela de conectar Jira + agente)
- [ ] Limpar vulnerabilidades do npm (remover/atualizar eslint)

### ✔️ Concluído nesta sessão
- Node 20 via nvm (convive com a v14) — ambiente destravado
- `npm install` limpo (zod 4), app rodando de ponta a ponta na máquina
- Polling, **timesheet** (horas por branch + ociosidade + auto-log) e **review**
  (PRs via gh + status no Jira) portados; frontend React no ar

---

## ✅ Já pronto e testado

- Projeto TypeScript modular (Fastify + Zod), sem dado da empresa, no git (9 commits)
- Agente com **portões humanos**: código (plano/diff) pede seu OK; git/Jira automático
- Política de portões configurável (default: commit pede OK, PR automático)
- Efeitos **git reais** (branch, aplicar patch, commit) — testados de ponta a ponta
- Integração do Agent SDK escrita (modo `plan`/read-only, auth por token)
- **Polling** portado: detecção de nova issue / status / responsável / comentário /
  descrição, com testes unitários (6/6 passando) e notificação nativa
- API: `/api/health`, `/api/capabilities`, `/api/connection`, `/api/notifications`,
  `/api/sync`, `/api/agent/*`
