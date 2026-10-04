"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isRecord, isUuid, modeSeconds, formatTime, type FocusSession, type Preferences, type SessionInput, type TimerMode } from "@/lib/focus-domain";
import { errorMessage, requestJson } from "@/lib/client-api";

export type TimerSnapshot = {
  version: 2; revision: number; mode: TimerMode; durationSeconds: number;
  remainingSeconds: number; deadline: number | null; cycleCount: number;
  runId: string | null; taskTitle: string | null; startedAt: number | null;
};
function fresh(mode: TimerMode, preferences: Preferences, cycleCount = 0): TimerSnapshot {
  const seconds = modeSeconds(mode, preferences);
  return { version: 2, revision: 0, mode, durationSeconds: seconds, remainingSeconds: seconds, deadline: null, cycleCount, runId: null, taskTitle: null, startedAt: null };
}
function parseSnapshot(raw: string | null, preferences: Preferences): TimerSnapshot | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 2 || !["focus", "shortBreak", "longBreak"].includes(String(value.mode))) return null;
    const duration = value.durationSeconds;
    const remaining = value.remainingSeconds;
    if (typeof duration !== "number" || !Number.isInteger(duration) || duration < 60 || duration > 10800 || typeof remaining !== "number" || !Number.isInteger(remaining) || remaining < 0 || remaining > duration) return null;
    const base = fresh(value.mode as TimerMode, preferences);
    const deadline = typeof value.deadline === "number" && Number.isSafeInteger(value.deadline) && value.deadline > 0 ? value.deadline : null;
    const runId = isUuid(value.runId) ? value.runId : null;
    const startedAt = typeof value.startedAt === "number" && Number.isSafeInteger(value.startedAt) && value.startedAt > 0 ? value.startedAt : null;
    if (deadline !== null && (!runId || !startedAt || deadline < startedAt || deadline - Date.now() > duration * 1000 + 60000)) return null;
    return {
      ...base, revision: typeof value.revision === "number" && Number.isSafeInteger(value.revision) ? value.revision : 0,
      durationSeconds: duration, remainingSeconds: deadline === null ? remaining : Math.max(0, Math.min(duration, Math.ceil((deadline - Date.now()) / 1000))),
      deadline, runId, startedAt,
      cycleCount: typeof value.cycleCount === "number" && Number.isInteger(value.cycleCount) && value.cycleCount >= 0 ? value.cycleCount : 0,
      taskTitle: typeof value.taskTitle === "string" ? value.taskTitle.slice(0, 180) : null,
    };
  } catch { return null; }
}
function readQueue(key: string, workspaceId: string): SessionInput[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((row): row is SessionInput => isRecord(row) && row.workspaceId === workspaceId && isUuid(row.clientId) && typeof row.durationSeconds === "number" && Number.isInteger(row.durationSeconds) && row.durationSeconds >= 60 && row.durationSeconds <= 10800 && typeof row.startedAt === "string" && typeof row.endedAt === "string");
  } catch { return []; }
}

type Options = {
  workspaceId: string | null; preferences: Preferences; taskTitle: string | null;
  onSaved: (session: FocusSession) => void; onNotice: (message: string) => void;
};
export function useFocusTimer(options: Options) {
  const { workspaceId, preferences } = options;
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() => fresh("focus", preferences));
  const [ready, setReady] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncError, setSyncError] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const current = useRef(snapshot);
  const settings = useRef(options);
  const activeWorkspace = useRef<string | null>(null);
  const queueMemory = useRef<SessionInput[]>([]);
  const isFlushing = useRef(false);
  const chime = useRef<AudioContext | null>(null);
  const storageKey = workspaceId ? `stillroom.timer.v2:${workspaceId}` : "";
  const queueKey = workspaceId ? `stillroom.outbox.v2:${workspaceId}` : "";

  useEffect(() => { settings.current = options; });
  const adopt = useCallback((next: TimerSnapshot) => { current.current = next; setSnapshot(next); }, []);
  const commit = useCallback((next: TimerSnapshot) => {
    if (!storageKey) return;
    let revision = current.current.revision;
    try {
      const latest = parseSnapshot(localStorage.getItem(storageKey), settings.current.preferences);
      revision = Math.max(revision, latest?.revision ?? 0);
    } catch { /* Browser storage can be unavailable in private/restricted contexts. */ }
    const saved = { ...next, revision: revision + 1 };
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
    catch { setStorageAvailable(false); }
    adopt(saved);
  }, [storageKey, adopt]);

  const persistQueue = useCallback((next: SessionInput[]) => {
    queueMemory.current = next;
    setQueuedCount(next.length);
    try { localStorage.setItem(queueKey, JSON.stringify(next)); }
    catch { setStorageAvailable(false); }
  }, [queueKey]);

  const flush = useCallback(async () => {
    if (!workspaceId || window.location.hostname.endsWith(".manus.computer") || activeWorkspace.current !== workspaceId || isFlushing.current || !navigator.onLine) return;
    isFlushing.current = true;
    const scope = workspaceId;
    try {
      const queue = readQueue(queueKey, scope);
      const pending = queue.length ? queue : queueMemory.current;
      for (const item of pending) {
        if (activeWorkspace.current !== scope) break;
        const result = await requestJson<{ session: FocusSession }>("/api/focus-sessions", { method: "POST", body: JSON.stringify(item) });
        if (activeWorkspace.current !== scope) break;
        const latest = readQueue(queueKey, scope);
        persistQueue((latest.length ? latest : queueMemory.current).filter((entry) => entry.clientId !== item.clientId));
        settings.current.onSaved(result.session);
      }
      setSyncError("");
    } catch (error) { setSyncError(errorMessage(error)); }
    finally { isFlushing.current = false; }
  }, [workspaceId, queueKey, persistQueue]);

  useEffect(() => {
    if (!workspaceId) { setReady(false); return; }
    activeWorkspace.current = workspaceId;
    let restored: TimerSnapshot | null = null;
    try { restored = parseSnapshot(localStorage.getItem(storageKey), settings.current.preferences); }
    catch { setStorageAvailable(false); }
    adopt(restored ?? fresh("focus", settings.current.preferences));
    queueMemory.current = readQueue(queueKey, workspaceId);
    setQueuedCount(queueMemory.current.length);
    setReady(true);
    void flush();
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        const next = parseSnapshot(event.newValue, settings.current.preferences);
        if (next && next.revision >= current.current.revision) adopt(next);
      }
      if (event.key === queueKey) {
        queueMemory.current = readQueue(queueKey, workspaceId);
        setQueuedCount(queueMemory.current.length);
      }
    };
    const onResume = () => { if (document.visibilityState === "visible") void flush(); };
    const retry = window.setInterval(() => void flush(), 30000);
    window.addEventListener("storage", onStorage);
    window.addEventListener("online", onResume);
    document.addEventListener("visibilitychange", onResume);
    return () => {
      activeWorkspace.current = null;
      window.clearInterval(retry);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [workspaceId, storageKey, queueKey, adopt, flush]);

  const playChime = useCallback(() => {
    const context = chime.current;
    if (!context || context.state !== "running" || !settings.current.preferences.completionSound || document.visibilityState !== "visible") return;
    for (const [index, frequency] of [660, 880].entries()) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.23;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.035, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start); oscillator.stop(start + 0.5);
    }
  }, []);

  const finish = useCallback((early = false) => {
    if (!workspaceId || !ready) return;
    let value = current.current;
    try {
      const latest = parseSnapshot(localStorage.getItem(storageKey), settings.current.preferences);
      if (latest && latest.revision > value.revision) { adopt(latest); return; }
    } catch { /* Use in-memory timer if persistence is blocked. */ }
    if (value.deadline !== null) value = { ...value, remainingSeconds: Math.max(0, Math.min(value.durationSeconds, Math.ceil((value.deadline - Date.now()) / 1000))) };
    if (!value.runId || !value.startedAt) return;
    const seconds = early ? value.durationSeconds - value.remainingSeconds : value.durationSeconds;
    const localOnly = window.location.hostname.endsWith(".manus.computer");
    if (early && (value.mode !== "focus" || seconds < (localOnly ? 1 : 60))) { settings.current.onNotice(localOnly ? "Hãy tập trung ít nhất một giây rồi lưu phần đã tập trung." : "Cần ít nhất 1 phút tập trung để lưu phiên."); return; }
    if (value.mode === "focus") {
      const payload: SessionInput = {
        clientId: value.runId, workspaceId, durationSeconds: seconds, taskTitle: value.taskTitle,
        startedAt: new Date(value.startedAt).toISOString(),
        endedAt: new Date(early ? Date.now() : value.deadline ?? Date.now()).toISOString(),
      };
      if (localOnly) settings.current.onSaved({ id: Date.now(), ...payload, durationMinutes: seconds / 60, durationSeconds: seconds, createdAt: payload.endedAt });
      else {
        const latestQueue = readQueue(queueKey, workspaceId);
        const queue = latestQueue.length ? latestQueue : queueMemory.current;
        if (!queue.some((item) => item.clientId === payload.clientId)) persistQueue([...queue, payload]);
      }
    }
    const prefs = settings.current.preferences;
    const count = value.cycleCount + (value.mode === "focus" ? 1 : 0);
    const nextMode: TimerMode = value.mode === "focus" ? (count % prefs.longBreakEvery === 0 ? "longBreak" : "shortBreak") : "focus";
    const next = fresh(nextMode, prefs, count);
    // Do not fabricate another completed session when a tab was closed for hours.
    const recentlyFinished = !early && value.deadline !== null && Date.now() - value.deadline < 5000;
    const shouldAutoStart = recentlyFinished && (nextMode === "focus" ? prefs.autoStartFocus : prefs.autoStartBreak);
    if (shouldAutoStart) {
      next.runId = crypto.randomUUID(); next.startedAt = Date.now();
      next.taskTitle = nextMode === "focus" ? settings.current.taskTitle : null;
      next.deadline = Date.now() + next.durationSeconds * 1000;
    }
    commit(next);
    playChime();
    settings.current.onNotice(value.mode === "focus" ? "Đã hoàn thành phiên. Bạn xứng đáng với một nhịp nghỉ." : "Đã hết giờ nghỉ. Bắt đầu khi bạn sẵn sàng.");
    void flush();
  }, [workspaceId, ready, storageKey, queueKey, adopt, persistQueue, commit, playChime, flush]);

  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const value = current.current;
      if (value.deadline === null) return;
      const remaining = Math.max(0, Math.min(value.durationSeconds, Math.ceil((value.deadline - Date.now()) / 1000)));
      if (remaining === 0) { finish(); return; }
      if (remaining !== value.remainingSeconds) adopt({ ...value, remainingSeconds: remaining });
    };
    tick();
    const interval = window.setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [ready, finish, adopt]);

  useEffect(() => {
    if (!ready) return;
    const value = current.current;
    const duration = modeSeconds(value.mode, preferences);
    if (value.deadline === null && value.runId === null && value.remainingSeconds === value.durationSeconds && duration !== value.durationSeconds) {
      commit({ ...value, durationSeconds: duration, remainingSeconds: duration });
    }
  }, [ready, preferences, commit]);

  const toggle = useCallback(() => {
    if (!ready) return;
    const value = current.current;
    if (value.deadline !== null) {
      const remaining = Math.max(0, Math.ceil((value.deadline - Date.now()) / 1000));
      if (remaining === 0) { finish(); return; }
      commit({ ...value, deadline: null, remainingSeconds: remaining });
    } else {
      if (settings.current.preferences.completionSound && typeof AudioContext !== "undefined") {
        try { chime.current ??= new AudioContext(); void chime.current.resume().catch(() => {}); } catch { /* Optional completion sound. */ }
      }
      const remaining = value.remainingSeconds || value.durationSeconds;
      commit({ ...value, remainingSeconds: remaining, deadline: Date.now() + remaining * 1000,
        runId: value.runId ?? crypto.randomUUID(), startedAt: value.startedAt ?? Date.now(),
        taskTitle: value.runId ? value.taskTitle : value.mode === "focus" ? settings.current.taskTitle : null,
      });
    }
  }, [ready, commit, finish]);
  const choose = useCallback((mode: TimerMode) => { if (ready) commit(fresh(mode, settings.current.preferences, current.current.cycleCount)); }, [ready, commit]);
  const reset = useCallback(() => { if (ready) commit(fresh(current.current.mode, settings.current.preferences, current.current.cycleCount)); }, [ready, commit]);
  const finishEarly = useCallback(() => finish(true), [finish]);
  useEffect(() => {
    if (!ready) return;
    document.title = snapshot.deadline !== null ? `${formatTime(snapshot.remainingSeconds)} · still. room` : "still. room — Tập trung & tiến độ";
  }, [ready, snapshot.deadline, snapshot.remainingSeconds]);
  useEffect(() => () => { document.title = "still. room — Tập trung & tiến độ"; void chime.current?.close().catch(() => {}); }, []);

  return { snapshot, ready, running: snapshot.deadline !== null, elapsedSeconds: snapshot.durationSeconds - snapshot.remainingSeconds,
    queuedCount, syncError, storageAvailable, toggle, choose, reset, finishEarly, flush };
}
