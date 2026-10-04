import { db } from "@/db";
import { accounts, meetRoomComments, sharedStudyRooms } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ApiError, apiError, json, positiveId, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const roomId = positiveId((await context.params).roomId);
    const [room] = await db.select({ id: sharedStudyRooms.id }).from(sharedStudyRooms).where(eq(sharedStudyRooms.id, roomId)).limit(1);
    if (!room) throw new ApiError(404, "Không tìm thấy phòng học.");
    const rows = await db.select({ id: meetRoomComments.id, roomId: meetRoomComments.roomId, parentId: meetRoomComments.parentId, body: meetRoomComments.body, createdAt: meetRoomComments.createdAt, authorId: accounts.id, authorName: accounts.name, authorPicture: accounts.picture })
      .from(meetRoomComments).innerJoin(accounts, eq(accounts.id, meetRoomComments.accountId)).where(eq(meetRoomComments.roomId, roomId)).orderBy(asc(meetRoomComments.createdAt), asc(meetRoomComments.id));
    return json(rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const account = await requireAccount(request);
    const roomId = positiveId((await context.params).roomId);
    const body = await readBody(request);
    if (typeof body.body !== "string" || !body.body.trim() || body.body.trim().length > 2000) throw new ApiError(400, "Bình luận phải từ 1 đến 2000 ký tự.");
    let parentId: number | null = null;
    if (body.parentId !== undefined && body.parentId !== null) {
      const value = Number(body.parentId);
      if (!Number.isSafeInteger(value) || value < 1) throw new ApiError(400, "Phản hồi không hợp lệ.");
      const [parent] = await db.select({ id: meetRoomComments.id }).from(meetRoomComments).where(and(eq(meetRoomComments.id, value), eq(meetRoomComments.roomId, roomId))).limit(1);
      if (!parent) throw new ApiError(400, "Bình luận được trả lời không tồn tại.");
      parentId = value;
    }
    const [comment] = await db.insert(meetRoomComments).values({ roomId, accountId: account.id, parentId, body: body.body.trim() }).returning();
    return json({ comment: { ...comment, createdAt: comment.createdAt.toISOString(), authorId: account.id, authorName: account.name, authorPicture: account.picture } }, 201);
  } catch (error) { return apiError(error); }
}