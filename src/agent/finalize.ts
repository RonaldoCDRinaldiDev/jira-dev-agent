import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config/index.js";
import { effects } from "./effects.js";
import { transitionTo, addComment } from "../jira/client.js";
import { textToAdf } from "./adf.js";
import { timesheetState, finalizeSession, markEntryLogged } from "../timesheet/index.js";
import { resolveRepo } from "./chat.js";

/**
 * Finalizacao em UMA acao: commita o que foi aprovado, abre o PR, move a issue
 * no Jira para Code Review, comenta a resolucao e lanca as horas da sessao ativa.
 * Cada passo e isolado: se um falhar, os outros ainda sao tentados e o resultado
 * diz exatamente o que deu certo e o que faltou. Dispara so quando VOCE pede.
 */
const exec = promisify(execFile);

async function hasChanges(repo: string): Promise<boolean> {
  try {
    const { stdout } = await exec("git", ["-C", repo, "status", "--porcelain"], {
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export interface FinalizeStep {
  step: "commit" | "pr" | "jira" | "comment" | "worklog";
  ok: boolean;
  detail: string;
}
export interface FinalizeResult {
  key: string;
  ok: boolean;
  steps: FinalizeStep[];
}

export async function finalizeTask(opts: {
  key: string;
  repo?: string;
  message?: string;
  prTitle?: string;
  prBody?: string;
  resolution?: string;
  moveStatus?: string;
}): Promise<FinalizeResult> {
  const key = opts.key.toUpperCase();
  const repo = opts.repo || resolveRepo(key) || "";
  const steps: FinalizeStep[] = [];
  const add = (step: FinalizeStep["step"], ok: boolean, detail: string) =>
    steps.push({ step, ok, detail });

  // 1) commit (so se houver mudanca)
  if (repo) {
    try {
      if (await hasChanges(repo)) {
        const msg = opts.message || `chore(${key}): finaliza task`;
        add("commit", true, await effects.commit(repo, msg));
      } else {
        add("commit", true, "nada a commitar (working tree limpa)");
      }
    } catch (e) {
      add("commit", false, (e as Error).message);
    }
  } else {
    add("commit", false, "repositório não encontrado para esta task");
  }

  // 2) abrir PR (push + gh pr create)
  if (repo) {
    try {
      const title = opts.prTitle || `${key}: ${opts.message || "finaliza task"}`;
      const body = opts.prBody || `Fecha ${key}.`;
      add("pr", true, await effects.openPr(repo, title, body));
    } catch (e) {
      add("pr", false, (e as Error).message);
    }
  }

  // 3) mover a issue no Jira (ex.: Code Review)
  const target = opts.moveStatus || config.review.statuses[0] || "Code Review";
  try {
    await transitionTo(key, target);
    add("jira", true, `status → ${target}`);
  } catch (e) {
    add("jira", false, (e as Error).message);
  }

  // 4) comentar a resolucao
  try {
    const text =
      opts.resolution || `Finalizado (${key}): mudanças commitadas e PR aberto.`;
    await addComment(key, textToAdf(text));
    add("comment", true, "resolução comentada no Jira");
  } catch (e) {
    add("comment", false, (e as Error).message);
  }

  // 5) lancar as horas da sessao ativa (se for desta task)
  try {
    const st = timesheetState();
    if (st.active && st.active.key === key) {
      const fin = finalizeSession();
      if (fin && fin.minutes > 0) {
        const startedIso = new Date(fin.startedAt).toISOString().replace("Z", "+0000");
        await effects.logWorklog(key, fin.minutes, `Trabalho em ${key}`, startedIso);
        markEntryLogged(fin.day, fin.slot);
        add("worklog", true, `${fin.minutes}min lançados`);
      } else {
        add("worklog", true, "sessão sem minutos para lançar");
      }
    } else {
      add("worklog", true, "sem sessão ativa desta task");
    }
  } catch (e) {
    add("worklog", false, (e as Error).message);
  }

  return { key, ok: steps.every((s) => s.ok), steps };
}
