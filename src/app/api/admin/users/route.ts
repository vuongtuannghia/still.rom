import { desc } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { assertAdmin } from "@/lib/admin";
import { apiError, json } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    assertAdmin(current);
    const rows = await db.select({
      id: accounts.id,
      name: accounts.name,
      email: accounts.email,
      picture: accounts.customPicture,
      googlePicture: accounts.picture,
      role: accounts.role,
      lockedUntil: accounts.lockedUntil,
      lockReason: accounts.lockReason,
      createdAt: accounts.createdAt,
      lastSignInAt: accounts.lastSignInAt,
    }).from(accounts).orderBy(desc(accounts.createdAt)).limit(500);
    return json(rows.map(row => ({
      ...row,
      picture: row.picture || row.googlePicture || null,
      lockedUntil: row.lockedUntil?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      lastSignInAt: row.lastSignInAt.toISOString(),
    })));
  } catch (error) {
    return apiError(error);
  }
}
