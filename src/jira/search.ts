import { getConnection } from "./connection.js";
import { jiraRequest } from "./client.js";
import type { Issue } from "../types.js";

const FIELDS = [
  "summary",
  "status",
  "assignee",
  "updated",
  "issuetype",
  "priority",
  "description",
  "comment",
  "parent",
  "creator",
];
const EXPAND = "renderedFields,changelog";

/**
 * Busca issues para o polling. Tenta o endpoint novo (/search/jql, Jira Cloud atual)
 * e cai no classico (/search) se vier 404/410. Pagina ate acabar.
 */
export async function searchForPolling(jql = getConnection().jql): Promise<Issue[]> {
  try {
    return await searchJql(jql);
  } catch (e) {
    if (e instanceof Error && /\b(404|410)\b/.test(e.message)) {
      return searchClassic(jql);
    }
    throw e;
  }
}

async function searchJql(jql: string): Promise<Issue[]> {
  const all: Issue[] = [];
  let nextPageToken: string | undefined;
  for (let i = 0; i < 20; i++) {
    const qs = new URLSearchParams({
      jql,
      maxResults: "100",
      fields: FIELDS.join(","),
      expand: EXPAND,
    });
    if (nextPageToken) qs.set("nextPageToken", nextPageToken);
    const r = await jiraRequest<{ issues?: Issue[]; nextPageToken?: string }>(
      "GET",
      `/rest/api/3/search/jql?${qs.toString()}`,
    );
    all.push(...(r.issues ?? []));
    nextPageToken = r.nextPageToken;
    if (!nextPageToken) break;
  }
  return all;
}

async function searchClassic(jql: string): Promise<Issue[]> {
  const all: Issue[] = [];
  let startAt = 0;
  for (let i = 0; i < 20; i++) {
    const r = await jiraRequest<{ issues?: Issue[]; total?: number }>(
      "POST",
      "/rest/api/3/search",
      { jql, startAt, maxResults: 100, fields: FIELDS, expand: EXPAND.split(",") },
    );
    const batch = r.issues ?? [];
    all.push(...batch);
    startAt += batch.length;
    if (startAt >= (r.total ?? 0) || !batch.length) break;
  }
  return all;
}
