import { spawn } from "node:child_process";
import pg from "pg";

const { Client } = pg;
const sourceUrl = process.env.DATABASE_URL;
const targetUrl = process.env.SUPABASE_DATABASE_URL;
const MIGRATION_KEY = "render-to-supabase-v1";
const tables = [
  ["workspaces","id"],["accounts","id"],["profile_posts","id"],["profile_post_comments","id"],
  ["account_sessions","id"],["google_login_attempts","id"],["account_snapshots","id"],
  ["shared_study_rooms","id"],["forum_posts","id"],["forum_comments","id"],["meet_room_comments","id"],
  ["direct_threads","id"],["friend_requests","id"],["friendships","id"],["account_blocks","id"],
  ["workspace_access_keys","token_hash"],["tasks","id"],["subtasks","id"],["habits","id"],
  ["habit_check_ins","id"],["notifications","id"],["direct_messages","id"],["focus_sessions","id"]
];
const serialTables = [
  "profile_posts","profile_post_comments","shared_study_rooms","forum_posts","forum_comments",
  "meet_room_comments","direct_threads","friend_requests","friendships","account_blocks","tasks",
  "subtasks","habits","habit_check_ins","notifications","direct_messages","focus_sessions"
];
const qi = (s) => '"' + s.replaceAll('"','""') + '"';

async function migrate() {
  if (!sourceUrl || !targetUrl) return false;
  const source = new Client({ connectionString: sourceUrl });
  const target = new Client({ connectionString: targetUrl });
  await source.connect(); await target.connect();
  try {
    const marker = await target.query("select 1 from public.still_room_migration_meta where migration_key=$1", [MIGRATION_KEY]);
    if (marker.rowCount) return true;
    for (const [table, pk] of tables) {
      const result = await source.query(`select * from public.${qi(table)}`);
      if (!result.rows.length) continue;
      const columns = result.fields.map(f => f.name);
      const colSql = columns.map(qi).join(", ");
      const updates = columns.filter(c=>c!==pk).map(c=>`${qi(c)}=excluded.${qi(c)}`).join(", ");
      for (let o=0;o<result.rows.length;o+=50) {
        const batch=result.rows.slice(o,o+50), values=[];
        const tuples=batch.map((row,ri)=>"("+columns.map((col,ci)=>{values.push(row[col]); return "$"+(ri*columns.length+ci+1)}).join(",")+")").join(",");
        await target.query(`insert into public.${qi(table)} (${colSql}) values ${tuples} on conflict (${qi(pk)}) do update set ${updates || qi(pk)+"=excluded."+qi(pk)}`, values);
      }
      console.log(`[still.room] migrated ${table}: ${result.rows.length}`);
    }
    for (const table of serialTables) {
      await target.query(`select setval(pg_get_serial_sequence('public.${table}','id'), coalesce((select max(id) from public.${table}),0)+1, false)`);
    }
    await target.query("insert into public.still_room_migration_meta(migration_key) values($1) on conflict(migration_key) do update set completed_at=now()",[MIGRATION_KEY]);
    return true;
  } finally {
    await source.end().catch(()=>{}); await target.end().catch(()=>{});
  }
}

async function main() {
  if (targetUrl) {
    try {
      if (await migrate()) process.env.DATABASE_URL = targetUrl;
    } catch (e) { console.error("[still.room] migration failed; keeping Render database", e); }
  }
  const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next","start"], { env: process.env, stdio:"inherit" });
  child.on("exit", (code, signal)=>process.exit(signal ? 1 : (code ?? 1)));
}
void main();
