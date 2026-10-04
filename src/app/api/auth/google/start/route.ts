import { randomBytes } from "node:crypto";
import { googleAuthUrl, googleConfigured } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "stillroom.google.state";

export async function GET(request: Request) {
  const target = new URL("/", request.url);
  const secure = new URL(request.url).protocol === "https:";

  if (!googleConfigured()) {
    target.searchParams.set("google", "not-configured");
    return new Response(null, {
      status: 302,
      headers: { Location: target.toString() },
    });
  }

  try {
    const state = randomBytes(24).toString("hex");
    const nonce = randomBytes(24).toString("hex");
    const location = googleAuthUrl(state, nonce);
    const headers = new Headers({ Location: location });
    headers.append(
      "Set-Cookie",
      `${STATE_COOKIE}=${state}.${nonce}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax; ${secure ? "Secure; " : ""}`,
    );
    return new Response(null, { status: 302, headers });
  } catch {
    target.searchParams.set("google", "error");
    target.searchParams.set("message", "Không thể khởi tạo đăng nhập Google.");
    return new Response(null, {
      status: 302,
      headers: { Location: target.toString() },
    });
  }
}
