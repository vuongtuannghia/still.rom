import { db } from "@/db";
import { focusSessions } from "@/db/schema";
import { requireAccount } from "@/lib/community-auth";
import { assertAdmin } from "@/lib/admin";
import { and, eq } from "drizzle-orm";
import { ApiError, apiError, getWorkspace, json, readBody } from "@/lib/server-api";
import { isUuid } from "@/lib/focus-domain";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    if (body.manual === true) {
      const account = await requireAccount(request);
      assertAdmin(account);
    }
    if (body.workspaceId !== workspace.id) throw new ApiError(409, "Phiên này thuộc một không gian khác. Hãy tải lại trang.");
    if (!isUuid(body.clientId)) throw new ApiError(400, "Mã phiên không hợp lệ.");
    const seconds = body.durationSeconds;
    if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 60 || seconds > 10800) throw new ApiError(400, "Thời lượng phải từ 1 đến 180 phút.");
    if (typeof body.startedAt !== "string" || typeof body.endedAt !== "string") throw new ApiError(400, "Thời điểm phiên không hợp lệ.");
    const startedAt = new Date(body.startedAt);
    const endedAt = new Date(body.endedAt);
    if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(endedAt.getTime()) || endedAt < startedAt || endedAt.getTime() > Date.now() + 120000 || endedAt.getTime() < Date.now() - 367 * 86400000) {
      throw new ApiError(400, "Thời điểm phiên không hợp lệ.");
    }
    if (endedAt.getTime() - startedAt.getTime() + 1000 < seconds * 1000) throw new ApiError(400, "Thời lượng vượt quá thời gian của phiên.");
    if (body.taskTitle !== null && body.taskTitle !== undefined && (typeof body.taskTitle !== "string" || body.taskTitle.length > 180)) throw new ApiError(400, "Tên nhiệm vụ không hợp lệ.");
    const taskTitle = typeof body.taskTitle === "string" ? body.taskTitle.trim() || null : null;
    const [inserted] = await db.insert(focusSessions).values({
      workspaceId: workspace.id, clientId: body.clientId, durationSeconds: seconds,
      durationMinutes: Math.round(seconds / 60), taskTitle, startedAt, endedAt,
    }).onConflictDoNothing({ target: [focusSessions.workspaceId, focusSessions.clientId] }).returning();
    const session = inserted ?? (await db.select().from(focusSessions).where(and(eq(focusSessions.workspaceId, workspace.id), eq(focusSessions.clientId, body.clientId))).limit(1))[0];
    if (!inserted && (session.durationSeconds !== seconds || session.endedAt?.getTime() !== endedAt.getTime())) throw new ApiError(409, "Mã phiên đã được dùng cho một phiên khác.");
    return json({ session }, inserted ? 201 : 200);
  } catch (error) { return apiError(error); }
}
