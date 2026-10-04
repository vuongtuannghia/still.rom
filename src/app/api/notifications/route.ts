import { db } from "@/db";
import { accounts, notifications } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { apiError, json } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    const unreadOnly = new URL(request.url).searchParams.get("unread") === "1";
    const rows = await db.select({
      id: notifications.id, type: notifications.type, title: notifications.title, body: notifications.body,
      requestId: notifications.requestId, threadId: notifications.threadId, readAt: notifications.readAt,
      createdAt: notifications.createdAt, actorId: accounts.id, actorName: accounts.name, actorPicture: accounts.picture,
    }).from(notifications)
      .leftJoin(accounts, eq(accounts.id, notifications.actorId))
      .where(unreadOnly ? and(eq(notifications.accountId, current.id), isNull(notifications.readAt)) : eq(notifications.accountId, current.id))
      .orderBy(desc(notifications.createdAt)).limit(40);

    const unreadCount = rows.filter(row => row.readAt === null).length;
    return json({
      unreadCount,
      notifications: rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), readAt: row.readAt?.toISOString() ?? null })),
    });
  } catch (error) { return apiError(error); }
}
