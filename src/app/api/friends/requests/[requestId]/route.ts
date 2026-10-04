import { db } from "@/db";
import { accounts, friendRequests, friendships, notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ApiError, apiError, json, positiveId, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";
import { orderedAccountPair } from "@/lib/friendship";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const current = await requireAccount(request);
    const requestId = positiveId((await context.params).requestId);
    const body = await readBody(request);
    const action = body.action === "accept" || body.action === "reject" || body.action === "cancel" ? body.action : "";
    if (!action) throw new ApiError(400, "Hành động không hợp lệ.");

    const [row] = await db.select({
      request: friendRequests,
      sender: accounts,
    }).from(friendRequests)
      .innerJoin(accounts, eq(accounts.id, friendRequests.senderId))
      .where(and(eq(friendRequests.id, requestId), eq(friendRequests.status, "pending")))
      .limit(1);

    if (!row) throw new ApiError(404, "Lời mời không tồn tại hoặc đã được xử lý.");

    const isRecipient = row.request.recipientId === current.id;
    const isSender = row.request.senderId === current.id;
    if (action === "cancel") {
      if (!isSender) throw new ApiError(403, "Bạn chỉ có thể hủy lời mời do mình gửi.");
      await db.update(friendRequests).set({ status: "cancelled", respondedAt: new Date() }).where(eq(friendRequests.id, requestId));
      return json({ ok: true, status: "cancelled" });
    }

    if (!isRecipient) throw new ApiError(403, "Bạn không có quyền xử lý lời mời này.");

    if (action === "reject") {
      await db.update(friendRequests).set({ status: "rejected", respondedAt: new Date() }).where(eq(friendRequests.id, requestId));
      return json({ ok: true, status: "rejected" });
    }

    const [accountAId, accountBId] = orderedAccountPair(current.id, row.sender.id);
    await db.transaction(async tx => {
      await tx.update(friendRequests).set({ status: "accepted", respondedAt: new Date() }).where(eq(friendRequests.id, requestId));
      await tx.insert(friendships).values({ accountAId, accountBId }).onConflictDoNothing({
        target: [friendships.accountAId, friendships.accountBId],
      });
      await tx.insert(notifications).values({
        accountId: row.sender.id,
        actorId: current.id,
        type: "friend_accepted",
        title: "Lời mời kết bạn được chấp nhận",
        body: `${current.name} đã chấp nhận lời mời kết bạn.`,
      });
    });

    return json({ ok: true, status: "accepted" });
  } catch (error) { return apiError(error); }
}
