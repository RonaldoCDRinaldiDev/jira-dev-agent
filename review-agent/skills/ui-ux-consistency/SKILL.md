---
name: ui-ux-consistency
description: Avalia no Front-end a consistência visual e comportamental das alterações de interface, estados de UI, formulários, responsividade e internacionalização (i18n) em relação aos padrões existentes do projeto.
---

# UI/UX Consistency

Avalie somente alterações de interface relacionadas ao Change Set.

A análise deve identificar inconsistências introduzidas ou diretamente impactadas pela alteração, considerando os padrões já existentes no projeto.

---

# RESPONSABILIDADE

Avaliar:

- consistência visual;
- consistência comportamental;
- reutilização de componentes existentes;
- estados de loading, vazio e erro;
- feedback ao usuário;
- formulários;
- navegação;
- interação;
- responsividade;
- comportamento de componentes reutilizáveis;
- internacionalização (textos, traduções e formatação);
- aderência aos padrões visuais existentes.

---

# REFERÊNCIA

O padrão existente do projeto é a principal referência.

Considere:

- componentes já existentes;
- estilos existentes;
- padrões de layout;
- padrões de interação;
- componentes reutilizáveis;
- convenções de formulários;
- padrões de feedback;
- padrões de tradução;
- comportamento de páginas equivalentes.

Não impor:

- design system externo;
- biblioteca visual diferente;
- novo padrão visual;
- redesign;
- preferência estética pessoal.

Uma implementação não deve ser considerada incorreta apenas por utilizar abordagem diferente quando não existir impacto verificável.

---

# PROCESSO

Para cada alteração de interface relevante:

1. Identifique o componente ou página alterada.
2. Identifique componentes equivalentes ou reutilizáveis existentes.
3. Verifique se a alteração segue o padrão visual existente.
4. Verifique os estados de loading, sucesso, erro, vazio, desabilitado e confirmação.
5. Verifique o comportamento de interação.
6. Verifique a navegação, quando aplicável.
7. Verifique a responsividade, quando diretamente relacionada à alteração.
8. Verifique formulários e mensagens de validação, quando aplicável.
9. Verifique textos exibidos e traduções.
10. Verifique se componentes existentes poderiam estar sendo utilizados.
11. Relacione qualquer inconsistência ao Change Set.

---

# CONSISTÊNCIA DE COMPONENTES

Quando um componente reutilizável for alterado, verificar se:

- os consumidores continuam com comportamento consistente;
- propriedades existentes continuam sendo respeitadas;
- estados existentes não foram removidos indevidamente;
- estilos compartilhados não foram alterados de maneira incompatível;
- comportamento específico de outros consumidores não foi quebrado.

---

# ESTADOS DE UI

Quando a alteração introduzir ou modificar operações assíncronas, verificar se tratam adequadamente:

- loading;
- sucesso;
- erro;
- estado vazio;
- desabilitação durante processamento;
- feedback ao usuário.

A ausência de um estado não é finding automaticamente. Encaminhar somente quando houver evidência de comportamento inconsistente ou risco funcional.

---

# FORMULÁRIOS

Quando houver alteração em formulários, verificar:

- mensagens de validação;
- estados de erro;
- estados de submissão;
- campos obrigatórios;
- feedback;
- valores iniciais;
- comportamento após sucesso;
- comportamento após erro.

Não recomendar mudança de biblioteca de formulário por preferência.

---

# INTERNACIONALIZAÇÃO (i18n)

Identificar a biblioteca de i18n pelo `package.json` (ex.: `react-intl`) e o padrão de uso no módulo alterado (componentes, hooks, arquivos de mensagens e idiomas suportados).

Quando o módulo alterado já utilizar i18n, verificar no Change Set:

- textos exibidos ao usuário escritos diretamente no código, em vez de usar a biblioteca de tradução (títulos, labels, placeholders, botões, mensagens de validação, mensagens de erro, `title`, `alt`, `aria-label`, textos de notificação e modais);
- chave de tradução nova ou alterada que não exista em todos os arquivos de idioma suportados;
- chave removida do código que continua em uso em outro ponto, ou chave referenciada que não existe;
- concatenação de textos traduzidos que impede a tradução correta da frase, em vez de interpolação com variáveis;
- datas, números e moedas formatados manualmente em vez de usar a formatação da biblioteca ou o padrão do projeto;
- mensagens de validação de Yup ou Zod fixas em um idioma, quando o padrão do módulo é traduzir.

Não gerar finding quando:

- o módulo alterado não utiliza i18n;
- o texto não é exibido ao usuário (logs, chaves técnicas, identificadores);
- o texto fixo segue um padrão existente e explícito no módulo.

Não avaliar a qualidade da tradução.

---

# RESPONSIVIDADE

Quando a alteração afetar layout ou componentes responsivos, verificar:

- sobreposição;
- conteúdo cortado;
- elementos inacessíveis;
- quebra de layout;
- comportamento em larguras menores;
- comportamento de elementos interativos.

Considerar também textos mais longos em outros idiomas quando o módulo usar i18n.

Somente reportar com evidência suficiente.

---

# FINDING

Um possível finding só pode ser encaminhado quando:

1. existir evidência concreta;
2. estiver relacionado ao Change Set;
3. houver impacto verificável em experiência, comportamento ou manutenção;
4. não for apenas preferência estética;
5. não for exclusivamente preexistente;
6. não for duplicado por outro finding.

---

# PREEXISTÊNCIA

Se a inconsistência já existia antes da alteração e não foi diretamente impactada:

> DESCARTAR.

Uma inconsistência preexistente pode ser considerada quando a alteração:

- amplia seu impacto;
- modifica seu comportamento;
- altera seus consumidores;
- altera o padrão relacionado;
- introduz novo fluxo que depende dela.

---

# LIMITES

Não:

- modificar código;
- criar arquivos;
- sugerir código corrigido;
- propor redesign;
- recomendar troca de biblioteca;
- recomendar migração tecnológica;
- classificar severity final;
- declarar aprovação.

Retorne somente evidências e possíveis findings para validação pelo Core.
