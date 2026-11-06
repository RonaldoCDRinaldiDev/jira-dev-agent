import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const exec = promisify(execFile);

/** Roda um comando git num repo e devolve stdout. Erros viram Error com stderr. */
async function git(repo: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await exec("git", ["-C", repo, ...args], {
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    throw new Error(`git ${args[0]} falhou: ${(err.stderr || err.message).trim()}`);
  }
}

export async function currentBranch(repo: string): Promise<string> {
  return git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

/** Cria (ou troca para) a branch. Idempotente: se existir, so faz checkout. */
export async function createBranch(repo: string, branch: string): Promise<void> {
  const exists = await git(repo, ["branch", "--list", branch]);
  if (exists) await git(repo, ["checkout", branch]);
  else await git(repo, ["checkout", "-b", branch]);
}

/** Aplica um patch unificado (o diff aprovado) na working tree. */
export async function applyPatch(repo: string, patch: string): Promise<void> {
  const file = join(mkdtempSync(join(tmpdir(), "jda-")), "change.patch");
  writeFileSync(file, patch.endsWith("\n") ? patch : patch + "\n");
  try {
    await git(repo, ["apply", "--whitespace=nowarn", file]);
  } finally {
    rmSync(file, { force: true });
  }
}

/** Faz commit. Se files vier vazio, usa o que ja estiver staged/tracked (-a). */
export async function commit(
  repo: string,
  message: string,
  files: string[] = [],
): Promise<string> {
  if (files.length) await git(repo, ["add", ...files]);
  else await git(repo, ["add", "-A"]);
  await git(repo, ["commit", "-m", message]);
  return git(repo, ["rev-parse", "--short", "HEAD"]);
}

export async function headShort(repo: string): Promise<string> {
  return git(repo, ["rev-parse", "--short", "HEAD"]);
}

/**
 * Abre um PR via GitHub CLI (`gh`). Faz push da branch antes.
 * Requer `gh` autenticado na maquina do usuario. Retorna a URL do PR.
 */
export async function openPr(
  repo: string,
  title: string,
  body: string,
): Promise<string> {
  const branch = await currentBranch(repo);
  await git(repo, ["push", "-u", "origin", branch]);
  try {
    const { stdout } = await exec(
      "gh",
      ["pr", "create", "--title", title, "--body", body, "--head", branch],
      { cwd: repo },
    );
    return stdout.trim();
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    throw new Error(`gh pr create falhou: ${(err.stderr || err.message).trim()}`);
  }
}
