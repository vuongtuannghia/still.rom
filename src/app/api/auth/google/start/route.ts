import { randomBytes } from "node:crypto";
import { googleAuthUrl, googleConfigured } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "stillroom.google.state";

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return Response.redirect(new URL("/?google=not-configured", request.url));
  }
  const state = randomBytes(24).toString("hex");
  const nonce = randomBytes(24).toString("hex");
  const secure = new URL(request.url).protocol === "https:";
  const response = Response.redirect(googleAuthUrl(state, nonce));
  response.headers.append("Set-Cookie", `${STATE_COOKIE}=${state}.${nonce}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax; ${secure ? "Secure; " : ""}`);
  return response;
}
