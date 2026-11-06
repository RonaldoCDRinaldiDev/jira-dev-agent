import { config } from "../config/index.js";

/**
 * Regra do produto: trabalho mecanico de Jira/git roda AUTOMATICO; o que envolve
 * CODIGO passa por voce. Cada acao e classificada e tem politica "auto" | "gate".
 *
 * "gate"  -> o agente PROPOE e PARA; so executa com seu OK.
 * "auto"  -> executa direto (rotina determinista, sem decisao criativa).
 *
 * Defaults ajustaveis via GATED_ACTIONS no .env (csv das acoes que exigem OK).
 */
export type ActionType =
  | "plan" // decidir o que sera feito (levantamento)   -> CODIGO
  | "diff" // escrever/alterar codigo                    -> CODIGO
  | "commit" // selar o codigo ja aprovado                -> fronteira
  | "pr" // abrir pull request                         -> fronteira
  | "branch" // criar/trocar branch                        -> mecanico
  | "status" // mover status no Jira                       -> mecanico
  | "worklog"; // lancar horas no Jira                       -> mecanico

/** Categorias para o "guia": deixa claro por que cada acao e auto ou gate. */
export const CATEGORY: Record<ActionType, "codigo" | "git" | "jira"> = {
  plan: "codigo",
  diff: "codigo",
  commit: "git",
  pr: "git",
  branch: "git",
  status: "jira",
  worklog: "jira",
};

/**
 * Default escolhido pelo dono do fluxo:
 *  - plan, diff (codigo) -> sempre pede OK
 *  - commit             -> pede OK ("commita so quando eu mandar")
 *  - pr                 -> AUTOMATICO (abre sozinho, voce ajusta depois)
 *  - branch, status, worklog -> AUTOMATICO (mecanico git/jira)
 */
const DEFAULT_GATED: ReadonlySet<ActionType> = new Set(["plan", "diff", "commit"]);

function configuredGates(): ReadonlySet<ActionType> {
  const raw = (config.agent.gatedActions ?? []).filter(Boolean) as ActionType[];
  return raw.length ? new Set(raw) : DEFAULT_GATED;
}

export function isGated(action: ActionType): boolean {
  // Codigo nunca pode ser desligado: e o nucleo da filosofia do produto.
  if (action === "plan" || action === "diff") return true;
  return configuredGates().has(action);
}

export function policyTable(): Array<{
  action: ActionType;
  category: string;
  mode: "auto" | "gate";
  locked: boolean;
}> {
  return (Object.keys(CATEGORY) as ActionType[]).map((a) => ({
    action: a,
    category: CATEGORY[a],
    mode: isGated(a) ? "gate" : "auto",
    locked: a === "plan" || a === "diff", // nao podem virar auto
  }));
}
