# Guia de teste — jira-dev-agent

Siga na ordem. Cada teste tem **o que fazer** e **o que esperar**. Marque `[x]` ao passar.

---

## 0. Subir o app

```sh
cd ~/jira-notify/jira-dev-agent
nvm use 20
npm start
```

- [ ] Aparece `Server listening at http://127.0.0.1:7788`
- [ ] Abrir `http://127.0.0.1:7788` mostra a tela com 3 abas (Notificações / Horas / Agente)

> Se der `EADDRINUSE`, outra instância está na porta. Rode `lsof -ti:7788 | xargs kill` e `npm start` de novo.

---

## 1. Conexão com o Jira

- [ ] No topo, a bolinha está **verde** e mostra `Jira: Ronaldo Cezar Domingues Rinaldi`
- [ ] A etiqueta `agente: ...` aparece (vai estar `desativado` até ligar o cérebro — normal)

**Testar a tela de login (opcional):**
- [ ] Clicar em **Conexão** no topo → abre o formulário (URL / e-mail / token)
- [ ] Clicar em **Cancelar** → volta pro app sem mudar nada

**Simular um usuário novo (opcional, avançado):**
1. Pare o app (`Ctrl+C`).
2. Renomeie o arquivo de conexão: `mv data/connection.json data/connection.bak 2>/dev/null; true`
   e comente as 3 linhas `JIRA_*` do `.env`.
3. `npm start` e abra a 7788.
- [ ] O app abre **direto na tela de conectar** (sem as abas)
- [ ] Preencher URL + e-mail + token e clicar **Conectar** → conecta e mostra o app
> Para voltar ao normal, restaure o `.env` e `data/connection.json`.

---

## 2. Notificações (o hub)

- [ ] A aba **Notificações** lista suas issues/eventos
- [ ] Um evento de **Comentário** mostra o **texto do comentário** num box abaixo (ex.: o da Ana)
- [ ] O texto do resumo **não aparece cortado** com "..."
- [ ] Clicar em **Sincronizar** (topo) não dá erro; novos eventos aparecem após mudanças no Jira
- [ ] Cada tipo tem cor na borda esquerda (status=laranja, comentário=verde, nova=azul, etc.)

> O 1º ciclo cria o "baseline" (pode vir pouca coisa). Mudanças reais no Jira aparecem nos ciclos seguintes (a cada 5 min, ou no botão Sincronizar).

---

## 3. Horas (timesheet automático)

**Pré-requisito:** apontar seus repositórios locais. No `.env`, preencha:
```
TIMESHEET_REPOS=/caminho/para/repo-front,/caminho/para/repo-back
```
Reinicie o app (`npm start`).

- [ ] Abra a aba **Horas**
- [ ] Em um dos repos, faça checkout de uma branch com a chave da task (ex.: `git checkout -b feature/ACME-1234`)
- [ ] Recarregue a aba Horas → aparece **"Task ativa pela branch: ACME-1234"**
- [ ] Clicar em **Iniciar ACME-1234** → aparece a sessão ativa contando o tempo
- [ ] Esperar 1–2 min → os minutos aumentam
- [ ] Clicar em **Parar** → a sessão encerra e a task aparece na lista "Hoje" com os minutos
- [ ] **Descartar** remove a sessão (se ainda não foi lançada)

**Auto-log no commit (opcional):** com `AUTO_LOG_ON_COMMIT=1` no `.env`:
- [ ] Com a sessão ativa, faça um commit na branch da task
- [ ] A sessão para sozinha e as horas são lançadas no Jira (worklog da issue)

---

## 4. Agente (o copiloto com portões)

**Pré-requisito:** ligar o cérebro (uma vez):
```sh
claude setup-token
```
Cole o token gerado na linha `CLAUDE_CODE_OAUTH_TOKEN=` do `.env` e reinicie (`npm start`).
- [ ] No topo, a etiqueta vira `agente: assinatura (sua conta)`

**Fluxo com portões:**
- [ ] Aba **Agente** → digite a chave da task (ex.: `ACME-1234`) e o caminho do repo
- [ ] Clicar **Levantamento** → aparece um **plano proposto** e o estado vira `analyzed`
- [ ] Revisar o plano → **Aprovar** (ou Recusar)
- [ ] Após aprovar, aparecem **Iniciar task** e **Propor código (diff)**
- [ ] **Iniciar task** (com a branch) → cria a branch e move o status (automático)
- [ ] **Propor código** com uma instrução → aparece o **diff** pra você revisar
- [ ] **Aprovar** o diff → aplica no repo; o histórico registra cada passo
- [ ] Nada acontece sem o seu OK nos passos de código

> Sem o token, o "Levantamento" devolve a mensagem de "agente desativado" — os portões funcionam, mas sem IA real.

---

## 5. Code review (opcional)

**Pré-requisito:** `gh` (GitHub CLI) instalado e autenticado (`gh auth status`), e PRs abertos para a task.

- [ ] Com uma task em revisão, o endpoint `/api/review/pr` (via aba Agente no futuro, ou API) analisa os PRs
- [ ] Em modo "dry" (análise), ele diz se o PR é aprovável, sem mexer
- [ ] Fora do dry, aprova e faz merge (se sem conflito) e move a issue no Jira

> Essa parte ainda não tem botão na UI — é a próxima a ganhar interface.

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `EADDRINUSE :7788` | app já rodando | `lsof -ti:7788 \| xargs kill` |
| Tela sem as abas | build velho em cache | `Cmd+Shift+R` no navegador |
| `conectando...` infinito | backend não está rodando | rode `npm start` |
| `agente: desativado` | sem `CLAUDE_CODE_OAUTH_TOKEN` | rode `claude setup-token` |
| aba Horas vazia | `TIMESHEET_REPOS` não configurado | preencha no `.env` e reinicie |
