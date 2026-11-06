import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { config } from "../config/index.js";
import { getMyself } from "../jira/client.js";
import { getConnection, setConnection, isConfigured } from "../jira/connection.js";
import { getNotifications, pollOnce, deleteNotification, markRead } from "../poll/index.js";
import {
  timesheetState,
  startSession,
  stopSession,
  discardSession,
  pauseSession,
  resumeSession,
} from "../timesheet/index.js";
import { finalizeTask } from "../agent/finalize.js";
import { reviewPullRequests, approveAndComplete, rejectTask } from "../review/index.js";
import { runReview, getReview, type ReviewAgentType } from "../review-agent/index.js";
import { capabilities, agentModeLabel } from "../agent/capabilities.js";
import { policyTable } from "../agent/policy.js";
import { getInstructions, setInstructions, resetInstructions } from "../agent/instructions.js";
import { makeRunner } from "../agent/runner.js";
import { Workflow, GateError, EffectError } from "../agent/workflow.js";
import { runTurn, answerPermission, resetChat, resolveRepo } from "../agent/chat.js";
import type { Decision } from "../agent/types.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  const wf = new Workflow(makeRunner());

  // Portao violado -> 409 Conflict (e nao 500). Centraliza o tratamento.
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof GateError) {
      reply.code(409).send({ error: err.message }); // pulou um portao
      return;
    }
    if (err instanceof EffectError) {
      reply.code(422).send({ error: err.message }); // efeito git/jira falhou
      return;
    }
    reply.code(500).send({ error: err.message });
  });

  app.get("/api/health", async () => ({ ok: true, ts: new Date().toISOString() }));

  // ---- Instrucoes do agente (AGENT.md editavel) ----
  app.get("/api/instructions", async () => ({ text: getInstructions() }));
  app.put<{ Body: { text: string } }>("/api/instructions", async (req) => {
    setInstructions(req.body.text);
    return { ok: true };
  });
  app.post("/api/instructions/reset", async () => ({ text: resetInstructions() }));

  // Guia de capacidades + politica de portoes (o que e auto vs exige seu OK).
  app.get("/api/capabilities", async () => ({
    agentMode: agentModeLabel(),
    capabilities: capabilities(),
    policy: policyTable(),
  }));

  app.get("/api/connection", async () => {
    try {
      const me = await getMyself();
      return { connected: true, accountId: me.accountId, displayName: me.displayName };
    } catch (e) {
      return { connected: false, error: (e as Error).message };
    }
  });

  // ---- Setup / conexao do Jira (tela de login) ----
  app.get("/api/setup/status", async () => {
    const c = getConnection();
    return { configured: isConfigured(), baseUrl: c.baseUrl, email: c.email, jql: c.jql };
  });
  app.post<{ Body: { baseUrl: string; email: string; token: string; jql?: string } }>(
    "/api/setup",
    async (req) => {
      const { baseUrl, email, token, jql } = req.body;
      setConnection({ baseUrl, email, apiToken: token, ...(jql ? { jql } : {}) });
      try {
        const me = await getMyself();
        pollOnce().catch(() => {}); // puxa dados ja de cara
        return { connected: true, displayName: me.displayName };
      } catch (e) {
        return { connected: false, error: (e as Error).message };
      }
    },
  );

  app.get("/api/notifications", async () => getNotifications());
  app.post("/api/sync", async () => ({ ok: true, scanned: await pollOnce() }));
  app.post<{ Body: { id: string } }>("/api/notifications/delete", async (req) => {
    deleteNotification(req.body.id);
    return { ok: true };
  });
  app.post<{ Body: { id: string } }>("/api/notifications/read", async (req) => {
    markRead(req.body.id);
    return { ok: true };
  });

  // Repo da task (auto): usa a branch ou o 1o repo configurado.
  app.get<{ Querystring: { key: string } }>("/api/agent/repo-for", async (req) => ({
    repo: resolveRepo(req.query.key) ?? "",
  }));

  // ---- Timesheet ----
  app.get("/api/timesheet", async () => timesheetState());
  app.post<{ Body: { key: string; summary?: string } }>(
    "/api/timesheet/start",
    async (req) => ({ ok: startSession(req.body.key, req.body.summary) }),
  );
  app.post("/api/timesheet/stop", async () => ({ ok: true, key: stopSession() }));
  app.post("/api/timesheet/discard", async () => ({ ok: true, key: discardSession() }));
  app.post("/api/timesheet/pause", async () => ({ ok: pauseSession() }));
  app.post("/api/timesheet/resume", async () => ({ ok: resumeSession() }));

  // Finalizar a task em UMA acao: commit -> PR -> Jira -> comentario -> horas.
  app.post<{
    Body: { key: string; repo?: string; message?: string; resolution?: string };
  }>("/api/agent/finalize", async (req) => finalizeTask(req.body));

  // ---- Agente de Code Review (read-only sobre o Change Set) ----
  app.get<{ Querystring: { key: string } }>(
    "/api/review-agent/state",
    async (req) => getReview(req.query.key),
  );
  app.post<{
    Body: {
      key: string;
      repo: string;
      baseBranch: string;
      agentType: ReviewAgentType;
      context?: string;
    };
  }>("/api/review-agent/run", async (req) => {
    const { key, repo, baseBranch, agentType, context } = req.body;
    return runReview({ key, repo, baseBranch, agentType, context });
  });

  // ---- Acoes de review (gh PRs + status no Jira) ----
  // Checagem das PRs (dry-run): usada pela UI para habilitar/desabilitar o aprovar.
  app.post<{ Body: { key: string; dry?: boolean } }>(
    "/api/review/pr",
    async (req) => reviewPullRequests(req.body.key, req.body.dry ?? true),
  );
  // APROVAR + MERGEAR: aprova/mergeia PR, move p/ Pending Deploy + comentario, loga horas.
  app.post<{ Body: { key: string } }>(
    "/api/review/approve",
    async (req) => approveAndComplete(req.body.key),
  );
  // REPROVAR task: comenta o motivo detalhado, move p/ Fail, loga horas.
  app.post<{ Body: { key: string; note?: string } }>(
    "/api/review/reject",
    async (req) => rejectTask(req.body.key, req.body.note),
  );

  // ---- Agente: SEMPRE propoe-e-espera. Executar so via /decide (voce). ----

  app.get<{ Querystring: { key: string } }>("/api/agent/state", async (req) =>
    wf.state(req.query.key),
  );

  app.post<{ Body: { key: string; context: string; repo?: string } }>(
    "/api/agent/analyze",
    async (req) => {
      const { key, context, repo } = req.body;
      return wf.analyze(key, context ?? "", repo); // levantamento, read-only
    },
  );

  // Iniciar task: mecanico (branch+status). Auto por padrao; vira proposta se gated.
  app.post<{ Body: { key: string; branch: string } }>(
    "/api/agent/start",
    async (req) => wf.startTask(req.body.key, req.body.branch),
  );

  app.post<{ Body: { key: string; instruction: string; context: string } }>(
    "/api/agent/propose-change",
    async (req) => {
      const { key, instruction, context } = req.body;
      return wf.proposeChange(key, instruction, context ?? "");
    },
  );

  app.post<{ Body: { key: string; message: string; files: string[] } }>(
    "/api/agent/propose-commit",
    async (req) => {
      const { key, message, files } = req.body;
      return wf.proposeCommit(key, message, files ?? []);
    },
  );

  // O UNICO ponto que executa algo. Disparado por voce. (GateError -> 409 no handler global.)
  app.post<{ Body: { key: string; decision: Decision; edited?: unknown } }>(
    "/api/agent/decide",
    async (req) => wf.decide(req.body.key, req.body.decision, req.body.edited),
  );

  // ---- Chat interativo do dev agent (streaming via SSE) ----
  app.post<{ Body: { key: string; text: string; repo?: string } }>(
    "/api/agent/chat/send",
    async (req, reply) => {
      const { key, text, repo } = req.body;
      reply.hijack();
      const raw = reply.raw;
      raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      try {
        for await (const ev of runTurn(key, text, repo)) {
          raw.write(`data: ${JSON.stringify(ev)}\n\n`);
          if (ev.type === "done") break;
        }
      } catch (e) {
        raw.write(`data: ${JSON.stringify({ type: "error", message: (e as Error).message })}\n\n`);
      } finally {
        raw.end();
      }
    },
  );
  app.post<{ Body: { key: string; requestId: string; allow: boolean } }>(
    "/api/agent/chat/permission",
    async (req) => ({ ok: answerPermission(req.body.key, req.body.requestId, req.body.allow) }),
  );
  app.post<{ Body: { key: string } }>("/api/agent/chat/reset", async (req) => {
    resetChat(req.body.key);
    return { ok: true };
  });

  // Serve a UI React buildada (web/dist) em "/", se existir. SPA: fallback no index.
  const uiDir = resolve(process.cwd(), "web/dist");
  if (existsSync(uiDir)) {
    app.register(fastifyStatic, { root: uiDir });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api/")) {
        reply.code(404).send({ error: "rota nao encontrada" });
        return;
      }
      reply.sendFile("index.html");
    });
  }

  return app;
}

export async function startServer() {
  const app = buildServer();
  await app.listen({ port: config.server.port, host: "127.0.0.1" });
  return app;
}
