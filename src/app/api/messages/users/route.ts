import { db } from "@/db";
import { accounts } from "@/db/schema";
import { and, asc, ilike, ne } from "drizzle-orm";
import { apiError, json } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const where = q ? and(ne(accounts.id, current.id), ilike(accounts.name, `%${q}%`)) : ne(accounts.id, current.id);
    const rows = await db.select({ id: accounts.id, name: accounts.name, picture: accounts.picture }).from(accounts).where(where).orderBy(asc(accounts.name)).limit(40);
    return json(rows);
  } catch (error) { return apiError(error); }
}