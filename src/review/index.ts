import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "../config/index.js";
import { jiraRequest } from "../jira/client.js";
import { textToAdf } from "../agent/adf.js";

/**
 * Code review: aprova/mergeia PRs da task via GitHub CLI (`gh`) e move a issue
 * para o status de fim de review no Jira. Depende de `gh` autenticado na maquina.
 * (Nao testavel sem PRs reais; portado fiel ao prototipo, com convencoes
 * configuraveis em REVIEW_* no .env.)
 */
const normTxt = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

interface GhResult {
  ok: boolean;
  out: string;
  err: string;
}
function gh(args: string[]): Promise<GhResult> {
  return new Promise((resolve) => {
    execFile(
      "gh",
      args,
      { timeout: 30_000, env: { ...process.env, GH_PROMPT_DISABLED: "1", GIT_TERMINAL_PROMPT: "0" } },
      (err, stdout, stderr) =>
        resolve({
          ok: !err,
          out: String(stdout || ""),
          err: String(stderr || (err && err.message) || "").trim(),
        }),
    );
  });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** owner/repo do remote origin (lê .git/config, sem rodar git). */
export function githubSlug(repo: string): string | null {
  try {
    const conf = readFileSync(join(repo, ".git", "config"), "utf8");
    const sec = conf.split(/^\[/m).find((s) => s.startsWith('remote "origin"'));
    const m =
      sec &&
      sec.match(/url\s*=\s*\S*github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\s*$/m);
    return m ? (m[1] ?? null) : null;
  } catch {
    return null;
  }
}

export interface PrReview {
  repo: string;
  number?: number;
  url?: string;
  base?: string;
  approved: boolean;
  merged: boolean;
  approvable: boolean;
  reason?: string;
}

/** Revisa (aprova + mergeia) os PRs da task. dry=true so analisa. */
export async function reviewPullRequests(
  key: string,
  dry: boolean,
  repos = config.timesheet.repos,
): Promise<PrReview[]> {
  const res: PrReview[] = [];
  const head = `${config.review.headPrefix}${key}`;
  for (const repo of repos) {
    const slug = githubSlug(repo);
    if (!slug) continue;
    const list = await gh([
      "pr", "list", "-R", slug, "--head", head, "--state", "all",
      "--json", "number,url,baseRefName,mergeable,isDraft,state",
    ]);
    if (!list.ok) {
      res.push({ repo: slug, approved: false, merged: false, approvable: false, reason: `gh: ${list.err.split("\n")[0]}` });
      continue;
    }
    let all: any[] = [];
    try { all = JSON.parse(list.out || "[]"); } catch { /* vazio */ }
    const prs = all.filter((pr) => pr.state === "OPEN");
    if (!prs.length) {
      const merged = all.find((pr) => pr.state === "MERGED");
      if (merged)
        res.push({ repo: slug, number: merged.number, url: merged.url, base: merged.baseRefName, merged: true, approved: true, approvable: true });
      continue;
    }
    for (const pr of prs) {
      const p: PrReview = { repo: slug, number: pr.number, url: pr.url, base: pr.baseRefName, approved: false, merged: false, approvable: false };
      let mergeable = pr.mergeable;
      for (let i = 0; mergeable === "UNKNOWN" && i < 4; i++) {
        await sleep(2500);
        const v = await gh(["pr", "view", String(pr.number), "-R", slug, "--json", "mergeable"]);
        try { mergeable = JSON.parse(v.out).mergeable; } catch { /* mantem */ }
      }
      if (pr.isDraft) p.reason = "PR em rascunho";
      else if (mergeable === "CONFLICTING") p.reason = "PR com conflito";
      else if (mergeable !== "MERGEABLE") p.reason = `GitHub nao confirmou ausencia de conflito (${mergeable})`;
      else p.approvable = true;
      if (p.approvable && !dry) {
        const a = await gh(["pr", "review", String(pr.number), "-R", slug, "--approve"]);
        p.approved = a.ok;
        if (!a.ok) p.reason = `aprovacao falhou: ${a.err.split("\n")[0]}`;
        if (a.ok) {
          const m = await gh(["pr", "merge", String(pr.number), "-R", slug, "--merge"]);
          p.merged = m.ok;
          if (!m.ok) p.reason = `merge falhou: ${m.err.split("\n")[0]}`;
        }
      }
      res.push(p);
    }
  }
  return res;
}

export interface MoveResult {
  moved: boolean;
  wouldMove?: boolean;
  transition?: string;
  to?: string;
  reason?: string;
}

/** Move a task pro status de fim de review, preenchendo a Resolucao exigida. */
export async function moveToDoneStatus(
  key: string,
  dry: boolean,
  comment?: string,
): Promise<MoveResult> {
  const data = await jiraRequest<{ transitions?: any[] }>(
    "GET",
    `/rest/api/3/issue/${encodeURIComponent(key)}/transitions?expand=transitions.fields`,
  );
  const target = normTxt(config.review.doneStatus);
  const tr = (data.transitions ?? []).find((x) => normTxt(x.to?.name) === target);
  if (!tr) return { moved: false, reason: `sem transicao para ${config.review.doneStatus}` };

  const fields: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const [id, f] of Object.entries<any>(tr.fields ?? {})) {
    if (id === "resolution") {
      const v = (f.allowedValues ?? []).find((a: any) => normTxt(a.name) === normTxt(config.review.resolution));
      if (v) fields.resolution = { id: v.id };
      else if (f.required) missing.push(`Resolucao "${config.review.resolution}"`);
    } else if (f.required && !f.hasDefaultValue) {
      missing.push(f.name || id);
    }
  }
  if (missing.length) return { moved: false, reason: `campos obrigatorios sem valor: ${missing.join(", ")}` };
  if (dry) return { moved: false, wouldMove: true, transition: tr.name, to: tr.to?.name };

  const payload: Record<string, unknown> = { transition: { id: tr.id }, fields };
  if (comment?.trim()) payload.update = { comment: [{ add: { body: textToAdf(comment) } }] };
  await jiraRequest("POST", `/rest/api/3/issue/${encodeURIComponent(key)}/transitions`, payload);
  return { moved: true, transition: tr.name, to: tr.to?.name };
}
