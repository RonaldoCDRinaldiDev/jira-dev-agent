import { execFile } from "node:child_process";
import { platform } from "node:os";
import type { NotificationEvent } from "../types.js";

/** Notificacao nativa. Hoje: macOS (osascript). Outras plataformas: no-op silencioso. */
export function notifyNative(ev: NotificationEvent): void {
  if (platform() !== "darwin") return;
  const title = `${ev.key} - ${ev.kind.toUpperCase()}`.replace(/"/g, "'");
  const text = `${ev.summary}\n${ev.detail ?? ""}`.replace(/"/g, "'").slice(0, 240);
  const script = `display notification "${text}" with title "${title}"`;
  execFile("osascript", ["-e", script], (e) => {
    if (e) console.error("osascript falhou:", e.message);
  });
}
