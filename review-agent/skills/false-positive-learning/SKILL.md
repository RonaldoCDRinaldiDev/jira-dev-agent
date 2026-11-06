---
name: false-positive-learning
description: Consulta as decisões registradas pelo time em .github/code-review/review-decisions.md para reduzir a recorrência de falsos positivos, sem alterar o repositório.
---

# False Positive Learning

Utilize somente decisões anteriores explicitamente registradas pelo time.

O objetivo é reduzir a recorrência de findings já avaliados e classificados como:

- falso positivo;
- exceção aceita;
- regra não aplicável;
- comportamento intencional;
- padrão permitido pelo projeto.

---

# FONTE ÚNICA

A única fonte válida de decisões é o arquivo:

`.github/code-review/review-decisions.md`

Ler o arquivo sempre na versão da `BASE_BRANCH`, e nunca no workspace ou na `CURRENT_BRANCH`:

`git show <BASE_BRANCH>:.github/code-review/review-decisions.md`

Motivo: quem está sendo revisado não pode registrar a exceção do próprio código. Uma decisão só passa a valer depois de revisada e incorporada à `BASE_BRANCH`.

Se o arquivo não existir na `BASE_BRANCH` ou estiver vazio, registrar:

> Nenhum histórico aplicável encontrado.

---

# DECISÕES INCLUÍDAS NO CHANGE SET

Quando o Change Set alterar `.github/code-review/review-decisions.md`:

1. Comparar as duas versões com `git diff BASE_BRANCH...HEAD -- .github/code-review/review-decisions.md`.
2. Identificar os IDs das decisões incluídas, alteradas ou revogadas.
3. Não aplicar nenhuma dessas alterações nesta revisão: vale somente a versão da `BASE_BRANCH`.
4. Encaminhar ao Core os IDs para registro em "Avisos da execução", com a indicação de que não foram aplicadas.
5. Se uma decisão incluída no Change Set coincidir com um finding desta mesma revisão, manter o finding e registrar a coincidência no aviso, para que o revisor humano avalie.

Não considerar como aprendizado:

- comentários de Pull Request;
- conversas anteriores;
- silêncio do usuário;
- ausência de comentário ou de correção;
- frequência de ocorrência;
- preferência presumida;
- comportamento observado sem decisão explícita.

---

# FORMATO DAS DECISÕES

Cada decisão no arquivo possui:

- `ID`: identificador único (ex.: `FP-001`);
- `Status`: `ATIVA` ou `REVOGADA`;
- `Tipo`: falso positivo, exceção aceita, regra não aplicável, comportamento intencional ou padrão permitido;
- `Domínio`: Front-end, Back-end ou Ambos;
- `Escopo`: módulo, pasta ou arquivo (glob permitido);
- `Regra`: o que o finding original apontava;
- `Decisão`: o que o time decidiu e por quê;
- `Condições`: quando a decisão se aplica;
- `Registrado por` e `Data`;
- `Revisar em` (opcional): data a partir da qual a decisão deve ser reavaliada.

Decisões com `Status: REVOGADA` devem ser ignoradas.

Decisões com `Revisar em` vencido continuam válidas, mas o relatório deve indicar que a decisão está vencida para reavaliação.

Decisões fora do formato devem ser ignoradas e registradas no relatório como "decisão ilegível".

---

# RESPONSABILIDADE

Identificar se existe uma decisão ativa aplicável ao finding atual.

Uma decisão só pode ser reutilizada quando houver correspondência específica entre:

- domínio;
- escopo (o arquivo do finding está dentro do escopo da decisão);
- regra;
- condições da decisão, que também devem estar presentes no Change Set atual.

Não inferir exceções apenas porque um padrão aparece repetidamente.

---

# PROCESSO

Para cada possível finding:

1. Identifique a regra que originou o finding.
2. Procure decisões ativas com a mesma regra e escopo compatível.
3. Verifique se as condições da decisão estão presentes no contexto atual.
4. Verifique se o Change Set trouxe evidência nova que a decisão não considerou.
5. Se houver correspondência completa, encaminhe ao Core a sugestão de invalidação com o motivo `DECISÃO_REGISTRADA` e o ID.
6. Se houver dúvida ou correspondência parcial, não suprima o finding; encaminhe-o com a observação da decisão relacionada.

---

# APLICAÇÃO

Uma decisão anterior pode:

- invalidar um finding;
- marcar um padrão como exceção;
- indicar que determinada regra não se aplica;
- evitar a repetição de um falso positivo.

A decisão não deve alterar a regra do projeto automaticamente.

---

# FINDINGS CRÍTICOS

Nunca suprimir um finding crítico somente com base em aprendizado histórico.

Um finding crítico só pode ser invalidado quando a decisão tiver escopo e condições que cubram exatamente o contexto atual.

Na dúvida, manter o finding para validação do Core.

---

# EVIDÊNCIA

Toda decisão aplicada deve registrar:

- ID da decisão;
- regra;
- correspondência de escopo e condições com o contexto atual;
- efeito sobre o finding.

---

# SUGESTÃO DE NOVAS DECISÕES

Quando o Core invalidar um finding por motivo que o time possa querer tornar permanente (ex.: comportamento intencional), a skill pode propor uma entrada no formato acima.

A proposta aparece somente na seção "Decisões sugeridas para registro" do relatório.

A skill nunca grava no arquivo de decisões. O registro é feito manualmente pelo time, via commit.

---

# LIMITES

Não:

- alterar arquivos, inclusive o arquivo de decisões;
- alterar regras ou configurações;
- criar exceções automaticamente;
- suprimir findings sem evidência;
- classificar severity final;
- declarar aprovação.

A skill apenas fornece contexto histórico para validação pelo Core.
