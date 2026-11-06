---
name: architecture-review
description: Avalia se as alterações respeitam a arquitetura existente, responsabilidades, dependências, padrões, acoplamento e organização do sistema, em Front-end e Back-end.
---

# Architecture Review

Avalie a consistência arquitetural das alterações do Change Set.

Não faça uma avaliação genérica da arquitetura inteira.

---

# PRINCÍPIO

A arquitetura existente é a referência.

Não considerar uma tecnologia diferente como incorreta apenas porque existe uma alternativa mais moderna.

---

# STACK

Identificar a stack e as versões pelos manifestos, a cada execução:

- Front-end: `package.json`;
- Back-end: `pom.xml`, `build.gradle` ou `build.gradle.kts`.

Não usar versões fixas escritas em documentação ou em skills como referência.

Considerar também os padrões documentados em `.github/copilot-instructions.md` e na documentação de arquitetura do módulo, quando existirem.

---

# FRONT-END

Avaliar, conforme as tecnologias encontradas:

- responsabilidade de componentes;
- estado local e global;
- Redux e Redux-Saga;
- chamadas HTTP e camada de serviços;
- formulários;
- roteamento;
- reutilização;
- acoplamento;
- dependências;
- separação de responsabilidades.

Não recomendar migração para Redux Toolkit, React Query, Zustand, Next.js ou outras tecnologias apenas por preferência ou modernização.

---

# BACK-END

Avaliar, conforme as tecnologias encontradas:

- Controllers;
- Services;
- DTOs;
- entidades;
- repositories;
- persistência;
- integrações;
- configuração;
- exceções;
- transações;
- validações.

Não assumir automaticamente JPA, Hibernate, Spring Data, Kafka, RabbitMQ, Redis, Elasticsearch ou outros frameworks.

---

# DEPENDÊNCIAS NOVAS

Quando o Change Set adicionar uma dependência, verificar se o projeto já possui outra com a mesma finalidade (ex.: bibliotecas de datas, HTTP, formulários, validação ou estado).

Encaminhar como possível finding quando a nova dependência duplicar funcionalidade existente sem justificativa evidente no Change Set.

Riscos de segurança de dependências pertencem ao `security-review`.

---

# PRINCÍPIOS

Avaliar:

- responsabilidade única;
- separação de responsabilidades;
- coesão;
- acoplamento;
- dependências;
- reutilização;
- consistência;
- padrões existentes;
- impacto arquitetural.

---

# FINDING

Uma inconsistência arquitetural só deve ser considerada quando produzir:

- problema real;
- acoplamento relevante;
- quebra de responsabilidade;
- inconsistência significativa;
- risco funcional;
- dificuldade concreta de manutenção;
- impacto relevante no Change Set.

---

# FORA DO ESCOPO

Não recomendar migrações amplas, reescritas, troca de framework, modernização geral ou refatoração de código preexistente quando não houver relação direta com o Change Set.

---

# LIMITES

Não:

- modificar código;
- propor código corrigido;
- classificar severity final;
- declarar aprovação.

Retorne apenas evidências e possíveis findings para validação pelo Core.
