import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ApiError, apiError, json, positiveId } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ notificationId: string }> }) {
  try {
    const current = await requireAccount(request);
    const notificationId = positiveId((await context.params).notificationId);
    const [row] = await db.update(notifications).set({ readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.accountId, current.id)))
      .returning({ id: notifications.id });
    if (!row) throw new ApiError(404, "Không tìm thấy thông báo.");
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
