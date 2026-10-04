import { cookies } from "next/headers";
import { db } from "@/db";
import { accountSessions } from "@/db/schema";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { ACCOUNT_COOKIE } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(ACCOUNT_COOKIE)?.value;
  if (token) {
    await db.update(accountSessions)
      .set({ revokedAt: new Date() })
      .where(eq(accountSessions.tokenHash, createHash("sha256").update(token).digest("hex")));
  }
  const response = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  response.headers.append("Set-Cookie", `${ACCOUNT_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  response.headers.append("Set-Cookie", "stillroom.workspace.v2=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  return response;
}
