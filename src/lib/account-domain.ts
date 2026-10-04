import type { CheckIn, FocusSession, Habit, Preferences, Subtask, Task } from "./focus-domain";
import type { RoomSettings } from "./scene-domain";

export type AccountSummary = { id: string; name: string; email: string; picture: string | null; role: "user" | "admin"; lockedUntil: string | null; createdAt: string };
export type VerifiedGoogleIdentity = { subject: string; email: string; name: string; picture: string | null };
export type MergeSummary = { tasks: number; habits: number; sessions: number; subtaskCount: number; snapshotId: string | null };
export type WorkspaceBackup = {
  format: "stillroom-backup"; version: 1; exportedAt: string;
  preferences: Preferences; room: RoomSettings; tasks: Task[]; subtasks: Subtask[]; habits: Habit[];
  checkIns: CheckIn[]; sessions: FocusSession[];
};
export type LoginTicket = { id: string; secret: string; expiresAt: string; loginPath: string };
export type LoginStatus = { status: "pending" | "verified" | "claimed" | "cancelled"; expiresAt: string; profile: { name: string; email: string; picture: string | null } | null };
export type AccountStatus = {
  account: AccountSummary | null;
  google: { configured: boolean; reason: string | null };
  snapshots: { id: string; createdAt: string; tasks: number; habits: number; sessions: number }[];
};
