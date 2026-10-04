import { db } from "@/db";
import {
  accounts, accountBlocks, accountSessions, friendRequests, friendships,
  forumComments, forumPosts, meetRoomComments, notifications,
  profilePostComments, profilePosts, sharedStudyRooms,
} from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { assertAdmin, assertRootAdmin } from "@/lib/admin";
import { apiError, ApiError, json, positiveId, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

function validUuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

const PERMITTED_LOCK_MINUTES = new Set([60, 1440, 10080, 43200]);

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const current = await requireAccount(request);
    assertAdmin(current);

    const userId = (await context.params).userId;
    if (!validUuid(userId) || userId === current.id) throw new ApiError(400, "Tài khoản quản trị không hợp lệ.");

    const [target] = await db.select().from(accounts).where(eq(accounts.id, userId)).limit(1);
    if (!target) throw new ApiError(404, "Không tìm thấy tài khoản.");

    const body = await readBody(request);
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "set-role") {
      assertRootAdmin(current);
      const role = body.role === "admin" ? "admin" : "user";
      await db.update(accounts).set({ role }).where(eq(accounts.id, target.id));
      return json({ ok: true, role });
    }

    if (action === "lock") {
      const durationMinutes = Number(body.durationMinutes);
      const permanent = body.permanent === true;
      if (!permanent && !PERMITTED_LOCK_MINUTES.has(durationMinutes)) {
        throw new ApiError(400, "Thời gian khóa không hợp lệ.");
      }
      const lockedUntil = permanent ? new Date("2099-12-31T23:59:59.000Z") : new Date(Date.now() + durationMinutes * 60000);
      await db.transaction(async tx => {
        await tx.update(accounts).set({
          lockedUntil,
          lockReason: typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || null : null,
        }).where(eq(accounts.id, target.id));
        await tx.update(accountSessions).set({ revokedAt: new Date() })
          .where(and(eq(accountSessions.accountId, target.id)));
        if (body.purgeContent === true) {
          await tx.delete(forumComments).where(eq(forumComments.accountId, target.id));
          await tx.delete(profilePostComments).where(eq(profilePostComments.accountId, target.id));
          await tx.delete(meetRoomComments).where(eq(meetRoomComments.accountId, target.id));
          await tx.delete(forumPosts).where(eq(forumPosts.accountId, target.id));
          await tx.delete(profilePosts).where(eq(profilePosts.accountId, target.id));
        }
        await tx.delete(notifications).where(eq(notifications.accountId, target.id));
      });
      return json({ ok: true, lockedUntil: lockedUntil.toISOString(), purged: body.purgeContent === true });
    }

    if (action === "unlock") {
      await db.update(accounts).set({ lockedUntil: null, lockReason: null }).where(eq(accounts.id, target.id));
      return json({ ok: true, lockedUntil: null });
    }

    if (action === "purge-content") {
      await db.transaction(async tx => {
        await tx.delete(forumComments).where(eq(forumComments.accountId, target.id));
        await tx.delete(profilePostComments).where(eq(profilePostComments.accountId, target.id));
        await tx.delete(meetRoomComments).where(eq(meetRoomComments.accountId, target.id));
        await tx.delete(forumPosts).where(eq(forumPosts.accountId, target.id));
        await tx.delete(profilePosts).where(eq(profilePosts.accountId, target.id));
      });
      return json({ ok: true, purged: true });
    }

    throw new ApiError(400, "Hành động quản trị không hợp lệ.");
  } catch (error) {
    return apiError(error);
  }
}
