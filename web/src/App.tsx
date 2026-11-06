import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  useConnection,
  useCapabilities,
  useNotifications,
  useSync,
  useNotifActions,
  fetchRepoFor,
  useTimesheet,
  useTimesheetAction,
  useSetupStatus,
  useSetup,
  useInstructions,
  useSaveInstructions,
  useReviewState,
  useRunReview,
  useReviewActions,
  type Notification,
  type ReviewAgentType,
} from "./api.js";

const KIND_LABEL: Record<Notification["kind"], string> = {
  new: "Nova",
  status: "Status",
  assignee: "Responsavel",
  description: "Descricao",
  comment: "Comentario",
};


function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}min` : `${m}min`;
}

function Header({
  onConnect,
  onInstructions,
}: {
  onConnect: () => void;
  onInstructions: () => void;
}) {
  const { data: conn } = useConnection();
  const { data: caps } = useCapabilities();
  const sync = useSync();
  return (
    <header className="hd">
      <div className="hd-left">
        <h1>jira-dev-agent</h1>
        <span className={`dot ${conn?.connected ? "on" : "off"}`} />
        <span className="muted">
          {conn === undefined
            ? "conectando..."
            : conn.connected
              ? `Jira: ${conn.displayName}`
              : "Jira desconectado"}
        </span>
        {caps && <span className="pill">agente: {caps.agentMode}</span>}
      </div>
      <div className="hd-right">
        <button className="btn ghost sm" onClick={onInstructions}>
          Instruções
        </button>
        <button className="btn ghost sm" onClick={onConnect}>
          Conexão
        </button>
        <button className="btn" disabled={sync.isPending} onClick={() => sync.mutate()}>
          {sync.isPending ? "Sincronizando..." : "Sincronizar"}
        </button>
      </div>
    </header>
  );
}

function InstructionsEditor({ onClose }: { onClose: () => void }) {
  const { data } = useInstructions(true);
  const { save, reset } = useSaveInstructions();
  const [text, setText] = useState<string | null>(null);
  const value = text ?? data?.text ?? "";

  return (
    <div className="setup-wrap">
      <motion.div
        className="setup-card wide"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <h2>Instruções do agente</h2>
        <p className="muted setup-intro">
          Regras que o agente segue em toda task. Começam com o padrão do produto;
          o que você editar aqui fica salvo no arquivo <code>AGENT.md</code>. (O{" "}
          <code>CLAUDE.md</code> de cada repositório é lido automaticamente, à parte.)
        </p>
        <textarea
          className="inp ta"
          value={value}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="setup-actions">
          <button
            className="btn ghost"
            onClick={() => reset.mutate(undefined, { onSuccess: (d) => setText(d.text) })}
          >
            Restaurar padrão
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>
            Fechar
          </button>
          <button
            className="btn"
            disabled={save.isPending}
            onClick={() => save.mutate(value, { onSuccess: onClose })}
          >
            {save.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Setup({ onDone, canClose }: { onDone: () => void; canClose: boolean }) {
  const { data: status } = useSetupStatus();
  const setup = useSetup();
  const [baseUrl, setBaseUrl] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  // Pré-preenche com o que já existe (sem o token, que é secreto).
  const bu = baseUrl || status?.baseUrl || "";
  const em = email || status?.email || "";

  const submit = () =>
    setup.mutate(
      { baseUrl: bu, email: em, token },
      { onSuccess: (r) => r.connected && onDone() },
    );

  return (
    <div className="setup-wrap">
      <motion.div
        className="setup-card"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <h2>Conectar ao Jira</h2>
        <p className="muted setup-intro">
          Seus dados ficam só na sua máquina. O token é gerado em Atlassian →
          Account settings → Security → API tokens.
        </p>
        <label className="fld">
          <span>URL do Jira</span>
          <input
            className="inp"
            placeholder="https://suaempresa.atlassian.net"
            value={bu}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </label>
        <label className="fld">
          <span>Seu e-mail</span>
          <input
            className="inp"
            placeholder="voce@empresa.com"
            value={em}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="fld">
          <span>API token</span>
          <input
            className="inp"
            type="password"
            placeholder="cole o token aqui"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        {setup.data && !setup.data.connected && (
          <p className="err">Não conectou: {setup.data.error}</p>
        )}
        <div className="setup-actions">
          {canClose && (
            <button className="btn ghost" onClick={onDone}>
              Cancelar
            </button>
          )}
          <button
            className="btn"
            disabled={!bu || !em || !token || setup.isPending}
            onClick={submit}
          >
            {setup.isPending ? "Conectando..." : "Conectar"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Guide() {
  const { data } = useCapabilities();
  if (!data) return null;
  // Só mostra o que falta ativar (dica de setup). Tudo ligado = nada aqui.
  const off = data.capabilities.filter((c) => !c.enabled);
  if (off.length === 0) return null;
  return (
    <section className="guide">
      <div className="guide-head">Recursos a ativar (opcional)</div>
      <div className="guide-cards">
        {off.map((c) => (
          <div key={c.id} className="cap no">
            <strong>{c.label}</strong>
            {c.hint && <p className="hint">{c.hint}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Feed({
  onWork,
  onReview,
}: {
  onWork: (key: string) => void;
  onReview: (key: string) => void;
}) {
  const { data, isLoading, error } = useNotifications();
  const { remove, markRead } = useNotifActions();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  if (isLoading) return <p className="muted pad">Carregando...</p>;
  if (error) return <p className="muted pad">Erro ao carregar notificacoes.</p>;
  if (!data || data.length === 0)
    return <p className="muted pad">Sem eventos ainda. Novidades do Jira aparecem aqui.</p>;
  return (
    <>
      <ul className="feed">
        {data.map((n, i) => (
          <motion.li
            key={n.id}
            className={`item k-${n.kind}${n.read ? " read" : ""}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4), ease: "easeOut" }}
          >
            <button className="item-x" title="Excluir" onClick={() => setConfirmId(n.id)}>
              ×
            </button>
            <div className="item-top">
              <span className={`badge b-${n.kind}`}>{KIND_LABEL[n.kind]}</span>
              <span className="key">{n.key}</span>
              <span className="when">{new Date(n.at).toLocaleString("pt-BR")}</span>
            </div>
            {n.parentKey && (
              <div className="parent">
                ↳ Filho de <span className="key">{n.parentKey}</span>
                {n.parentSummary ? ` · ${n.parentSummary}` : ""}
              </div>
            )}
            <div className="item-sum">{n.summary}</div>
            {n.detail && <div className="item-detail">{n.detail}</div>}
            {n.kind === "comment" && n.commentHtml && (
              <div className="comment-body" dangerouslySetInnerHTML={{ __html: n.commentHtml }} />
            )}
            <div className="item-actions">
              <button className="btn sm" onClick={() => onWork(n.key)}>
                Enviar ao agente
              </button>
              <button className="btn sm ghost" onClick={() => onReview(n.key)}>
                Enviar ao review
              </button>
              {!n.read && (
                <button className="btn sm ghost" onClick={() => markRead.mutate(n.id)}>
                  Marcar lida
                </button>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
      {confirmId && (
        <div className="modal-overlay" onClick={() => setConfirmId(null)}>
          <motion.div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h3>Excluir notificação?</h3>
            <p className="muted">Remove o item do feed. Não altera nada no Jira.</p>
            <div className="setup-actions">
              <button className="btn ghost" onClick={() => setConfirmId(null)}>
                Cancelar
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  remove.mutate(confirmId);
                  setConfirmId(null);
                }}
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function TimesheetPanel() {
  const { data, isLoading } = useTimesheet();
  const { start, stop, discard } = useTimesheetAction();
  if (isLoading) return <p className="muted pad">Carregando...</p>;
  if (!data) return <p className="muted pad">Timesheet indisponivel.</p>;
  const entries = Object.entries(data.entries);
  return (
    <div className="panel">
      <div className="row">
        <div>
          <span className="muted">Task ativa pela branch: </span>
          <strong>{data.activeBranchKey ?? "nenhuma"}</strong>
        </div>
        {data.active ? (
          <div className="active-session">
            <span className="pill on">
              ▶ {data.active.key} · {fmtMin(data.active.minutes)}
            </span>
            <button className="btn sm" onClick={() => stop.mutate()}>
              Parar
            </button>
            <button className="btn sm ghost" onClick={() => discard.mutate()}>
              Descartar
            </button>
          </div>
        ) : (
          data.activeBranchKey && (
            <button
              className="btn sm"
              onClick={() => start.mutate({ key: data.activeBranchKey! })}
            >
              Iniciar {data.activeBranchKey}
            </button>
          )
        )}
      </div>
      <h3 className="sub">Hoje</h3>
      {entries.length === 0 ? (
        <p className="muted">Nenhuma hora registrada hoje.</p>
      ) : (
        <ul className="ts-list">
          {entries.map(([slot, e]) => (
            <li key={slot} className="ts-item">
              <span className="key">{e.key}</span>
              <span className="sum">{e.summary ?? ""}</span>
              <span className="mins">{fmtMin(e.minutes)}</span>
              <span className={`tag ${e.logged ? "ok" : ""}`}>
                {e.logged ? "lancado" : "pendente"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type ChatMsg = { id: string; role: "user" | "agent" | "tool" | "system" | "error"; text: string };
let msgSeq = 0;
const nextId = () => `m${++msgSeq}`;

function AgentPanel({ preset }: { preset: { key: string; n: number } | null }) {
  const [key, setKey] = useState("");
  const [repo, setRepo] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [perm, setPerm] = useState<{ requestId: string; toolName: string; summary: string } | null>(null);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const curAgent = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preset) {
      setKey(preset.key);
      setInput(`Faça o levantamento da task ${preset.key} e proponha um plano objetivo. Aguarde meu OK antes de qualquer alteração.`);
      fetchRepoFor(preset.key).then((r) => r && setRepo(r)); // repo automático
    }
  }, [preset?.n]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, perm]);

  const add = (m: ChatMsg) => setMsgs((prev) => [...prev, m]);
  const appendAgent = (t: string) => {
    if (curAgent.current) {
      const id = curAgent.current;
      setMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + t } : m)));
    } else {
      const id = nextId();
      curAgent.current = id;
      setMsgs((prev) => [...prev, { id, role: "agent", text: t }]);
    }
  };

  function handleEvent(ev: any) {
    if (ev.type === "text") appendAgent(ev.text);
    else if (ev.type === "tool") {
      curAgent.current = null;
      add({ id: nextId(), role: "tool", text: `${ev.name}${ev.summary ? " · " + ev.summary : ""}` });
    } else if (ev.type === "permission") {
      curAgent.current = null;
      setPerm({ requestId: ev.requestId, toolName: ev.toolName, summary: ev.summary });
    } else if (ev.type === "error") {
      curAgent.current = null;
      add({ id: nextId(), role: "error", text: ev.message });
    } else if (ev.type === "result") {
      curAgent.current = null;
    }
  }

  async function send(text: string) {
    if (!key || !repo || !text.trim() || running) return;
    add({ id: nextId(), role: "user", text });
    setInput("");
    setRunning(true);
    curAgent.current = null;
    try {
      const res = await fetch("/api/agent/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, text, repo }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.type === "done") { setRunning(false); return; }
            handleEvent(ev);
          } catch { /* linha parcial */ }
        }
      }
    } catch (e) {
      add({ id: nextId(), role: "error", text: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }

  async function answerPerm(allow: boolean) {
    if (!perm) return;
    const p = perm;
    setPerm(null);
    add({ id: nextId(), role: "system", text: allow ? `Permissão concedida: ${p.toolName}` : `Recusado: ${p.toolName}` });
    await fetch("/api/agent/chat/permission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, requestId: p.requestId, allow }),
    });
  }

  return (
    <div className="panel">
      <div className="row">
        <input className="inp" placeholder="Chave da task (ex.: ABC-123)" value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())} />
        <input className="inp" placeholder="Caminho do repo (ex.: ~/GitHub/meu-repo)" value={repo}
          onChange={(e) => setRepo(e.target.value)} />
      </div>

      <div className="chat">
        {msgs.length === 0 && !running && (
          <p className="muted pad">Converse com o agente sobre a task. Ele lê o código, te explica o que vai fazer e pede sua permissão antes de alterar.</p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            {m.role === "tool" && <span className="msg-ico">⚙</span>}
            <div className="msg-body">{m.text}</div>
          </div>
        ))}
        {running && !perm && <div className="msg agent"><div className="msg-body typing">pensando…</div></div>}
        {perm && (
          <div className="perm">
            <div className="perm-head"><span className="badge gate">permissão</span><strong>{perm.toolName}</strong></div>
            {perm.summary && <pre className="prop-body">{perm.summary}</pre>}
            <div className="prop-actions">
              <button className="btn sm" onClick={() => answerPerm(true)}>Permitir</button>
              <button className="btn sm ghost" onClick={() => answerPerm(false)}>Negar</button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input">
        <textarea
          className="inp"
          placeholder={key && repo ? "Escreva para o agente..." : "Preencha a chave e o repo acima"}
          value={input}
          disabled={!key || !repo}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={2}
        />
        <button className="btn" disabled={!key || !repo || !input.trim() || running} onClick={() => send(input)}>
          {running ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}

const REVIEW_TYPES: { v: ReviewAgentType; label: string }[] = [
  { v: "backend", label: "Back-end" },
  { v: "frontend", label: "Front-end" },
  { v: "requirements", label: "Requisitos" },
];

function ReviewPanel({ preset }: { preset: { key: string; n: number } | null }) {
  const [key, setKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [repo, setRepo] = useState("");
  const [base, setBase] = useState("");
  const [type, setType] = useState<ReviewAgentType>("backend");
  const { data: result } = useReviewState(key);
  const run = useRunReview(key);
  const act = useReviewActions(key);

  useEffect(() => {
    if (preset) {
      setKey(preset.key);
      setDraft(preset.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.n]);

  const canRun = (key ?? draft) && repo && base && !run.isPending;

  return (
    <div className="panel">
      <div className="row">
        <input
          className="inp"
          placeholder="Chave da task (ex.: ABC-123)"
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
        />
        <input
          className="inp"
          placeholder="Caminho do repo"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
      </div>
      <div className="row">
        <input
          className="inp"
          placeholder="Branch base (ex.: develop)"
          value={base}
          onChange={(e) => setBase(e.target.value)}
        />
        <select className="inp" value={type} onChange={(e) => setType(e.target.value as ReviewAgentType)}>
          {REVIEW_TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              Review {t.label}
            </option>
          ))}
        </select>
        <button
          className="btn sm"
          disabled={!canRun}
          onClick={() => {
            if (!key) setKey(draft);
            run.mutate({ repo, baseBranch: base, agentType: type });
          }}
        >
          {run.isPending ? "Revisando..." : "Revisar"}
        </button>
      </div>

      {run.isPending && (
        <p className="muted pad">Rodando a revisão read-only sobre o Change Set...</p>
      )}

      {result && (
        <div className="proposal">
          <div className="prop-head">
            <span className="badge gate">findings</span>
            <strong>
              Review {REVIEW_TYPES.find((t) => t.v === result.agentType)?.label} ·{" "}
              {result.baseBranch}...HEAD
            </strong>
          </div>
          <pre className="prop-body">{result.findings}</pre>
          <div className="prop-actions">
            <button className="btn sm ghost" onClick={() => act.analyzePr.mutate()}>
              Analisar PR
            </button>
            <button className="btn sm" onClick={() => act.approvePr.mutate()}>
              Aprovar + mergear PR
            </button>
            <button className="btn sm ghost" onClick={() => act.moveStatus.mutate()}>
              Mover status (fim de review)
            </button>
          </div>
          <p className="act-hint">
            Revisão é read-only. Estas ações usam o GitHub CLI e o Jira — exigem{" "}
            <code>gh</code> autenticado.
          </p>
        </div>
      )}
    </div>
  );
}

type Tab = "feed" | "horas" | "agente" | "review";

export function App() {
  const [tab, setTab] = useState<Tab>("feed");
  const [showSetup, setShowSetup] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [preset, setPreset] = useState<{ key: string; n: number } | null>(null);
  const [reviewPreset, setReviewPreset] = useState<{ key: string; n: number } | null>(null);
  const { data: status } = useSetupStatus();
  const { start } = useTimesheetAction();

  // Automação central: a partir de uma notificação, liga tudo na mesma task.
  const workOn = (key: string) => {
    start.mutate({ key }); // 1) liga o cronômetro (Horas)
    setPreset({ key, n: Date.now() }); // 2) manda a task pro Agente
    setTab("agente"); // 3) abre o Agente
  };
  const workReview = (key: string) => {
    start.mutate({ key });
    setReviewPreset({ key, n: Date.now() });
    setTab("review");
  };

  // Primeira vez (sem conexao configurada) abre a tela de login direto.
  const mustSetup = status !== undefined && !status.configured;
  if (mustSetup || showSetup) {
    return (
      <div className="app">
        <Setup onDone={() => setShowSetup(false)} canClose={!mustSetup} />
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className="app">
        <InstructionsEditor onClose={() => setShowInstructions(false)} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        onConnect={() => setShowSetup(true)}
        onInstructions={() => setShowInstructions(true)}
      />
      <nav className="tabs">
        {(["feed", "horas", "agente", "review"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "feed"
              ? "Notificações"
              : t === "horas"
                ? "Horas"
                : t === "agente"
                  ? "Agente"
                  : "Code Review"}
          </button>
        ))}
      </nav>
      <main>
        {tab === "feed" && (
          <>
            <Guide />
            <Feed onWork={workOn} onReview={workReview} />
          </>
        )}
        {tab === "horas" && <TimesheetPanel />}
        {tab === "agente" && <AgentPanel preset={preset} />}
        {tab === "review" && <ReviewPanel preset={reviewPreset} />}
      </main>
    </div>
  );
}
