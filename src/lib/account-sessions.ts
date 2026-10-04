import { createHash } from "node:crypto";
import { db } from "@/db";
import { accounts, accountSessions, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AccountSummary } from "./account-domain";

export const hashAccessToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function accountSummary(row: typeof accounts.$inferSelect): AccountSummary {
  return { id: row.id, name: row.name, email: row.email, picture: row.customPicture || row.picture, role: row.role === "admin" ? "admin" : "user", lockedUntil: row.lockedUntil?.toISOString() ?? null, createdAt: row.createdAt.toISOString() };
}
export async function accountForWorkspace(workspaceId: string) {
  return (await db.select().from(accounts).where(eq(accounts.workspaceId, workspaceId)).limit(1))[0] ?? null;
}
export async function findAccountSession(token: string) {
  const [row] = await db.select({ session: accountSessions, account: accounts, workspace: workspaces })
    .from(accountSessions).innerJoin(accounts, eq(accounts.id, accountSessions.accountId))
    .innerJoin(workspaces, eq(workspaces.id, accounts.workspaceId))
    .where(eq(accountSessions.tokenHash, hashAccessToken(token))).limit(1);
  if (!row) return null;
  return { ...row, active: row.session.revokedAt === null && row.session.expiresAt.getTime() > Date.now() };
}


export async function accountFromSessionToken(token: string) {
  const row = await findAccountSession(token);
  return row?.active ? row : null;
}
