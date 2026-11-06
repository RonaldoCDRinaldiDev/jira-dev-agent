import type { AgentRequest, AgentResult } from "./runner.js";
import { getInstructions } from "./instructions.js";

/**
 * Integracao real com o Claude Agent SDK (@anthropic-ai/claude-agent-sdk).
 *
 * Import DINAMICO de proposito: o pacote traz um binario especifico de plataforma,
 * entao so e carregado em runtime (na maquina do usuario, apos `npm install`).
 * Assim o projeto compila mesmo sem o SDK instalado no ambiente de dev.
 *
 * Auth: usa CLAUDE_CODE_OAUTH_TOKEN (gerado por `claude setup-token`), passado por
 * options.env. IMPORTANTE: nao definimos ANTHROPIC_API_KEY — em modo nao-interativo
 * ela teria precedencia e ignoraria a assinatura.
 */

type Permission = "plan" | "acceptEdits" | "default";

async function loadQuery(): Promise<(args: unknown) => AsyncIterable<any>> {
  try {
    // Specifier em variavel: evita o TS tentar resolver o modulo em tempo de build
    // (ele so existe na maquina do usuario apos `npm install`).
    const spec = "@anthropic-ai/claude-agent-sdk";
    const mod: any = await import(spec);
    return mod.query;
  } catch {
    throw new Error(
      "Agent SDK nao instalado. Rode `npm install` na sua maquina (o pacote " +
        "@anthropic-ai/claude-agent-sdk traz binario de plataforma).",
    );
  }
}

/** Extrai um diff unificado da resposta, se vier em cerca ```diff ... ``` ou cru. */
export function extractDiff(text: string): string | undefined {
  const fenced = text.match(/```(?:diff|patch)?\s*\n([\s\S]*?)```/);
  const body = (fenced && fenced[1]) || text;
  if (/^(diff --git |--- |\+\+\+ |@@ )/m.test(body)) return body.trim();
  return undefined;
}

export async function runViaSdk(req: AgentRequest): Promise<AgentResult> {
  const query = await loadQuery();
  const permissionMode: Permission = req.allowWrites ? "acceptEdits" : "plan";

  const token = process.env.CLAUDE_CODE_OAUTH_TOKEN || "";
  const env = token ? { CLAUDE_CODE_OAUTH_TOKEN: token } : undefined;

  const prompt = [
    req.context ? `Contexto:\n${req.context}` : "",
    "",
    req.instruction,
  ]
    .join("\n")
    .trim();

  let text = "";
  let costUsd: number | undefined;

  const instructions = req.systemPromptOverride ?? getInstructions();

  const stream = query({
    prompt,
    options: {
      cwd: req.repo,
      permissionMode, // "plan" = read-only: explora e propoe, nao escreve
      settingSources: ["project"], // carrega CLAUDE.md do repo
      // Instrucoes (AGENT.md ou override do review) como system prompt.
      ...(instructions ? { appendSystemPrompt: instructions } : {}),
      ...(req.additionalDirs?.length ? { additionalDirectories: req.additionalDirs } : {}),
      ...(env ? { env } : {}),
    },
  });

  for await (const msg of stream) {
    if (msg?.type === "assistant") {
      const parts = msg.message?.content ?? [];
      for (const p of parts) if (p?.type === "text") text += p.text;
    } else if (msg?.type === "result") {
      if (typeof msg.result === "string" && msg.result) text = msg.result;
      if (typeof msg.total_cost_usd === "number") costUsd = msg.total_cost_usd;
      if (msg.subtype && msg.subtype !== "success") {
        throw new Error(`Agente terminou com: ${msg.subtype}`);
      }
    }
  }

  return { text: text.trim(), diff: extractDiff(text), costUsd };
}
