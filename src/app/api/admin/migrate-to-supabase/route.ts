import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  accounts, accountBlocks, accountSessions, accountSnapshots, directMessages, directThreads,
  focusSessions, forumComments, forumPosts, friendRequests, friendships, googleLoginAttempts,
  habitCheckIns, habits, meetRoomComments, notifications, profilePostComments, profilePosts,
  sharedStudyRooms, subtasks, tasks, workspaceAccessKeys, workspaces
} from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DESTINATION = "https://rsotajjgblmtbqffkgyw.supabase.co/functions/v1/still-room-migrate";
const tables = [
  ["workspaces", workspaces], ["accounts", accounts], ["profile_posts", profilePosts],
  ["profile_post_comments", profilePostComments], ["account_sessions", accountSessions],
  ["google_login_attempts", googleLoginAttempts], ["account_snapshots", accountSnapshots],
  ["shared_study_rooms", sharedStudyRooms], ["forum_posts", forumPosts], ["forum_comments", forumComments],
  ["meet_room_comments", meetRoomComments], ["direct_threads", directThreads],
  ["friend_requests", friendRequests], ["friendships", friendships], ["account_blocks", accountBlocks],
  ["workspace_access_keys", workspaceAccessKeys], ["tasks", tasks], ["subtasks", subtasks],
  ["habits", habits], ["habit_check_ins", habitCheckIns], ["notifications", notifications],
  ["direct_messages", directMessages], ["focus_sessions", focusSessions],
] as const;

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== process.env.STILL_ROOM_MIGRATION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Array<{ table: string; count: number; batches: number; ok: boolean; error?: string }> = [];
  for (const [name, table] of tables) {
    try {
      const rows = await db.select().from(table);
      const batches = chunk(rows, 50);
      for (const batch of batches) {
        const response = await fetch(DESTINATION, {
          method: "POST",
          headers: { "content-type": "application/json", "x-still-room-migrate": process.env.STILL_ROOM_MIGRATION_TOKEN! },
          body: JSON.stringify({ table: name, rows: batch }),
          cache: "no-store",
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message.slice(0, 500));
        }
      }
      results.push({ table: name, count: rows.length, batches: batches.length, ok: true });
    } catch (error) {
      results.push({ table: name, count: 0, batches: 0, ok: false, error: error instanceof Error ? error.message : "Migration failed" });
      return NextResponse.json({ ok: false, results }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, project: "still-room", results }, { status: 200 });
}
