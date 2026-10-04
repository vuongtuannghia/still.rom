import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { accountBlocks, accounts, friendRequests, friendships, notifications } from "@/db/schema";
import { apiError, ApiError, json, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";
import { orderedAccountPair } from "@/lib/friendship";

export const dynamic = "force-dynamic";

async function validTarget(currentId: string, userId: unknown) {
  if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId) || userId === currentId) {
    throw new ApiError(400, "Tài khoản không hợp lệ.");
  }
  const [target] = await db.select({ id: accounts.id, name: accounts.name }).from(accounts)
    .where(eq(accounts.id, userId)).limit(1);
  if (!target) throw new ApiError(404, "Không tìm thấy tài khoản.");
  return target;
}

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    const userId = new URL(request.url).searchParams.get("userId");
    const target = await validTarget(current.id, userId);
    const [mine] = await db.select({ id: accountBlocks.id }).from(accountBlocks)
      .where(and(eq(accountBlocks.blockerId, current.id), eq(accountBlocks.blockedId, target.id))).limit(1);
    const [theirs] = await db.select({ id: accountBlocks.id }).from(accountBlocks)
      .where(and(eq(accountBlocks.blockerId, target.id), eq(accountBlocks.blockedId, current.id))).limit(1);
    return json({ status: mine ? "blocked_by_me" : theirs ? "blocked_you" : "none" });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const current = await requireAccount(request);
    const body = await readBody(request);
    const target = await validTarget(current.id, body.userId);

    await db.transaction(async tx => {
      await tx.insert(accountBlocks).values({
        blockerId: current.id,
        blockedId: target.id,
      }).onConflictDoNothing({ target: [accountBlocks.blockerId, accountBlocks.blockedId] });

      const [a, b] = orderedAccountPair(current.id, target.id);
      await tx.delete(friendships).where(and(eq(friendships.accountAId, a), eq(friendships.accountBId, b)));
      await tx.update(friendRequests).set({ status: "rejected", respondedAt: new Date() })
        .where(or(
          and(eq(friendRequests.senderId, current.id), eq(friendRequests.recipientId, target.id), eq(friendRequests.status, "pending")),
          and(eq(friendRequests.senderId, target.id), eq(friendRequests.recipientId, current.id), eq(friendRequests.status, "pending"))
        ));
      await tx.delete(notifications).where(or(
        and(eq(notifications.accountId, current.id), eq(notifications.actorId, target.id)),
        and(eq(notifications.accountId, target.id), eq(notifications.actorId, current.id))
      ));
    });

    return json({ ok: true, status: "blocked_by_me" });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const current = await requireAccount(request);
    const body = await readBody(request);
    const target = await validTarget(current.id, body.userId);
    const [deleted] = await db.delete(accountBlocks).where(
      and(eq(accountBlocks.blockerId, current.id), eq(accountBlocks.blockedId, target.id))
    ).returning({ id: accountBlocks.id });
    if (!deleted) throw new ApiError(404, "Không tìm thấy chặn để bỏ.");
    return json({ ok: true, status: "none" });
  } catch (error) { return apiError(error); }
}
