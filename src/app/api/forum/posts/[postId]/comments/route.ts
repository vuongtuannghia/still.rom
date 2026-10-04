import { db } from "@/db";
import { accounts, forumComments, forumPosts } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ApiError, apiError, json, positiveId, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const postId = positiveId((await context.params).postId);
    const [post] = await db.select({ id: forumPosts.id }).from(forumPosts).where(eq(forumPosts.id, postId)).limit(1);
    if (!post) throw new ApiError(404, "Không tìm thấy chủ đề.");
    const rows = await db.select({ id: forumComments.id, postId: forumComments.postId, parentId: forumComments.parentId, body: forumComments.body, createdAt: forumComments.createdAt, authorId: accounts.id, authorName: accounts.name, authorPicture: accounts.picture })
      .from(forumComments).innerJoin(accounts, eq(accounts.id, forumComments.accountId)).where(eq(forumComments.postId, postId)).orderBy(asc(forumComments.createdAt), asc(forumComments.id));
    return json(rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const account = await requireAccount(request);
    const postId = positiveId((await context.params).postId);
    const body = await readBody(request);
    if (typeof body.body !== "string" || !body.body.trim() || body.body.trim().length > 2000) throw new ApiError(400, "Bình luận phải từ 1 đến 2000 ký tự.");
    let parentId: number | null = null;
    if (body.parentId !== undefined && body.parentId !== null) {
      const value = Number(body.parentId);
      if (!Number.isSafeInteger(value) || value < 1) throw new ApiError(400, "Phản hồi không hợp lệ.");
      const [parent] = await db.select({ id: forumComments.id }).from(forumComments).where(and(eq(forumComments.id, value), eq(forumComments.postId, postId))).limit(1);
      if (!parent) throw new ApiError(400, "Bình luận được trả lời không tồn tại.");
      parentId = value;
    }
    const [comment] = await db.insert(forumComments).values({ postId, accountId: account.id, parentId, body: body.body.trim() }).returning();
    return json({ comment: { ...comment, createdAt: comment.createdAt.toISOString(), authorId: account.id, authorName: account.name, authorPicture: account.picture } }, 201);
  } catch (error) { return apiError(error); }
}