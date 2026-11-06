import { randomUUID } from "node:crypto";
import type { Issue, NotificationEvent, Snapshot } from "../types.js";

/** Hash estavel (mesmo algoritmo do prototipo original). */
export function hash(s: unknown): number {
  let h = 0;
  const str = String(s ?? "");
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}

/** Autor da ultima mudanca de um campo, lido do changelog da issue. */
function lastActorForField(issue: Issue, field: string): string | undefined {
  const histories: any[] = (issue as any).changelog?.histories ?? [];
  for (let i = histories.length - 1; i >= 0; i--) {
    const h = histories[i];
    if ((h.items ?? []).some((it: any) => it.field === field)) {
      return h.author?.displayName ?? undefined;
    }
  }
  return undefined;
}

/** Reduz uma issue do Jira a um Snapshot comparavel. */
export function snapshot(issue: Issue): Snapshot {
  const f = (issue.fields ?? {}) as Record<string, any>;
  const rendered = (issue as any).renderedFields ?? {};
  const comments: any[] = f.comment?.comments ?? [];
  const last = comments[comments.length - 1];
  const renderedComments: any[] = rendered.comment?.comments ?? [];
  return {
    key: issue.key,
    summary: f.summary ?? "",
    type: f.issuetype?.name ?? "",
    priority: f.priority?.name ?? "",
    status: f.status?.name ?? "",
    assignee: f.assignee?.displayName ?? null,
    updated: f.updated ?? "",
    descriptionHtml: rendered.description ?? "",
    // Hash pela descricao CRUA (ADF), estavel — o HTML renderizado muda a cada chamada.
    descriptionHash: hash(JSON.stringify(f.description ?? "")),
    commentCount: comments.length,
    lastCommentId: last?.id ?? null,
    lastCommentAuthor: last?.author?.displayName ?? "",
    lastCommentHtml: renderedComments[renderedComments.length - 1]?.body ?? "",
    parentKey: f.parent?.key,
    parentSummary: f.parent?.fields?.summary,
    creator: f.creator?.displayName,
    statusActor: lastActorForField(issue, "status"),
    assigneeActor: lastActorForField(issue, "assignee"),
  };
}

/** Compara snapshot anterior e atual e devolve os eventos detectados. */
export function diffSnapshots(
  prev: Snapshot | undefined,
  snap: Snapshot,
): NotificationEvent[] {
  const at = new Date().toISOString();
  const base = {
    key: snap.key,
    summary: snap.summary,
    type: snap.type,
    at,
    read: false,
    parentKey: snap.parentKey,
    parentSummary: snap.parentSummary,
  };
  const ev = (
    kind: NotificationEvent["kind"],
    detail: string,
    extra: Partial<NotificationEvent> = {},
  ): NotificationEvent => ({ id: randomUUID(), kind, detail, ...base, ...extra });

  if (!prev)
    return [
      ev("new", snap.creator ? `${snap.creator} criou (${snap.status})` : `Nova issue (${snap.status})`, {
        author: snap.creator,
      }),
    ];

  const out: NotificationEvent[] = [];
  if (prev.status !== snap.status) {
    const who = snap.statusActor;
    out.push(
      ev(
        "status",
        who
          ? `${who} moveu de "${prev.status}" para "${snap.status}"`
          : `Status: ${prev.status} -> ${snap.status}`,
        { author: who },
      ),
    );
  }
  if (prev.assignee !== snap.assignee) {
    const who = snap.assigneeActor;
    out.push(
      ev(
        "assignee",
        who
          ? `${who} definiu o responsável como ${snap.assignee ?? "-"}`
          : `Responsavel: ${prev.assignee ?? "-"} -> ${snap.assignee ?? "-"}`,
        { author: who },
      ),
    );
  }
  if (prev.descriptionHash !== snap.descriptionHash)
    out.push(ev("description", "Descricao alterada"));
  if (snap.commentCount > prev.commentCount)
    out.push(
      ev("comment", `Novo comentario de ${snap.lastCommentAuthor || "alguem"}`, {
        commentHtml: snap.lastCommentHtml,
        author: snap.lastCommentAuthor || undefined,
      }),
    );
  return out;
}
