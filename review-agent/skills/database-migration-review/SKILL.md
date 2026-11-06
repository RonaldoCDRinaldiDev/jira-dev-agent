---
name: database-migration-review
description: Avalia no Back-end migrations e alterações de schema do Change Set quanto à compatibilidade entre versões, rollback, locks, integridade de dados e ordem de deploy.
---

# Database Migration Review

Avalie migrations e alterações de schema somente quando houver evidência de que o Change Set as introduz, altera ou depende delas.

Não assuma uma tecnologia específica.

---

# QUANDO EXECUTAR

- scripts de migration adicionados ou alterados;
- DDL em qualquer arquivo SQL;
- alterações em entidades, mapeamentos ou anotações de persistência que alterem o schema esperado;
- consultas novas que dependam de colunas, tabelas ou índices novos;
- alterações em configuração de geração automática de schema (ex.: `ddl-auto`).

---

# TECNOLOGIA

Não assumir automaticamente Flyway, Liquibase, JPA, Hibernate ou qualquer outro mecanismo.

Identificar a ferramenta pelo manifesto (`pom.xml`, `build.gradle`), pela configuração e pela estrutura de pastas (ex.: `db/migration`, `db/changelog`).

Quando não houver ferramenta de migration, avaliar apenas a coerência entre o código e o schema esperado, sem recomendar a adoção de uma ferramenta.

---

# PROCESSO

1. Identificar a ferramenta e a pasta de migrations.
2. Listar as migrations do Change Set e a ordem de execução (versão, nome, changeset).
3. Verificar se alguma migration já existente foi editada.
4. Classificar cada alteração: aditiva, destrutiva ou de transformação de dados.
5. Verificar compatibilidade com a versão da aplicação atualmente em produção.
6. Verificar o comportamento sobre dados existentes.
7. Verificar risco de lock e de duração em tabelas grandes.
8. Verificar rollback.
9. Verificar a coerência entre migration, entidades e consultas do Change Set.
10. Relacionar o impacto ao Change Set.

---

# MIGRATION JÁ EXISTENTE EDITADA

Alterar uma migration que pode já ter sido aplicada em algum ambiente causa falha de checksum ou divergência de schema entre ambientes.

Sinalizar sempre que uma migration existente na BASE_BRANCH for modificada no Change Set.

---

# COMPATIBILIDADE ENTRE VERSÕES

Durante o deploy, a versão anterior da aplicação pode continuar rodando com o schema novo.

Sinalizar quando a migration, no mesmo release em que o código deixa de usar o elemento:

- remover ou renomear coluna ou tabela;
- alterar tipo de coluna de forma incompatível;
- adicionar coluna `NOT NULL` sem valor default;
- adicionar constraint que dados existentes ou a versão anterior possam violar.

Nesses casos, a alteração deveria ocorrer em etapas separadas (expandir, migrar e depois remover).

---

# DADOS EXISTENTES

Verificar:

- coluna `NOT NULL` adicionada em tabela com dados, sem default ou sem preenchimento prévio;
- constraint única ou FK adicionada sem tratamento de dados que a violem;
- transformação de dados sem filtro, podendo afetar registros indevidos;
- conversão de tipo com possível perda ou truncamento;
- exclusão de dados sem critério explícito.

---

# LOCKS E DURAÇÃO

Quando houver evidência de que a tabela é grande ou crítica (tabela central do domínio, uso intenso no código, comentários ou documentação):

- criação de índice sem opção não bloqueante suportada pelo banco;
- `ALTER TABLE` que reescreve a tabela;
- `UPDATE` ou `DELETE` em massa em uma única transação.

Não afirmar que a tabela é grande sem evidência.

---

# ROLLBACK

Verificar:

- se a ferramenta usa rollback e se ele foi definido;
- se a alteração é irreversível (drop, perda de dados) e se isso está explícito;
- se a versão anterior da aplicação continua funcionando caso o deploy precise ser revertido após a migration.

---

# COERÊNCIA COM O CÓDIGO

Verificar:

- entidade ou mapeamento alterado sem migration correspondente;
- migration sem uso correspondente no código, quando isso indicar erro;
- nomes de colunas e tabelas divergentes entre migration e mapeamento;
- tipos e tamanhos divergentes;
- índices necessários para consultas novas do Change Set, somente com evidência de impacto;
- `ddl-auto` configurado para alterar schema automaticamente em ambientes não locais.

---

# ORDEM DE DEPLOY

Quando o Change Set exigir uma ordem específica (migration antes do código, ou o inverso), verificar se isso está documentado no próprio Change Set.

Sinalizar quando a ordem for obrigatória e não estiver documentada.

---

# PREEXISTÊNCIA

Se o problema já existia antes da alteração e não foi diretamente impactado:

> DESCARTAR.

---

# LIMITES

Não:

- executar migrations;
- conectar ao banco de dados;
- assumir tecnologia de migration;
- recomendar adoção de ferramenta inexistente;
- fornecer SQL ou código corrigido;
- modificar código ou configuração;
- classificar severity final;
- declarar aprovação.

Retorne evidências e possíveis findings para validação pelo Core.
