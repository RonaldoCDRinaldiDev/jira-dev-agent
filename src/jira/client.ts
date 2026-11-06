import { getConnection } from "./connection.js";
import { config } from "../config/index.js";
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

/**
 * Campo "reviewer" do Jira. Resolve do config (id ou nome) ou DESCOBRE sozinho
 * um campo customizado de usuario cujo nome lembra "revisor/review". Cacheado:
 * undefined = ainda nao resolvido; null = nao existe.
 */
let reviewerFieldId: string | null | undefined;
export async function getReviewerFieldId(): Promise<string | null> {
  if (reviewerFieldId !== undefined) return reviewerFieldId;
  reviewerFieldId = null;
  try {
    const fields = await jiraRequest<Array<{ id: string; name?: string; custom?: boolean; schema?: { type?: string; custom?: string } }>>(
      "GET",
      "/rest/api/3/field",
    );
    if (!Array.isArray(fields)) return reviewerFieldId;
    const cfg = config.review.reviewerField;
    if (cfg) {
      const f = fields.find(
        (x) => x.id === cfg || (x.name ?? "").toLowerCase() === cfg.toLowerCase(),
      );
      reviewerFieldId = f ? f.id : null;
    } else {
      const f = fields.find((x) => {
        const t = (x.schema?.type || x.schema?.custom) ?? "";
        return !!x.custom && /user/i.test(t) && /revis|review/i.test(x.name ?? "");
      });
      reviewerFieldId = f ? f.id : null;
    }
  } catch {
    /* mantem null */
  }
  return reviewerFieldId;
}

/** accountIds no valor do campo reviewer (pode ser 1 usuario ou lista). */
function reviewerAccountIds(fields: Record<string, any>, fieldId: string | null): string[] {
  if (!fieldId) return [];
  const v = fields[fieldId];
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return arr.map((u) => u?.accountId).filter(Boolean) as string[];
}

/** Decide se a task e pra DESENVOLVER ou REVISAR, olhando quem e voce nela. */
export async function routeForTask(
  key: IssueKey,
): Promise<{ target: "dev" | "review"; reason: string }> {
  const me = await getMyself();
  const issue = await getIssue(key);
  const f = ((issue as unknown as { fields?: Record<string, any> }).fields) ?? {};
  const assignee: string | undefined = f.assignee?.accountId;
  const fieldId = await getReviewerFieldId();
  const reviewers = reviewerAccountIds(f, fieldId);
  const statusName: string = f.status?.name ?? "";
  const inReview = config.review.statuses.some(
    (s) => s.toLowerCase() === statusName.toLowerCase(),
  );

  // Regra: reviewer = você -> code review; responsável = você -> dev.
  if (reviewers.includes(me.accountId))
    return { target: "review", reason: "você é o reviewer desta task" };
  if (assignee && assignee === me.accountId)
    return { target: "dev", reason: "você é o responsável desta task" };
  // Sem casar: se está em status de review, trata como review; senão, dev.
  if (inReview) return { target: "review", reason: `task em "${statusName}"` };
  return { target: "dev", reason: "desenvolvimento" };
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
