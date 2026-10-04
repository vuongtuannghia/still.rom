import { db } from "@/db";
import { accounts, directMessages, directThreads } from "@/db/schema";
import { and, asc, desc, eq, inArray, ne, or, isNull } from "drizzle-orm";
import { friendships } from "@/db/schema";
import { apiError, json } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);

    const rows = await db.select({
      threadId: directThreads.id,
      accountAId: directThreads.accountAId,
      accountBId: directThreads.accountBId,
      messageId: directMessages.id,
      senderId: directMessages.senderId,
      body: directMessages.body,
      createdAt: directMessages.createdAt,
    })
      .from(directThreads)
      .innerJoin(directMessages, eq(directMessages.threadId, directThreads.id))
      .where(or(eq(directThreads.accountAId, current.id), eq(directThreads.accountBId, current.id)))
      .orderBy(desc(directMessages.createdAt), desc(directMessages.id));

    const latestByThread = new Map<number, typeof rows[number]>();
    for (const row of rows) {
      if (!latestByThread.has(row.threadId)) latestByThread.set(row.threadId, row);
    }

    const latestRows = Array.from(latestByThread.values());
    const otherIds = [...new Set(latestRows.map(row => row.accountAId === current.id ? row.accountBId : row.accountAId))];

    const blockRows = otherIds.length
      ? await db.select({ blockerId: accountBlocks.blockerId, blockedId: accountBlocks.blockedId })
          .from(accountBlocks)
          .where(or(eq(accountBlocks.blockerId, current.id), eq(accountBlocks.blockedId, current.id)))
      : [];
    const blockedIds = new Set(blockRows.flatMap(row => [row.blockerId, row.blockedId]).filter(id => id !== current.id));

    const availableOtherIds = otherIds.filter(id => !blockedIds.has(id));

    const people = availableOtherIds.length
      ? await db.select({ id: accounts.id, name: accounts.name, email: accounts.email, picture: accounts.customPicture, googlePicture: accounts.picture })
          .from(accounts).where(inArray(accounts.id, availableOtherIds))
      : [];

    const friendshipRows = availableOtherIds.length
      ? await db.select({ a: friendships.accountAId, b: friendships.accountBId })
          .from(friendships)
          .where(or(eq(friendships.accountAId, current.id), eq(friendships.accountBId, current.id)))
      : [];
    const friendIds = new Set(friendshipRows.flatMap(row => [row.a, row.b]).filter(id => id !== current.id && !blockedIds.has(id)));
    const peopleById = new Map(people.map(person => [person.id, person]));

    const visibleRows = latestRows.filter(row => !blockedIds.has(row.accountAId === current.id ? row.accountBId : row.accountAId));
    const threadIds = visibleRows.map(row => row.threadId);
    const unreadRows = threadIds.length
      ? await db.select({ threadId: directMessages.threadId, count: directMessages.id })
          .from(directMessages)
          .where(and(
            inArray(directMessages.threadId, threadIds),
            ne(directMessages.senderId, current.id),
            isNull(directMessages.readAt),
          ))
      : [];

    const unreadCounts = new Map<number, number>();
    for (const row of unreadRows) unreadCounts.set(row.threadId, (unreadCounts.get(row.threadId) ?? 0) + 1);

    return json(visibleRows.map(row => {
      const otherId = row.accountAId === current.id ? row.accountBId : row.accountAId;
      const other = peopleById.get(otherId);
      return {
        threadId: row.threadId,
        other: other ? { id: other.id, name: other.name, email: other.email, picture: other.picture || other.googlePicture || null, relationship: friendIds.has(other.id) ? "friend" as const : "conversation" as const } : null,
        isFriend: friendIds.has(otherId),
        lastBody: row.body,
        lastSenderId: row.senderId,
        lastCreatedAt: row.createdAt.toISOString(),
        unreadCount: unreadCounts.get(row.threadId) ?? 0,
      };
    }).filter(row => row.other).slice(0, 50));
  } catch (error) {
    return apiError(error);
  }
}
