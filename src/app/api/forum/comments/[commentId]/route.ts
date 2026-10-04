import { db } from "@/db";
import { accounts, forumComments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { assertAdmin } from "@/lib/admin";
import { apiError, ApiError, json, positiveId } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ commentId: string }> }) {
  try {
    const current = await requireAccount(request);
    const commentId = positiveId((await context.params).commentId);
    const [row] = await db.select({ id: forumComments.id, accountId: forumComments.accountId }).from(forumComments).where(eq(forumComments.id, commentId)).limit(1);
    if (!row) throw new ApiError(404, "Không tìm thấy bình luận.");
    if (row.accountId !== current.id) {
      assertAdmin(current);
    }
    await db.delete(forumComments).where(eq(forumComments.id, commentId));
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
