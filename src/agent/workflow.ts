import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "../store/json.js";
import type { IssueKey } from "../types.js";
import type { AgentRunner } from "./runner.js";
import { isGated } from "./policy.js";
import { effects } from "./effects.js";
import { getIssue } from "../jira/client.js";
import { adfToText } from "./adf.js";

/** Monta o contexto da issue (titulo + status + descricao) para o agente. */
async function buildIssueContext(key: IssueKey): Promise<string> {
  try {
    const issue = await getIssue(key);
    const f = issue.fields as Record<string, any>;
    const parts = [`Task ${key}: ${f.summary ?? ""}`];
    if (f.status?.name) parts.push(`Status: ${f.status.name}`);
    const desc = adfToText(f.description).trim();
    if (desc) parts.push(`Descricao:\n${desc}`);
    return parts.join("\n");
  } catch {
    return ""; // Jira indisponivel: segue so com o contexto da UI (degrada)
  }
}
import type {
  Decision,
  Proposal,
  ProposalKind,
  Stage,
  WorkflowState,
} from "./types.js";

const STORE = "workflows.json";
type Store = Record<IssueKey, WorkflowState>;

const load = (): Store => readJson<Store>(STORE, {});
const save = (s: Store): void => writeJson(STORE, s);

function get(key: IssueKey): WorkflowState {
  const s = load();
  return (
    s[key] ?? { key, stage: "idle", history: [] }
  );
}
function put(state: WorkflowState): void {
  const s = load();
  s[state.key] = state;
  save(s);
}
function log(st: WorkflowState, event: string, by: "agent" | "user"): void {
  st.history.push({ at: new Date().toISOString(), event, by });
}

/** Erro de portao: tentaram avancar sem a aprovacao correspondente. */
export class GateError extends Error {}
/** Erro ao executar um efeito real (git/jira). */
export class EffectError extends Error {}

/** Executa o efeito real de uma proposta aprovada. Retorna um resumo p/ historico. */
async function runEffect(st: WorkflowState, p: Proposal): Promise<string> {
  const pl = (p.payload ?? {}) as Record<string, unknown>;
  switch (p.kind) {
    case "plan":
      return ""; // plano aprovado so libera o fluxo; sem efeito colateral
    case "status":
      return (await effects.start(st.key, String(pl.branch ?? ""), st.repo)).join(", ");
    case "diff": {
      const patch = (pl.diff as string) || "";
      if (!st.repo) throw new Error("Sem repo associado para aplicar o diff.");
      if (!patch) throw new Error("Proposta de diff sem patch.");
      return effects.applyDiff(st.repo, patch);
    }
    case "commit": {
      if (!st.repo) throw new Error("Sem repo associado para commitar.");
      return effects.commit(
        st.repo,
        String(pl.message ?? ""),
        (pl.files as string[]) ?? [],
      );
    }
    case "pr": {
      if (!st.repo) throw new Error("Sem repo associado para abrir PR.");
      return effects.openPr(st.repo, String(pl.title ?? ""), String(pl.body ?? ""));
    }
    case "worklog":
      return effects.logWorklog(
        st.key,
        Number(pl.minutes ?? 0),
        String(pl.comment ?? ""),
      );
    default:
      return "";
  }
}

function propose<T>(
  st: WorkflowState,
  kind: ProposalKind,
  summary: string,
  payload: T,
  editable = true,
): Proposal<T> {
  const p: Proposal<T> = {
    id: randomUUID(),
    kind,
    key: st.key,
    createdAt: new Date().toISOString(),
    summary,
    payload,
    editable,
  };
  st.pending = p as Proposal;
  log(st, `propos ${kind}: ${summary}`, "agent");
  return p;
}

/**
 * Orquestra o ciclo com PORTOES HUMANOS. Cada metodo "propose*" so GERA uma
 * proposta e PARA. `decide()` e o unico caminho para EXECUTAR — sempre disparado
 * por voce. Nada aqui executa acao sem passar por `decide(approve)`.
 */
export class Workflow {
  constructor(private runner: AgentRunner) {}

  state(key: IssueKey): WorkflowState {
    return get(key);
  }

  /** Etapa 1: levantamento. Read-only. Produz o plano e PARA. */
  async analyze(key: IssueKey, context: string, repo?: string): Promise<Proposal> {
    const st = get(key);
    st.repo = repo ?? st.repo;
    // Busca o conteudo real da issue no Jira (titulo + descricao + status) e junta
    // com qualquer contexto extra vindo da UI. Sem isso o agente trabalha as cegas.
    const issueCtx = await buildIssueContext(key);
    const fullContext = [issueCtx, context].filter(Boolean).join("\n\n");
    const res = await this.runner.run({
      key,
      repo: st.repo,
      instruction: "Faca o levantamento da task e proponha um plano objetivo.",
      context: fullContext,
      allowWrites: false,
    });
    const p = propose(st, "plan", "Plano do levantamento", { text: res.text });
    st.stage = "analyzed";
    put(st);
    return p;
  }

  /**
   * Voce decide sobre a proposta pendente. Este e o unico ponto de execucao.
   * - approve: executa o efeito da proposta e avanca o estado.
   * - edit: substitui o payload pelo seu texto e re-pendura (sem executar).
   * - reject: descarta a proposta (sem executar).
   */
  async decide(
    key: IssueKey,
    decision: Decision,
    edited?: unknown,
  ): Promise<WorkflowState> {
    const st = get(key);
    const p = st.pending;
    if (!p) throw new GateError("Nao ha proposta pendente para decidir.");

    if (decision === "reject") {
      log(st, `recusou ${p.kind}`, "user");
      st.pending = undefined;
      put(st);
      return st;
    }
    if (decision === "edit") {
      if (!p.editable) throw new GateError(`Proposta ${p.kind} nao e editavel.`);
      p.payload = edited ?? p.payload;
      log(st, `editou ${p.kind}`, "user");
      put(st);
      return st;
    }

    // approve -> executa o efeito REAL conforme o tipo, e avanca o portao.
    log(st, `aprovou ${p.kind}`, "user");
    try {
      const result = await runEffect(st, p);
      if (result) log(st, result, "agent");
      st.stage = nextStageOnApprove(p.kind, st.stage);
    } catch (e) {
      // Efeito falhou (repo/jira). Nao avanca o estado; registra o erro.
      log(st, `ERRO ao executar ${p.kind}: ${(e as Error).message}`, "agent");
      put(st);
      throw new EffectError((e as Error).message);
    }
    st.pending = undefined;
    put(st);
    return st;
  }

  /**
   * Etapa 2: iniciar a task (criar branch + mover status no Jira).
   * Trabalho MECANICO de git/jira: por padrao roda AUTOMATICO (sem portao).
   * So vira proposta se voce configurar branch/status como gated.
   * Retorna {auto:true} se ja executou, ou a proposta se exigiu seu OK.
   */
  async startTask(
    key: IssueKey,
    branch: string,
  ): Promise<{ auto: true; state: WorkflowState } | { auto: false; proposal: Proposal }> {
    const st = get(key);
    if (st.stage === "idle") {
      throw new GateError("Faca o levantamento antes de iniciar a task.");
    }
    const needsOk = isGated("branch") || isGated("status");
    if (needsOk) {
      const p = propose(st, "status", `Iniciar task (branch ${branch})`, { branch });
      put(st);
      return { auto: false, proposal: p };
    }
    // AUTO: executa o efeito real (branch + status). Falha nao corrompe o estado.
    try {
      const done = await effects.start(key, branch, st.repo);
      log(st, `iniciou task (auto): ${done.join(", ")}`, "agent");
      st.stage = "in_progress";
    } catch (e) {
      log(st, `ERRO ao iniciar task: ${(e as Error).message}`, "agent");
      put(st);
      throw new EffectError((e as Error).message);
    }
    put(st);
    return { auto: true, state: st };
  }

  /** Etapa 3: propoe uma mudanca (diff) para sua revisao. */
  async proposeChange(key: IssueKey, instruction: string, context: string): Promise<Proposal> {
    const st = get(key);
    if (st.stage !== "in_progress") {
      throw new GateError("Inicie a task antes de propor mudancas.");
    }
    const res = await this.runner.run({
      key,
      repo: st.repo,
      // Pede explicitamente um diff unificado: o agente PROPOE, nos aplicamos depois.
      instruction:
        `${instruction}\n\nResponda com um diff unificado (unified diff) dentro de ` +
        "um bloco ```diff, aplicavel com `git apply`. Nao edite arquivos; apenas proponha.",
      context,
      allowWrites: false, // "plan" no SDK: read-only, nao escreve
    });
    const p = propose(st, "diff", instruction, {
      text: res.text,
      diff: res.diff ?? null,
    });
    put(st);
    return p;
  }

  /** Etapa 4: propoe o commit (voce aprova a mensagem). */
  async proposeCommit(key: IssueKey, message: string, files: string[]): Promise<Proposal> {
    const st = get(key);
    const p = propose(st, "commit", `Commit: ${message}`, { message, files });
    put(st);
    return p;
  }
}

function nextStageOnApprove(kind: ProposalKind, cur: Stage): Stage {
  switch (kind) {
    case "plan":
      return "in_progress"; // plano aprovado libera a task (iniciar ainda e outro portao)
    case "status":
      return cur === "analyzed" ? "in_progress" : cur;
    case "diff":
      return "in_progress"; // segue iterando ate voce mandar commitar
    case "commit":
      return "committed";
    case "pr":
      return "pr_open";
    case "worklog":
      return cur;
    default:
      return cur;
  }
}
