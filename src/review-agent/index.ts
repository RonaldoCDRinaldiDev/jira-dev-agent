import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { detectAgentMode } from "../agent/runner.js";
import { runViaSdk } from "../agent/claude-sdk.js";
import { readJson, writeJson } from "../store/json.js";
import type { IssueKey } from "../types.js";

/**
 * Agente de Code Review: roda READ-ONLY sobre o Change Set (BASE_BRANCH...HEAD),
 * seguindo os agentes/skills embarcados em review-agent/. Nao altera codigo.
 * As acoes de aprovar PR / mover status ficam no modulo review/ (ja existente).
 */
export type ReviewAgentType = "backend" | "frontend" | "requirements";
const LABEL: Record<ReviewAgentType, string> = {
  backend: "Back-end",
  frontend: "Front-end",
  requirements: "Validacao de Requisitos",
};
const REVIEW_DIR = resolve(process.cwd(), "review-agent");

export function reviewAgentAvailable(): boolean {
  return existsSync(resolve(REVIEW_DIR, "skills/code-review-core/SKILL.md"));
}

export interface ReviewResult {
  key: IssueKey;
  agentType: ReviewAgentType;
  baseBranch: string;
  at: string;
  findings: string; // relatorio/resumo textual do agente
  costUsd?: number;
}

const STORE = "reviews.json";
type Store = Record<IssueKey, ReviewResult>;

export function getReview(key: IssueKey): ReviewResult | null {
  return readJson<Store>(STORE, {})[key] ?? null;
}

function buildPrompt(
  key: IssueKey,
  baseBranch: string,
  agentType: ReviewAgentType,
  context: string,
): string {
  return [
    `Você é o agente de Code Review (${LABEL[agentType]}).`,
    `Leia e siga INTEGRALMENTE as regras em "review-agent/skills/code-review-core/SKILL.md"`,
    `e a persona em "review-agent/agents/${agentType}.md" (leia esses arquivos antes de tudo).`,
    `As skills de apoio estão em "review-agent/skills/".`,
    "",
    `BASE_BRANCH = ${baseBranch}.`,
    `Revise EXCLUSIVAMENTE o Change Set da branch atual em relação à BASE_BRANCH`,
    `(git diff ${baseBranch}...HEAD). NÃO altere nenhum arquivo do repositório.`,
    `Produza os findings com severidade e um resumo final, em português.`,
    "",
    `Task do Jira: ${key}.`,
    context ? `\nContexto da task:\n${context}` : "",
  ].join("\n");
}

export async function runReview(opts: {
  key: IssueKey;
  repo: string;
  baseBranch: string;
  agentType: ReviewAgentType;
  context?: string;
}): Promise<ReviewResult> {
  const { key, repo, baseBranch, agentType, context = "" } = opts;

  let findings: string;
  let costUsd: number | undefined;

  if (detectAgentMode() === "disabled") {
    findings =
      "Agente de review desativado. Rode `claude setup-token` (sua assinatura) " +
      "ou defina ANTHROPIC_API_KEY para rodar a revisão real.";
  } else {
    const res = await runViaSdk({
      key,
      repo,
      instruction: buildPrompt(key, baseBranch, agentType, context),
      context: "",
      allowWrites: false, // review é read-only
      systemPromptOverride:
        "Você é um revisor de código sênior. Siga as regras do pacote de code review " +
        "(review-agent/). A revisão é READ-ONLY: não altere arquivos. Responda em português.",
      additionalDirs: [REVIEW_DIR],
    });
    findings = res.text;
    costUsd = res.costUsd;
  }

  const result: ReviewResult = {
    key,
    agentType,
    baseBranch,
    at: new Date().toISOString(),
    findings,
    costUsd,
  };
  const store = readJson<Store>(STORE, {});
  store[key] = result;
  writeJson(STORE, store);
  return result;
}
