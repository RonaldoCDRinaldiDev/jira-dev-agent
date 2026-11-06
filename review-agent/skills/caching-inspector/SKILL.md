---
name: caching-inspector
description: Inspeciona mecanismos de cache no Back-end, avaliando chaves, TTL, invalidação, consistência, concorrência e impacto do Change Set.
---

# Caching Inspector

Avalie mecanismos de cache somente quando houver evidência de que o Change Set utiliza, altera ou impacta diretamente algum mecanismo de cache.

Não assuma uma tecnologia específica.

---

# RESPONSABILIDADE

Verificar, quando aplicável:

- criação de entradas;
- leitura de entradas;
- chaves;
- escopo das chaves;
- TTL;
- expiração;
- invalidação;
- atualização;
- consistência com a fonte de verdade;
- dados obsoletos;
- concorrência;
- sincronização;
- comportamento em falha;
- fallback;
- impacto da alteração sobre consumidores do cache.

---

# TECNOLOGIA

Não assumir automaticamente:

- Redis;
- Caffeine;
- Ehcache;
- Hazelcast;
- Memcached;
- Spring Cache;
- qualquer outro mecanismo.

Identifique a tecnologia somente quando existir evidência no projeto ou no Change Set.

---

# PROCESSO

Quando o Change Set envolver cache:

1. Identifique o mecanismo utilizado.

2. Identifique as chaves utilizadas.

3. Identifique os pontos de leitura.

4. Identifique os pontos de escrita.

5. Identifique TTL ou política de expiração.

6. Identifique mecanismos de invalidação.

7. Identifique a fonte de verdade.

8. Verifique se alterações de dados exigem invalidação.

9. Verifique possíveis dados obsoletos.

10. Verifique colisões ou escopo inadequado de chaves.

11. Verifique comportamento concorrente relevante.

12. Verifique comportamento quando o cache estiver indisponível.

13. Identifique consumidores afetados.

14. Relacione o impacto ao Change Set.

---

# INVALIDAÇÃO

Avaliar se alterações relevantes na fonte de verdade podem deixar dados inconsistentes no cache.

Considere:

- atualização;
- criação;
- exclusão;
- alteração parcial;
- operações transacionais;
- operações concorrentes.

Não assumir que toda alteração exige invalidação.

A necessidade deve ser sustentada pelo comportamento efetivamente encontrado.

---

# TTL

Avaliar TTL quando:

- existir configuração explícita;
- o Change Set alterar TTL;
- o comportamento depender da expiração.

Verificar se o TTL alterado pode produzir:

- dados obsoletos;
- comportamento inesperado;
- inconsistência;
- carga excessiva sobre a fonte de verdade.

Não considerar um TTL incorreto sem evidência do comportamento esperado.

---

# CONCORRÊNCIA

Quando aplicável, verificar:

- escrita simultânea;
- invalidação concorrente;
- atualização concorrente;
- race conditions;
- inconsistência entre cache e fonte de verdade.

Somente encaminhar problemas quando houver evidência técnica suficiente.

---

# FINDING

Gerar possível finding somente quando houver evidência de risco real, como:

- invalidação ausente;
- TTL incompatível com o comportamento esperado;
- colisão de chave;
- escopo incorreto;
- dado obsoleto com impacto funcional;
- inconsistência;
- condição de corrida relevante;
- comportamento incorreto em falha do cache.

---

# IMPACT ANALYSIS

Quando dados cacheados forem afetados, considere:

- consumidores;
- pontos de leitura;
- pontos de escrita;
- chaves relacionadas;
- regras de invalidação;
- fonte de verdade;
- operações concorrentes;
- integrações relacionadas.

Utilize o `change-impact-analysis` para consolidar o impacto quando necessário.

---

# PREEXISTÊNCIA

Se o problema já existia antes da alteração e não foi diretamente impactado:

> DESCARTAR.

---

# LIMITES

Não:

- assumir tecnologia de cache;
- recomendar criação de cache inexistente;
- propor implementação corretiva;
- fornecer código corrigido;
- alterar configuração;
- modificar código;
- classificar severity final;
- declarar aprovação.

Retorne evidências para validação pelo Core.
