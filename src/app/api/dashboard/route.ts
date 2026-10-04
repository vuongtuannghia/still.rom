import { db } from "@/db";
import { workspaces, tasks, subtasks, habits, habitCheckIns, focusSessions, accountSnapshots } from "@/db/schema";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { apiError, getWorkspace, json, readBody } from "@/lib/server-api";
import { workspaceGrant } from "@/lib/access-protocol";
import { normalizePreferences } from "@/lib/focus-domain";
import { normalizeRoom } from "@/lib/scene-domain";
import { accountForWorkspace, accountSummary } from "@/lib/account-sessions";

export const dynamic = "force-dynamic";
async function dashboard(request: Request, legacyRead: boolean) {
  try {
    if (!legacyRead) await readBody(request);
    // POST reads must identify an existing, verified personal workspace.
    // Never create an unrelated anonymous workspace when a proof is missing.
    const workspace = await getWorkspace(request, legacyRead);
    if (!workspace.initialized) {
      await db.transaction(async (tx) => {
        const [locked] = await tx.select().from(workspaces).where(eq(workspaces.id, workspace.id)).for("update");
        if (locked.initialized) return;
        await tx.insert(tasks).values([
          { workspaceId: workspace.id, title: "Chọn một việc quan trọng nhất hôm nay" },
          { workspaceId: workspace.id, title: "Đọc 20 trang sách" },
          { workspaceId: workspace.id, title: "Dành 30 phút vận động" },
        ]);
        await tx.insert(habits).values([
          { workspaceId: workspace.id, title: "Đọc sách" },
          { workspaceId: workspace.id, title: "Vận động" },
          { workspaceId: workspace.id, title: "Thiền 5 phút" },
          { workspaceId: workspace.id, title: "Uống đủ nước" },
        ]);
        await tx.update(workspaces).set({ initialized: true }).where(eq(workspaces.id, workspace.id));
      });
    }
    const since = new Date(Date.now() - 367 * 86400000);
    const [taskRows, habitRows, checkIns, sessions, subtaskRows] = await Promise.all([
      db.select().from(tasks).where(eq(tasks.workspaceId, workspace.id)).orderBy(asc(tasks.completed), desc(tasks.createdAt), desc(tasks.id)),
      db.select().from(habits).where(eq(habits.workspaceId, workspace.id)).orderBy(asc(habits.createdAt), asc(habits.id)),
      db.select({ habitId: habitCheckIns.habitId, date: habitCheckIns.date }).from(habitCheckIns).innerJoin(habits, eq(habits.id, habitCheckIns.habitId)).where(and(eq(habits.workspaceId, workspace.id), gte(habitCheckIns.date, since.toISOString().slice(0, 10)))),
      db.select().from(focusSessions).where(and(eq(focusSessions.workspaceId, workspace.id), gte(focusSessions.createdAt, since))).orderBy(desc(focusSessions.endedAt), desc(focusSessions.id)),
      db.select({ id: subtasks.id, taskId: subtasks.taskId, title: subtasks.title, completed: subtasks.completed, completedAt: subtasks.completedAt, createdAt: subtasks.createdAt }).from(subtasks).innerJoin(tasks, eq(tasks.id, subtasks.taskId)).where(eq(tasks.workspaceId, workspace.id)).orderBy(asc(subtasks.id)),
    ]);
    const owner = await accountForWorkspace(workspace.id);
    if (owner) {
      const [snapshot] = await db.select({ data: accountSnapshots.data })
        .from(accountSnapshots)
        .where(eq(accountSnapshots.accountId, owner.id))
        .orderBy(desc(accountSnapshots.createdAt))
        .limit(1);
      if (snapshot?.data) {
        return json({
          ...snapshot.data,
          account: accountSummary(owner),
          workspaceId: workspace.id,
          access: workspaceGrant(workspace.id),
        });
      }
    }
    return json({ account: owner ? accountSummary(owner) : null, workspaceId: workspace.id, access: workspaceGrant(workspace.id), preferences: normalizePreferences(workspace.preferences), room: normalizeRoom(workspace.roomSettings), tasks: taskRows, habits: habitRows, checkIns, sessions, subtasks: subtaskRows });
  } catch (error) { return apiError(error); }
}
export async function GET(request: Request) { return dashboard(request, true); }
export async function POST(request: Request) { return dashboard(request, false); }
