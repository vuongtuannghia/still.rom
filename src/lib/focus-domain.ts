export type TimerMode = "focus" | "shortBreak" | "longBreak";
export type Theme = "paper" | "graphite";
export type Preferences = {
  name: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  dailyGoalMinutes: number;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
  completionSound: boolean;
  theme: Theme;
  wallpaper: "grid" | "calm" | "grain";
  widgets: { chart: boolean; habits: boolean; tasks: boolean; sound: boolean; history: boolean };
};
export type Task = { id: number; title: string; completed: boolean; completedAt: string | null; createdAt: string };
export type Subtask = { id: number; taskId: number; title: string; completed: boolean; completedAt: string | null; createdAt: string };
export type Habit = { id: number; title: string; createdAt: string };
export type CheckIn = { habitId: number; date: string };
export type FocusSession = {
  id: number; clientId: string | null; durationMinutes: number; durationSeconds: number | null;
  taskTitle: string | null; startedAt: string | null; endedAt: string | null; createdAt: string;
};
export type SessionInput = {
  clientId: string; workspaceId: string; durationSeconds: number; taskTitle: string | null;
  startedAt: string; endedAt: string;
};
export type DashboardData = {
  account: import("./account-domain").AccountSummary | null;
  workspaceId: string; access: import("./access-protocol").WorkspaceGrant;
  preferences: Preferences; tasks: Task[]; habits: Habit[];
  checkIns: CheckIn[]; sessions: FocusSession[]; subtasks: Subtask[];
  room: import("./scene-domain").RoomSettings;
};
export const DEFAULT_PREFERENCES: Preferences = {
  name: "Bạn", focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15,
  longBreakEvery: 4, dailyGoalMinutes: 120, autoStartBreak: false, autoStartFocus: false,
  completionSound: true, theme: "paper", wallpaper: "grid",
  widgets: { chart: true, habits: true, tasks: true, sound: true, history: true },
};
export const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Tập trung", shortBreak: "Nghỉ ngắn", longBreak: "Nghỉ dài",
};
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}
export function normalizePreferences(value: unknown): Preferences {
  const v = isRecord(value) ? value : {};
  const w = isRecord(v.widgets) ? v.widgets : {};
  return {
    name: typeof v.name === "string" && v.name.trim() ? v.name.trim().slice(0, 40) : "Bạn",
    focusMinutes: boundedInteger(v.focusMinutes, 1, 90, 25),
    shortBreakMinutes: boundedInteger(v.shortBreakMinutes, 1, 30, 5),
    longBreakMinutes: boundedInteger(v.longBreakMinutes, 5, 60, 15),
    longBreakEvery: boundedInteger(v.longBreakEvery, 2, 8, 4),
    dailyGoalMinutes: boundedInteger(v.dailyGoalMinutes, 15, 600, 120),
    autoStartBreak: v.autoStartBreak === true,
    autoStartFocus: v.autoStartFocus === true,
    completionSound: v.completionSound !== false,
    theme: v.theme === "graphite" ? "graphite" : "paper",
    wallpaper: v.wallpaper === "calm" || v.wallpaper === "grain" ? v.wallpaper : "grid",
    widgets: {
      chart: w.chart !== false, habits: w.habits !== false, tasks: w.tasks !== false,
      sound: w.sound !== false, history: w.history !== false,
    },
  };
}
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function shiftDay(day: string, amount: number) {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
export function dateRange(end: string, length: number) {
  return Array.from({ length }, (_, i) => shiftDay(end, i - length + 1));
}
export function monthDays(month: string) {
  const [year, index] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}
export function shiftMonth(month: string, amount: number) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + amount, 1)).toISOString().slice(0, 7);
}
export function labelDate(day: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("vi-VN", { ...options, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}
export function shortWeekday(day: string) {
  const index = new Date(`${day}T12:00:00Z`).getUTCDay();
  return index === 0 ? "CN" : `T${index + 1}`;
}
export function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
export function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe} phút`;
  const hours = Math.floor(safe / 60);
  return `${hours} giờ${safe % 60 ? ` ${safe % 60} phút` : ""}`;
}
export function sessionDay(session: FocusSession) {
  return dateKey(new Date(session.endedAt ?? session.createdAt));
}
export function sessionSeconds(session: FocusSession) {
  return session.durationSeconds ?? session.durationMinutes * 60;
}
export function focusStreak(sessions: FocusSession[], today: string) {
  const days = new Set(sessions.map(sessionDay));
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let count = 0;
  while (days.has(cursor)) { count += 1; cursor = shiftDay(cursor, -1); }
  return count;
}
export function modeSeconds(mode: TimerMode, preferences: Preferences) {
  return (mode === "focus" ? preferences.focusMinutes : mode === "shortBreak" ? preferences.shortBreakMinutes : preferences.longBreakMinutes) * 60;
}
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
