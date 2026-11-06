import type { IssueKey } from "../types.js";

/**
 * Filosofia: human-in-command. O agente nunca executa nada sozinho.
 * Cada etapa que MUDA algo (iniciar, aplicar diff, commitar, PR, horas) e um
 * PORTAO: o agente PROPOE e PARA; so avanca com um comando explicito seu.
 */
export type Stage =
  | "idle" // nada aconteceu
  | "analyzed" // levantamento pronto, aguardando sua decisao sobre o plano
  | "in_progress" // task iniciada (voce mandou)
  | "change_proposed" // ha um diff proposto, aguardando sua aprovacao
  | "committed" // commit feito (voce mandou)
  | "pr_open" // PR aberto (voce mandou)
  | "done";

/** Toda acao que executa algo passa por uma Proposta que voce aprova/recusa. */
export type ProposalKind =
  | "plan" // plano do levantamento
  | "diff" // mudanca de codigo
  | "commit" // mensagem + arquivos a commitar
  | "pr" // titulo/descricao do PR
  | "worklog" // horas a lancar
  | "status"; // transicao de status no Jira

export interface Proposal<T = unknown> {
  id: string;
  kind: ProposalKind;
  key: IssueKey;
  createdAt: string;
  summary: string; // o que o agente quer fazer, em 1 linha
  payload: T; // conteudo revisavel (ex.: texto do plano, patch, msg de commit)
  editable: boolean; // voce pode editar antes de aprovar?
}

export type Decision = "approve" | "reject" | "edit";

export interface WorkflowState {
  key: IssueKey;
  stage: Stage;
  pending?: Proposal; // proposta aguardando sua decisao (so uma por vez)
  history: Array<{ at: string; event: string; by: "agent" | "user" }>;
  repo?: string; // repo local associado (se houver)
}
