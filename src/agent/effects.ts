import { config } from "../config/index.js";
import { transitionTo, addWorklog } from "../jira/client.js";
import * as git from "../git/index.js";
import { textToAdf } from "./adf.js";
import type { IssueKey } from "../types.js";

/**
 * As "maos" do agente: executa de verdade git + Jira. So e chamado a partir do
 * workflow QUANDO voce aprova (ou numa acao automatica permitida pela politica).
 * Cada metodo e isolado e lanca Error claro se o ambiente nao permitir.
 */
export const effects = {
  /** Iniciar task: cria branch local + move status no Jira (ex.: In Progress). */
  async start(key: IssueKey, branch: string, repo?: string, toStatus = "In Progress") {
    const done: string[] = [];
    if (repo) {
      await git.createBranch(repo, branch);
      done.push(`branch ${branch}`);
    }
    try {
      await transitionTo(key, toStatus);
      done.push(`status -> ${toStatus}`);
    } catch (e) {
      // Nao aborta a branch ja criada; reporta o que falhou.
      done.push(`(status nao movido: ${(e as Error).message})`);
    }
    return done;
  },

  /** Aplica o diff aprovado na working tree. */
  async applyDiff(repo: string, patch: string) {
    await git.applyPatch(repo, patch);
    return `patch aplicado em ${repo}`;
  },

  /** Commit do codigo aprovado. */
  async commit(repo: string, message: string, files: string[] = []) {
    const sha = await git.commit(repo, message, files);
    return `commit ${sha}`;
  },

  /** Abre PR (automatico por padrao, apos commit). */
  async openPr(repo: string, title: string, body: string) {
    return git.openPr(repo, title, body);
  },

  /** Lanca horas no Jira. */
  async logWorklog(key: IssueKey, minutes: number, comment: string, startedIso?: string) {
    const started = startedIso ?? new Date().toISOString().replace("Z", "+0000");
    await addWorklog(key, started, minutes * 60, comment ? textToAdf(comment) : undefined);
    return `worklog ${minutes}min em ${key}`;
  },

  defaultInProgress: () => config.review.statuses, // referencia util ao guia
};
