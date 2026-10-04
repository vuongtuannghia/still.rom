import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accountSessions, accountSnapshots, accounts } from "@/db/schema";
import { accountSummary } from "@/lib/account-sessions";
import { ACCOUNT_COOKIE } from "@/lib/server-api";
import { googleConfigured, googleClientId } from "@/lib/google-auth";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (!token) return Response.json({ account: null, google: { configured: googleConfigured(), clientId: googleConfigured() ? googleClientId() : null, reason: googleConfigured() ? null : "Thiếu GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET." }, hasSnapshot: false }, { headers: { "Cache-Control": "no-store" } });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db.select({ session: accountSessions, account: accounts })
    .from(accountSessions).innerJoin(accounts, eq(accounts.id, accountSessions.accountId))
    .where(eq(accountSessions.tokenHash, tokenHash)).limit(1);
  if (!row || row.session.revokedAt || row.session.expiresAt.getTime() <= Date.now()) {
    return Response.json({ account: null, google: { configured: googleConfigured(), clientId: googleConfigured() ? googleClientId() : null, reason: null }, hasSnapshot: false }, { headers: { "Cache-Control": "no-store" } });
  }
  const [snapshot] = await db.select({ id: accountSnapshots.id, createdAt: accountSnapshots.createdAt })
    .from(accountSnapshots).where(eq(accountSnapshots.accountId, row.account.id)).orderBy(desc(accountSnapshots.createdAt)).limit(1);
  return Response.json({
    account: accountSummary(row.account),
    google: { configured: googleConfigured(), clientId: googleConfigured() ? googleClientId() : null, reason: null },
    hasSnapshot: Boolean(snapshot),
    snapshotCreatedAt: snapshot?.createdAt.toISOString() ?? null,
  }, { headers: { "Cache-Control": "no-store" } });
}
