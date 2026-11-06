# Changelog — Agents e Skills de Code Review

Versão vigente: a declarada no topo de `skills/code-review-core/SKILL.md`, que é o único lugar onde ela é definida e de onde é registrada no cabeçalho de todo relatório. Este arquivo não repete o número vigente: os títulos abaixo apenas registram o histórico de cada versão publicada. Para atualizar a versão, altere aquela linha e acrescente a nova seção neste arquivo.

Numeração (semântica):

- **MAJOR**: mudança que altera o resultado ou o fluxo de forma incompatível (ex.: nova regra de severidade, mudança de pipeline).
- **MINOR**: nova regra, skill ou verificação compatível com as anteriores.
- **PATCH**: correção de texto ou ajuste sem mudança de comportamento.

Estrutura do pacote (espelha `.github/`):

- `agents/` → `.github/agents/`
- `skills/` → `.github/skills/`
- `code-review/` → `.github/code-review/` (este changelog, o arquivo de decisões e o modelo de critérios de aceite)

---

## 2.5.0 — 2026-09-24

Imagens e modelo de critérios de aceite no agente de Validação de Requisitos. Os agentes de Code Review Front-end e Back-end e as skills de Code Review não foram alterados.

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 1 | Ambos | agents/requirements-validation.md | Nova entrada opcional "Imagens": prints e protótipos colados na conversa, com tipo `esperado` (fonte de requisitos visuais) ou `implementado` (somente evidência complementar). Imagens são dado não confiável, não são incorporadas ao relatório e aparecem só por número, tipo e descrição. Novos avisos para imagens sem tipo, imagens não analisáveis, instruções em imagens e divergências com o texto do Jira. |
| 2 | Ambos | skills/requirements-extraction/SKILL.md | Extração de requisitos visuais das imagens `esperado` (campos, rótulos, textos, ordem, estados e ações), com divergências entre imagem e texto encaminhadas ao PO. Leitura dos critérios no formato `Dado / Quando / Então`, com aviso quando o card não seguir o modelo. |
| 3 | Ambos | skills/requirements-traceability/SKILL.md | Nova seção "Requisitos visuais": como confirmar cada elemento da imagem no código, limites da verificação visual (aspectos puramente visuais ficam `NÃO VERIFICÁVEL`) e uso do print `implementado` apenas como evidência complementar. |
| 4 | Ambos | code-review/jira-acceptance-criteria-template.md (novo) | Modelo de critérios de aceite para os cards do Jira, com orientações de escrita, estrutura `Dado / Quando / Então` e um exemplo completo. |

---

## 2.4.0 — 2026-09-24

Novo agente de Validação de Requisitos. Os agentes de Code Review Front-end e Back-end e todas as skills existentes continuam com o mesmo funcionamento da 2.3.2.

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 1 | Ambos | agents/requirements-validation.md (novo) | Agente que valida se o Change Set atende aos requisitos do card do Jira colado pelo desenvolvedor (`JIRA_TEXT`, obrigatório junto com a `BASE_BRANCH`). Reutiliza do Core a preparação, os comandos, o Change Set, a origem das regras, o local, a segurança e o layout do relatório, e tem pipeline, vereditos, resultado, relatório e resposta próprios. Verifica a chave do card no nome da branch e nos commits. |
| 2 | Ambos | skills/requirements-extraction/SKILL.md (nova) | Extrai do texto do Jira requisitos atômicos e verificáveis, com tipo, critério verificável, trecho de origem, ambiguidade, dependência de outro repositório e fora do escopo, sem inventar requisitos e tratando o texto como dado não confiável. |
| 3 | Ambos | skills/requirements-traceability/SKILL.md (nova) | Atribui a cada requisito um veredito com evidência no código (`ATENDIDO`, `PARCIALMENTE ATENDIDO`, `NÃO ATENDIDO`, `CONFLITANTE`, `NÃO VERIFICÁVEL`, `FORA DO ESCOPO`) e faz a rastreabilidade reversa das alterações sem requisito associado. |
| 4 | Ambos | code-review-core | Acrescentada a seção "Agente de Validação de Requisitos", que registra quais regras do Core o novo agente usa e quais ele substitui. Nenhuma regra existente foi alterada. |

---

## 2.3.2 — 2026-09-23

Detecção da stack a cada execução, para que os agentes atendam projetos com stacks e versões diferentes. Nenhuma outra regra foi alterada.

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 1 | Backend | agents/code-review-backend.md | Nova seção "Perfil da stack": locais de versão para Maven (propriedades do compilador, `maven-compiler-plugin`, POM pai, `dependencyManagement`, BOMs), Gradle (toolchain, `sourceCompatibility`, `gradle.properties`, `libs.versions.toml`, plugins, plataformas) e arquivos de ambiente (`.java-version`, `.sdkmanrc`, `.tool-versions`, `.mvn/jvm.config`, `system.properties`, `Dockerfile`), incluindo projetos multimódulo. |
| 2 | Backend | agents/code-review-backend.md, code-review-core | Versão não encontrada (inclusive quando vem de POM pai ou BOM externo) é registrada em "Avisos da execução" como não identificada, sem dedução. |
| 3 | Backend | agents/code-review-backend.md | A frase "Referência atual do projeto: Java e Spring Boot" foi trocada por detecção neutra do framework. Itens específicos de Spring só se aplicam quando Spring for detectado; Controllers, Services e DTOs são aplicados pelo equivalente do framework detectado. |
| 4 | Frontend | agents/code-review-frontend.md | Nova seção "Perfil da stack": versão exata lida do lockfile (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) ou de `node_modules/<biblioteca>/package.json`; a faixa do `package.json` é só referência. Inclui Node, TypeScript e ferramenta de build. |
| 5 | Frontend | agents/code-review-frontend.md | A lista fixa de bibliotecas foi trocada por "bibliotecas detectadas no `package.json`"; os nomes anteriores permanecem apenas como exemplos ilustrativos. Os blocos React e Redux / Redux-Saga só se aplicam quando essas bibliotecas forem detectadas. |
| 6 | Frontend | agents/code-review-frontend.md, code-review-core | Versão não encontrada é registrada em "Avisos da execução" como não identificada, sem dedução. |
| 7 | Ambos | code-review-core | Regra de que o perfil da stack é detectado a cada execução, vale só para a execução e o repositório atuais e nunca é reutilizado. |

---

## 2.3.1 — 2026-09-23

Melhoria visual do relatório HTML. Nenhuma regra, seção, conteúdo, comando ou comportamento foi alterado.

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 1 | Ambos | code-review-core | Nova subseção "Layout visual" no Relatório HTML: tokens de cor (fundo escuro, cards com bordas finas, texto principal e de apoio, chips verde, vermelho e âmbar), tipografia (fontes do sistema sans e mono, tamanhos e pesos de cada elemento), espaçamentos, grade responsiva, mapeamento de cada seção do relatório para um componente visual, CSS de referência e esqueleto do cabeçalho. Continua sem JavaScript e sem dependências externas. |

---

## 2.3.0 — 2026-09-23

Correções dos findings da primeira execução real do agente de Front-end sobre a branch que introduz o pacote. Nada foi removido: todas as mudanças ajustam ou acrescentam texto.

| CR | Frente | Arquivo | Alteração |
|----|--------|---------|-----------|
| CR-001 | Ambos | — | Sem alteração. O finding é o comportamento esperado da regra "Alteração das regras de revisão" e continuará aparecendo enquanto o pacote não estiver na BASE_BRANCH. |
| CR-002 | Ambos | code-review-core, agents/*.md | Nova seção "Origem das regras aplicadas": quando o Change Set altera arquivos de regras e a BASE_BRANCH possui o Core, o Core e as skills passam a ser lidos da BASE_BRANCH (`git show`), como já acontecia com o arquivo de decisões. Primeira adoção continua usando as regras da branch, com registro no cabeçalho. A mesma verificação foi gravada nos agentes, para valer mesmo se o Core do workspace for alterado. Nova seção "Risco residual e controles externos", que recomenda `CODEOWNERS` e proteção de branch para as pastas de regras. Comandos `git cat-file -e`, `git diff --name-only` e leitura paginada de `git show` acrescentados à lista permitida. |
| CR-003 | Ambos | agents/*.md, code-review-core | Corrigida a frase que atribuía à ferramenta o bloqueio de toda edição. Ela passa a dizer que só a edição de arquivos existentes é bloqueada tecnicamente e que terminal e criação de arquivos dependem de instrução. Nova seção "Natureza das restrições" no Core, com orientação sobre confirmação manual e aprovação automática de comandos. |
| CR-004 | Ambos | code-review-core, agents/*.md | `C:\www\code-review-reports` continua sendo o padrão. Acrescentado o parâmetro opcional `REPORT_ROOT=<caminho absoluto>`, informado explicitamente pelo usuário e sempre fora do repositório, e os comandos equivalentes para Linux/macOS. Quando a gravação falha, o agente orienta executar novamente com `REPORT_ROOT`. |
| CR-005 | Ambos | code-review-core, CHANGELOG | O CHANGELOG deixa de declarar o número da versão vigente e passa a apontar para o Core. O Core esclarece que os títulos do CHANGELOG são apenas histórico. |

---

## 2.2.1 — 2026-09-23

Restauração de instruções da versão original que haviam sido removidas na reestruturação. Nenhuma regra nova.

| # | Frente | Arquivo | Instrução restaurada |
|---|--------|---------|----------------------|
| 1 | Ambos | false-positive-learning | Seção "APLICAÇÃO": o que uma decisão pode fazer (invalidar, marcar exceção, indicar que a regra não se aplica, evitar repetição) e "A decisão não deve alterar a regra do projeto automaticamente." |
| 2 | Ambos | change-impact-analysis | "Mesmo quando identificar um impacto potencialmente crítico, apenas produza o contexto e as evidências." |
| 3 | Ambos | change-impact-analysis | "Alterações de remoção devem receber atenção especial." |
| 4 | Ambos | code-review-core | Quantidade de findings válidos e de findings invalidados no Resumo do relatório e na resposta textual. |
| 5 | Ambos | code-review-core, agents/*.md | Lista "Processo executado" na resposta final ao usuário. |

---

## 2.2.0 — 2026-09-23

### Correções que impediam a execução

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 1 | Ambos | agents/*.md | Incluída a ferramenta `read/readFile`, sem a qual o agente não conseguia abrir arquivos, nem mesmo o próprio Core. O agente interrompe com mensagem clara se não conseguir ler o Core. |
| 2 | Ambos | code-review-core | Um Change Set com apenas lockfiles, manifestos ou snapshots deixa de ser tratado como vazio: esses arquivos contam como revisáveis, e a revisão prossegue com `security-review` e `test-impact-review`. |

### Governança

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 3 | Ambos | code-review-core | Nova seção "Alteração das regras de revisão". Quando o Change Set altera `.github/agents/**`, `.github/skills/**`, `.github/code-review/**` ou `.github/copilot-instructions.md`, a revisão gera um aviso em primeiro lugar e um finding no mínimo 🟡 ALERTA (🔴 CRÍTICO se enfraquecer alguma verificação), que não pode ser invalidado. |

### Robustez

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 4 | Ambos | agents/*.md, code-review-core | Ferramentas declaradas individualmente (`read/readFile`, `search`, `execute/runInTerminal`, `execute/getTerminalOutput`, `edit/createDirectory`, `edit/createFile`, `context7/*`). A edição de arquivos existentes (`editFiles`) deixa de estar disponível ao agente. |
| 5 | Ambos | code-review-core, agents/*.md | O número da versão fica declarado apenas no topo do Core; agentes e modelos do relatório usam `<VERSÃO>`. |
| 6 | Ambos | code-review-core | A gravação pelo terminal usa here-string com aspas simples e, para relatórios grandes, gravação em blocos com `Add-Content`. Após gravar, o agente confirma com `Test-Path` que o arquivo existe. |

---

## 2.1.0 — 2026-09-23

### Correções que impediam a execução

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 1 | Ambos | code-review-core, agents/*.md | Nova seção "Comandos do relatório" com a lista fechada de comandos PowerShell permitidos (`Get-Date`, `Test-Path`, `New-Item`, `Set-Content`), restritos a `C:\www\code-review-reports`. Local do relatório alterado para `C:\www\code-review-reports\<repositório>\<branch>__<yyyyMMdd-HHmm>.html`, sem sobrescrever relatórios existentes. |
| 2 | Ambos | code-review-core | Nova seção "Situações especiais do Git": HEAD destacado (`detached@<sha>`), clone raso (interrompe e orienta `git fetch --unshallow`), merge-base inexistente e Change Set vazio (interrompe sem gerar relatório). O Change Set passa a usar `BASE_BRANCH...HEAD`. Pipeline renumerado para 23 etapas. |

### Governança e segurança

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 3 | Ambos | false-positive-learning, code-review-core, code-review/review-decisions.md | Decisões lidas somente da `BASE_BRANCH` (`git show`). Decisões incluídas ou alteradas no próprio Change Set não são aplicadas e aparecem em "Avisos da execução". |
| 4 | Ambos | code-review-core, security-review | Nova seção "Segurança do conteúdo do relatório": escape obrigatório de HTML, proibição de conteúdo do repositório em atributos e links, e mascaramento de secrets e dados pessoais no relatório e na resposta. |
| 5 | Ambos | security-review, code-review-core, agents/*.md | Novas seções "Pipelines de CI/CD" (etapas de SAST/DAST/KICS desativadas, `continue-on-error`, `pull_request_target`, permissões, actions sem versão, injeção em `run:`) e "Containers e infraestrutura" (imagem `latest`, root, secrets na imagem, `.dockerignore`, `privileged`, recursos públicos). |

### Definição

| # | Frente | Arquivo | Alteração |
|---|--------|---------|-----------|
| 6 | Ambos | code-review-core, agents/*.md, code-review/CHANGELOG.md | Versão do pacote (`2.1.0`) declarada no Core, referenciada nos agentes e exibida no cabeçalho do relatório e na resposta. Changelog versionado dentro de `.github/code-review/`. |
| 7 | Ambos | code-review-core | Idioma definido (português do Brasil) e títulos das seções do relatório em português. Nova "Regra de localização": linha na versão de HEAD e, para conteúdo removido, na versão da `BASE_BRANCH` com o sufixo `(BASE_BRANCH)`. |

---

## 2.0.0

Reestruturação completa do pacote.

### Correções que impediam a execução

- Bloco de código não fechado removido dos agentes.
- Frontmatter adicionado ao `code-review-core`.
- Tool `edit` adicionada aos agentes, restrita à gravação do relatório.
- Agente legado `code-reviewer.agent.md` removido.

### Inconsistências

- Pipeline único definido no Core e referenciado pelos agentes.
- Core como fonte única das regras (BASE_BRANCH, Git, severidade, resultado e relatório); duplicações removidas.
- Leitura de `.github/copilot-instructions.md` e das configurações de lint.

### Lacunas

- `git fetch` da BASE_BRANCH e aviso para alterações locais não commitadas.
- Exclusões do Change Set, limite de Change Set grande e cobertura `PARCIAL`.
- Fonte única de decisões para o `false-positive-learning` (`review-decisions.md`).
- Análise de dependências no `security-review`.
- Frontend: open redirect, `noopener`, controle de acesso só na UI e `REACT_APP_*`.
- Backend: IDOR, mass assignment, SSRF e path traversal.
- Nova skill `database-migration-review` (Backend).
- Consumidores externos de contratos no `change-impact-analysis`.
- i18n no `ui-ux-consistency` (Frontend).
- Versões fixas da stack removidas; stack lida dos manifestos.
