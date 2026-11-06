/** Tipos compartilhados do dominio. */

export type IssueKey = string; // ex.: "ABC-123" (generico, sem projeto fixo)

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
}

export interface IssueFields {
  summary: string;
  description?: unknown;
  status?: { name: string };
  assignee?: JiraUser | null;
  updated?: string;
  [key: string]: unknown;
}

export interface Issue {
  key: IssueKey;
  fields: IssueFields;
}

export type EventKind =
  | "new" // nova issue na board
  | "status" // mudanca de status
  | "assignee" // troca de responsavel
  | "description" // descricao alterada
  | "comment"; // novo comentario

export interface NotificationEvent {
  id: string;
  key: IssueKey;
  kind: EventKind;
  summary: string;
  type?: string; // tipo da issue (Bug, Task...)
  detail?: string;
  at: string; // ISO
  author?: string; // quem fez a mudanca (mudou status, comentou, etc.)
  parentKey?: IssueKey; // issue pai, se houver
  parentSummary?: string;
  commentHtml?: string;
  read?: boolean;
  note?: string;
}

/** Snapshot comparavel de uma issue, usado para detectar mudancas entre polls. */
export interface Snapshot {
  key: IssueKey;
  summary: string;
  type: string;
  priority: string;
  status: string;
  assignee: string | null;
  updated: string;
  descriptionHtml: string;
  descriptionHash: number;
  commentCount: number;
  lastCommentId: string | null;
  lastCommentAuthor: string;
  lastCommentHtml: string;
  parentKey?: string;
  parentSummary?: string;
  creator?: string;
  statusActor?: string; // quem fez a ultima mudanca de status (changelog)
  assigneeActor?: string; // quem fez a ultima troca de responsavel
}
