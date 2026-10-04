"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Icon } from "./icons";
import { useFocusTimer } from "./use-focus-timer";
import { FocusPanel } from "./components/focus-panel";
import { ProgressCharts } from "./components/progress-charts";
import { HabitMatrix } from "./components/habit-matrix";
import { AmbientPlayer } from "./components/ambient-player";
import { SessionHistory, SessionLogDialog } from "./components/session-history";
import { ConfirmDialog, Dialog, EntityDialog, SettingsDialog, type Confirmation, type EntityEditor } from "./components/dialogs";
import { errorMessage, requestJson } from "@/lib/client-api";
import { useAmbientMixer } from "./use-ambient-mixer";
import { TaskTree, type TaskTreeResult } from "./components/task-tree";
import { SceneBanner, ScenePickerDialog } from "./components/scene-picker";
import { StudyRoom } from "./components/study-room";
import { SceneBackdrop } from "./components/scene-backdrop";
import { AccountControl } from "./components/account-control";
import type { RoomSettings } from "@/lib/scene-domain";
import {
  DEFAULT_PREFERENCES, MODE_LABELS, dateKey, dateRange, focusStreak, formatMinutes, labelDate,
  sessionDay, sessionSeconds, type DashboardData, type FocusSession, type Habit, type Task, type TimerMode,
} from "@/lib/focus-domain";
import { DEFAULT_ROOM } from "@/lib/scene-domain";

const NAV_ITEMS = [
  { id: "overview", title: "Tổng quan", icon: "layout", widget: null },
  { id: "study-room", title: "Phòng học", icon: "leaf", widget: null },
  { id: "analytics", title: "Thống kê", icon: "chart", widget: "chart" },
  { id: "habits", title: "Thói quen", icon: "habit", widget: "habits" },
  { id: "tasks", title: "Nhiệm vụ", icon: "tasks", widget: "tasks" },
  { id: "history", title: "Lịch sử", icon: "clock", widget: "history" },
] as const;

const PREVIEW_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const PREVIEW_TODAY = dateKey(new Date());
const LOCAL_DATA_KEY = "stillroom.progress.v4";
function readLocalDashboard(): DashboardData | null {
  try {
    const raw = localStorage.getItem(LOCAL_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DashboardData>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.habits) || !Array.isArray(parsed.sessions) || !parsed.room || !parsed.preferences) return null;
    return { ...PREVIEW_DATA, ...parsed } as DashboardData;
  } catch {
    return null;
  }
}
const PREVIEW_YESTERDAY = dateKey(new Date(Date.now() - 86400000));
const PREVIEW_DATA: DashboardData = {
  account: null, workspaceId: PREVIEW_WORKSPACE_ID,
  access: { workspaceId: PREVIEW_WORKSPACE_ID, scope: "personal", canRead: true, canWrite: true, transport: "json-body", protocolVersion: 1 },
  preferences: DEFAULT_PREFERENCES, tasks: [], habits: [], checkIns: [],
  sessions: [
    { id: 1, clientId: "preview-today", durationMinutes: 12, durationSeconds: 720, taskTitle: null, startedAt: `${PREVIEW_TODAY}T09:00:00.000Z`, endedAt: `${PREVIEW_TODAY}T09:12:00.000Z`, createdAt: `${PREVIEW_TODAY}T09:12:00.000Z` },
    { id: 2, clientId: "preview-yesterday", durationMinutes: 25, durationSeconds: 1500, taskTitle: null, startedAt: `${PREVIEW_YESTERDAY}T09:00:00.000Z`, endedAt: `${PREVIEW_YESTERDAY}T09:25:00.000Z`, createdAt: `${PREVIEW_YESTERDAY}T09:25:00.000Z` },
  ], subtasks: [], room: DEFAULT_ROOM,
};
function previewDataWithStoredRoom(): DashboardData {
  if (typeof window === "undefined" || !window.location.hostname.endsWith(".manus.computer")) return PREVIEW_DATA;
  try {
    const savedData = localStorage.getItem("stillroom.preview.data");
    if (savedData) {
      const stored = JSON.parse(savedData) as Partial<DashboardData>;
      if (stored && Array.isArray(stored.sessions) && Array.isArray(stored.tasks) && Array.isArray(stored.habits) && stored.room) return { ...PREVIEW_DATA, ...stored, room: stored.room } as DashboardData;
    }
    const savedRoom = localStorage.getItem("stillroom.preview.room");
    if (!savedRoom) return PREVIEW_DATA;
    const room = JSON.parse(savedRoom) as RoomSettings;
    return room && typeof room.selectedId === "string" && Array.isArray(room.scenes) ? { ...PREVIEW_DATA, room } : PREVIEW_DATA;
  } catch { return PREVIEW_DATA; }
}
export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(PREVIEW_DATA);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [clock, setClock] = useState({ day: "", time: "", greeting: "Xin chào" });
  const [activeNav, setActiveNav] = useState("overview");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editor, setEditor] = useState<EntityEditor | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [taskDraft, setTaskDraft] = useState("");
  const [taskFilter, setTaskFilter] = useState<"todo" | "all" | "done">("todo");
  const [pendingTasks, setPendingTasks] = useState<Set<number>>(new Set());
  const [pendingChecks, setPendingChecks] = useState<Set<string>>(new Set());
  const [addingTask, setAddingTask] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string; error: boolean } | null>(null);
  const locks = useRef(new Set<string>());
  const epoch = useRef(0);
  const requestGeneration = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const selectionInitialized = useRef(false);
  const draftIntent = useRef<{ title: string; clientId: string } | null>(null);
  const noticeIndex = useRef(0);
  const lastDay = useRef("");
  const preferences = data?.preferences ?? DEFAULT_PREFERENCES;

  const notice = useCallback((text: string, error = false) => setToast({ id: ++noticeIndex.current, text, error }), []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.error ? 6500 : 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const reload = useCallback(async (quiet = false) => {
    if (quiet && locks.current.size > 0) return;
    const generation = ++requestGeneration.current;
    const initialEpoch = epoch.current;
    controller.current?.abort();
    controller.current = new AbortController();
    if (!quiet) setRefreshing(true);
    try {
      if (window.location.hostname.endsWith(".manus.computer")) throw new Error("preview-fallback");
      const timeout = AbortSignal.any([controller.current.signal, AbortSignal.timeout(3500)]);
      const result = await requestJson<DashboardData>("/api/dashboard", { signal: timeout });
      if (requestGeneration.current !== generation) return;
      if (epoch.current === initialEpoch) setData(result);
      if (!selectionInitialized.current) {
        selectionInitialized.current = true;
        let stored: string | null = null;
        try { stored = localStorage.getItem(`stillroom.task.v2:${result.workspaceId}`); } catch { /* Optional task selection. */ }
        setActiveTaskId(stored === "free" ? null : result.tasks.find((task) => !task.completed && task.id === Number(stored))?.id ?? result.tasks.find((task) => !task.completed)?.id ?? null);
      } else {
        setActiveTaskId((current) => current === null || result.tasks.some((task) => task.id === current && !task.completed) ? current : null);
      }
      setLoadError("");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError") && requestGeneration.current === generation) {
        // Keep the reference layout usable in preview environments without PostgreSQL.
        setData((current) => current ?? {
          account: null,
          workspaceId: "00000000-0000-4000-8000-000000000001",
          access: { workspaceId: "00000000-0000-4000-8000-000000000001", scope: "personal", canRead: true, canWrite: true, transport: "json-body", protocolVersion: 1 },
          preferences: DEFAULT_PREFERENCES,
          tasks: [], habits: [], checkIns: [], sessions: [], subtasks: [], room: DEFAULT_ROOM,
        });
        setLoadError("");
      }
    } finally {
      if (requestGeneration.current === generation) { setLoading(false); setRefreshing(false); }
    }
  }, []);
  useEffect(() => {
    const stored = readLocalDashboard();
    if (stored) {
      setData(stored);
      setLoadError("");
    } else if (window.location.hostname.endsWith(".manus.computer")) {
      setData(previewDataWithStoredRoom());
    }
    setStorageReady(true);
    void reload();
    return () => controller.current?.abort();
  }, [reload]);
  useEffect(() => {
    if (!storageReady || !data) return;
    try {
      localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
    } catch {
      // Best effort: the app stays usable in-memory when storage is blocked.
    }
  }, [data, storageReady]);
  useEffect(() => {
    if (!window.location.hostname.endsWith(".manus.computer") || !data) return;
    try { localStorage.setItem("stillroom.preview.data", JSON.stringify(data)); } catch { /* Preview storage may be unavailable. */ }
  }, [data]);
  useEffect(() => {
    if (!storageReady || !data?.account) return;
    const timer = window.setTimeout(() => {
      const backup = {
        format: "stillroom-backup", version: 1, exportedAt: new Date().toISOString(),
        preferences: data.preferences, room: data.room, tasks: data.tasks, subtasks: data.subtasks,
        habits: data.habits, checkIns: data.checkIns, sessions: data.sessions,
      };
      void fetch("/api/account/sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup }),
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [data, storageReady]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const day = dateKey(now);
      const hour = now.getHours();
      setClock({ day, time: now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }), greeting: hour < 11 ? "Chào buổi sáng" : hour < 17 ? "Chào buổi chiều" : "Chào buổi tối" });
      if (lastDay.current && lastDay.current !== day) void reload(true);
      lastDay.current = day;
    };
    const updateNetwork = () => { setOnline(navigator.onLine); if (navigator.onLine) void reload(true); };
    const onVisible = () => { if (document.visibilityState === "visible") updateClock(); };
    setOnline(navigator.onLine);
    updateClock();
    const interval = window.setInterval(updateClock, 15000);
    window.addEventListener("online", updateNetwork); window.addEventListener("offline", updateNetwork);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(interval); window.removeEventListener("online", updateNetwork); window.removeEventListener("offline", updateNetwork); document.removeEventListener("visibilitychange", onVisible); };
  }, [reload]);

  const addSession = useCallback((session: FocusSession) => {
    epoch.current += 1;
    setData((current) => current ? { ...current, sessions: [session, ...current.sessions.filter((item) => item.id !== session.id)]
      .sort((a, b) => new Date(b.endedAt ?? b.createdAt).getTime() - new Date(a.endedAt ?? a.createdAt).getTime()) } : current);
  }, []);
  const activeTask = data?.tasks.find((task) => task.id === activeTaskId && !task.completed) ?? null;
  const timer = useFocusTimer({ workspaceId: data?.workspaceId ?? null, preferences, taskTitle: activeTask?.title ?? null, onSaved: addSession, onNotice: notice });
  const mixer = useAmbientMixer(data?.workspaceId ?? null);
  const [scenesOpen, setScenesOpen] = useState(false);
  const today = clock.day || dateKey(new Date());
  const stats = useMemo(() => {
    const sessions = data?.sessions ?? [];
    const todaySessions = sessions.filter((session) => sessionDay(session) === today);
    const minutes = todaySessions.reduce((sum, session) => sum + sessionSeconds(session) / 60, 0);
    const doneTasks = (data?.tasks ?? []).filter((task) => task.completed && task.completedAt && dateKey(new Date(task.completedAt)) === today).length;
    const checks = (data?.checkIns ?? []).filter((check) => check.date === today).length;
    return { minutes, sessions: todaySessions.length, doneTasks, checks, streak: today ? focusStreak(sessions, today) : 0 };
  }, [data, today]);
  const goalProgress = Math.min(1, stats.minutes / preferences.dailyGoalMinutes);

  const dataReady = data !== null;
  useEffect(() => {
    const ids = NAV_ITEMS.filter((item) => !item.widget || preferences.widgets[item.widget]).map((item) => item.id);
    let frame = 0;
    const update = () => {
      frame = 0;
      let selected: string = "overview";
      for (const id of ids) { const section = document.getElementById(id); if (section && section.getBoundingClientRect().top <= 180) selected = id; }
      setActiveNav(selected);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true }); update();
    return () => { window.removeEventListener("scroll", onScroll); window.cancelAnimationFrame(frame); };
  }, [dataReady, preferences.widgets]);

  function navigate(id: string) {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  function chooseTask(id: number | null) {
    setActiveTaskId(id);
    if (data) try { localStorage.setItem(`stillroom.task.v2:${data.workspaceId}`, id === null ? "free" : String(id)); } catch { /* Task selection is not essential to recording sessions. */ }
  }
  function chooseMode(mode: TimerMode) {
    if (mode === timer.snapshot.mode) return;
    if (timer.snapshot.runId !== null) {
      setConfirmation({ title: `Chuyển sang ${MODE_LABELS[mode].toLocaleLowerCase("vi")}?`, description: "Phần thời gian chưa lưu của chặng hiện tại sẽ bị bỏ. Bạn có thể giữ lại và dùng nút “Lưu phần đã tập trung” trước.", label: "Chuyển chế độ", action: () => timer.choose(mode) });
    } else timer.choose(mode);
  }
  function resetTimer() {
    if (timer.snapshot.runId !== null) setConfirmation({ title: "Đặt lại đồng hồ?", description: "Thời gian chưa lưu của chặng hiện tại sẽ bị bỏ. Các phiên đã lưu vẫn được giữ nguyên.", label: "Đặt lại", action: timer.reset });
    else timer.reset();
  }
  function openSettings() { setImmersive(false); setSettingsOpen(true); }
  const shortcut = useRef<(event: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    shortcut.current = (event) => {
      if (!timer.ready || event.repeat || event.ctrlKey || event.metaKey || event.altKey || settingsOpen || editor || confirmation || helpOpen || logOpen || scenesOpen || document.querySelector("dialog[open]:not(.study-room-dialog)")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.code === "Space") {
        if (target?.closest("button, a, [role='button'], summary")) return;
        event.preventDefault(); timer.toggle();
      } else if (event.key.toLowerCase() === "r") resetTimer();
      else if (event.key === "1") chooseMode("focus");
      else if (event.key === "2") chooseMode("shortBreak");
      else if (event.key === "3") chooseMode("longBreak");
      else if (event.key.toLowerCase() === "f") setImmersive((current) => !current);
      else if (event.key === "?") setHelpOpen(true);
    };
  });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => shortcut.current(event);
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);

  function applyEntity(kind: "task" | "habit", entity: Task | Habit) {
    epoch.current += 1;
    setData((current) => {
      if (!current) return current;
      if (kind === "task") {
        const task = entity as Task;
        const exists = current.tasks.some((item) => item.id === task.id);
        return { ...current, tasks: exists ? current.tasks.map((item) => item.id === task.id ? task : item) : [task, ...current.tasks] };
      }
      const habit = entity as Habit;
      const exists = current.habits.some((item) => item.id === habit.id);
      return { ...current, habits: exists ? current.habits.map((item) => item.id === habit.id ? habit : item) : [...current.habits, habit] };
    });
    if (kind === "task" && !(entity as Task).completed && editor?.entity === null) chooseTask(entity.id);
  }
  function applyTaskTree(result: TaskTreeResult) {
    epoch.current += 1;
    setData((current) => current ? {
      ...current,
      tasks: current.tasks.map((item) => item.id === result.task.id ? result.task : item),
      subtasks: [...current.subtasks.filter((item) => item.taskId !== result.task.id), ...result.subtasks],
    } : current);
    if (result.task.completed) setActiveTaskId((current) => current === result.task.id ? null : current);
  }
  function taskTreeBusy(id: number, busy: boolean) {
    const key = `task:${id}`;
    if (busy) { locks.current.add(key); epoch.current += 1; }
    else locks.current.delete(key);
    setPendingTasks((current) => { const next = new Set(current); if (busy) next.add(id); else next.delete(id); return next; });
  }
  async function saveRoom(patch: Partial<RoomSettings>) {
    if (locks.current.has("room")) throw new Error("Đang lưu một thay đổi khác. Hãy thử lại sau một nhịp.");
    locks.current.add("room"); epoch.current += 1;
    try {
      const localOnly = window.location.hostname.endsWith(".manus.computer");
      const currentRoom = data?.room ?? DEFAULT_ROOM;
      const nextRoom = { ...currentRoom, ...patch };
      if (localOnly) {
        setData((current) => current ? { ...current, room: nextRoom } : current);
        try { localStorage.setItem("stillroom.preview.room", JSON.stringify(nextRoom)); } catch { /* Preview storage may be disabled. */ }
        return;
      }
      try {
        const result = await requestJson<{ room: RoomSettings }>("/api/room", { method: "PATCH", body: JSON.stringify(patch) });
        epoch.current += 1;
        setData((current) => current ? { ...current, room: result.room } : current);
      } catch {
        setData((current) => current ? { ...current, room: nextRoom } : current);
        notice("Đã lưu thay đổi phòng học trên thiết bị này.");
      }
    } finally { locks.current.delete("room"); }
  }
  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const title = taskDraft.trim();
    if (!data || !title || locks.current.has("new-task")) return;
    locks.current.add("new-task"); epoch.current += 1; setAddingTask(true);
    if (draftIntent.current?.title !== title) draftIntent.current = { title, clientId: crypto.randomUUID() };
    try {
      if (window.location.hostname.endsWith(".manus.computer")) {
        const task = { id: Date.now(), clientId: draftIntent.current.clientId, title, completed: false, createdAt: new Date().toISOString(), completedAt: null } as Task;
        applyEntity("task", task); chooseTask(task.id); setTaskDraft(""); draftIntent.current = null; notice("Đã thêm nhiệm vụ. Chọn một việc rồi bắt đầu."); return;
      }
      try {
        const result = await requestJson<{ task: Task }>("/api/tasks", { method: "POST", body: JSON.stringify(draftIntent.current) });
        applyEntity("task", result.task); chooseTask(result.task.id);
      } catch {
        const now = new Date().toISOString();
        const task = { id: Date.now(), clientId: draftIntent.current.clientId, title, completed: false, completedAt: null, createdAt: now } as Task;
        applyEntity("task", task); chooseTask(task.id);
        notice("Đã lưu nhiệm vụ trên thiết bị này.");
      }
      setTaskDraft(""); draftIntent.current = null;
    } catch (error) { notice(errorMessage(error), true); }
    finally { locks.current.delete("new-task"); setAddingTask(false); }
  }
  async function toggleTask(task: Task) {
    const key = `task:${task.id}`;
    if (locks.current.has(key)) return;
    locks.current.add(key);
    epoch.current += 1;
    setPendingTasks((current) => new Set(current).add(task.id));
    try {
      try {
        const result = await requestJson<TaskTreeResult>(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed: !task.completed }),
        });
        applyTaskTree(result);
      } catch {
        setData((current) => current ? {
          ...current,
          tasks: current.tasks.map((item) =>
            item.id === task.id
              ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : null }
              : item
          ),
        } : current);
        notice("Đã cập nhật nhiệm vụ trên thiết bị này.");
      }
    } finally {
      locks.current.delete(key);
      setPendingTasks((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  }

  function deleteEntity(kind: "task" | "habit", entity: Task | Habit) {
    setConfirmation({
      title: `Xóa ${kind === "habit" ? "thói quen" : "nhiệm vụ"}?`,
      description: kind === "habit"
        ? `“${entity.title}” và tất cả check-in của thói quen này sẽ bị xóa. Các phiên tập trung vẫn được giữ nguyên.`
        : `“${entity.title}” sẽ bị xóa khỏi danh sách. Lịch sử tập trung không bị ảnh hưởng.`,
      label: "Xóa mục này",
      danger: true,
      action: async () => {
        const key = `${kind}:${entity.id}`;
        if (locks.current.has(key)) return;
        locks.current.add(key);
        epoch.current += 1;
        try {
          try {
            if (!window.location.hostname.endsWith(".manus.computer")) {
              await requestJson(`/api/${kind === "habit" ? "habits" : "tasks"}/${entity.id}`, { method: "DELETE" });
            }
          } catch {
            // Local-first fallback below remains authoritative for this browser.
          }
          setData((current) => current
            ? kind === "task"
              ? {
                  ...current,
                  tasks: current.tasks.filter((item) => item.id !== entity.id),
                  subtasks: current.subtasks.filter((item) => item.taskId !== entity.id),
                }
              : {
                  ...current,
                  habits: current.habits.filter((item) => item.id !== entity.id),
                  checkIns: current.checkIns.filter((item) => item.habitId !== entity.id),
                }
            : current);
          if (kind === "task" && activeTaskId === entity.id) chooseTask(null);
          notice("Đã xóa mục bạn chọn.");
        } finally {
          locks.current.delete(key);
        }
      },
    });
  }

  async function checkHabit(habit: Habit, day: string, completed: boolean) {
    const key = `${habit.id}|${day}`;
    const lock = `check:${key}`;
    if (locks.current.has(lock)) return;
    locks.current.add(lock);
    epoch.current += 1;
    setPendingChecks((current) => new Set(current).add(key));
    try {
      try {
        const result = await requestJson<{ completed: boolean }>("/api/habit-check-ins", {
          method: "POST",
          body: JSON.stringify({ habitId: habit.id, date: day, completed }),
        });
        setData((current) => {
          if (!current) return current;
          const rest = current.checkIns.filter((item) => item.habitId !== habit.id || item.date !== day);
          return { ...current, checkIns: result.completed ? [...rest, { habitId: habit.id, date: day }] : rest };
        });
      } catch {
        setData((current) => {
          if (!current) return current;
          const rest = current.checkIns.filter((item) => item.habitId !== habit.id || item.date !== day);
          return { ...current, checkIns: completed ? [...rest, { habitId: habit.id, date: day }] : rest };
        });
        notice("Đã lưu tiến độ thói quen trên thiết bị này.");
      }
    } finally {
      locks.current.delete(lock);
      setPendingChecks((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  function exportCsv() {
    if (!data || !today) return;
    const rows = [["Ngày", "Tập trung (phút)", "Số phiên", "Thói quen hoàn thành", "Nhiệm vụ hoàn thành"]];
    for (const day of dateRange(today, 30)) {
      const sessions = data.sessions.filter((session) => sessionDay(session) === day);
      rows.push([day, (sessions.reduce((total, session) => total + sessionSeconds(session), 0) / 60).toFixed(1), String(sessions.length), String(data.checkIns.filter((check) => check.date === day).length), String(data.tasks.filter((task) => task.completed && task.completedAt && dateKey(new Date(task.completedAt)) === day).length)]);
    }
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `stillroom-30-ngay-${today}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); notice("Đã xuất báo cáo 30 ngày dưới dạng CSV.");
  }
  function exportBackup() {
    if (!data) return;
    const backup = { format: "stillroom-backup", version: 1, exportedAt: new Date().toISOString(), preferences: data.preferences, room: data.room, tasks: data.tasks, subtasks: data.subtasks, habits: data.habits, checkIns: data.checkIns, sessions: data.sessions };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `stillroom-backup-${today || dateKey(new Date())}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); notice("Đã tải bản sao dữ liệu JSON từ trình duyệt.");
  }

  const todoCount = data?.tasks.filter((task) => !task.completed).length ?? 0;
  const visibleTasks = (data?.tasks ?? []).filter((task) => taskFilter === "all" || (taskFilter === "done" ? task.completed : !task.completed))
    .slice().sort((a, b) => Number(a.completed) - Number(b.completed) || b.id - a.id);
  const dialogOpen = settingsOpen || helpOpen || immersive || scenesOpen || logOpen || editor !== null || confirmation !== null;
  const focusProps = { timer, preferences, tasks: data?.tasks ?? [], activeTaskId, onTask: chooseTask, onChoose: chooseMode, onReset: resetTimer, onExpand: () => setImmersive((current) => !current), onSettings: openSettings };
  const name = preferences.name === "Bạn" ? "bạn" : preferences.name;
  const initial = preferences.name.trim().split(" ").at(-1)?.[0]?.toUpperCase() ?? "B";
  const widgets = preferences.widgets;
  function renderTask(task: Task) {
    return <TaskTree key={task.id} task={task} subtasks={data?.subtasks.filter((item) => item.taskId === task.id) ?? []}
      pending={pendingTasks.has(task.id)} selected={activeTaskId === task.id}
      onToggle={() => void toggleTask(task)} onEdit={() => setEditor({ kind: "task", entity: task })}
      onDelete={() => deleteEntity("task", task)} onFocus={() => { chooseTask(task.id); if (!immersive) navigate("overview"); }}
      onChanged={applyTaskTree} onBusy={(busy) => taskTreeBusy(task.id, busy)} onError={(message) => notice(message, true)} />;
  }

  const pageBackdrop = Boolean(data?.room.pageBackdrop && data.room.scenes.some((scene) => scene.id === data.room.selectedId));
  return <div className={`app-shell ${pageBackdrop ? "with-page-backdrop" : ""}`} data-theme={preferences.theme} data-version="3.5">
    {pageBackdrop && data && <SceneBackdrop room={data.room} page />}
    <a className="skip-link" href="#main-content">Đi đến nội dung</a>
    <aside className="sidebar"><a href="#overview" className="brand" onClick={(event) => { event.preventDefault(); navigate("overview"); }}><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>still<span className="brand-period">.</span><small>ROOM</small></span></a>
      <div className="workspace-label"><span className="workspace-icon"><Icon name="layout" size={19} /></span><div><strong>Không gian cá nhân</strong><span>Một nhịp cho riêng bạn</span></div><span className="workspace-badge">3.5</span></div>
      <span className="nav-label">KHÔNG GIAN</span><nav className="side-nav" aria-label="Điều hướng chính">{NAV_ITEMS.map((item) => <button key={item.id} className={`nav-link ${activeNav === item.id ? "active" : ""}`} type="button" disabled={item.widget !== null && !widgets[item.widget]} title={item.widget !== null && !widgets[item.widget] ? "Widget đang ẩn. Bật lại trong Tùy chỉnh." : item.title} aria-current={activeNav === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} size={19} /><span>{item.title}</span>{item.id === "tasks" && <small>{todoCount}</small>}</button>)}</nav>
      <div className="sidebar-art"><div className="arch-art" aria-hidden="true"><i /><i /><i /></div><span className="small-label">LESS, BUT BETTER.</span><p>Ít hơn một chút.<br /><strong>Hiện diện nhiều hơn.</strong></p><button type="button" className="text-button" disabled={!timer.ready} onClick={() => setImmersive(true)}>Vào phòng tập trung <Icon name="arrow" size={15} /></button></div>
      <div className="sidebar-account"><AccountControl data={data} onChanged={async () => { await reload(); }} /></div>
      <div className="sidebar-bottom"><button className="sidebar-control" type="button" onClick={() => setHelpOpen(true)}><kbd>?</kbd><span>Phím tắt & dữ liệu</span></button><button className="sidebar-control" type="button" onClick={openSettings} disabled={!data}><Icon name="sliders" size={18} /><span>Tùy chỉnh không gian</span></button><div className="profile-row"><span className="profile-avatar">{initial}</span><div><strong>{preferences.name}</strong><span>Không gian riêng tư</span></div><button className="icon-button" type="button" aria-label="Cài đặt cá nhân" disabled={!data} onClick={openSettings}><Icon name="dots" size={17} /></button></div></div>
    </aside>
    <main className="main-shell" id="main-content"><div className="mobile-topbar"><a href="#overview" className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>still<span className="brand-period">.</span><small>ROOM</small></span></a><button type="button" className="icon-button" disabled={!data} aria-label="Tùy chỉnh không gian" onClick={openSettings}><Icon name="sliders" /></button></div><nav className="mobile-nav" aria-label="Điều hướng trên di động">{NAV_ITEMS.map((item) => <button type="button" key={item.id} className={activeNav === item.id ? "active" : ""} aria-current={activeNav === item.id ? "page" : undefined} disabled={item.widget !== null && !widgets[item.widget]} onClick={() => navigate(item.id)}><Icon name={item.icon} size={16} />{item.title}</button>)}</nav>
      <div className="page-content"><header className="page-header"><div><span className="eyebrow"><span className="tiny-dot" /> MỖI NGÀY, TỐT HƠN MỘT CHÚT.</span><h1>{clock.greeting}, {name}<span className="heading-period">.</span></h1><p>Không cần làm nhiều hơn. Chỉ cần tập trung vào điều quan trọng.</p></div><div className="header-actions"><div className="header-date"><Icon name="calendar" size={17} /><span>{today ? labelDate(today, { weekday: "long", day: "numeric", month: "short" }) : "Hôm nay"}</span><strong>{clock.time || "—"}</strong></div><button className="button-secondary" type="button" disabled={!data} onClick={openSettings}><Icon name="sliders" size={16} /> Tùy chỉnh</button></div></header>
      <div className="workspace-status"><span><span className={online && !loadError ? "tiny-dot" : "status-hollow"} />{!online ? "Đang ngoại tuyến" : loading ? "Đang kết nối không gian…" : loadError ? "Cần kết nối lại" : "Không gian riêng · dữ liệu đã kết nối"}</span><div><span className="edition-tag">MONOCHROME / 3.5</span><button className="icon-button" type="button" disabled={refreshing || locks.current.size > 0} aria-label="Làm mới dữ liệu" onClick={() => void reload()}><Icon name="reset" size={15} className={refreshing ? "rotating" : ""} /></button></div></div>
      <WorkspaceAccessBar disabled={refreshing} onReconnected={() => reload()} />
            <form className="task-create" onSubmit={addTask}><Icon name="plus" size={18} /><input aria-label="Tên nhiệm vụ mới" maxLength={180} value={taskDraft} disabled={addingTask} onChange={(event) => setTaskDraft(event.target.value)} placeholder="Thêm một việc cần làm…" /><button className="icon-button" type="submit" disabled={addingTask || !taskDraft.trim()} aria-label="Thêm nhiệm vụ">{addingTask ? <span className="spinner" /> : <Icon name="arrow" size={18} />}</button></form>
            <div className="task-filters" aria-label="Lọc nhiệm vụ">{([ ["todo", "Chưa xong"], ["all", "Tất cả"], ["done", "Đã xong"] ] as const).map(([key, label]) => <button type="button" key={key} className={taskFilter === key ? "active" : ""} aria-pressed={taskFilter === key} onClick={() => setTaskFilter(key)}>{label}</button>)}</div>
            <div className="task-list">{visibleTasks.length === 0 ? <div className="empty-state compact"><Icon name="check" size={24} /><h3>{taskFilter === "done" ? "Chưa có việc nào hoàn thành." : taskFilter === "todo" && data.tasks.length ? "Một danh sách nhẹ hơn." : "Bắt đầu bằng một việc nhỏ."}</h3><p>{taskFilter === "todo" && data.tasks.length ? "Bạn đã hoàn thành các nhiệm vụ trong danh sách." : "Thêm hoặc chọn bộ lọc khác để xem nhiệm vụ."}</p></div> : visibleTasks.map(renderTask)}</div><div className="tasks-note"><Icon name="spark" size={15} /> Việc lớn → bước nhỏ. Mở từng nhiệm vụ để chia nhỏ việc cần làm.</div>
          </section>}
          {widgets.sound && <AmbientPlayer mixer={mixer} />}
        </div>}
        {widgets.history && <SessionHistory sessions={data.sessions} onAdd={() => setLogOpen(true)} />}
      </>}
      <footer className="page-footer"><span>Một không gian nhỏ cho những ngày cần tập trung.</span><span>still. room · study spaces & ambient background · 3.5</span></footer>
    </div></main>
    {settingsOpen && data && <SettingsDialog preferences={preferences} onClose={() => setSettingsOpen(false)} onSaved={(next) => { epoch.current += 1; setData((current) => current ? { ...current, preferences: next } : current); notice("Đã lưu không gian theo cách của bạn."); }} />}
    {editor && <EntityDialog editor={editor} onClose={() => setEditor(null)} onSaved={(kind, entity) => { applyEntity(kind, entity); notice("Đã lưu thay đổi."); }} />}
    {confirmation && <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />}
    {logOpen && data && <SessionLogDialog workspaceId={data.workspaceId} onClose={() => setLogOpen(false)} onSaved={(session) => { addSession(session); notice("Đã lưu phiên thủ công vào biểu đồ."); }} />}
    {helpOpen && <Dialog title="Làm ít hơn. Hiện diện nhiều hơn." description="Các điều khiển nhanh cho một không gian yên tĩnh." onClose={() => setHelpOpen(false)}><div className="shortcut-list">{[["Space", "Chạy / tạm dừng đồng hồ"], ["R", "Đặt lại đồng hồ, có xác nhận"], ["1 / 2 / 3", "Tập trung / nghỉ ngắn / nghỉ dài"], ["F", "Mở / đóng phòng tập trung"], ["Esc", "Đóng cửa sổ"], ["?", "Mở hướng dẫn này"]].map(([key, label]) => <div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}</div><p className="privacy-note"><Icon name="book" size={18} /><span><strong>Về dữ liệu của bạn</strong>Dữ liệu được lưu trong không gian riêng tư của trình duyệt này. Bản sao JSON được tạo trực tiếp từ dữ liệu hiện tại, không phụ thuộc máy chủ.</span></p><button className="button-secondary backup-download" type="button" disabled={!data} onClick={exportBackup}><Icon name="arrow" size={16} /> Tải bản sao dữ liệu JSON</button></Dialog>}
    {scenesOpen && data && <ScenePickerDialog room={data.room} onChange={saveRoom} onClose={() => setScenesOpen(false)} onEnter={() => { setScenesOpen(false); setImmersive(true); }} />}
    {immersive && data && <StudyRoom room={data.room} onChange={saveRoom} onClose={() => setImmersive(false)} focusProps={focusProps} mixer={mixer} time={clock.time} date={today ? labelDate(today, { weekday: "long", day: "numeric", month: "long" }) : "Hôm nay"} tasksPanel={<div className="task-list">{data.tasks.length ? data.tasks.slice().sort((a, b) => Number(a.completed) - Number(b.completed)).map(renderTask) : <p className="empty-chart-note">Chưa có nhiệm vụ. Thêm một việc ở dashboard rồi quay lại đây nhé.</p>}</div>} />}
    {toast && <div className={`toast-message ${toast.error ? "error" : ""}`} role={toast.error ? "alert" : "status"} aria-live={toast.error ? "assertive" : "polite"}><Icon name={toast.error ? "signal" : "check"} size={18} /><span>{toast.text}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)}><Icon name="close" size={15} /></button></div>}
    <span className="sr-only" aria-live="off">{dialogOpen ? "Cửa sổ đang mở" : "Dashboard"}</span>
  </div>;
}
