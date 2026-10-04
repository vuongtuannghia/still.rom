import { db } from "@/db";
import { accountBlocks, accounts, friendRequests, friendships, notifications } from "@/db/schema";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { ApiError, apiError, json, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    const blockedRows = await db.select({ blockerId: accountBlocks.blockerId, blockedId: accountBlocks.blockedId })
      .from(accountBlocks).where(or(eq(accountBlocks.blockerId, current.id), eq(accountBlocks.blockedId, current.id)));
    const blockedIds = new Set(blockedRows.flatMap(row => [row.blockerId, row.blockedId]).filter(id => id !== current.id));

    const friendRows = await db.select({
      id: accounts.id, name: accounts.name, email: accounts.email, picture: accounts.customPicture, googlePicture: accounts.picture,
      friendshipId: friendships.id, createdAt: friendships.createdAt,
    }).from(friendships)
      .innerJoin(accounts, or(eq(accounts.id, friendships.accountAId), eq(accounts.id, friendships.accountBId)))
.where(or(eq(friendships.accountAId, current.id), eq(friendships.accountBId, current.id)))
      .orderBy(asc(accounts.name));

    const friends = friendRows
      .filter(row => row.id !== current.id && !blockedIds.has(row.id))
      .map(row => ({ id: row.id, name: row.name, email: row.email, picture: row.picture || row.googlePicture || null, friendshipId: row.friendshipId, createdAt: row.createdAt.toISOString() }));

    const incomingRows = await db.select({
      id: friendRequests.id, senderId: accounts.id, senderName: accounts.name, senderEmail: accounts.email,
      senderPicture: accounts.picture, createdAt: friendRequests.createdAt,
    }).from(friendRequests).innerJoin(accounts, eq(accounts.id, friendRequests.senderId))
      .where(and(eq(friendRequests.recipientId, current.id), eq(friendRequests.status, "pending")))
      .orderBy(desc(friendRequests.createdAt));

    const outgoingRows = await db.select({
      id: friendRequests.id, recipientId: accounts.id, recipientName: accounts.name, recipientEmail: accounts.email,
      recipientPicture: accounts.picture, createdAt: friendRequests.createdAt,
    }).from(friendRequests).innerJoin(accounts, eq(accounts.id, friendRequests.recipientId))
      .where(and(eq(friendRequests.senderId, current.id), eq(friendRequests.status, "pending")))
      .orderBy(desc(friendRequests.createdAt));

    return json({
      friends,
      blocks: [...blockedIds],
      incoming: incomingRows.filter(row => !blockedIds.has(row.senderId)).map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
      outgoing: outgoingRows.filter(row => !blockedIds.has(row.recipientId)).map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
    });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const current = await requireAccount(request);
    const body = await readBody(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!email && !/^[0-9a-f-]{36}$/i.test(userId)) throw new ApiError(400, "Hãy chọn một tài khoản.");
    if (email && (!email.includes("@") || email.length > 320)) throw new ApiError(400, "Hãy nhập đúng email.");
    if (email && email === current.email.toLowerCase()) throw new ApiError(400, "Bạn không thể kết bạn với chính mình.");
    if (userId === current.id) throw new ApiError(400, "Bạn không thể kết bạn với chính mình.");

    const [target] = await db.select().from(accounts)
      .where(email ? eq(accounts.email, email) : eq(accounts.id, userId)).limit(1);
    if (!target) throw new ApiError(404, "Không tìm thấy tài khoản.");
    const [blocked] = await db.select({ id: accountBlocks.id }).from(accountBlocks)
      .where(or(
        and(eq(accountBlocks.blockerId, current.id), eq(accountBlocks.blockedId, target.id)),
        and(eq(accountBlocks.blockerId, target.id), eq(accountBlocks.blockedId, current.id))
      )).limit(1);
    if (blocked) throw new ApiError(403, "Không thể gửi lời mời cho tài khoản đang bị chặn.");

    const [pairA, pairB] = [current.id < target.id ? current.id : target.id, current.id < target.id ? target.id : current.id];
    const [alreadyFriend] = await db.select({ id: friendships.id }).from(friendships)
      .where(and(eq(friendships.accountAId, pairA), eq(friendships.accountBId, pairB))).limit(1);
    if (alreadyFriend) throw new ApiError(409, "Hai bạn đã là bạn bè.");

    const [reversePending] = await db.select().from(friendRequests)
      .where(and(eq(friendRequests.senderId, target.id), eq(friendRequests.recipientId, current.id), eq(friendRequests.status, "pending"))).limit(1);
    if (reversePending) throw new ApiError(409, "Người này đã gửi lời mời kết bạn cho bạn.");

    const [existing] = await db.select().from(friendRequests)
      .where(and(eq(friendRequests.senderId, current.id), eq(friendRequests.recipientId, target.id))).limit(1);
    if (existing?.status === "pending") throw new ApiError(409, "Bạn đã gửi lời mời cho người này.");
    const requestRow = await db.transaction(async tx => {
      let row;
      if (existing) {
        [row] = await tx.update(friendRequests).set({
          status: "pending",
          createdAt: new Date(),
          respondedAt: null,
        }).where(eq(friendRequests.id, existing.id)).returning();
      } else {
        [row] = await tx.insert(friendRequests).values({
          senderId: current.id,
          recipientId: target.id,
          status: "pending",
        }).returning();
      }
      if (!row) throw new ApiError(500, "Không thể tạo lời mời kết bạn.");
      await tx.insert(notifications).values({
        accountId: target.id,
        actorId: current.id,
        type: "friend_request",
        title: "Lời mời kết bạn mới",
        body: `${current.name} muốn kết bạn với bạn.`,
        requestId: row.id,
      });
      return row;
    });

    return json({ request: { id: requestRow.id, recipientId: target.id, recipientName: target.name, recipientEmail: target.email, status: requestRow.status } }, 201);
  } catch (error) { return apiError(error); }
}


export async function DELETE(request: Request) {
  try {
    const current = await requireAccount(request);
    const body = await readBody(request);
    const queryUserId = new URL(request.url).searchParams.get("userId") ?? "";
    const userId = typeof body.userId === "string" ? body.userId : queryUserId;
    if (!/^[0-9a-f-]{36}$/i.test(userId) || userId === current.id) throw new ApiError(400, "Tài khoản không hợp lệ.");
    const a = current.id < userId ? current.id : userId;
    const b = current.id < userId ? userId : current.id;
    const [deleted] = await db.delete(friendships)
      .where(and(eq(friendships.accountAId, a), eq(friendships.accountBId, b)))
      .returning({ id: friendships.id });
    if (!deleted) throw new ApiError(404, "Hai bạn không còn là bạn bè.");
    return json({ ok: true, status: "none" });
  } catch (error) {
    return apiError(error);
  }
}
