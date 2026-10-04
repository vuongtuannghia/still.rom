import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { accounts, accountSessions, workspaces } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { googleClient, googleConfigured, verifyGoogleCode } from "@/lib/google-auth";
import { ApiError, getWorkspace, setAccessCookie } from "@/lib/server-api";
import { accountSummary } from "@/lib/account-sessions";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "stillroom.google.state";
const ACCOUNT_COOKIE = "stillroom.account.v1";

function clearStateCookie(headers: Headers, secure: boolean) {
  headers.append("Set-Cookie", `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; ${secure ? "Secure; " : ""}`);
}

export async function GET(request: Request) {
  const target = new URL("/", request.url);
  const secure = target.protocol === "https:";
  const headers = new Headers();
  clearStateCookie(headers, secure);
  if (!googleConfigured()) {
    target.searchParams.set("google", "not-configured");
    return new Response(null, { status: 302, headers: { ...Object.fromEntries(headers), Location: target.toString() } });
  }

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) throw new ApiError(400, "Google chưa trả về mã đăng nhập.");

    const stored = (await cookies()).get(STATE_COOKIE)?.value ?? "";
    const [savedState, nonce] = stored.split(".");
    if (!savedState || !nonce || savedState !== state) throw new ApiError(403, "Phiên đăng nhập Google không hợp lệ. Hãy thử lại.");

    const identity = await verifyGoogleCode(code, nonce);

    const [existing] = await db.select().from(accounts).where(eq(accounts.googleSubject, identity.subject)).limit(1);
    let account = existing;

    if (!account) {
      const guestWorkspace = await getWorkspace(request, true);
      [account] = await db.insert(accounts).values({
        googleSubject: identity.subject,
        email: identity.email,
        name: identity.name,
        picture: identity.picture,
        workspaceId: guestWorkspace.id,
      }).returning();
    } else {
      if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
        const totalMinutes = Math.max(1, Math.ceil((account.lockedUntil.getTime() - Date.now()) / 60000));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const remaining = days > 0 ? (hours > 0 ? days + " ngày " + hours + " giờ" : days + " ngày") : (hours > 0 ? hours + " giờ" : totalMinutes + " phút");
        throw new ApiError(403, "Tài khoản đang bị khóa. Còn " + remaining + ".");
      }
      await db.update(accounts).set({
        email: identity.email,
        name: identity.name,
        picture: identity.picture,
        lastSignInAt: new Date(),
      }).where(eq(accounts.id, account.id));
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db.insert(accountSessions).values({
      accountId: account.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt,
    });

    headers.append("Set-Cookie", `${ACCOUNT_COOKIE}=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; ${secure ? "Secure; " : ""}`);
    await setAccessCookie(request, token);
    target.searchParams.set("google", "success");
    return new Response(null, { status: 302, headers: { ...Object.fromEntries(headers), Location: target.toString() } });
  } catch (error) {
    target.searchParams.set("google", "error");
    target.searchParams.set("message", error instanceof Error ? error.message : "Đăng nhập Google thất bại.");
    return new Response(null, { status: 302, headers: { ...Object.fromEntries(headers), Location: target.toString() } });
  }
}
