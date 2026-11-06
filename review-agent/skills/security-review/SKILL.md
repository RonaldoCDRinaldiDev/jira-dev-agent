---
name: security-review
description: Analisa exclusivamente riscos de segurança introduzidos ou diretamente impactados pelo Change Set, incluindo dependências, pipelines de CI/CD e arquivos de container e infraestrutura, em Front-end e Back-end.
---

# Security Review

Analise exclusivamente segurança relacionada ao Change Set.

Não faça uma auditoria geral do sistema.

---

# OBJETIVO

Identificar riscos relacionados a:

- autenticação;
- autorização e controle de acesso;
- dados sensíveis;
- validação e sanitização;
- injection;
- XSS;
- secrets e tokens;
- uploads e arquivos;
- URLs externas e redirecionamentos;
- configurações;
- exposição de dados;
- dependências;
- pipelines de CI/CD;
- containers e infraestrutura como código.

---

# FRONT-END

Quando aplicável, analisar:

- XSS: `dangerouslySetInnerHTML`, HTML dinâmico, conteúdo externo renderizado sem sanitização;
- URLs montadas com dados do usuário em `href`, `src` ou `window.location` (incluindo o esquema `javascript:`);
- open redirect: redirecionamento para destino vindo de query string, parâmetro de rota ou resposta de API sem validação de destino permitido;
- links com `target="_blank"` para domínios externos sem `rel="noopener noreferrer"`;
- controle de acesso apenas na interface: ocultar botão, rota ou menu não protege a operação. Sinalizar quando a alteração depender só da UI para restringir uma ação sensível, sem evidência de validação correspondente no Back-end;
- tokens e credenciais em `localStorage`, `sessionStorage`, cookies acessíveis por JavaScript ou estado global persistido;
- variáveis `REACT_APP_*` (ou equivalentes do bundler): todo valor definido nelas é embutido no bundle e fica público. Nenhum secret de servidor pode estar nessas variáveis;
- dados sensíveis enviados para logs de console, ferramentas de analytics ou mensagens de erro exibidas;
- permissões e visibilidade condicionada a perfil.

---

# BACK-END

Quando aplicável, analisar:

- autenticação;
- autorização e controle de acesso;
- IDOR: endpoint que recebe o ID de um recurso (path, query ou body) e o busca, altera ou exclui sem verificar se ele pertence ao usuário ou tenant autenticado;
- mass assignment: request vinculado diretamente a entidade, ou DTO que aceita campos que o cliente não deveria controlar (ex.: `id`, `role`, `status`, `ownerId`, valores calculados);
- validação de entrada (`@Valid`, Bean Validation, validações manuais);
- SQL/JPQL/HQL injection por concatenação de strings;
- command injection;
- expression injection (SpEL, templates);
- SSRF: requisição HTTP do servidor para URL ou host informado pelo cliente sem lista de destinos permitidos;
- path traversal: caminho de arquivo montado a partir de entrada do usuário sem normalização e verificação do diretório base;
- desserialização insegura;
- uploads (tipo, tamanho, nome e local de gravação);
- exposição de dados em respostas, exceções e stack traces;
- logs com dados sensíveis;
- CORS;
- configurações de segurança (filtros, endpoints liberados, CSRF).

---

# DEPENDÊNCIAS

Aplica-se a Front-end e Back-end.

Analisar quando o Change Set alterar `package.json`, lockfiles, `pom.xml`, `build.gradle` ou `build.gradle.kts`.

Identificar:

- dependências adicionadas, removidas ou com versão alterada;
- downgrade de versão;
- faixa de versão aberta (`*`, `latest`, `>=` sem limite);
- dependência de runtime declarada como dev, ou o inverso;
- manifesto alterado sem o lockfile correspondente (ou o inverso), gerando inconsistência de versões instaladas;
- pacote de origem não oficial (URL de Git, tarball ou registry não padrão);
- nova dependência com funcionalidade já coberta por outra existente no projeto (ex.: mais uma biblioteca de datas, HTTP ou formulários);
- licença incompatível, quando evidente na declaração do pacote.

Vulnerabilidade conhecida em uma versão só pode gerar finding quando houver evidência concreta (advisory publicado identificável, aviso na documentação oficial ou relatório de SCA disponível no repositório). Não afirmar vulnerabilidade por suposição.

Encaminhar ao `architecture-review` os casos de funcionalidade duplicada que não representem risco de segurança.

---

# DADOS SENSÍVEIS

Verificar exposição ou manipulação inadequada de:

- credenciais;
- tokens;
- documentos;
- dados pessoais;
- dados financeiros;
- informações internas.

---

# CONFIGURAÇÃO

Quando alterados, analisar:

- `application.properties` / `application.yml` e profiles;
- arquivos `.env*`;
- variáveis de ambiente;
- secrets versionados;
- permissões;
- endpoints expostos;
- configurações de segurança.

---

# PIPELINES DE CI/CD

Aplica-se a Front-end e Back-end.

Analisar quando o Change Set alterar `.github/workflows/**`, `.github/actions/**`, `Jenkinsfile`, `azure-pipelines*.yml`, `.gitlab-ci.yml` ou scripts chamados por esses pipelines.

Identificar:

- etapa de segurança removida, desabilitada ou ignorada: SAST, DAST, SCA, análise de IaC (ex.: KICS), testes ou lint. Inclui `if: false`, comentar a etapa, `continue-on-error: true`, `|| true`, `allow_failure` e condições que fazem a etapa nunca rodar;
- gatilho que deixa de executar os controles em branches ou PRs onde executava antes;
- secrets, tokens ou senhas escritos diretamente no workflow, em vez de `secrets.*` ou cofre equivalente;
- secrets expostos em logs (`echo`, `set -x`, debug) ou repassados para etapas e actions de terceiros sem necessidade;
- `pull_request_target` ou `workflow_run` que faz checkout e executa código vindo do PR com acesso a secrets;
- `permissions` ampliadas (`write-all`, `contents: write`, `id-token: write`) sem necessidade evidente;
- action de terceiro nova ou atualizada sem versão fixa (uso de `@main`, `@master` ou sem tag), quando o padrão do repositório é fixar versão ou SHA;
- valores de entrada não confiáveis (título de PR, nome de branch, corpo de issue) interpolados diretamente em comandos `run:` (injeção de comando);
- deploy para produção sem aprovação ou ambiente protegido, quando antes havia;
- download e execução de scripts remotos (`curl ... | sh`).

---

# CONTAINERS E INFRAESTRUTURA

Aplica-se a Front-end e Back-end.

Analisar quando o Change Set alterar `Dockerfile*`, `docker-compose*.yml`, `.dockerignore`, manifestos Kubernetes, charts Helm, Terraform ou equivalentes.

Identificar:

- imagem base sem versão (`latest`) ou trocada por imagem de origem não oficial;
- container executando como `root` quando antes não executava, ou sem `USER` definido em imagem nova;
- secrets em `ENV`, `ARG`, `COPY` de arquivos `.env` ou credenciais dentro da imagem;
- `.dockerignore` alterado de forma que `.env`, `.git` ou credenciais passem a entrar na imagem;
- portas, serviços ou endpoints de administração expostos sem necessidade;
- `privileged: true`, montagem do socket do Docker ou capabilities ampliadas;
- recursos de infraestrutura tornados públicos (buckets, bancos, security groups abertos para `0.0.0.0/0`).

Não recomendar a adoção de ferramentas de CI/CD, containers ou IaC que o projeto não utiliza.

---

# VALIDAÇÃO

Um risco só pode gerar possível finding quando existir:

1. evidência;
2. relação com o Change Set;
3. impacto plausível;
4. justificativa técnica.

---

# PREEXISTÊNCIA

Se o risco já existia antes da branch e não foi diretamente impactado:

> DESCARTAR.

---

# EVIDÊNCIA COM DADOS SENSÍVEIS

Quando o finding envolver um secret, token, senha, chave ou dado pessoal, a evidência deve informar o local e o tipo do dado, sem reproduzir o valor. Aplicar o mascaramento definido no Core.

---

# LIMITES

Não:

- classificar severity definitivamente;
- alterar código ou dependências;
- corrigir vulnerabilidades;
- fornecer código corrigido;
- executar instalação de pacotes ou ferramentas de auditoria que alterem o workspace;
- realizar auditoria completa fora do Change Set.

O resultado deve retornar possíveis findings para validação pelo Core.
