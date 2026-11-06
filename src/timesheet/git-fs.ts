import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lê informacoes do git direto dos arquivos (.git/HEAD, refs), SEM rodar o binario
 * git — robusto quando o processo roda com PATH minimo. Generico: a chave da task
 * e qualquer PROJETO-NUMERO (ex.: ABC-123), nao fixa num projeto.
 */
export const KEY_RE = /[A-Z][A-Z0-9]+-\d+/;

/** Branch atual de um repo (lê .git/HEAD). null se nao for um repo/branch. */
export function repoBranch(repo: string): string | null {
  try {
    const head = readFileSync(join(repo, ".git", "HEAD"), "utf8").trim();
    const m = head.match(/^ref:\s*refs\/heads\/(.+)$/);
    return m ? (m[1] ?? null) : null;
  } catch {
    return null;
  }
}

/** Extrai a chave da task de um texto de branch (feature/ABC-123 -> ABC-123). */
export function extractKey(branch: string | null): string | null {
  if (!branch) return null;
  const m = branch.match(KEY_RE);
  return m ? m[0].toUpperCase() : null;
}

/** Task ativa agora: 1º repo (na ordem configurada) cujo branch tem uma chave. */
export function activeTaskKey(repos: string[]): string | null {
  for (const repo of repos) {
    const key = extractKey(repoBranch(repo));
    if (key) return key;
  }
  return null;
}

/** Commit atual (hash) do repo, lendo refs direto (sem rodar git). */
export function headCommit(repo: string): string | null {
  try {
    const head = readFileSync(join(repo, ".git", "HEAD"), "utf8").trim();
    const m = head.match(/^ref:\s*(.+)$/);
    if (!m) return head || null; // HEAD destacado = o proprio hash
    const ref = m[1]!;
    try {
      const loose = readFileSync(join(repo, ".git", ref), "utf8").trim();
      if (loose) return loose;
    } catch {
      /* ref empacotado */
    }
    try {
      const packed = readFileSync(join(repo, ".git", "packed-refs"), "utf8");
      for (const line of packed.split("\n")) {
        if (line && !line.startsWith("#") && line.endsWith(" " + ref)) {
          return line.split(" ")[0] ?? null;
        }
      }
    } catch {
      /* sem packed-refs */
    }
    return null;
  } catch {
    return null;
  }
}

/** 1º repo cujo branch corresponde a uma chave. */
export function repoForKey(key: string, repos: string[]): string | null {
  const up = key.toUpperCase();
  for (const repo of repos) {
    if ((repoBranch(repo) || "").toUpperCase().includes(up)) return repo;
  }
  return null;
}
