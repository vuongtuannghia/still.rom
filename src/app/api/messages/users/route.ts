import { db } from "@/db";
import { accounts, friendRequests, friendships } from "@/db/schema";
import { and, asc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { apiError, json } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";

    const friendshipRows = await db.select({
      a: friendships.accountAId,
      b: friendships.accountBId,
    }).from(friendships).where(or(eq(friendships.accountAId, current.id), eq(friendships.accountBId, current.id)));

    const friendIds = friendshipRows.flatMap(row => [row.a, row.b]).filter(id => id !== current.id);

    let rows;
    if (!q) {
      rows = friendIds.length
        ? await db.select({ id: accounts.id, name: accounts.name, email: accounts.email, picture: accounts.customPicture, googlePicture: accounts.picture })
            .from(accounts).where(inArray(accounts.id, friendIds)).orderBy(asc(accounts.name))
        : [];
    } else {
      const pattern = "%" + q.replace(/[%_\\]/g, "\\      rows = await db.select({ id: accounts.id, name: accounts.name, email: accounts.email, picture: accounts.picture })
        .from(accounts).where(and(eq(accounts.email, q), ne(accounts.id, current.id))).limit(1);") + "%";
      rows = await db.select({ id: accounts.id, name: accounts.name, email: accounts.email, picture: accounts.picture })
        .from(accounts)
        .where(and(or(eq(accounts.email, q), ilike(accounts.name, pattern, "\\") ), ne(accounts.id, current.id)))
        .orderBy(asc(accounts.name)).limit(20);
    }

    const result = await Promise.all(rows.map(async person => {
      if (friendIds.includes(person.id)) return { ...person, picture: person.picture || person.googlePicture || null, relationship: "friend" as const };

      const [incoming] = await db.select({ id: friendRequests.id }).from(friendRequests)
        .where(and(eq(friendRequests.senderId, person.id), eq(friendRequests.recipientId, current.id), eq(friendRequests.status, "pending"))).limit(1);
      if (incoming) return { ...person, picture: person.picture || person.googlePicture || null, relationship: "incoming" as const, requestId: incoming.id };

      const [outgoing] = await db.select({ id: friendRequests.id }).from(friendRequests)
        .where(and(eq(friendRequests.senderId, current.id), eq(friendRequests.recipientId, person.id), eq(friendRequests.status, "pending"))).limit(1);
      if (outgoing) return { ...person, picture: person.picture || person.googlePicture || null, relationship: "outgoing" as const, requestId: outgoing.id };

      return { ...person, picture: person.picture || person.googlePicture || null, relationship: "lookup" as const };
    }));

    return json(result);
  } catch (error) { return apiError(error); }
}
