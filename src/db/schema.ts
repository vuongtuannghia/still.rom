import { boolean, date, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
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
  customPicture: text("custom_picture"),
  coverPicture: text("cover_picture"),
  bio: varchar("bio", { length: 280 }),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lockReason: varchar("lock_reason", { length: 500 }),
  workspaceId: uuid("workspace_id").notNull().unique().references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profilePosts = pgTable("profile_posts", {
  id: serial("id").primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  body: varchar("body", { length: 2000 }),
  imageData: text("image_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("profile_posts_account_created_idx").on(table.accountId, table.createdAt),
]);

export const profilePostComments = pgTable("profile_post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => profilePosts.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  body: varchar("body", { length: 2000 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("profile_post_comments_post_idx").on(table.postId, table.createdAt),
  index("profile_post_comments_parent_idx").on(table.parentId),
]);

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
export const sharedStudyRooms = pgTable("shared_study_rooms", {
  id: serial("id").primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 120 }).notNull(),
  meetUrl: varchar("meet_url", { length: 2000 }).notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("shared_study_rooms_created_idx").on(table.createdAt),
  index("shared_study_rooms_pinned_idx").on(table.pinned, table.createdAt),
]);

export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  body: varchar("body", { length: 5000 }).notNull(),
  meetRoomId: integer("meet_room_id").references(() => sharedStudyRooms.id, { onDelete: "set null" }),
  pinned: boolean("pinned").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("forum_posts_account_idx").on(table.accountId, table.createdAt),
  index("forum_posts_created_idx").on(table.createdAt),
  index("forum_posts_meet_room_idx").on(table.meetRoomId),
  index("forum_posts_pinned_idx").on(table.pinned, table.createdAt),
]);

export const forumComments = pgTable("forum_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  body: varchar("body", { length: 2000 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("forum_comments_post_idx").on(table.postId, table.createdAt),
  index("forum_comments_parent_idx").on(table.parentId),
]);

export const meetRoomComments = pgTable("meet_room_comments", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => sharedStudyRooms.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  body: varchar("body", { length: 2000 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("meet_room_comments_room_idx").on(table.roomId, table.createdAt),
  index("meet_room_comments_parent_idx").on(table.parentId),
]);

export const directThreads = pgTable("direct_threads", {
  id: serial("id").primaryKey(),
  accountAId: uuid("account_a_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  accountBId: uuid("account_b_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("direct_threads_pair_idx").on(table.accountAId, table.accountBId),
]);

export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  senderId: uuid("sender_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("friend_requests_pair_idx").on(table.senderId, table.recipientId),
  index("friend_requests_recipient_status_idx").on(table.recipientId, table.status, table.createdAt),
  index("friend_requests_sender_status_idx").on(table.senderId, table.status, table.createdAt),
]);

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  accountAId: uuid("account_a_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  accountBId: uuid("account_b_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("friendships_pair_idx").on(table.accountAId, table.accountBId),
  index("friendships_account_a_idx").on(table.accountAId),
  index("friendships_account_b_idx").on(table.accountBId),
]);

export const accountBlocks = pgTable("account_blocks", {
  id: serial("id").primaryKey(),
  blockerId: uuid("blocker_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  blockedId: uuid("blocked_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("account_blocks_pair_idx").on(table.blockerId, table.blockedId),
  index("account_blocks_blocker_idx").on(table.blockerId, table.createdAt),
  index("account_blocks_blocked_idx").on(table.blockedId, table.createdAt),
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => accounts.id, { onDelete: "set null" }),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: varchar("body", { length: 500 }),
  requestId: integer("request_id").references(() => friendRequests.id, { onDelete: "set null" }),
  threadId: integer("thread_id").references(() => directThreads.id, { onDelete: "set null" }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notifications_account_created_idx").on(table.accountId, table.createdAt),
  index("notifications_unread_idx").on(table.accountId, table.readAt, table.createdAt),
]);

export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => directThreads.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  body: varchar("body", { length: 4000 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (table) => [
  index("direct_messages_thread_idx").on(table.threadId, table.createdAt),
  index("direct_messages_sender_idx").on(table.senderId, table.createdAt),
]);

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
