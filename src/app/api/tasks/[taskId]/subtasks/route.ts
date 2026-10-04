import { db } from "@/db";
import { tasks, subtasks } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ApiError, apiError, getWorkspace, json, positiveId, readBody, titleValue } from "@/lib/server-api";
import { isUuid } from "@/lib/focus-domain";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ taskId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const taskId = positiveId((await context.params).taskId);
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    const title = titleValue(body.title, 180);
    if (!isUuid(body.clientId)) throw new ApiError(400, "Mã yêu cầu không hợp lệ.");
    const clientId = body.clientId;
    const result = await db.transaction(async (tx) => {
      const condition = and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspace.id));
      const [parent] = await tx.select().from(tasks).where(condition).for("update");
      if (!parent) throw new ApiError(404, "Không tìm thấy nhiệm vụ.");
      const children = await tx.select().from(subtasks).where(eq(subtasks.taskId, taskId));
      if (children.length >= 40 && !children.some((child) => child.clientId === clientId)) throw new ApiError(400, "Mỗi nhiệm vụ có tối đa 40 mục nhỏ.");
      const [inserted] = await tx.insert(subtasks).values({ taskId, clientId, title }).onConflictDoNothing({ target: [subtasks.taskId, subtasks.clientId] }).returning();
      let task = parent;
      if (inserted && parent.completed) task = (await tx.update(tasks).set({ completed: false, completedAt: null }).where(condition).returning())[0];
      const items = await tx.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(asc(subtasks.id));
      return { task, subtasks: items };
    });
    return json(result, 201);
  } catch (error) { return apiError(error); }
}
