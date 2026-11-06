import { config } from "../config/index.js";
import { searchForPolling } from "../jira/search.js";
import { readJson, writeJson } from "../store/json.js";
import { snapshot, diffSnapshots } from "./events.js";
import { notifyNative } from "./notify.js";
import type { NotificationEvent, Snapshot } from "../types.js";

const STATE = "state.json";
const FEED = "notifications.json";

interface State {
  issues: Record<string, Snapshot>;
  firstRun?: boolean;
}

export function getNotifications(): NotificationEvent[] {
  return readJson<NotificationEvent[]>(FEED, []);
}

export function deleteNotification(id: string): void {
  writeJson(FEED, getNotifications().filter((n) => n.id !== id));
}

export function markRead(id: string): void {
  writeJson(
    FEED,
    getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n)),
  );
}

/**
 * Uma rodada de polling. Na primeira execucao so cria o baseline (sem notificar).
 * Depois, detecta mudancas, grava no feed e dispara notificacao nativa.
 * Retorna quantos eventos novos surgiram.
 */
export async function pollOnce(): Promise<number> {
  const issues = await searchForPolling();
  const state = readJson<State>(STATE, { issues: {}, firstRun: true });
  const firstRun = !!state.firstRun || Object.keys(state.issues).length === 0;

  const newEvents: NotificationEvent[] = [];
  for (const issue of issues) {
    const snap = snapshot(issue);
    const prev = state.issues[snap.key];
    if (!firstRun) newEvents.push(...diffSnapshots(prev, snap));
    state.issues[snap.key] = snap;
  }
  delete state.firstRun;
  writeJson(STATE, state);

  if (newEvents.length) {
    const feed = newEvents.concat(getNotifications()).slice(0, config.poll.feedMax);
    writeJson(FEED, feed);
    if (config.poll.notify) newEvents.forEach(notifyNative);
  }
  return newEvents.length;
}

export function startPollLoop(): void {
  const run = () =>
    pollOnce()
      .then((n) => n && console.log(`[poll] ${n} evento(s) novo(s)`))
      .catch((e) => console.error("poll erro:", (e as Error).message));
  run();
  setInterval(run, config.poll.minutes * 60_000);
}
