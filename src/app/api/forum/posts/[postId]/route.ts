import { db } from "@/db";
import { forumPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, apiError, json, positiveId, readBody } from "@/lib/server-api";
import { isAdminAccount } from "@/lib/admin";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const account = await requireAccount(request);
    if (!isAdminAccount(account)) throw new ApiError(403, "Chỉ quản trị viên mới được ghim bài đăng.");
    const postId = positiveId((await context.params).postId);
    const body = await readBody(request) as { pinned?: boolean };
    if (typeof body.pinned !== "boolean") throw new ApiError(400, "Trạng thái ghim không hợp lệ.");

    await db.transaction(async tx => {
      if (body.pinned) await tx.update(forumPosts).set({ pinned: false });
      const [updated] = await tx.update(forumPosts).set({ pinned: body.pinned }).where(eq(forumPosts.id, postId)).returning({ id: forumPosts.id });
      if (!updated) throw new ApiError(404, "Không tìm thấy bài đăng.");
    });
    return json({ ok: true, id: postId, pinned: body.pinned });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const account = await requireAccount(request);
    if (!isAdminAccount(account)) throw new ApiError(403, "Chỉ quản trị viên mới được xóa bài đăng.");

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
