import { db } from "@/db";
import { forumPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, apiError, json, positiveId } from "@/lib/server-api";
import { isWebAdmin } from "@/lib/study-room";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const account = await requireAccount(request);
    if (!isWebAdmin(account.email)) throw new ApiError(403, "Chỉ quản trị viên mới được xóa bài đăng.");

    const postId = positiveId((await context.params).postId);
    const [deleted] = await db.delete(forumPosts)
      .where(eq(forumPosts.id, postId))
      .returning({ id: forumPosts.id });

    if (!deleted) throw new ApiError(404, "Không tìm thấy bài đăng.");
    return json({ ok: true, id: deleted.id });
  } catch (error) {
    return apiError(error);
  }
}
