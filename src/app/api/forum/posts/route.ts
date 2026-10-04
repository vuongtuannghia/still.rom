import { db } from "@/db";
import { accounts, forumComments, forumPosts, sharedStudyRooms } from "@/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { ApiError, apiError, json, readBody, titleValue } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select({
      id: forumPosts.id, title: forumPosts.title, body: forumPosts.body, meetRoomId: forumPosts.meetRoomId, pinned: forumPosts.pinned,
      createdAt: forumPosts.createdAt, updatedAt: forumPosts.updatedAt,
      authorId: accounts.id, authorName: accounts.name, authorEmail: accounts.email, authorPicture: sql<string | null>`coalesce(${accounts.customPicture}, ${accounts.picture})`,
      meetTitle: sharedStudyRooms.title, meetUrl: sharedStudyRooms.meetUrl,
    }).from(forumPosts).innerJoin(accounts, eq(accounts.id, forumPosts.accountId))
      .leftJoin(sharedStudyRooms, eq(sharedStudyRooms.id, forumPosts.meetRoomId))
      .orderBy(desc(forumPosts.pinned), desc(forumPosts.createdAt)).limit(50);
    const ids = rows.map(row => row.id);
    const comments = ids.length ? await db.select({ postId: forumComments.postId })
      .from(forumComments).where(inArray(forumComments.postId, ids)) : [];
    const counts = new Map<number, number>();
    for (const row of comments) counts.set(row.postId, (counts.get(row.postId) ?? 0) + 1);
    return json(rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), commentCount: counts.get(row.id) ?? 0 })));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const account = await requireAccount(request);
    const body = await readBody(request);
    const title = titleValue(body.title, 160);
    if (typeof body.body !== "string" || !body.body.trim() || body.body.trim().length > 5000) throw new ApiError(400, "Nội dung bài viết phải từ 1 đến 5000 ký tự.");
    let meetRoomId: number | null = null;
    if (body.meetRoomId !== undefined && body.meetRoomId !== null) {
      const value = Number(body.meetRoomId);
      if (!Number.isSafeInteger(value) || value < 1) throw new ApiError(400, "Phòng Meet không hợp lệ.");
      const [room] = await db.select({ id: sharedStudyRooms.id }).from(sharedStudyRooms).where(eq(sharedStudyRooms.id, value)).limit(1);
      if (!room) throw new ApiError(404, "Không tìm thấy phòng Meet.");
      meetRoomId = value;
    }
    const [post] = await db.insert(forumPosts).values({ accountId: account.id, title, body: body.body.trim(), meetRoomId }).returning();
    return json({ post: { id: post.id, title: post.title, body: post.body, meetRoomId: post.meetRoomId, createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString(), authorId: account.id, authorName: account.name, authorEmail: account.email, authorPicture: account.customPicture || account.picture, pinned: false, commentCount: 0 } }, 201);
  } catch (error) { return apiError(error); }
}