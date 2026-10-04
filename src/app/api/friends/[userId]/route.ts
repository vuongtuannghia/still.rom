import { db } from "@/db";
import { accountBlocks, friendships, accounts, notifications } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { apiError, ApiError, json } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";
import { orderedAccountPair } from "@/lib/friendship";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const current = await requireAccount(request);
    const userId = (await context.params).userId;
    if (!/^[0-9a-f-]{36}$/i.test(userId) || userId === current.id) throw new ApiError(400, "Tài khoản không hợp lệ.");

    const [target] = await db.select({ id: accounts.id, name: accounts.name }).from(accounts).where(eq(accounts.id, userId)).limit(1);
    if (!target) throw new ApiError(404, "Không tìm thấy tài khoản.");

    const [a, b] = orderedAccountPair(current.id, target.id);
    const [friendship] = await db.delete(friendships)
      .where(and(eq(friendships.accountAId, a), eq(friendships.accountBId, b)))
      .returning({ id: friendships.id });

    if (!friendship) throw new ApiError(404, "Hai tài khoản không phải bạn bè.");

    await db.delete(notifications).where(or(
      and(eq(notifications.accountId, current.id), eq(notifications.actorId, target.id), eq(notifications.type, "friend_accepted")),
      and(eq(notifications.accountId, target.id), eq(notifications.actorId, current.id), eq(notifications.type, "friend_accepted"))
    ));

    return json({ ok: true, status: "none" });
  } catch (error) {
    return apiError(error);
  }
}
