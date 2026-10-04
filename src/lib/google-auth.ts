import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

export function googleConfigured() {
  return Boolean(clientId && clientSecret);
}

export function googleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || "http://localhost:3000"}/api/auth/google/callback`;
}

export function googleClient() {
  if (!googleConfigured()) throw new Error("Google OAuth chưa được cấu hình.");
  return new OAuth2Client({ clientId, clientSecret, redirectUri: googleRedirectUri() });
}

export function googleClientId() {
  return clientId;
}

export function googleAuthUrl(state: string, nonce: string) {
  const client = googleClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    response_type: "code",
    state,
    nonce,
    prompt: "select_account",
    include_granted_scopes: true,
  });
}

export async function verifyGoogleCode(code: string, nonce: string) {
  const client = googleClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) throw new Error("Google không trả về danh tính người dùng.");
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: googleClientId() });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) throw new Error("Không xác minh được tài khoản Google.");
  if (payload.nonce !== nonce) throw new Error("Phiên Google không hợp lệ.");
  return {
    subject: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture || null,
  };
}


export async function verifyGoogleCredential(credential: string) {
  if (!credential) throw new Error("Google không trả về credential.");
  const client = googleClient();
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: googleClientId(),
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new Error("Không xác minh được tài khoản Google.");
  }
  return {
    subject: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture || null,
  };
}
