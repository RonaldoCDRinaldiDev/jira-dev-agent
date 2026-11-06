import { config } from "../config/index.js";
import { readJson, writeJson } from "../store/json.js";

/**
 * Conexao com o Jira em runtime. Prioriza o que foi salvo pela tela de login
 * (data/connection.json) e cai no .env como fallback. Assim da pra conectar
 * pela interface, sem editar arquivo.
 */
export interface Connection {
  baseUrl: string;
  email: string;
  apiToken: string;
  jql: string;
}
const FILE = "connection.json";

export function getConnection(): Connection {
  const s = readJson<Partial<Connection>>(FILE, {});
  return {
    baseUrl: (s.baseUrl || config.jira.baseUrl || "").replace(/\/+$/, ""),
    email: s.email || config.jira.email,
    apiToken: s.apiToken || config.jira.apiToken,
    jql: s.jql || config.jira.jql,
  };
}

export function setConnection(p: Partial<Connection>): void {
  const cur = readJson<Partial<Connection>>(FILE, {});
  const next = { ...cur, ...p };
  if (typeof next.baseUrl === "string") next.baseUrl = next.baseUrl.replace(/\/+$/, "");
  writeJson(FILE, next);
}

export function isConfigured(): boolean {
  const c = getConnection();
  return Boolean(c.baseUrl && c.email && c.apiToken);
}
