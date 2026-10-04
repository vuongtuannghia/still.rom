import { db } from "@/db";
import { tasks, subtasks } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ApiError, apiError, assertSameOrigin, getWorkspace, json, positiveId, readBody, titleValue } from "@/lib/server-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ taskId: string; subtaskId: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const params = await context.params;
    const taskId = positiveId(params.taskId); const id = positiveId(params.subtaskId);
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    if (body.completed === undefined && body.title === undefined) throw new ApiError(400, "Không có thay đổi để lưu.");
    if (body.completed !== undefined && typeof body.completed !== "boolean") throw new ApiError(400, "Trạng thái không hợp lệ.");
    const title = body.title === undefined ? undefined : titleValue(body.title, 180);
    const result = await db.transaction(async (tx) => {
      const parentCondition = and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspace.id));
      const [parent] = await tx.select().from(tasks).where(parentCondition).for("update");
      if (!parent) throw new ApiError(404, "Không tìm thấy nhiệm vụ.");
      const condition = and(eq(subtasks.id, id), eq(subtasks.taskId, taskId));
      const [existing] = await tx.select().from(subtasks).where(condition);
      if (!existing) throw new ApiError(404, "Không tìm thấy mục nhỏ.");
      const completed = typeof body.completed === "boolean" ? body.completed : existing.completed;
      await tx.update(subtasks).set({ title: title ?? existing.title, completed, completedAt: completed === existing.completed ? existing.completedAt : completed ? new Date() : null }).where(condition);
      const items = await tx.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(asc(subtasks.id));
      const allDone = items.every((item) => item.completed);
      const task = allDone === parent.completed ? parent : (await tx.update(tasks).set({ completed: allDone, completedAt: allDone ? new Date() : null }).where(parentCondition).returning())[0];
      return { task, subtasks: items };
    });
    return json(result);
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const params = await context.params;
    const taskId = positiveId(params.taskId); const id = positiveId(params.subtaskId);
    const workspace = await getWorkspace(request);
    const result = await db.transaction(async (tx) => {
      const parentCondition = and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspace.id));
      const [parent] = await tx.select().from(tasks).where(parentCondition).for("update");
      if (!parent) throw new ApiError(404, "Không tìm thấy nhiệm vụ.");
      await tx.delete(subtasks).where(and(eq(subtasks.id, id), eq(subtasks.taskId, taskId)));
      const items = await tx.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(asc(subtasks.id));
      const allDone = items.length ? items.every((item) => item.completed) : parent.completed;
      const task = allDone === parent.completed ? parent : (await tx.update(tasks).set({ completed: allDone, completedAt: allDone ? new Date() : null }).where(parentCondition).returning())[0];
      return { task, subtasks: items };
    });
    return json(result);
  } catch (error) { return apiError(error); }
}
