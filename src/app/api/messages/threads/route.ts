import { db } from "@/db";
import { accounts, directMessages, directThreads } from "@/db/schema";
import { and, asc, desc, eq, inArray, ne, or, isNull } from "drizzle-orm";
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

    const people = otherIds.length
      ? await db.select({ id: accounts.id, name: accounts.name, email: accounts.email, picture: accounts.picture })
          .from(accounts).where(inArray(accounts.id, otherIds))
      : [];
    const peopleById = new Map(people.map(person => [person.id, person]));

    const threadIds = latestRows.map(row => row.threadId);
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

    return json(latestRows.map(row => {
      const otherId = row.accountAId === current.id ? row.accountBId : row.accountAId;
      const other = peopleById.get(otherId);
      return {
        threadId: row.threadId,
        other: other ? { ...other, relationship: "conversation" as const } : null,
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
