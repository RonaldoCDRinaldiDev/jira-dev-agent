import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repoBranch, extractKey, headCommit, activeTaskKey, repoForKey } from "./git-fs.js";

function makeRepo(branch: string): string {
  const d = mkdtempSync(join(tmpdir(), "ts-"));
  const g = (args: string[]) => execFileSync("git", ["-C", d, ...args]);
  g(["init", "-q"]);
  g(["config", "user.email", "t@t.com"]);
  g(["config", "user.name", "t"]);
  writeFileSync(join(d, "a.txt"), "x");
  g(["add", "-A"]);
  g(["commit", "-qm", "init"]);
  g(["checkout", "-q", "-b", branch]);
  return d;
}

test("extractKey de varios formatos", () => {
  assert.equal(extractKey("feature/ABC-123-login"), "ABC-123");
  assert.equal(extractKey("bugfix/PROJ-9"), "PROJ-9");
  assert.equal(extractKey("main"), null);
  assert.equal(extractKey("release-2"), null); // nao e chave do Jira
  assert.equal(extractKey(null), null);
});

test("repoBranch e headCommit leem o repo real", () => {
  const repo = makeRepo("feature/XYZ-42");
  assert.equal(repoBranch(repo), "feature/XYZ-42");
  assert.match(headCommit(repo) ?? "", /^[0-9a-f]{40}$/);
});

test("activeTaskKey e repoForKey acham pela branch", () => {
  const repo = makeRepo("feature/DEV-7");
  assert.equal(activeTaskKey([repo]), "DEV-7");
  assert.equal(repoForKey("DEV-7", [repo]), repo);
  assert.equal(repoForKey("NAO-1", [repo]), null);
});
