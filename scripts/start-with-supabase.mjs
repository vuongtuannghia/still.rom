import { spawn } from "node:child_process";
import pg from "pg";

const { Client } = pg;
const sourceUrl = process.env.DATABASE_URL;
const targetUrl = process.env.SUPABASE_DATABASE_URL;
const shouldUseSupabase = Boolean(targetUrl);

const tables = [
  ["workspaces","id"], ["accounts","id"], ["profile_posts","id"], ["profile_post_comments","id"],
  ["account_sessions","id"], ["google_login_attempts","id"], ["account_snapshots","id"],
  ["shared_study_rooms","id"], ["forum_posts","id"], ["forum_comments","id"],
  ["meet_room_comments","id"], ["direct_threads","id"], ["friend_requests","id"],
  ["friendships","id"], ["account_blocks","id"], ["workspace_access_keys","token_hash"],
  ["tasks","id"], ["subtasks","id"], ["habits","id"], ["habit_check_ins","id"],
  ["notifications","id"], ["direct_messages","id"], ["focus_sessions","id"],
];

const serialTables = [
  "profile_posts","profile_post_comments","shared_study_rooms","forum_posts","forum_comments",
  "meet_room_comments","direct_threads","friend_requests","friendships","account_blocks",
  "tasks","subtasks","habits","habit_check_ins","notifications","direct_messages","focus_sessions"
];

function qIdent(value) {
  return '"' + value.replaceAll('"','""') + '"';
}

async function migrate() {
  if (!sourceUrl || !targetUrl) return false;
  console.log("[still.room] Supabase target detected; migrating existing Render data before startup.");
  const source = new Client({ connectionString: sourceUrl });
  const target = new Client({ connectionString: targetUrl });
  await source.connect();
  await target.connect();
  try {
    for (const [table, pk] of tables) {
      const result = await source.query(`select * from public.${qIdent(table)}`);
      if (result.rows.length === 0) {
        console.log(`[still.room] ${table}: 0 rows`);
        continue;
      }
      const columns = result.fields.map((f) => f.name);
      const columnSql = columns.map(qIdent).join(", ");
      const assignments = columns.filter((c) => c !== pk).map((c) => `${qIdent(c)} = excluded.${qIdent(c)}`).join(", ");
      for (let offset = 0; offset < result.rows.length; offset += 50) {
        const batch = result.rows.slice(offset, offset + 50);
        const values = [];
        const tuples = batch.map((row, rowIndex) => {
          const placeholders = columns.map((column, colIndex) => {
            values.push(row[column]);
            return `$${rowIndex * columns.length + colIndex + 1}`;
          });
          return "(" + placeholders.join(", ") + ")";
        }).join(", ");
        const sql = `insert into public.${qIdent(table)} (${columnSql}) values ${tuples} on conflict (${qIdent(pk)}) do update set ${assignments || `${qIdent(pk)} = excluded.${qIdent(pk)}`}`;
        await target.query(sql, values);
      }
      console.log(`[still.room] ${table}: ${result.rows.length} rows`);
    }

    for (const table of serialTables) {
      await target.query(`select setval(pg_get_serial_sequence('public.${table}', 'id'), coalesce((select max(id) from public.${table}), 0) + 1, false)`);
    }
    console.log("[still.room] Supabase migration complete.");
    return true;
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }
}

async function start() {
  if (shouldUseSupabase) {
    try {
      const ok = await migrate();
      if (!ok) console.log("[still.room] Supabase target is incomplete; keeping current DATABASE_URL.");
      else process.env.DATABASE_URL = targetUrl;
    } catch (error) {
      console.error("[still.room] Supabase migration failed; keeping Render database for safety.", error);
    }
  }
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(command, ["next", "start"], { stdio: "inherit", env: process.env });
  child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
}
start();
