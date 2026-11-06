import { config } from "../config/index.js";
import { readJson, writeJson } from "../store/json.js";
import { addWorklog } from "../jira/client.js";
import { textToAdf } from "../agent/adf.js";
import { repoBranch, headCommit, repoForKey, activeTaskKey, extractKey } from "./git-fs.js";
import { idleSeconds } from "./idle.js";

/**
 * Timesheet: conta o tempo de trabalho por task (detectada pela branch do git),
 * descontando ociosidade; ao commitar na branch da task, grava os minutos e,
 * opcionalmente, lanca as horas no Jira automaticamente.
 *
 * O tempo e sempre o elapsed real (agora - inicio - pausas), nao soma de ticks.
 */
const TS_FILE = "timesheet.json";
const SESSION_FILE = "session.json";

export interface Entry {
  key: string;
  minutes: number;
  source: "auto" | "manual";
  logged: boolean;
  worklogId: string | null;
  comment: string;
  startedAt: number;
  endedAt?: number;
  summary?: string;
}
type Timesheet = Record<string, Record<string, Entry>>;

interface Session {
  key: string;
  slot: string;
  day: string;
  repo: string | null;
  base: string | null; // commit base
  summary: string;
  startedAt: number;
  paused: boolean;
  pausedAt: number | null;
  pausedAccumMs: number;
}

const today = () => new Date().toISOString().slice(0, 10);
const loadTs = (): Timesheet => readJson<Timesheet>(TS_FILE, {});
const saveTs = (ts: Timesheet) => writeJson(TS_FILE, ts);

const stripSlot = (sk: string) => (sk.includes("#") ? sk.slice(0, sk.indexOf("#")) : sk);

/** Slot de armazenamento: reusa um aberto (nao lancado) do dia/task, ou cria #2, #3... */
function slotForNewSession(ts: Timesheet, d: string, baseKey: string): string {
  ts[d] = ts[d] || {};
  const slots = Object.keys(ts[d]).filter((sk) => stripSlot(sk) === baseKey);
  const aberto = slots.filter((sk) => !ts[d]![sk]?.logged).pop();
  if (aberto) return aberto;
  if (!slots.includes(baseKey)) return baseKey;
  let n = 2;
  while (slots.includes(`${baseKey}#${n}`)) n++;
  return `${baseKey}#${n}`;
}

let session: Session | null = null;

function saveSession() {
  if (session) writeJson(SESSION_FILE, session);
  else writeJson(SESSION_FILE, null);
}
export function loadSession() {
  session = readJson<Session | null>(SESSION_FILE, null);
}

const activeMs = (s: Session) => {
  const end = s.paused ? (s.pausedAt ?? Date.now()) : Date.now();
  return Math.max(0, end - s.startedAt - s.pausedAccumMs);
};
const elapsedMin = (s: Session) => Math.round(activeMs(s) / 60000);

/** Grava os minutos atuais da sessao na planilha (idempotente; nunca diminui). */
function writeSessionMinutes(min: number) {
  if (!session) return;
  const ts = loadTs();
  const d = session.day;
  ts[d] = ts[d] || {};
  const e: Entry = ts[d]![session.slot] ?? {
    key: session.key,
    minutes: 0,
    source: "auto",
    logged: false,
    worklogId: null,
    comment: "",
    startedAt: session.startedAt,
  };
  e.key = e.key || session.key;
  e.minutes = Math.max(e.minutes || 0, min);
  if (!e.startedAt) e.startedAt = session.startedAt;
  e.endedAt = Date.now();
  if (session.summary && !e.summary) e.summary = session.summary;
  ts[d]![session.slot] = e;
  saveTs(ts);
}

/** Inicia uma sessao para uma task. */
export function startSession(key: string, summary = ""): boolean {
  key = key.toUpperCase();
  if (!extractKey(key)) return false;
  const repo = repoForKey(key, config.timesheet.repos);
  const ts = loadTs();
  const d = today();
  const slot = slotForNewSession(ts, d, key);
  session = {
    key,
    slot,
    day: d,
    repo,
    base: repo ? headCommit(repo) : null,
    summary,
    startedAt: Date.now(),
    paused: false,
    pausedAt: null,
    pausedAccumMs: 0,
  };
  ts[d] = ts[d] || {};
  if (!ts[d]![slot]) {
    ts[d]![slot] = {
      key, minutes: 0, source: "auto", logged: false, worklogId: null,
      comment: "", summary, startedAt: session.startedAt,
    };
  }
  saveTs(ts);
  saveSession();
  return true;
}

export function stopSession(): string | null {
  const k = session?.key ?? null;
  session = null;
  saveSession();
  return k;
}

/** Descarta a sessao atual; remove a linha se nao tiver sido lancada. */
export function discardSession(): string | null {
  if (!session) return null;
  const { day, slot } = session;
  const ts = loadTs();
  if (ts[day]?.[slot] && !ts[day]![slot]!.logged) {
    delete ts[day]![slot];
    if (!Object.keys(ts[day]!).length) delete ts[day];
    saveTs(ts);
  }
  return stopSession();
}

/** Lanca horas no Jira (worklog). */
async function logWorklog(entry: Entry, startedMs: number): Promise<void> {
  const started = new Date(startedMs).toISOString().replace("Z", "+0000");
  const comment = entry.comment || `Trabalho em ${entry.key}`;
  await addWorklog(entry.key, started, entry.minutes * 60, textToAdf(comment));
}

let committing = false;
/** Detecta commit na branch da task; grava minutos finais, para e (opcional) lanca. */
async function checkCommitStop(): Promise<void> {
  if (committing || !session || session.paused) return;
  committing = true;
  try {
    const key = session.key;
    const repo =
      session.repo && (repoBranch(session.repo) || "").toUpperCase().includes(key)
        ? session.repo
        : repoForKey(key, config.timesheet.repos);
    if (!repo) return;
    session.repo = repo;
    const cur = headCommit(repo);
    if (session.base == null) {
      session.base = cur;
      saveSession();
    } else if (cur && cur !== session.base) {
      const mins = Math.max(elapsedMin(session), activeMs(session) > 0 ? 1 : 0);
      const slot = session.slot;
      const day = session.day;
      writeSessionMinutes(mins);
      stopSession();
      if (config.timesheet.autoLogOnCommit) {
        const ts = loadTs();
        const e = ts[day]?.[slot];
        if (e && !e.logged && e.minutes > 0) {
          try {
            await logWorklog(e, e.startedAt);
            e.logged = true;
            saveTs(ts);
          } catch (err) {
            console.error("auto-log falhou:", (err as Error).message);
          }
        }
      }
    }
  } finally {
    committing = false;
  }
}

let tracking = false;
async function trackTick(): Promise<void> {
  if (tracking || !session || session.paused) return;
  tracking = true;
  try {
    // ociosidade: acima do limite, nao conta este minuto (acumula como pausa).
    const idle = await idleSeconds();
    if (idle > config.timesheet.idleMaxSec) {
      session.pausedAccumMs += 60_000;
      saveSession();
      return;
    }
    await checkCommitStop();
    if (!session || session.paused) return;
    writeSessionMinutes(elapsedMin(session));
  } finally {
    tracking = false;
  }
}

export function startTrackLoop(): void {
  loadSession();
  setInterval(() => {
    trackTick().catch((e) => console.error("trackTick:", (e as Error).message));
  }, 60_000);
}

/** Estado para a UI: dia atual + sessao ativa. */
export function timesheetState() {
  const d = today();
  const ts = loadTs();
  return {
    day: d,
    entries: ts[d] ?? {},
    active: session
      ? { key: session.key, slot: session.slot, minutes: elapsedMin(session), paused: session.paused }
      : null,
    activeBranchKey: activeTaskKey(config.timesheet.repos),
  };
}
