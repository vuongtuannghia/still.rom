import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ApiError, apiError, getWorkspace, json, readBody, titleValue } from "@/lib/server-api";
import { isUuid } from "@/lib/focus-domain";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    const title = titleValue(body.title, 180);
    if (!isUuid(body.clientId)) throw new ApiError(400, "Mã yêu cầu không hợp lệ.");
    const [inserted] = await db.insert(tasks).values({ workspaceId: workspace.id, clientId: body.clientId, title })
      .onConflictDoNothing({ target: [tasks.workspaceId, tasks.clientId] }).returning();
    const task = inserted ?? (await db.select().from(tasks).where(and(eq(tasks.workspaceId, workspace.id), eq(tasks.clientId, body.clientId))).limit(1))[0];
    return json({ task }, inserted ? 201 : 200);
  } catch (error) { return apiError(error); }
}
