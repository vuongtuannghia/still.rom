import { db } from "@/db";
import { tasks, subtasks } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ApiError, apiError, assertSameOrigin, getWorkspace, json, positiveId, readBody, titleValue } from "@/lib/server-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ taskId: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const id = positiveId((await context.params).taskId);
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    if (body.completed === undefined && body.title === undefined) throw new ApiError(400, "Không có thay đổi để lưu.");
    if (body.completed !== undefined && typeof body.completed !== "boolean") throw new ApiError(400, "Trạng thái không hợp lệ.");
    const title = body.title === undefined ? undefined : titleValue(body.title, 180);
    const result = await db.transaction(async (tx) => {
      const condition = and(eq(tasks.id, id), eq(tasks.workspaceId, workspace.id));
      const [existing] = await tx.select().from(tasks).where(condition).for("update");
      if (!existing) throw new ApiError(404, "Không tìm thấy nhiệm vụ.");
      const completed = typeof body.completed === "boolean" ? body.completed : existing.completed;
      const completedAt = completed === existing.completed ? existing.completedAt : completed ? new Date() : null;
      const [task] = await tx.update(tasks).set({ title: title ?? existing.title, completed, completedAt }).where(condition).returning();
      if (typeof body.completed === "boolean") await tx.update(subtasks).set({ completed, completedAt: completed ? completedAt ?? new Date() : null }).where(eq(subtasks.taskId, id));
      const children = await tx.select().from(subtasks).where(eq(subtasks.taskId, id)).orderBy(asc(subtasks.id));
      return { task, subtasks: children };
    });
    return json(result);
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const id = positiveId((await context.params).taskId);
    const workspace = await getWorkspace(request);
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspace.id)));
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
