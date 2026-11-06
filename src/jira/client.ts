import { getConnection } from "./connection.js";
import type { Issue, IssueKey } from "../types.js";

/**
 * Cliente Jira usando fetch nativo (Node 20+). Le as credenciais da conexao
 * em runtime (tela de login ou .env) a CADA chamada, para refletir mudancas
 * feitas pela interface sem reiniciar.
 */
function authHeader(email: string, token: string): string {
  return "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
}

async function jiraRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const conn = getConnection();
  const url = path.startsWith("http") ? path : `${conn.baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(conn.email, conn.apiToken),
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new JiraError(`${method} ${path} -> ${res.status}`, res.status, text);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export class JiraError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly bodyText: string,
  ) {
    super(message);
    this.name = "JiraError";
  }
}

/** Busca chaves de issues por JQL. */
export async function searchIssues(
  jql: string,
  fields = "summary,status,assignee,updated",
  maxResults = 100,
): Promise<Issue[]> {
  const data = await jiraRequest<{ issues: Issue[] }>(
    "POST",
    "/rest/api/3/search",
    { jql, fields: fields.split(","), maxResults },
  );
  return data.issues ?? [];
}

/** Detalhe completo de uma issue. */
export async function getIssue(key: IssueKey): Promise<Issue> {
  return jiraRequest<Issue>(
    "GET",
    `/rest/api/3/issue/${encodeURIComponent(key)}`,
  );
}

/** accountId do usuario logado (dono do token). */
export async function getMyself(): Promise<{ accountId: string; displayName: string }> {
  return jiraRequest("GET", "/rest/api/3/myself");
}

/** Lista transicoes de status disponiveis para a issue. */
export async function getTransitions(
  key: IssueKey,
): Promise<Array<{ id: string; name: string; to: string }>> {
  const data = await jiraRequest<{
    transitions: Array<{ id: string; name: string; to: { name: string } }>;
  }>("GET", `/rest/api/3/issue/${encodeURIComponent(key)}/transitions`);
  return (data.transitions ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    to: t.to?.name ?? "",
  }));
}

/** Move a issue para um status alvo (casa pelo nome do status destino ou da transicao). */
export async function transitionTo(key: IssueKey, target: string): Promise<void> {
  const wanted = target.trim().toLowerCase();
  const ts = await getTransitions(key);
  const match =
    ts.find((t) => t.to.toLowerCase() === wanted) ??
    ts.find((t) => t.name.toLowerCase() === wanted);
  if (!match) {
    const avail = ts.map((t) => `${t.name} -> ${t.to}`).join(", ");
    throw new Error(`Transicao para "${target}" indisponivel. Opcoes: ${avail}`);
  }
  await jiraRequest("POST", `/rest/api/3/issue/${encodeURIComponent(key)}/transitions`, {
    transition: { id: match.id },
  });
}

/** Lanca worklog (horas) numa issue. */
export async function addWorklog(
  key: IssueKey,
  startedIso: string,
  timeSpentSeconds: number,
  commentAdf?: unknown,
): Promise<void> {
  await jiraRequest("POST", `/rest/api/3/issue/${encodeURIComponent(key)}/worklog`, {
    started: startedIso,
    timeSpentSeconds,
    ...(commentAdf ? { comment: commentAdf } : {}),
  });
}

/** Adiciona um comentario (em ADF) numa issue. */
export async function addComment(key: IssueKey, commentAdf: unknown): Promise<void> {
  await jiraRequest("POST", `/rest/api/3/issue/${encodeURIComponent(key)}/comment`, {
    body: commentAdf,
  });
}

export { jiraRequest };
