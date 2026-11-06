import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** Persistencia simples em JSON na pasta ./data (gitignored, so na maquina do usuario). */
const DATA_DIR = resolve(process.cwd(), "data");

function pathFor(name: string): string {
  return resolve(DATA_DIR, name);
}

export function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(pathFor(name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown): void {
  const file = pathFor(name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2));
}
