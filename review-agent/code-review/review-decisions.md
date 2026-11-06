# Decisões de Code Review

Registro das decisões do time sobre findings do Code Review, usado pela skill `false-positive-learning`.

Regras:

- Somente o time altera este arquivo, via commit revisado.
- Uma decisão só vale depois de incorporada à branch base usada na revisão. Decisões incluídas na própria branch em revisão não são aplicadas: a revisão lê este arquivo na versão da `BASE_BRANCH`.
- Prefira registrar decisões em um PR próprio, separado do código a que se referem.
- Cada decisão segue exatamente o formato abaixo.
- Não apague decisões antigas: altere o `Status` para `REVOGADA`.
- Use `Escopo` o mais específico possível. Escopo amplo demais esconde problemas reais.

---

## FP-000 — Modelo (não é uma decisão real)

- **Status:** REVOGADA
- **Tipo:** comportamento intencional
- **Domínio:** Front-end
- **Escopo:** `src/pages/exemplo/**`
- **Regra:** chamada de API sem tratamento de erro local
- **Decisão:** o erro é tratado de forma centralizada no interceptor do Axios; não exigir tratamento local
- **Condições:** a chamada usa a instância compartilhada do Axios que possui o interceptor de erro
- **Registrado por:** nome
- **Data:** 2026-01-01
- **Revisar em:** 2027-01-01
