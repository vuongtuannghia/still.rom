import { db } from "@/db";
import { habits } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ApiError, apiError, assertSameOrigin, getWorkspace, json, positiveId, readBody, titleValue } from "@/lib/server-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ habitId: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const id = positiveId((await context.params).habitId);
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    const title = titleValue(body.title, 80);
    const [habit] = await db.update(habits).set({ title }).where(and(eq(habits.id, id), eq(habits.workspaceId, workspace.id))).returning();
    if (!habit) throw new ApiError(404, "Không tìm thấy thói quen.");
    return json({ habit });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const id = positiveId((await context.params).habitId);
    const workspace = await getWorkspace(request);
    await db.delete(habits).where(and(eq(habits.id, id), eq(habits.workspaceId, workspace.id)));
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
