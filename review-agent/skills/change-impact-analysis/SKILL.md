---
name: change-impact-analysis
description: Analisa o impacto direto e indireto do Change Set, identificando dependências, consumidores (inclusive externos ao repositório), contratos, fluxos, estado, APIs, persistência, integrações e testes afetados.
---

# **Change Impact Analysis**

Esta skill determina o alcance real de uma alteração.

Ela não classifica severidade e não produz o resultado final.

---

# **ENTRADA**

Recebe do `code-review-core`:

- `CURRENT_BRANCH`;
- `BASE_BRANCH` já validada;
- Change Set já calculado e com as exclusões aplicadas;
- plano de cobertura.

A regra da `BASE_BRANCH`, o cálculo do Change Set e as exclusões são definidos exclusivamente no `code-review-core`.

Esta skill não calcula outra comparação, não substitui a `BASE_BRANCH` e não usa outra branch como referência.

---

# **RESPONSABILIDADE**

Identificar:

- dependências;
- consumidores;
- chamadas;
- fluxos;
- contratos;
- estado;
- APIs;
- persistência;
- integrações;
- testes;
- efeitos colaterais.

A skill determina como as alterações podem afetar outras partes do sistema, fornecendo contexto técnico para as demais fases da revisão.

---

# **ESCOPO**

O foco é o que foi introduzido, modificado, removido, renomeado ou movido, e o comportamento diretamente impactado.

Código existente pode ser consultado para contexto: consumidores, dependências, contratos, chamadas, fluxos, regras de negócio, integrações, persistência e testes.

Problemas exclusivamente preexistentes não devem ser tratados como findings.

Um problema existente pode ser relevante quando a alteração:

- modifica seu comportamento;
- altera seus consumidores ou seu contrato;
- altera o fluxo que o utiliza;
- passa a acioná-lo diretamente;
- remove uma proteção;
- altera os dados utilizados;
- altera uma dependência relacionada.

Esses casos devem ser encaminhados como contexto para validação pelo Core.

---

# **PROCESSO**

Para cada alteração relevante:

1. Identifique o ponto alterado.
2. Identifique quem o utiliza.
3. Identifique suas dependências.
4. Identifique chamadas diretas.
5. Identifique chamadas indiretas relevantes.
6. Identifique alterações de contrato.
7. Identifique se o contrato pode ter consumidores fora do repositório.
8. Identifique alterações de estado.
9. Identifique APIs afetadas.
10. Identifique persistência afetada.
11. Identifique integrações afetadas.
12. Identifique testes relacionados.
13. Identifique possíveis efeitos colaterais.
14. Verifique se o impacto possui relação direta com o Change Set.
15. Descarte impactos exclusivamente preexistentes ou sem evidência suficiente.

---

# **FRONT-END**

Considerar: componentes, props, hooks, estado local, Redux, Redux-Saga, actions, reducers, selectors, rotas, formulários, APIs, permissões e eventos.

Quando um componente compartilhado for alterado, identificar seus consumidores relevantes.

Quando estado compartilhado for alterado, identificar leitores, escritores, selectors, reducers, actions, sagas e consumidores.

Quando uma chamada de API for alterada, identificar consumidores, payloads, respostas, tratamento de erros e contratos.

Quando uma rota for alterada, identificar consumidores, parâmetros, navegação, guards, redirects, links externos e componentes associados.

---

# **BACK-END**

Considerar: Controllers, Services, DTOs, entidades, repositories, APIs, regras de negócio, persistência, transações, integrações, exceções e configuração.

Não assumir tecnologias específicas de persistência ou infraestrutura sem evidência no projeto.

Quando Controllers forem alterados, identificar serviços e consumidores afetados.

Quando Services forem alterados, identificar consumidores, regras de negócio, dependências, transações e efeitos colaterais.

Quando DTOs forem alterados, identificar endpoints, consumidores, serialização, desserialização e compatibilidade.

---

# **CONTRATOS**

Identificar alterações em:

- parâmetros;
- payloads;
- respostas;
- campos;
- tipos;
- obrigatoriedade;
- códigos HTTP;
- interfaces;
- eventos.

Para cada contrato alterado, procurar consumidores relevantes no repositório.

Avaliar se a alteração pode gerar:

- incompatibilidade;
- comportamento diferente;
- perda de informação;
- mudança de expectativa;
- quebra de consumidor.

---

# **CONSUMIDORES EXTERNOS AO REPOSITÓRIO**

Front-end e Back-end ficam em repositórios separados. Um contrato alterado em um pode quebrar o outro sem que isso apareça no Change Set.

Sinalizar como **possível consumidor externo** quando o Change Set:

- Back-end: alterar path, método, parâmetros, campos, tipos, obrigatoriedade, formato de data, enum, código HTTP ou estrutura de erro de um endpoint exposto;
- Back-end: alterar payload de evento, mensagem ou integração consumida por outro sistema;
- Front-end: passar a enviar ou esperar campos, parâmetros, formatos ou códigos HTTP diferentes dos usados até então na chamada de API;
- Front-end: alterar rotas públicas acessadas por links externos, e-mails ou outros sistemas.

Para cada sinalização, informar:

- contrato alterado;
- o que mudou (antes e depois);
- se a alteração é compatível com o consumidor anterior (aditiva) ou não (remoção, renomeação, mudança de tipo ou de obrigatoriedade).

Não afirmar que o consumidor externo quebrou, porque o código dele não está disponível. Encaminhar como risco candidato para o Core, que o registra em "Avisos da execução" e, se a alteração for incompatível, avalia a severidade.

---

# **REMOÇÕES**

Alterações de remoção devem receber atenção especial.

Quando uma função, método, componente, endpoint, campo, configuração, serviço ou dependência for removido, procure consumidores, chamadas, referências, imports, contratos, testes e integrações relacionadas.

Determine se a remoção afeta funcionalidades existentes.

---

# **RENOMEAÇÕES E MOVIMENTAÇÕES**

Trate renomeações e movimentações de forma semântica. Não as considere automaticamente como exclusão, criação ou alteração funcional.

Verifique conteúdo, referências, imports, chamadas, consumidores e comportamento.

Para arquivos ou módulos movidos, determine se houve apenas alteração estrutural ou também alteração funcional.

---

# **REGRAS DE NEGÓCIO**

Quando a alteração envolver uma regra de negócio:

1. Identifique a regra alterada.
2. Identifique onde ela é implementada.
3. Identifique seus consumidores.
4. Identifique fluxos dependentes.
5. Identifique efeitos colaterais.
6. Identifique contratos relacionados.
7. Identifique cenários afetados.

Não classifique severidade.

---

# **TESTES**

Identifique testes potencialmente relacionados: unitários, integração, componentes, contrato, end-to-end e específicos do fluxo.

A ausência de testes não é automaticamente um finding. A avaliação de cobertura pertence ao `test-impact-review`.

---

# **INTEGRAÇÕES**

Para integrações internas ou externas, identificar clientes, endpoints, contratos, payloads, respostas, autenticação, timeout, retries, tratamento de erros e consumidores.

Determine quais fluxos dependem da integração alterada.

---

# **PERSISTÊNCIA**

Quando houver alteração relacionada à persistência, identificar consultas, leituras, gravações, entidades, repositories, migrations, transações, integridade, relacionamentos e compatibilidade de dados.

Encaminhar migrations e alterações de schema ao `database-migration-review`.

---

# **IMPACTO INDIRETO**

Procure impactos indiretos relevantes, por exemplo:

- componente compartilhado alterado afetando consumidores;
- serviço alterado afetando outros serviços;
- DTO alterado afetando múltiplos endpoints;
- estado alterado afetando diferentes fluxos;
- remoção afetando referências existentes;
- configuração alterada afetando determinado ambiente.

Somente considerar impactos indiretos com evidência ou relação técnica justificável.

---

# **REGRESSÕES**

Identificar possíveis regressões, por exemplo:

- comportamento existente deixa de funcionar;
- contrato deixa de ser compatível;
- consumidor recebe dados diferentes;
- fluxo deixa de executar;
- estado deixa de ser atualizado;
- integração deixa de funcionar;
- validação ou tratamento de erro deixa de ocorrer.

Encaminhar como candidatos para validação posterior. Não classificar severidade.

---

# **EVIDÊNCIAS**

Quando possível, informe arquivo, símbolo, linha, alteração relacionada, consumidor, dependência, contrato, fluxo, integração, persistência, teste e possível efeito.

Não transformar hipóteses em fatos.

---

# **SAÍDA**

### **Changed Area**

O que mudou.

### **Direct Impact**

Impactos diretos.

### **Indirect Impact**

Impactos indiretos.

### **Dependencies**

Dependências relevantes.

### **Tests**

Testes potencialmente afetados.

### **Contracts**

Contratos afetados e compatibilidade.

### **External Consumers**

Possíveis consumidores externos de contratos alterados (somente quando houver).

### **Risk Candidates**

Possíveis riscos a serem validados pelas demais fases.

### **Evidence**

Evidências que sustentam os impactos identificados.

---

# **LIMITES**

Não:

- classificar severity;
- declarar finding válido ou crítico;
- aprovar ou reprovar;
- determinar ajustes obrigatórios;
- modificar código;
- recomendar arquitetura;
- substituir Security Review, Test Review ou Architecture Review;
- calcular outra comparação ou substituir a `BASE_BRANCH`.

Esta skill é read-only: não edita, cria, exclui, move ou renomeia arquivos, não aplica patches e não altera configurações, dependências ou testes.

Mesmo quando identificar um impacto potencialmente crítico, apenas produza o contexto e as evidências.

Esta skill produz contexto. O Core decide o resultado.

A análise deve responder: **o que mudou, quem depende disso, o que pode ser afetado e quais evidências sustentam esse impacto.**
