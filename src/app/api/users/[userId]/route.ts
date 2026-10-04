import { cookies } from "next/headers";
import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountBlocks, accounts, accountSessions, friendships, friendRequests, forumPosts, profilePosts, focusSessions } from "@/db/schema";
import { apiError, json, ApiError, readBody } from "@/lib/server-api";
import { accountSummary } from "@/lib/account-sessions";
import { orderedAccountPair } from "@/lib/friendship";
import { createHash } from "node:crypto";

const ADMIN = "vuongtuannghia585@gmail.com";
function validUuid(value: string) { return /^[0-9a-f-]{36}$/i.test(value); }

async function viewerId() {
  const token = (await cookies()).get("stillroom.account.v1")?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const [row] = await db.select({ accountId: accountSessions.accountId }).from(accountSessions)
    .where(eq(accountSessions.tokenHash, hash)).limit(1);
  return row?.accountId ?? null;
}

export async function GET(_: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const userId = (await context.params).userId;
    if (!validUuid(userId)) throw new ApiError(400, "Tài khoản không hợp lệ.");
    const [account] = await db.select().from(accounts).where(eq(accounts.id, userId)).limit(1);
    if (!account) throw new ApiError(404, "Không tìm thấy tài khoản.");

    const viewer = await viewerId();
    let blockStatus: "none" | "blocked_by_me" | "blocked_you" = "none";
    if (viewer && viewer !== userId) {
      const [mine] = await db.select({ id: accountBlocks.id }).from(accountBlocks)
        .where(and(eq(accountBlocks.blockerId, viewer), eq(accountBlocks.blockedId, userId))).limit(1);
      const [theirs] = await db.select({ id: accountBlocks.id }).from(accountBlocks)
        .where(and(eq(accountBlocks.blockerId, userId), eq(accountBlocks.blockedId, viewer))).limit(1);
      blockStatus = mine ? "blocked_by_me" : theirs ? "blocked_you" : "none";
    }

    const friendshipRows = await db.select({ a: friendships.accountAId, b: friendships.accountBId })
      .from(friendships).where(or(eq(friendships.accountAId, userId), eq(friendships.accountBId, userId)));
    const friendIds = [...new Set(friendshipRows.flatMap(row => [row.a, row.b]).filter(id => id !== userId))];
    const friendAccounts = friendIds.length
      ? await db.select({ id: accounts.id, name: accounts.name, picture: accounts.picture, customPicture: accounts.customPicture, bio: accounts.bio })
          .from(accounts).where(inArray(accounts.id, friendIds))
      : [];

    const posts = await db.select({
      id: forumPosts.id, title: forumPosts.title, body: forumPosts.body, meetRoomId: forumPosts.meetRoomId,
      pinned: forumPosts.pinned, createdAt: forumPosts.createdAt,
    }).from(forumPosts).where(eq(forumPosts.accountId, userId))
      .orderBy(desc(forumPosts.pinned), desc(forumPosts.createdAt)).limit(30);

    const photoPosts = await db.select({
      id: profilePosts.id, body: profilePosts.body, imageData: profilePosts.imageData, createdAt: profilePosts.createdAt,
    }).from(profilePosts).where(eq(profilePosts.accountId, userId))
      .orderBy(desc(profilePosts.createdAt)).limit(30);

    const [forumCount] = await db.select({ count: count() }).from(forumPosts).where(eq(forumPosts.accountId, userId));
    const [photoCount] = await db.select({ count: count() }).from(profilePosts).where(eq(profilePosts.accountId, userId));

    const focus = await db.select({ total: sql<number>`coalesce(sum(${focusSessions.durationMinutes}),0)` })
      .from(focusSessions).where(eq(focusSessions.workspaceId, account.workspaceId));

    let relationship: "self" | "friend" | "incoming" | "outgoing" | "blocked" | "none" = viewer === userId ? "self" : "none";
    let relationshipRequestId: number | null = null;
    if (viewer && viewer !== userId) {
      const [blockedByMe] = await db.select({ id: accountBlocks.id }).from(accountBlocks)
        .where(and(eq(accountBlocks.blockerId, viewer), eq(accountBlocks.blockedId, userId))).limit(1);
      const [blockedYou] = await db.select({ id: accountBlocks.id }).from(accountBlocks)
        .where(and(eq(accountBlocks.blockerId, userId), eq(accountBlocks.blockedId, viewer))).limit(1);
      if (blockedByMe || blockedYou) relationship = "blocked";
      const [a, b] = orderedAccountPair(viewer, userId);
      const [friend] = await db.select({ id: friendships.id }).from(friendships)
        .where(and(eq(friendships.accountAId, a), eq(friendships.accountBId, b))).limit(1);
      if (friend) relationship = "friend";
      else {
        const [outgoing] = await db.select({ id: friendRequests.id }).from(friendRequests)
          .where(and(eq(friendRequests.senderId, viewer), eq(friendRequests.recipientId, userId), eq(friendRequests.status, "pending"))).limit(1);
        if (outgoing) {
          relationship = "outgoing";
          relationshipRequestId = outgoing.id;
        }
        else {
          const [incoming] = await db.select({ id: friendRequests.id }).from(friendRequests)
            .where(and(eq(friendRequests.senderId, userId), eq(friendRequests.recipientId, viewer), eq(friendRequests.status, "pending"))).limit(1);
          if (incoming) {
            relationship = "incoming";
            relationshipRequestId = incoming.id;
          }
        }
      }
    }

    return json({
      blockStatus,
      profile: {
        id: account.id, name: account.name, email: viewer === userId || relationship === "friend" ? account.email : null,
        picture: account.customPicture || account.picture, coverPicture: account.coverPicture, bio: account.bio,
        createdAt: account.createdAt.toISOString(), lastSignInAt: account.lastSignInAt.toISOString(),
        isAdmin: account.email.toLowerCase() === ADMIN,
      },
      relationship,
      relationshipRequestId,
      stats: { friendCount: friendIds.length, forumPostCount: Number(forumCount?.count ?? 0), photoPostCount: Number(photoCount?.count ?? 0), focusMinutes: Number(focus[0]?.total ?? 0) },
      friends: friendAccounts.map(friend => ({ id: friend.id, name: friend.name, picture: friend.customPicture || friend.picture, bio: friend.bio })),
      forumPosts: posts.map(post => ({ ...post, createdAt: post.createdAt.toISOString() })),
      profilePosts: photoPosts.map(post => ({ ...post, createdAt: post.createdAt.toISOString() })),
    });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const current = await viewerId();
    const userId = (await context.params).userId;
    if (!current || current !== userId) throw new ApiError(403, "Bạn chỉ có thể sửa trang cá nhân của mình.");
    const body = await readBody(request);
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const customPicture = body.customPicture === null ? null : (typeof body.customPicture === "string" ? body.customPicture : undefined);
    const coverPicture = body.coverPicture === null ? null : (typeof body.coverPicture === "string" ? body.coverPicture : undefined);
    if (bio.length > 280) throw new ApiError(400, "Giới thiệu tối đa 280 ký tự.");
    if (customPicture !== undefined && customPicture !== null && (!customPicture.startsWith("data:image/") || customPicture.length > 700000))
      throw new ApiError(400, "Ảnh đại diện không hợp lệ hoặc quá lớn.");
    if (coverPicture !== undefined && coverPicture !== null && (!coverPicture.startsWith("data:image/") || coverPicture.length > 1200000))
      throw new ApiError(400, "Ảnh bìa không hợp lệ hoặc quá lớn.");
    const update: Record<string, unknown> = { bio };
    if (customPicture !== undefined) update.customPicture = customPicture;
    if (coverPicture !== undefined) update.coverPicture = coverPicture;
    const [updated] = await db.update(accounts).set(update).where(eq(accounts.id, current)).returning();
    if (!updated) throw new ApiError(404, "Không tìm thấy tài khoản.");
    return json({ account: accountSummary(updated) });
  } catch (error) { return apiError(error); }
}
