import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Connection {
  connected: boolean;
  displayName?: string;
  accountId?: string;
  error?: string;
}
export interface Capability {
  id: string;
  label: string;
  enabled: boolean;
  hint?: string;
}
export interface PolicyRow {
  action: string;
  category: string;
  mode: "auto" | "gate";
  locked: boolean;
}
export interface Capabilities {
  agentMode: string;
  capabilities: Capability[];
  policy: PolicyRow[];
}
export interface Notification {
  id: string;
  key: string;
  kind: "new" | "status" | "assignee" | "description" | "comment";
  summary: string;
  detail?: string;
  at: string;
  author?: string;
  parentKey?: string;
  parentSummary?: string;
  commentHtml?: string;
  read?: boolean;
}

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json() as Promise<T>;
}
async function post<T>(url: string): Promise<T> {
  const r = await fetch(url, { method: "POST" });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json() as Promise<T>;
}

export const useConnection = () =>
  useQuery({ queryKey: ["connection"], queryFn: () => get<Connection>("/api/connection") });

export const useCapabilities = () =>
  useQuery({ queryKey: ["capabilities"], queryFn: () => get<Capabilities>("/api/capabilities") });

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: () => get<Notification[]>("/api/notifications"),
    refetchInterval: 30_000,
  });

export const useSync = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ ok: boolean; scanned: number }>("/api/sync"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
};
export const useNotifActions = () => {
  const qc = useQueryClient();
  const inval = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  return {
    remove: useMutation({
      mutationFn: (id: string) =>
        fetch("/api/notifications/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).then((r) => r.json()),
      onSuccess: inval,
    }),
    markRead: useMutation({
      mutationFn: (id: string) =>
        fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).then((r) => r.json()),
      onSuccess: inval,
    }),
  };
};
export const fetchRepoFor = (key: string): Promise<string> =>
  get<{ repo: string }>(`/api/agent/repo-for?key=${encodeURIComponent(key)}`).then((r) => r.repo).catch(() => "");

// ---- Timesheet ----
export interface TimesheetEntry {
  slot: string; key: string; minutes: number; source: string; logged: boolean; summary?: string;
}
export interface TimesheetDay {
  day: string; total: number; entries: TimesheetEntry[];
}
export interface TimesheetActive {
  key: string; slot: string; minutes: number; paused: boolean;
  startedAt: number; pausedAccumMs: number; summary?: string; repo?: string | null;
}
export interface TimesheetState {
  days: TimesheetDay[];
  active: TimesheetActive | null;
  activeBranchKey: string | null;
}
async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `${url} -> ${r.status}`);
  return r.json() as Promise<T>;
}
export const useTimesheet = () =>
  useQuery({ queryKey: ["timesheet"], queryFn: () => get<TimesheetState>("/api/timesheet"), refetchInterval: 15_000 });
export const useTimesheetAction = () => {
  const qc = useQueryClient();
  const inval = () => qc.invalidateQueries({ queryKey: ["timesheet"] });
  return {
    start: useMutation({ mutationFn: (v: { key: string; summary?: string }) => postJson("/api/timesheet/start", v), onSuccess: inval }),
    stop: useMutation({ mutationFn: () => postJson("/api/timesheet/stop"), onSuccess: inval }),
    discard: useMutation({ mutationFn: () => postJson("/api/timesheet/discard"), onSuccess: inval }),
    pause: useMutation({ mutationFn: () => postJson("/api/timesheet/pause"), onSuccess: inval }),
    resume: useMutation({ mutationFn: () => postJson("/api/timesheet/resume"), onSuccess: inval }),
  };
};

// ---- Finalizar a task (acao unica: commit -> PR -> Jira -> comentario -> horas) ----
export interface FinalizeStep { step: string; ok: boolean; detail: string; }
export interface FinalizeResult { key: string; ok: boolean; steps: FinalizeStep[]; }
export const useFinalize = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { key: string; repo?: string; message?: string; resolution?: string }) =>
      postJson<FinalizeResult>("/api/agent/finalize", v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheet"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

// ---- Agente (fluxo com portoes) ----
export interface Proposal {
  id: string; kind: string; key: string; summary: string;
  payload: Record<string, unknown>; editable: boolean;
}
export interface AgentState {
  key: string;
  stage: "idle" | "analyzed" | "in_progress" | "change_proposed" | "committed" | "pr_open" | "done";
  pending?: Proposal;
  history: Array<{ at: string; event: string; by: "agent" | "user" }>;
  repo?: string;
}
export const useAgentState = (key: string | null) =>
  useQuery({
    queryKey: ["agent", key],
    queryFn: () => get<AgentState>(`/api/agent/state?key=${encodeURIComponent(key!)}`),
    enabled: !!key,
    refetchInterval: 4000,
  });
export const useAgentActions = (key: string | null) => {
  const qc = useQueryClient();
  const inval = () => qc.invalidateQueries({ queryKey: ["agent", key] });
  return {
    analyze: useMutation({ mutationFn: (v: { context?: string; repo?: string }) => postJson<Proposal>("/api/agent/analyze", { key, ...v }), onSuccess: inval }),
    decide: useMutation({ mutationFn: (v: { decision: "approve" | "reject" | "edit"; edited?: unknown }) => postJson("/api/agent/decide", { key, ...v }), onSuccess: inval }),
    start: useMutation({ mutationFn: (v: { branch: string }) => postJson("/api/agent/start", { key, ...v }), onSuccess: inval }),
    change: useMutation({ mutationFn: (v: { instruction: string; context?: string }) => postJson<Proposal>("/api/agent/propose-change", { key, ...v }), onSuccess: inval }),
    commit: useMutation({ mutationFn: (v: { message: string; files?: string[] }) => postJson<Proposal>("/api/agent/propose-commit", { key, ...v }), onSuccess: inval }),
  };
};

// ---- Setup / conexao ----
export interface SetupStatus { configured: boolean; baseUrl: string; email: string; jql: string; }
export const useSetupStatus = () =>
  useQuery({ queryKey: ["setup"], queryFn: () => get<SetupStatus>("/api/setup/status") });
export const useSetup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { baseUrl: string; email: string; token: string; jql?: string }) =>
      postJson<{ connected: boolean; displayName?: string; error?: string }>("/api/setup", v),
    onSuccess: (r) => {
      if (r.connected) {
        qc.invalidateQueries({ queryKey: ["connection"] });
        qc.invalidateQueries({ queryKey: ["setup"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      }
    },
  });
};

// ---- Instrucoes do agente ----
export interface Instructions { text: string; }
export const useInstructions = (enabled: boolean) =>
  useQuery({ queryKey: ["instructions"], queryFn: () => get<Instructions>("/api/instructions"), enabled });
export const useSaveInstructions = () => {
  const qc = useQueryClient();
  const inval = () => qc.invalidateQueries({ queryKey: ["instructions"] });
  return {
    save: useMutation({
      mutationFn: (text: string) =>
        fetch("/api/instructions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).then((r) => r.json()),
      onSuccess: inval,
    }),
    reset: useMutation({ mutationFn: () => postJson<Instructions>("/api/instructions/reset"), onSuccess: inval }),
  };
};

// ---- Agente de Code Review (aba 4) ----
export type ReviewAgentType = "backend" | "frontend" | "requirements";
export interface ReviewResult {
  key: string; agentType: ReviewAgentType; baseBranch: string; at: string; findings: string;
}
export const useReviewState = (key: string | null) =>
  useQuery({
    queryKey: ["review", key],
    queryFn: () => get<ReviewResult | null>(`/api/review-agent/state?key=${encodeURIComponent(key!)}`),
    enabled: !!key,
  });
export const useRunReview = (key: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { repo: string; baseBranch: string; agentType: ReviewAgentType }) =>
      postJson<ReviewResult>("/api/review-agent/run", { key, ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review", key] }),
  });
};
export interface PrReview {
  repo: string; number?: number; url?: string; base?: string;
  approved: boolean; merged: boolean; approvable: boolean; reason?: string;
}
export interface ConcludeResult {
  verdict: "aprovado" | "reprovado" | "indefinido";
  moved: boolean; wouldMove?: boolean; to?: string; commented: boolean; reason?: string;
}
// Verifica as PRs da task (dry-run) automaticamente, para habilitar/desabilitar o aprovar.
export const usePrStatus = (key: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ["pr-status", key],
    queryFn: () => postJson<PrReview[]>("/api/review/pr", { key, dry: true }),
    enabled: !!key && enabled,
    refetchOnWindowFocus: false,
  });

export const useReviewActions = (key: string | null) => {
  const qc = useQueryClient();
  const invalPr = () => qc.invalidateQueries({ queryKey: ["pr-status", key] });
  return {
    approvePr: useMutation({
      mutationFn: () => postJson<PrReview[]>("/api/review/pr", { key, dry: false }),
      onSuccess: invalPr,
    }),
    moveStatus: useMutation({
      mutationFn: () => postJson<ConcludeResult>("/api/review/done", { key, dry: false }),
    }),
  };
};
