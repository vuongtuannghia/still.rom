import { and, asc, eq, ilike, or, ne } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { apiError, json } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    const rows = await db.select({
      id: accounts.id,
      name: accounts.name,
      picture: accounts.customPicture,
      googlePicture: accounts.picture,
      bio: accounts.bio,
      createdAt: accounts.createdAt,
    }).from(accounts)
      .where(q
        ? and(or(ilike(accounts.name, "%" + q + "%"), eq(accounts.email, q)), ne(accounts.id, current.id))
        : ne(accounts.id, current.id))
      .orderBy(asc(accounts.name))
      .limit(40);

    return json(rows.map(row => ({
      id: row.id,
      name: row.name,
      picture: row.picture || row.googlePicture || null,
      bio: row.bio,
      createdAt: row.createdAt.toISOString(),
    })));
  } catch (error) {
    return apiError(error);
  }
}
