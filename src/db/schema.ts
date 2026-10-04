import { boolean, date, index, integer, jsonb, pgTable, serial, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import type { Preferences } from "@/lib/focus-domain";
import type { RoomSettings } from "@/lib/scene-domain";

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  initialized: boolean("initialized").default(false).notNull(),
  preferences: jsonb("preferences").$type<Partial<Preferences>>().default({}).notNull(),
  roomSettings: jsonb("room_settings").$type<Partial<RoomSettings>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  googleSubject: varchar("google_subject", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  picture: varchar("picture", { length: 2048 }),
  workspaceId: uuid("workspace_id").notNull().unique().references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accountSessions = pgTable("account_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [index("account_sessions_account_idx").on(table.accountId)]);

export const googleLoginAttempts = pgTable("google_login_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceWorkspaceId: uuid("source_workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  secretHash: varchar("secret_hash", { length: 64 }).notNull(),
  nonce: varchar("nonce", { length: 64 }).notNull(),
  includeGuestData: boolean("include_guest_data").default(true).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  identity: jsonb("identity").$type<import("@/lib/account-domain").VerifiedGoogleIdentity>(),
  claimedAccountId: uuid("claimed_account_id").references(() => accounts.id, { onDelete: "cascade" }),
  issuedSessionId: uuid("issued_session_id"),
  mergeSummary: jsonb("merge_summary").$type<import("@/lib/account-domain").MergeSummary>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
}, (table) => [index("google_attempts_workspace_created_idx").on(table.sourceWorkspaceId, table.createdAt)]);

export const accountSnapshots = pgTable("account_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  sourceWorkspaceId: uuid("source_workspace_id").notNull(),
  data: jsonb("data").$type<import("@/lib/account-domain").WorkspaceBackup>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("account_snapshots_account_idx").on(table.accountId)]);

// Browser access keys allow secure same-origin requests when embedded cookies are blocked.
export const workspaceAccessKeys = pgTable("workspace_access_keys", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("workspace_access_keys_workspace_idx").on(table.workspaceId)]);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  // Nullable only to retain records created by the original single-workspace app.
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id"),
  title: varchar("title", { length: 180 }).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("tasks_created_at_idx").on(table.createdAt),
  index("tasks_workspace_idx").on(table.workspaceId),
  uniqueIndex("tasks_workspace_client_idx").on(table.workspaceId, table.clientId),
]);

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("subtasks_task_idx").on(table.taskId),
  uniqueIndex("subtasks_task_client_idx").on(table.taskId, table.clientId),
]);

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id"),
  title: varchar("title", { length: 80 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("habits_created_at_idx").on(table.createdAt),
  index("habits_workspace_idx").on(table.workspaceId),
  uniqueIndex("habits_workspace_client_idx").on(table.workspaceId, table.clientId),
]);

export const habitCheckIns = pgTable("habit_check_ins", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("habit_check_ins_habit_date_idx").on(table.habitId, table.date),
  index("habit_check_ins_date_idx").on(table.date),
]);

export const focusSessions = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id"),
  durationMinutes: integer("duration_minutes").notNull(),
  durationSeconds: integer("duration_seconds"),
  taskTitle: varchar("task_title", { length: 180 }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("focus_sessions_created_at_idx").on(table.createdAt),
  index("focus_sessions_workspace_idx").on(table.workspaceId, table.endedAt),
  uniqueIndex("focus_sessions_workspace_client_idx").on(table.workspaceId, table.clientId),
]);
