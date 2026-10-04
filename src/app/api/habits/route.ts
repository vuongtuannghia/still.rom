import { db } from "@/db";
import { habits } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ApiError, apiError, getWorkspace, json, readBody, titleValue } from "@/lib/server-api";
import { isUuid } from "@/lib/focus-domain";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    const title = titleValue(body.title, 80);
    if (!isUuid(body.clientId)) throw new ApiError(400, "Mã yêu cầu không hợp lệ.");
    const [inserted] = await db.insert(habits).values({ workspaceId: workspace.id, clientId: body.clientId, title })
      .onConflictDoNothing({ target: [habits.workspaceId, habits.clientId] }).returning();
    const habit = inserted ?? (await db.select().from(habits).where(and(eq(habits.workspaceId, workspace.id), eq(habits.clientId, body.clientId))).limit(1))[0];
    return json({ habit }, inserted ? 201 : 200);
  } catch (error) { return apiError(error); }
}
