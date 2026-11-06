import { execFile } from "node:child_process";
import { platform } from "node:os";

/** Segundos ocioso (macOS via ioreg). Outros SOs: 0 (conta como ativo). */
export function idleSeconds(): Promise<number> {
  return new Promise((resolve) => {
    if (platform() !== "darwin") return resolve(0);
    execFile(
      "sh",
      ["-c", "ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF; exit}'"],
      (e, out) => {
        const ns = parseInt(String(out || "").trim(), 10);
        resolve(e || !Number.isFinite(ns) ? 0 : Math.round(ns / 1e9));
      },
    );
  });
}
