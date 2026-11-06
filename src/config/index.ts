import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * Carrega configuracao de .env (ou config.env legado) + process.env e valida.
 * Tudo generico: nenhuma chave de projeto fica hardcoded no codigo.
 */
function loadEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of [".env", "config.env"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq === -1) continue;
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!(key in out)) out[key] = val;
      }
    } catch {
      /* arquivo ausente e normal */
    }
  }
  return out;
}

const csv = (s: string | undefined): string[] =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const Schema = z.object({
  // Jira agora e opcional no boot: pode ser configurado pela tela de conexao.
  JIRA_BASE_URL: z.string().default("").transform((s) => s.replace(/\/+$/, "")),
  JIRA_EMAIL: z.string().default(""),
  JIRA_API_TOKEN: z.string().default(""),
  JIRA_JQL: z.string().default("assignee = currentUser() ORDER BY updated DESC"),
  PORT: z.coerce.number().int().positive().default(7777),
  POLL_MINUTES: z.coerce.number().positive().default(5),
  LOOKBACK_MINUTES: z.coerce.number().positive().default(20),
  FEED_MAX: z.coerce.number().positive().default(300),
  NOTIFY: z.coerce.number().default(1),
  TIMESHEET_REPOS: z.string().optional(),
  IDLE_MAX_SEC: z.coerce.number().default(180),
  AUTO_LOG_ON_COMMIT: z.coerce.number().default(0),
  REVIEW_STATUSES: z.string().default("Code Review,In Review,Review"),
  REVIEWER_FIELD: z.string().optional(),
  // Review APROVADO: status destino (apos aprovar+mergear) e resolucao na transicao.
  REVIEW_DONE_STATUS: z.string().default("Pending Deploy"),
  REVIEW_RESOLUTION: z.string().default("Concluído"),
  // Review REPROVADO: status para onde a issue vai (ex.: Fail / devolver ao dev).
  REVIEW_REJECTED_STATUS: z.string().default("Fail"),
  // Comentario do worklog ao finalizar um code review.
  REVIEW_WORKLOG_COMMENT: z.string().default("Code review usando o agente, testes manuais e merge."),
  // Convencao de branch do PR a revisar (head). Ex.: "issue/" -> issue/ABC-123.
  REVIEW_HEAD_PREFIX: z.string().default("issue/"),
  CLAUDE_BIN: z.string().optional(),
  // Acoes que exigem seu OK explicito (csv). Vazio = default (plan,diff,commit,pr).
  // plan e diff sao sempre gated, mesmo que omitidos aqui.
  GATED_ACTIONS: z.string().optional(),
});

const fileEnv = loadEnvFile();
// Injeta as chaves do .env no process.env (sem sobrescrever) para que processos
// filhos — como o CLI do Agent SDK — herdem o token/credenciais.
for (const [k, v] of Object.entries(fileEnv)) {
  if (process.env[k] === undefined) process.env[k] = v;
}
const merged = { ...fileEnv, ...process.env };
const parsed = Schema.safeParse(merged);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(
    "Configuracao invalida. Copie .env.example para .env e preencha:\n" + issues,
  );
  process.exit(1);
}

const c = parsed.data;

export const config = {
  jira: {
    baseUrl: c.JIRA_BASE_URL,
    email: c.JIRA_EMAIL,
    apiToken: c.JIRA_API_TOKEN,
    jql: c.JIRA_JQL,
  },
  server: { port: c.PORT },
  poll: {
    minutes: c.POLL_MINUTES,
    lookbackMinutes: c.LOOKBACK_MINUTES,
    feedMax: c.FEED_MAX,
    notify: c.NOTIFY === 1,
  },
  timesheet: {
    repos: csv(c.TIMESHEET_REPOS),
    idleMaxSec: c.IDLE_MAX_SEC,
    autoLogOnCommit: c.AUTO_LOG_ON_COMMIT === 1,
  },
  review: {
    statuses: csv(c.REVIEW_STATUSES),
    reviewerField: c.REVIEWER_FIELD ?? "",
    doneStatus: c.REVIEW_DONE_STATUS,
    resolution: c.REVIEW_RESOLUTION,
    rejectedStatus: c.REVIEW_REJECTED_STATUS,
    worklogComment: c.REVIEW_WORKLOG_COMMENT,
    headPrefix: c.REVIEW_HEAD_PREFIX,
  },
  agent: { claudeBin: c.CLAUDE_BIN ?? "", gatedActions: csv(c.GATED_ACTIONS) },
} as const;

export type Config = typeof config;
