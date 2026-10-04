import { db } from "@/db";
import { accounts, directMessages, directThreads } from "@/db/schema";
import { and, asc, desc, eq, ne, or, sql } from "drizzle-orm";
import { apiError, json } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);

    const rows = await db.select({
      threadId: directThreads.id,
      otherId: sql<string>`CASE WHEN ${directThreads.accountAId} = ${current.id} THEN ${directThreads.accountBId} ELSE ${directThreads.accountAId} END`,
      otherName: sql<string>`CASE WHEN a.id = ${current.id} THEN b.name ELSE a.name END`,
      otherEmail: sql<string>`CASE WHEN a.id = ${current.id} THEN b.email ELSE a.email END`,
      otherPicture: sql<string | null>`CASE WHEN a.id = ${current.id} THEN b.picture ELSE a.picture END`,
      lastBody: directMessages.body,
      lastSenderId: directMessages.senderId,
      lastCreatedAt: directMessages.createdAt,
      unreadCount: sql<number>`COUNT(CASE WHEN ${directMessages.senderId} <> ${current.id} AND ${directMessages.readAt} IS NULL THEN 1 END)`,
    })
      .from(directThreads)
      .innerJoin(accounts.as("a"), eq(sql`${directThreads.accountAId}`, sql`a.id`))
      .innerJoin(accounts.as("b"), eq(sql`${directThreads.accountBId}`, sql`b.id`))
      .innerJoin(
        directMessages,
        eq(directMessages.threadId, directThreads.id)
      )
      .where(or(eq(directThreads.accountAId, current.id), eq(directThreads.accountBId, current.id)))
      .groupBy(
        directThreads.id,
        directThreads.accountAId,
        directThreads.accountBId,
        sql`a.id`,
        sql`b.id`,
        sql`b.name`,
        sql`a.name`,
        sql`b.email`,
        sql`a.email`,
        sql`b.picture`,
        sql`a.picture`,
        directMessages.id,
        directMessages.body,
        directMessages.senderId,
        directMessages.createdAt
      )
      .orderBy(desc(directMessages.createdAt), desc(directMessages.id));

    // Keep only the newest message per thread.
    const seen = new Set<number>();
    const threads = [];
    for (const row of rows) {
      if (seen.has(row.threadId)) continue;
      seen.add(row.threadId);
      threads.push({
        threadId: row.threadId,
        other: { id: row.otherId, name: row.otherName, email: row.otherEmail, picture: row.otherPicture },
        lastBody: row.lastBody,
        lastSenderId: row.lastSenderId,
        lastCreatedAt: row.lastCreatedAt.toISOString(),
        unreadCount: Number(row.unreadCount),
      });
    }

    return json(threads.slice(0, 50));
  } catch (error) {
    return apiError(error);
  }
}
