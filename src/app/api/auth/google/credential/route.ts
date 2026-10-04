import { randomBytes, createHash } from "node:crypto";
import { db } from "@/db";
import { accounts, accountSessions, accountSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyGoogleCredential, googleConfigured } from "@/lib/google-auth";
import { accountSummary } from "@/lib/account-sessions";
import { getWorkspace, ACCOUNT_COOKIE, ApiError, apiError, json, readBody } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!googleConfigured()) throw new ApiError(503, "Google OAuth chưa được cấu hình.");
    const body = await readBody(request);
    if (!body || typeof body.credential !== "string" || !body.credential) {
      throw new ApiError(400, "Google credential không hợp lệ.");
    }

    const identity = await verifyGoogleCredential(body.credential);
    const guestWorkspace = await getWorkspace(request, true);

    const [existing] = await db.select().from(accounts)
      .where(eq(accounts.googleSubject, identity.subject))
      .limit(1);

    let account = existing;
    let hasSnapshot = false;

    if (!account) {
      [account] = await db.insert(accounts).values({
        googleSubject: identity.subject,
        email: identity.email,
        name: identity.name,
        picture: identity.picture,
        workspaceId: guestWorkspace.id,
      }).returning();
    } else {
      await db.update(accounts).set({
        email: identity.email,
        name: identity.name,
        picture: identity.picture,
        lastSignInAt: new Date(),
      }).where(eq(accounts.id, account.id));

      const [snapshot] = await db.select({ id: accountSnapshots.id })
        .from(accountSnapshots)
        .where(eq(accountSnapshots.accountId, account.id))
        .limit(1);
      hasSnapshot = Boolean(snapshot);
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db.insert(accountSessions).values({
      accountId: account.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt,
    });

    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    headers.append(
      "Set-Cookie",
      `${ACCOUNT_COOKIE}=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; ${new URL(request.url).protocol === "https:" ? "Secure; " : ""}`,
    );
    return new Response(JSON.stringify({
      account: accountSummary(account),
      hasSnapshot,
    }), { status: 200, headers });
  } catch (error) {
    return apiError(error);
  }
}
