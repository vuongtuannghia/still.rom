import { db } from "@/db";
import { accounts, notifications, profilePostComments, profilePosts } from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { ApiError, apiError, json, positiveId, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const postId = positiveId((await context.params).postId);
    const [post] = await db.select({ id: profilePosts.id }).from(profilePosts).where(eq(profilePosts.id, postId)).limit(1);
    if (!post) throw new ApiError(404, "Không tìm thấy bài đăng.");
    const rows = await db.select({
      id: profilePostComments.id, postId: profilePostComments.postId, parentId: profilePostComments.parentId,
      body: profilePostComments.body, createdAt: profilePostComments.createdAt,
      authorId: accounts.id, authorName: accounts.name,
      authorPicture: sql<string | null>`coalesce(${accounts.customPicture}, ${accounts.picture})`,
    }).from(profilePostComments)
      .innerJoin(accounts, eq(accounts.id, profilePostComments.accountId))
      .where(eq(profilePostComments.postId, postId))
      .orderBy(asc(profilePostComments.createdAt), asc(profilePostComments.id));
    return json(rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const account = await requireAccount(request);
    const postId = positiveId((await context.params).postId);
    const [post] = await db.select({ accountId: profilePosts.accountId }).from(profilePosts).where(eq(profilePosts.id, postId)).limit(1);
    if (!post) throw new ApiError(404, "Không tìm thấy bài đăng.");
    const body = await readBody(request);
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text || text.length > 2000) throw new ApiError(400, "Bình luận phải từ 1 đến 2000 ký tự.");

    let parentId: number | null = null;
    if (body.parentId !== undefined && body.parentId !== null) {
      const value = Number(body.parentId);
      if (!Number.isSafeInteger(value) || value < 1) throw new ApiError(400, "Phản hồi không hợp lệ.");
      const [parent] = await db.select({ id: profilePostComments.id, accountId: profilePostComments.accountId })
        .from(profilePostComments).where(and(eq(profilePostComments.id, value), eq(profilePostComments.postId, postId))).limit(1);
      if (!parent) throw new ApiError(400, "Bình luận được trả lời không tồn tại.");
      parentId = value;
    }

    const [comment] = await db.insert(profilePostComments).values({ postId, accountId: account.id, parentId, body: text }).returning();
    if (!comment) throw new ApiError(500, "Không thể lưu bình luận.");

    const [target] = parentId
      ? await db.select({ accountId: profilePostComments.accountId }).from(profilePostComments).where(eq(profilePostComments.id, parentId)).limit(1)
      : await db.select({ accountId: profilePosts.accountId }).from(profilePosts).where(eq(profilePosts.id, postId)).limit(1);

    if (target && target.accountId !== account.id) {
      await db.insert(notifications).values({
        accountId: target.accountId,
        actorId: account.id,
        type: parentId ? "profile_comment_reply" : "profile_comment",
        title: parentId ? "Có người trả lời bình luận của bạn" : "Trang cá nhân có bình luận mới",
        body: parentId ? account.name + " đã trả lời bình luận của bạn." : account.name + " đã bình luận bài đăng của bạn.",
      });
    }

    return json({
      comment: {
        ...comment,
        createdAt: comment.createdAt.toISOString(),
        authorId: account.id,
        authorName: account.name,
        authorPicture: account.customPicture || account.picture,
      },
    }, 201);
  } catch (error) {
    return apiError(error);
  }
}
