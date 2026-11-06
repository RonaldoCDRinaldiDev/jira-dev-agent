import { getInstructions } from "./instructions.js";
import { detectAgentMode } from "./runner.js";
import { getIssue } from "../jira/client.js";
import { adfToText } from "./adf.js";
import { config } from "../config/index.js";
import { repoForKey } from "../timesheet/git-fs.js";

/** Resolve o repo da task automaticamente (pela branch ou 1º repo configurado). */
export function resolveRepo(key: string): string | undefined {
  return repoForKey(key, config.timesheet.repos) ?? config.timesheet.repos[0];
}

/** Contexto da issue do Jira para a primeira mensagem da conversa. */
async function issueContext(key: string): Promise<string> {
  try {
    const f = (await getIssue(key)).fields as Record<string, any>;
    const parts = [`Task do Jira ${key}: ${f.summary ?? ""}`];
    if (f.status?.name) parts.push(`Status: ${f.status.name}`);
    const desc = adfToText(f.description).trim();
    if (desc) parts.push(`Descrição:\n${desc}`);
    return parts.join("\n");
  } catch {
    return "";
  }
}

/**
 * Chat interativo do dev agent — conversa ao vivo com o Agent SDK, igual ao
 * Claude Code: streaming do que ele faz, perguntas e respostas, e permissão
 * pedida antes de ações que escrevem (editar/commitar). Multi-turno via `resume`.
 */
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; summary: string }
  | { type: "permission"; requestId: string; toolName: string; summary: string }
  | { type: "result"; ok: boolean; costUsd?: number }
  | { type: "error"; message: string }
  | { type: "done" };

interface Session {
  sessionId?: string;
  repo?: string;
  pending: Map<string, (allow: boolean) => void>;
}
const sessions = new Map<string, Session>();
const getSession = (key: string): Session => {
  let s = sessions.get(key);
  if (!s) {
    s = { pending: new Map() };
    sessions.set(key, s);
  }
  return s;
};

/** Fila assíncrona simples (produtor/consumidor) para os eventos do turno. */
class EventQueue {
  private items: ChatEvent[] = [];
  private resolvers: ((v: IteratorResult<ChatEvent>) => void)[] = [];
  private closed = false;
  push(ev: ChatEvent) {
    if (this.closed) return;
    const r = this.resolvers.shift();
    if (r) r({ value: ev, done: false });
    else this.items.push(ev);
  }
  close() {
    this.closed = true;
    let r;
    while ((r = this.resolvers.shift())) r({ value: undefined as never, done: true });
  }
  [Symbol.asyncIterator]() {
    return {
      next: (): Promise<IteratorResult<ChatEvent>> => {
        const item = this.items.shift();
        if (item) return Promise.resolve({ value: item, done: false });
        if (this.closed) return Promise.resolve({ value: undefined as never, done: true });
        return new Promise((resolve) => this.resolvers.push(resolve));
      },
    };
  }
}

async function loadQuery(): Promise<(args: unknown) => AsyncIterable<any>> {
  const spec = "@anthropic-ai/claude-agent-sdk";
  const mod: any = await import(spec);
  return mod.query;
}

/** Resumo legível de uma chamada de ferramenta. */
function toolSummary(name: string, input: Record<string, unknown>): string {
  const p = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : "");
  if (name === "Bash") return p("command").slice(0, 160);
  if (name === "Read" || name === "Edit" || name === "Write") return p("file_path");
  if (name === "Grep") return p("pattern");
  if (name === "Glob") return p("pattern");
  const first = Object.values(input)[0];
  return typeof first === "string" ? first.slice(0, 120) : "";
}

/** O usuário respondeu a um pedido de permissão. */
export function answerPermission(key: string, requestId: string, allow: boolean): boolean {
  const s = sessions.get(key);
  const r = s?.pending.get(requestId);
  if (!r) return false;
  r(allow);
  s!.pending.delete(requestId);
  return true;
}

/** Roda um turno da conversa e emite os eventos (texto, ferramentas, permissões). */
export async function* runTurn(
  key: string,
  text: string,
  repo?: string,
): AsyncGenerator<ChatEvent> {
  if (detectAgentMode() === "disabled") {
    yield { type: "error", message: "Agente desativado. Rode `claude setup-token`." };
    yield { type: "done" };
    return;
  }
  const s = getSession(key);
  if (repo) s.repo = repo;
  if (!s.repo) s.repo = resolveRepo(key); // auto: já temos os repos conectados
  const token = process.env.CLAUDE_CODE_OAUTH_TOKEN || "";
  const queue = new EventQueue();

  const canUseTool = (toolName: string, input: Record<string, unknown>, opts: any) =>
    new Promise<any>((resolve) => {
      const requestId = String(opts?.requestId ?? opts?.toolUseID ?? Math.random());
      s.pending.set(requestId, (allow: boolean) =>
        resolve(
          allow
            ? { behavior: "allow", updatedInput: input }
            : { behavior: "deny", message: "Ação recusada pelo usuário." },
        ),
      );
      queue.push({
        type: "permission",
        requestId,
        toolName,
        summary: toolSummary(toolName, input),
      });
    });

  // Na primeira mensagem da sessão, injeta o contexto da issue do Jira.
  let prompt = text;
  if (!s.sessionId) {
    const ctx = await issueContext(key);
    if (ctx) prompt = `${ctx}\n\n---\n\n${text}`;
  }

  (async () => {
    try {
      const query = await loadQuery();
      const stream = query({
        prompt,
        options: {
          cwd: s.repo,
          ...(s.sessionId ? { resume: s.sessionId } : {}),
          settingSources: ["project"], // CLAUDE.md do repo
          appendSystemPrompt: getInstructions(), // AGENT.md
          canUseTool,
          ...(token ? { env: { CLAUDE_CODE_OAUTH_TOKEN: token } } : {}),
        },
      });
      for await (const msg of stream) {
        if (msg?.session_id) s.sessionId = msg.session_id;
        if (msg?.type === "assistant") {
          for (const block of msg.message?.content ?? []) {
            if (block?.type === "text" && block.text) queue.push({ type: "text", text: block.text });
            else if (block?.type === "tool_use")
              queue.push({ type: "tool", name: block.name, summary: toolSummary(block.name, block.input ?? {}) });
          }
        } else if (msg?.type === "result") {
          queue.push({
            type: "result",
            ok: msg.subtype === "success" || !msg.is_error,
            costUsd: typeof msg.total_cost_usd === "number" ? msg.total_cost_usd : undefined,
          });
        }
      }
    } catch (e) {
      queue.push({ type: "error", message: (e as Error).message });
    } finally {
      queue.push({ type: "done" });
      queue.close();
    }
  })();

  for await (const ev of queue) yield ev;
}

/** Encerra a sessão de uma task (limpa o resume). */
export function resetChat(key: string): void {
  sessions.delete(key);
}
