import { db } from "@/db";
import { accounts, friendRequests, friendships, notifications } from "@/db/schema";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { ApiError, apiError, json, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    const friendRows = await db.select({
      id: accounts.id, name: accounts.name, email: accounts.email, picture: accounts.picture,
      friendshipId: friendships.id, createdAt: friendships.createdAt,
    }).from(friendships)
      .innerJoin(accounts, or(eq(accounts.id, friendships.accountAId), eq(accounts.id, friendships.accountBId)))
.where(or(eq(friendships.accountAId, current.id), eq(friendships.accountBId, current.id)))
      .orderBy(asc(accounts.name));

    const friends = friendRows
      .filter(row => row.id !== current.id)
      .map(row => ({ id: row.id, name: row.name, email: row.email, picture: row.picture, friendshipId: row.friendshipId, createdAt: row.createdAt.toISOString() }));

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
      incoming: incomingRows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
      outgoing: outgoingRows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
    });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const current = await requireAccount(request);
    const body = await readBody(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@") || email.length > 320) throw new ApiError(400, "Hãy nhập đúng email.");
    if (email === current.email.toLowerCase()) throw new ApiError(400, "Bạn không thể kết bạn với chính mình.");

    const [target] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
    if (!target) throw new ApiError(404, "Không tìm thấy tài khoản với email này.");

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
    let requestRow;
    if (existing) {
      [requestRow] = await db.update(friendRequests).set({
        status: "pending",
        createdAt: new Date(),
        respondedAt: null,
      }).where(eq(friendRequests.id, existing.id)).returning();
    } else {
      [requestRow] = await db.insert(friendRequests).values({
        senderId: current.id,
        recipientId: target.id,
        status: "pending",
      }).returning();
    }

    await db.insert(notifications).values({
      accountId: target.id,
      actorId: current.id,
      type: "friend_request",
      title: "Lời mời kết bạn mới",
      body: `${current.name} muốn kết bạn với bạn.`,
      requestId: requestRow.id,
    });

    return json({ request: { id: requestRow.id, recipientId: target.id, recipientName: target.name, recipientEmail: target.email, status: requestRow.status } }, 201);
  } catch (error) { return apiError(error); }
}
