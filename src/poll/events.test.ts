import { test } from "node:test";
import assert from "node:assert/strict";
import { snapshot, diffSnapshots } from "./events.js";
import type { Issue } from "../types.js";

const issue = (over: Record<string, unknown> = {}): Issue =>
  ({
    key: "ABC-1",
    fields: {
      summary: "Fazer login",
      issuetype: { name: "Task" },
      priority: { name: "High" },
      status: { name: "To Do" },
      assignee: { displayName: "Ana" },
      updated: "2026-11-05T10:00:00Z",
      description: { type: "doc", content: [] },
      comment: { comments: [] },
      ...over,
    },
  }) as unknown as Issue;

const base = snapshot(issue());
const kinds = (prev: ReturnType<typeof snapshot> | undefined, s: Issue) =>
  diffSnapshots(prev, snapshot(s)).map((e) => e.kind);

test("nova issue sem estado anterior", () => {
  assert.deepEqual(diffSnapshots(undefined, base).map((e) => e.kind), ["new"]);
});
test("mudanca de status", () => {
  assert.ok(kinds(base, issue({ status: { name: "In Progress" } })).includes("status"));
});
test("troca de responsavel", () => {
  assert.ok(kinds(base, issue({ assignee: { displayName: "Bruno" } })).includes("assignee"));
});
test("novo comentario", () => {
  assert.ok(
    kinds(base, issue({ comment: { comments: [{ id: "10", author: { displayName: "Ana" } }] } })).includes("comment"),
  );
});
test("descricao alterada", () => {
  assert.ok(
    kinds(base, issue({ description: { type: "doc", content: [{ type: "paragraph" }] } })).includes("description"),
  );
});
test("sem mudanca nao gera evento", () => {
  assert.equal(diffSnapshots(base, snapshot(issue())).length, 0);
});
