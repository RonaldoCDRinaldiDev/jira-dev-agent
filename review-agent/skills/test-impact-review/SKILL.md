---
name: test-impact-review
description: Avalia o impacto das alterações sobre testes, cobertura comportamental e lacunas de cobertura relacionadas ao Change Set.
---

# Test Impact Review

Avalie o impacto das alterações sobre testes e cobertura comportamental.

A análise deve identificar riscos concretos de regressão e lacunas de cobertura diretamente relacionadas ao comportamento alterado.

---

# PRINCÍPIO

A ausência de teste não é automaticamente um problema.

Primeiro determine:

> Qual comportamento mudou?

Depois determine:

> Existe risco relevante sem cobertura adequada?

Somente então avalie se existe uma lacuna de cobertura relevante.

---

# PROCESSO

Para cada alteração relevante:

1. Identifique o comportamento alterado.

2. Localize testes relacionados.

3. Verifique cobertura existente.

4. Verifique se testes existentes continuam válidos.

5. Identifique cenários de sucesso.

6. Identifique cenários de erro.

7. Identifique regras de negócio relacionadas.

8. Identifique casos extremos relevantes.

9. Identifique consumidores impactados.

10. Identifique contratos alterados.

11. Identifique fluxos de integração relevantes.

12. Avalie risco de regressão.

13. Identifique cenários novos sem cobertura.

14. Determine se a lacuna possui impacto concreto.

---

# TEST GAP ANALYSIS

A Test Gap Analysis deve identificar lacunas diretamente relacionadas ao comportamento introduzido ou alterado pelo Change Set.

Considere, quando aplicável:

- cenário principal;
- cenários de erro;
- limites;
- estados vazios;
- estados de loading;
- combinações de parâmetros;
- validações;
- permissões;
- regressões nos consumidores impactados;
- contratos alterados;
- integrações;
- persistência;
- transações;
- regras de negócio.

A análise deve distinguir:

- cobertura suficiente;
- cobertura parcialmente suficiente;
- cenário novo sem cobertura;
- lacuna sem impacto relevante.

---

# FRONT-END

Considerar:

- renderização;
- interação;
- formulários;
- validação;
- navegação;
- estado;
- Redux;
- Redux-Saga;
- APIs;
- permissões;
- comportamento relevante de UX;
- estados de loading;
- estados vazios;
- estados de erro.

---

# BACK-END

Considerar:

- Controllers;
- Services;
- regras de negócio;
- validações;
- APIs;
- respostas HTTP;
- exceções;
- persistência;
- integrações;
- transações;
- contratos;
- concorrência;
- cache quando diretamente relacionado.

---

# TESTES EXISTENTES

Verificar:

- testes unitários;
- testes de integração;
- testes de componentes;
- testes de API;
- testes de contrato;
- testes de fluxo;
- testes de regressão.

Utilize os testes existentes como referência para entender o comportamento esperado.

---

# SNAPSHOTS

Snapshots (`__snapshots__/`, `*.snap`) não são revisados linha a linha, conforme as exclusões do Core.

Quando um snapshot for alterado, verificar apenas se a alteração é coerente com o comportamento modificado no Change Set.

Encaminhar possível finding quando o snapshot mudar sem alteração correspondente no componente, ou quando indicar mudança de renderização não explicada pelo Change Set (atualização em massa de snapshots sem revisão).

---

# FINDING

Somente encaminhar possível finding quando:

1. o comportamento foi introduzido ou alterado;
2. existe risco relevante;
3. existe cenário importante sem cobertura;
4. a ausência de cobertura dificulta validar o comportamento;
5. existe relação direta com o Change Set.

---

# NÃO REPORTAR AUTOMATICAMENTE

Não criar finding apenas porque:

- não existe teste;
- o teste existente não foi alterado;
- seria possível adicionar mais testes;
- a cobertura percentual poderia aumentar;
- existe preferência por outro tipo de teste.

---

# PREEXISTÊNCIA

Se a ausência de teste já existia antes da alteração e não está diretamente relacionada ao comportamento modificado:

> DESCARTAR.

---

# LIMITES

Não:

- criar testes;
- alterar testes;
- executar alterações;
- classificar severity final;
- declarar aprovação;
- modificar código;
- fornecer código corrigido.

O resultado deve ser validado pelo Core.
