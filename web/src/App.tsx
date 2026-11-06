import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  useConnection,
  useCapabilities,
  useNotifications,
  useSync,
  useNotifActions,
  fetchRepoFor,
  fetchRoute,
  useTimesheet,
  useTimesheetAction,
  useFinalize,
  useSetupStatus,
  useSetup,
  useInstructions,
  useSaveInstructions,
  useReviewState,
  useRunReview,
  useReviewActions,
  usePrStatus,
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
  return h ? `${h}h ${m.toString().padStart(2, "0")}min` : `${m}min`;
}

function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function fmtDay(iso: string) {
  // iso = YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d);
  const hoje = new Date();
  const isHoje = dt.toDateString() === hoje.toDateString();
  const label = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} · ${WEEKDAYS[dt.getDay()]}`;
  return isHoje ? `Hoje · ${label}` : label;
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
}: {
  onWork: (n: Notification) => void;
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
              <button className="btn sm" onClick={() => onWork(n)}>
                Trabalhar na task
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
  const { start, discard, pause, resume } = useTimesheetAction();
  const finalize = useFinalize();
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<import("./api.js").FinalizeResult | null>(null);

  // relógio vivo: tica de 1 em 1s enquanto houver sessão rodando (não pausada).
  const running = !!data?.active && !data.active.paused;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (isLoading) return <p className="muted pad">Carregando...</p>;
  if (!data) return <p className="muted pad">Timesheet indisponível.</p>;

  const active = data.active;
  const liveMs = active
    ? active.paused
      ? active.minutes * 60_000
      : now - active.startedAt - active.pausedAccumMs
    : 0;

  const doFinalize = () => {
    if (!active) return;
    finalize.mutate(
      { key: active.key, ...(active.repo ? { repo: active.repo } : {}) },
      { onSuccess: (r) => setResult(r) },
    );
  };

  return (
    <div className="panel ts">
      <div className="ts-eyebrow">EM DESENVOLVIMENTO</div>
      {active ? (
        <div className={`ts-active${active.paused ? " paused" : ""}`}>
          <div className="ts-active-info">
            <div className="ts-active-top">
              <span className="key">{active.key}</span>
              {active.summary && <span className="ts-active-sum">{active.summary}</span>}
            </div>
            <div className="ts-active-sub">
              {active.paused ? "pausado" : "contando"} · lança sozinho ao commitar
            </div>
          </div>
          <div className="ts-clock">{fmtClock(liveMs)}</div>
          <div className="ts-active-actions">
            {active.paused ? (
              <button className="btn sm" onClick={() => resume.mutate()}>▶ Retomar</button>
            ) : (
              <button className="btn sm ghost" onClick={() => pause.mutate()}>⏸ Pausar</button>
            )}
            <button className="btn sm" disabled={finalize.isPending} onClick={doFinalize}>
              {finalize.isPending ? "Finalizando..." : "✓ Finalizar"}
            </button>
            <button className="btn sm ghost danger" onClick={() => discard.mutate()}>✕ Remover</button>
          </div>
        </div>
      ) : (
        <div className="ts-active empty">
          <span className="muted">
            Nenhuma task em andamento.
            {data.activeBranchKey ? " Branch detectada: " : ""}
            {data.activeBranchKey && <strong> {data.activeBranchKey}</strong>}
          </span>
          {data.activeBranchKey && (
            <button className="btn sm" onClick={() => start.mutate({ key: data.activeBranchKey! })}>
              Iniciar {data.activeBranchKey}
            </button>
          )}
        </div>
      )}

      {result && (
        <div className={`finalize-result ${result.ok ? "ok" : "warn"}`}>
          <div className="fr-head">
            <strong>{result.ok ? "✓ Task finalizada" : "Finalização com pendências"}</strong>
            <button className="item-x" onClick={() => setResult(null)}>×</button>
          </div>
          <ul className="fr-steps">
            {result.steps.map((s) => (
              <li key={s.step} className={s.ok ? "ok" : "fail"}>
                <span className="fr-ico">{s.ok ? "✓" : "✕"}</span>
                <span className="fr-step">{s.step}</span>
                <span className="fr-detail">{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ts-eyebrow mt">DESENVOLVIDAS · ÚLTIMOS 14 DIAS</div>
      {data.days.length === 0 ? (
        <p className="muted">Nenhuma hora registrada ainda.</p>
      ) : (
        data.days.map((d) => (
          <div key={d.day} className="ts-day">
            <div className="ts-day-head">
              <span className="ts-day-label">{fmtDay(d.day)}</span>
              <span className="ts-day-total">total do dia: {fmtMin(d.total)}</span>
            </div>
            <ul className="ts-list">
              {d.entries.map((e) => (
                <li key={e.slot} className="ts-item">
                  <span className="key">{e.key}</span>
                  <span className="sum">{e.summary ?? ""}</span>
                  <span className="ts-spent">{fmtMin(e.minutes)}</span>
                  <span className={`ts-status ${e.logged ? "ok" : ""}`}>
                    {e.logged ? "✓ lançado" : "• não lançado"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

type ChatMsg = { id: string; role: "user" | "agent" | "tool" | "system" | "error"; text: string };
let msgSeq = 0;
const nextId = () => `m${++msgSeq}`;

// Renderização leve de markdown inline: **negrito** e `código`.
function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] !== undefined) out.push(<strong key={k++}>{m[2]}</strong>);
    else if (m[3] !== undefined) out.push(<code key={k++}>{m[3]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Separa o corpo da resposta do bloco final Feito/Falta/Status (se houver).
function splitFFS(text: string): { body: string; ffs?: { feito: string; falta: string; status: string } } {
  const lines = text.split("\n");
  let idx = -1;
  for (let i = 0; i < lines.length; i++) if (/^[\s>*-]*\**\s*feito\s*\**\s*:/i.test(lines[i]!)) idx = i;
  if (idx === -1) return { body: text };
  const after = lines.slice(idx);
  const grab = (label: string) => {
    const re = new RegExp(`^[\\s>*-]*\\**\\s*${label}\\**\\s*:\\s*(.*)$`, "i");
    for (const l of after) { const mm = l.match(re); if (mm) return mm[1]!.trim(); }
    return "";
  };
  const feito = grab("feito"), falta = grab("falta"), status = grab("status");
  if (!feito && !falta && !status) return { body: text };
  return { body: lines.slice(0, idx).join("\n").trim(), ffs: { feito, falta, status } };
}

function AgentBody({ text }: { text: string }) {
  const { body, ffs } = splitFFS(text);
  const blocks = body.split("\n").filter((l) => l.trim() !== "");
  return (
    <div className="msg-body">
      {blocks.map((l, i) => {
        const bullet = /^[-*]\s+/.test(l);
        return (
          <p key={i} className={bullet ? "md-li" : "md-p"}>
            {inline(bullet ? l.replace(/^[-*]\s+/, "") : l)}
          </p>
        );
      })}
      {ffs && (
        <div className="ffs">
          <div className="ffs-row ffs-feito"><span>Feito</span><p>{inline(ffs.feito)}</p></div>
          <div className="ffs-row ffs-falta"><span>Falta</span><p>{inline(ffs.falta)}</p></div>
          <div className="ffs-row ffs-status"><span>Status</span><p>{inline(ffs.status)}</p></div>
        </div>
      )}
    </div>
  );
}

function AgentPanel({ preset }: { preset: { key: string; n: number; msg?: string } | null }) {
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
      setInput(preset.msg ?? `Vamos trabalhar na ${preset.key}.`);
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
            {m.role === "agent" ? (
              <AgentBody text={m.text} />
            ) : (
              <div className="msg-body">{m.text}</div>
            )}
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

// Renderização de markdown em blocos: #/##/### títulos, listas, parágrafos.
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  lines.forEach((raw, i) => {
    const l = raw.trimEnd();
    if (l.trim() === "") return;
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1]!.length;
      out.push(<div key={i} className={`md-h md-h${lvl}`}>{inline(h[2]!)}</div>);
    } else if (/^\s*[-*]\s+/.test(l)) {
      out.push(<p key={i} className="md-li">{inline(l.replace(/^\s*[-*]\s+/, ""))}</p>);
    } else if (/^\s*\d+\.\s+/.test(l)) {
      out.push(<p key={i} className="md-li num">{inline(l.replace(/^\s*/, ""))}</p>);
    } else {
      out.push(<p key={i} className="md-p">{inline(l)}</p>);
    }
  });
  return <div className="md">{out}</div>;
}

function count(t: string, re: RegExp) {
  return (t.match(re) || []).length;
}
function ReviewReport({ result }: { result: { agentType: ReviewAgentType; baseBranch: string; findings: string } }) {
  const t = result.findings || "";
  const crit = count(t, /🔴/g) || count(t, /\bCR[ÍI]TICO\b/gi);
  const alerta = count(t, /🟡/g) || count(t, /\bALERTA\b/gi);
  const sug = count(t, /🟢/g) || count(t, /\bSUGEST[ÃA]O\b/gi);
  const findings = count(t, /\bCR-\d+/g);
  const reprovado = /AJUSTES OBRIGAT|❌/i.test(t);
  const aprovado = !reprovado && /(SEM AJUSTES|✅)/i.test(t);
  const label = REVIEW_TYPES.find((x) => x.v === result.agentType)?.label ?? result.agentType;
  return (
    <div className="review-report">
      <div className="rr-head">
        <span className="rr-eyebrow">CODE REVIEW</span>
        <h3>{label}</h3>
        <div className="rr-chips">
          <span className="rr-chip add">+ HEAD</span>
          <span className="rr-chip del">− {result.baseBranch}</span>
          <span className="rr-chip-note">= Change Set revisado</span>
        </div>
      </div>
      <div className="rr-counts">
        <div className="rr-count"><span>Findings</span><strong>{findings || "—"}</strong></div>
        <div className="rr-count crit"><span>🔴 Críticos</span><strong>{crit}</strong></div>
        <div className="rr-count alerta"><span>🟡 Alertas</span><strong>{alerta}</strong></div>
        <div className="rr-count sug"><span>🟢 Sugestões</span><strong>{sug}</strong></div>
      </div>
      {(aprovado || reprovado) && (
        <div className={`rr-verdict ${reprovado ? "fail" : "ok"}`}>
          {reprovado ? "❌ AJUSTES OBRIGATÓRIOS" : "✅ SEM AJUSTES OBRIGATÓRIOS"}
        </div>
      )}
      <div className="rr-body">
        <Markdown text={t} />
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
  const prStatus = usePrStatus(key, !!result); // verifica as PRs sozinho quando há review

  useEffect(() => {
    if (preset) {
      setKey(preset.key);
      setDraft(preset.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.n]);

  const canRun = (key ?? draft) && repo && base && !run.isPending;
  const prs = prStatus.data ?? [];
  const anyApprovable = prs.some((p) => p.approvable && !p.merged);

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
        <div className="review-wrap">
          <ReviewReport result={result} />
          {/* Status das PRs — verificado automaticamente */}
          <div className="pr-status">
            <div className="pr-status-head">
              <span className="pr-status-title">PULL REQUESTS</span>
              <button className="linkish" disabled={prStatus.isFetching} onClick={() => prStatus.refetch()}>
                {prStatus.isFetching ? "verificando…" : "atualizar"}
              </button>
            </div>
            {prStatus.isLoading ? (
              <div className="ar-line muted">Verificando PRs da task…</div>
            ) : prs.length > 0 ? (
              prs.map((p, i) => (
                <div key={i} className="ar-line">
                  <span className="ar-repo">
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.repo}{p.number ? ` #${p.number}` : ""}</a>
                           : <>{p.repo}{p.number ? ` #${p.number}` : ""}</>}
                  </span>
                  <span className={`ar-tag ${p.merged || p.approvable ? "ok" : "warn"}`}>
                    {p.merged ? "mergeada" : p.approvable ? "pronta p/ merge" : (p.reason ?? "não mergeável")}
                  </span>
                </div>
              ))
            ) : (
              <div className="ar-line muted">Nenhuma PR aberta para esta task.</div>
            )}
          </div>

          <div className="prop-actions">
            <button
              className="btn sm"
              title={anyApprovable ? "Aprova e mergeia a PR, move para Pending Deploy, comenta que passou e loga as horas." : "Nenhuma PR pronta pra merge."}
              disabled={!anyApprovable || act.approve.isPending || act.reject.isPending || prStatus.isFetching}
              onClick={() => act.approve.mutate()}
            >
              {act.approve.isPending ? "Aprovando…" : "Aprovar + mergear"}
            </button>
            <button
              className="btn sm ghost danger"
              title="Reprova a task: move para Fail, comenta o motivo detalhado e loga as horas."
              disabled={act.reject.isPending || act.approve.isPending}
              onClick={() => act.reject.mutate()}
            >
              {act.reject.isPending ? "Reprovando…" : "Reprovar task"}
            </button>
          </div>

          {!prStatus.isLoading && prs.length > 0 && !anyApprovable && (
            <p className="act-warn">
              ⚠ Nenhuma PR pronta pra merge agora (rascunho ou conflito). Resolva e clique em “atualizar” para aprovar.
            </p>
          )}

          {act.approve.data && (
            <div className="act-result verdict-aprovado">
              <div className="ar-line">
                <strong>✅ Aprovado</strong>
                <span>
                  {act.approve.data.jira.moved
                    ? `PR mergeada · issue movida para "${act.approve.data.jira.to}" · passou na revisão comentado`
                    : `não concluiu: ${act.approve.data.jira.reason ?? "verifique as PRs"}`}
                  {act.approve.data.worklog.logged ? ` · ${fmtMin(act.approve.data.worklog.minutes)} de review lançados` : ""}
                </span>
              </div>
            </div>
          )}

          {act.reject.data && (
            <div className="act-result verdict-reprovado">
              <div className="ar-line">
                <strong>❌ Reprovada</strong>
                <span>
                  {act.reject.data.moved
                    ? `issue movida para "${act.reject.data.to}"`
                    : `não moveu${act.reject.data.reason ? `: ${act.reject.data.reason}` : ""}`}
                  {act.reject.data.commented ? " · motivo comentado no Jira" : ""}
                  {act.reject.data.worklog.logged ? ` · ${fmtMin(act.reject.data.worklog.minutes)} de review lançados` : ""}
                </span>
              </div>
            </div>
          )}

          <p className="act-hint">
            A revisão é read-only. <strong>Aprovar + mergear</strong> dá merge na PR, move para{" "}
            <code>Pending Deploy</code>, comenta que passou e loga as horas. <strong>Reprovar</strong>{" "}
            move para <code>Fail</code>, comenta o motivo detalhado e loga as horas. As ações de PR usam o GitHub CLI (<code>gh</code> autenticado).
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
  const [preset, setPreset] = useState<{ key: string; n: number; msg?: string } | null>(null);
  const [reviewPreset, setReviewPreset] = useState<{ key: string; n: number } | null>(null);
  const { data: status } = useSetupStatus();
  const { start } = useTimesheetAction();

  // Monta o comando inicial a partir da notificação que originou a ação.
  // (O contexto da issue é injetado pelo backend de qualquer forma; aqui só
  // damos o foco certo pro agente — ex.: apontar pro comentário novo.)
  const openingMsg = (n: Notification) =>
    n.kind === "comment"
      ? `Vamos trabalhar na ${n.key}. Veja o último comentário e me proponha o plano.`
      : `Vamos trabalhar na ${n.key}.`;

  // Automação central: um botão só. O app olha a task e decide o destino —
  // se VOCÊ é o reviewer, vai pro Code Review; se é o responsável, pro agente de dev.
  const workOn = async (n: Notification) => {
    start.mutate({ key: n.key }); // liga o cronômetro já (Horas)
    const route = await fetchRoute(n.key);
    if (route.target === "review") {
      setReviewPreset({ key: n.key, n: Date.now() });
      setTab("review");
    } else {
      setPreset({ key: n.key, n: Date.now(), msg: openingMsg(n) });
      setTab("agente");
    }
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
            <Feed onWork={workOn} />
          </>
        )}
        {tab === "horas" && <TimesheetPanel />}
        {tab === "agente" && <AgentPanel preset={preset} />}
        {tab === "review" && <ReviewPanel preset={reviewPreset} />}
      </main>
    </div>
  );
}
