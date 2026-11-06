import { config } from "../config/index.js";
import type { IssueKey } from "../types.js";

/**
 * Abstrai COMO a IA roda, pra trocar o modo de auth sem mexer no workflow:
 *  - "subscription": sua conta Claude via `claude setup-token` (voce, agora).
 *  - "apiKey":       API key por usuario (produto multiusuario, cobrada por token).
 *  - "disabled":     sem IA; a ferramenta vira so hub de notificacao/timesheet.
 *
 * NOTA DE INTEGRACAO: a chamada real ao Agent SDK (@anthropic-ai/claude-agent-sdk)
 * entra em `run()`. Mantemos atras desta interface de proposito: o resto do app
 * so conhece "proponha X e me devolva o texto", nunca o SDK direto.
 */
export type AgentMode = "subscription" | "apiKey" | "disabled";

export interface AgentRequest {
  key: IssueKey;
  repo?: string;
  /** Instrucao de alto nivel (ex.: "faca o levantamento", "implemente o item 2"). */
  instruction: string;
  /** Contexto ja montado (descricao da issue, trechos do repo). */
  context: string;
  /**
   * Modo de permissao. Para os portoes humanos, o agente roda SEM escrever nada
   * ("plan"/read-only) ao propor; a escrita so acontece apos sua aprovacao, e
   * mesmo assim limitada ao que foi aprovado.
   */
  allowWrites: boolean;
  /** Substitui o system prompt padrao (AGENT.md). Usado pelo agente de review. */
  systemPromptOverride?: string;
  /** Diretorios extras que o agente pode ler (ex.: os arquivos do review). */
  additionalDirs?: string[];
}

export interface AgentResult {
  text: string; // resposta/proposta do agente
  diff?: string; // patch unificado, quando aplicavel
  costUsd?: number; // estimativa local (nao e fatura)
}

export interface AgentRunner {
  readonly mode: AgentMode;
  run(req: AgentRequest): Promise<AgentResult>;
}

/** Detecta o modo disponivel a partir do ambiente (base do "guia" de capacidades). */
export function detectAgentMode(): AgentMode {
  if (process.env.ANTHROPIC_API_KEY) return "apiKey";
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN || config.agent.claudeBin) {
    return "subscription";
  }
  return "disabled";
}

/** Runner desabilitado: responde explicando o que falta (nunca quebra o app). */
export class DisabledRunner implements AgentRunner {
  readonly mode = "disabled" as const;
  async run(): Promise<AgentResult> {
    return {
      text:
        "Agente de IA desativado. Para ativar: rode `claude setup-token` " +
        "(sua assinatura) ou defina ANTHROPIC_API_KEY. Enquanto isso, a central " +
        "segue funcionando para notificacoes e timesheet.",
    };
  }
}

/** Runner real: chama o Claude Agent SDK (carregado dinamicamente em runtime). */
export class ClaudeAgentRunner implements AgentRunner {
  constructor(readonly mode: AgentMode) {}
  async run(req: AgentRequest): Promise<AgentResult> {
    const { runViaSdk } = await import("./claude-sdk.js");
    return runViaSdk(req);
  }
}

export function makeRunner(): AgentRunner {
  const mode = detectAgentMode();
  return mode === "disabled" ? new DisabledRunner() : new ClaudeAgentRunner(mode);
}
