import { config } from "../config/index.js";
import { detectAgentMode } from "./runner.js";

/**
 * Base do GUIA INTUITIVO: diz o que esta destravado e, se nao, o que falta.
 * O frontend usa isso para orientar o usuario sem ele travar em erro.
 */
export interface Capability {
  id: string;
  label: string;
  enabled: boolean;
  hint?: string; // o que fazer para destravar
}

export function capabilities(): Capability[] {
  const mode = detectAgentMode();
  const hasRepos = config.timesheet.repos.length > 0;
  return [
    {
      id: "notifications",
      label: "Notificacoes do Jira",
      enabled: true,
    },
    {
      id: "timesheet",
      label: "Timesheet automatico (horas por branch)",
      enabled: hasRepos,
      hint: hasRepos ? undefined : "Defina TIMESHEET_REPOS no .env com os caminhos dos repos.",
    },
    {
      id: "agent",
      label: "Agente de desenvolvimento (copiloto com portoes)",
      enabled: mode !== "disabled",
      hint:
        mode !== "disabled"
          ? undefined
          : "Rode `claude setup-token` (sua assinatura) ou defina ANTHROPIC_API_KEY.",
    },
  ];
}

export function agentModeLabel(): string {
  const m = detectAgentMode();
  return m === "subscription"
    ? "assinatura (sua conta)"
    : m === "apiKey"
      ? "API key"
      : "desativado";
}
