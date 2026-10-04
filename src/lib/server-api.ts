import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { workspaceAccessKeys, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isRecord } from "./focus-domain";
import { accountForWorkspace, findAccountSession } from "./account-sessions";
import { ACCESS_FIELD, validAccessToken, validWorkspaceProof, type WorkspaceProof } from "./access-protocol";

const COOKIE = "stillroom.workspace.v2";
export const ACCOUNT_COOKIE = "stillroom.account.v1";
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
const requestBodies = new WeakMap<Request, Promise<Record<string, unknown>>>();
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return json({ error: error.message }, error.status);
  // Do not log bodies, bearer credentials, cookie values, or request URLs containing secrets.
  console.error("Workspace request failed", error instanceof Error ? error.name : "UnknownError");
  return json({ error: "Máy chủ chưa sẵn sàng lưu dữ liệu. Vui lòng thử lại." }, 500);
}
export function assertSameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "Yêu cầu không hợp lệ.");
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host).split(",")[0].trim();
  let originHost: string;
  try { originHost = new URL(origin).host; } catch { throw new ApiError(403, "Yêu cầu không hợp lệ."); }
  if (originHost !== requestHost) throw new ApiError(403, "Yêu cầu không hợp lệ.");
}
function rawRequestBody(request: Request): Promise<Record<string, unknown>> {
  const known = requestBodies.get(request);
  if (known) return known;
  const value = (async () => {
    if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiError(415, "Dữ liệu phải ở định dạng JSON.");
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > 262144) throw new ApiError(413, "Dữ liệu quá lớn.");
    // Read one bounded clone, and share the result between validation and authorization.
    const reader = request.clone().body?.getReader();
    if (!reader) throw new ApiError(400, "Dữ liệu JSON chưa có nội dung.");
    const decoder = new TextDecoder(); let text = ""; let bytes = 0;
    try {
      while (true) {
        const next = await reader.read(); if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 262144) { void reader.cancel(); throw new ApiError(413, "Dữ liệu quá lớn."); }
        text += decoder.decode(next.value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    let decoded: unknown;
    try { decoded = JSON.parse(text); } catch { throw new ApiError(400, "JSON không hợp lệ."); }
    if (!isRecord(decoded)) throw new ApiError(400, "Dữ liệu không hợp lệ.");
    return decoded;
  })();
  requestBodies.set(request, value);
  return value;
}
function bodyProof(value: Record<string, unknown>): WorkspaceProof | null {
  if (!Object.hasOwn(value, ACCESS_FIELD)) return null;
  const proof = value[ACCESS_FIELD];
  if (!validWorkspaceProof(proof)) throw new ApiError(401, "Bằng chứng truy cập chưa hợp lệ. Hãy kết nối lại quyền của không gian này.");
  if (!isRecord(value.payload)) throw new ApiError(400, "Nội dung yêu cầu không hợp lệ.");
  return proof;
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  assertSameOrigin(request);
  const value = await rawRequestBody(request);
  return bodyProof(value) ? value.payload as Record<string, unknown> : value;
}
export function positiveId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) throw new ApiError(400, "Mã mục không hợp lệ.");
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new ApiError(400, "Mã mục không hợp lệ.");
  return id;
}
export function titleValue(value: unknown, maximum: number) {
  if (typeof value !== "string" || !value.trim()) throw new ApiError(400, "Hãy nhập tên trước khi lưu.");
  const result = value.trim();
  if (result.length > maximum) throw new ApiError(400, `Tên không được dài hơn ${maximum} ký tự.`);
  return result;
}
async function findWorkspace(token: string) {
  const accountSession = await findAccountSession(token);
  if (accountSession) {
    if (!accountSession.active) throw new ApiError(401, "Phiên tài khoản đã hết hạn hoặc đã đăng xuất. Đăng nhập lại hoặc tiếp tục ở chế độ khách.");
    return accountSession.workspace;
  }
  const hash = hashToken(token);
  const [direct] = await db.select().from(workspaces).where(eq(workspaces.tokenHash, hash)).limit(1);
  if (direct) return await accountForWorkspace(direct.id) ? null : direct;
  const [key] = await db.select({ workspaceId: workspaceAccessKeys.workspaceId }).from(workspaceAccessKeys).where(eq(workspaceAccessKeys.tokenHash, hash)).limit(1);
  if (!key || await accountForWorkspace(key.workspaceId)) return null;
  return (await db.select().from(workspaces).where(eq(workspaces.id, key.workspaceId)).limit(1))[0] ?? null;
}
export async function setAccessCookie(request: Request, token: string, maxAge = 60 * 60 * 24 * 365) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host).split(",")[0].trim();
  const localHost = /^(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\])(?::\d+)?$/i.test(host);
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https" || (process.env.NODE_ENV === "production" && !localHost);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: secure ? "none" : "lax", path: "/", maxAge, secure, partitioned: secure });
}
export async function bootstrapWorkspace(request: Request, browserToken: unknown) {
  if (!validAccessToken(browserToken)) throw new ApiError(400, "Mã truy cập trình duyệt không hợp lệ.");
  const known = await findWorkspace(browserToken);
  if (known) { await setAccessCookie(request, browserToken); return known; }
  const cookieToken = (await cookies()).get(COOKIE)?.value;
  let existing: typeof workspaces.$inferSelect | null = null;
  if (validAccessToken(cookieToken)) {
    try { existing = await findWorkspace(cookieToken); } catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
  }
  // Never turn a temporary account cookie into an everlasting guest access key.
  if (existing && !(await accountForWorkspace(existing.id))) {
    await db.insert(workspaceAccessKeys).values({ tokenHash: hashToken(browserToken), workspaceId: existing.id }).onConflictDoNothing();
    const bound = await findWorkspace(browserToken);
    if (!bound) throw new ApiError(503, "Chưa thể kết nối lại không gian.");
    await setAccessCookie(request, browserToken);
    return bound;
  }
  const tokenHash = hashToken(browserToken);
  const [created] = await db.insert(workspaces).values({ tokenHash }).onConflictDoNothing({ target: workspaces.tokenHash }).returning();
  const workspace = created ?? (await db.select().from(workspaces).where(eq(workspaces.tokenHash, tokenHash)).limit(1))[0];
  await setAccessCookie(request, browserToken);
  return workspace;
}
export async function getWorkspace(request: Request, create = false) {
  // An authenticated account always wins over the browser guest proof.
  // The account cookie is HttpOnly, so a stale guest token in the request body cannot
  // accidentally downgrade an authenticated user to a different workspace.
  const accountToken = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (validAccessToken(accountToken)) {
    const accountSession = await findAccountSession(accountToken);
    if (accountSession?.active) return accountSession.workspace;
    if (accountSession && !accountSession.active) throw new ApiError(401, "Phiên tài khoản đã hết hạn. Vui lòng đăng nhập lại.");
  }

  // Explicit JSON proof is authoritative for guest sessions.
  if (request.method !== "GET" && request.method !== "HEAD" && request.headers.get("content-type")?.includes("application/json")) {
    assertSameOrigin(request);
    const proof = bodyProof(await rawRequestBody(request));
    if (proof) {
      const workspace = await findWorkspace(proof.token);
      if (!workspace) throw new ApiError(401, "Kết nối không gian cần xác nhận lại. Vui lòng dùng nút Kết nối lại quyền.");
      if (workspace.id !== proof.workspaceId) throw new ApiError(403, "Mã truy cập không thuộc không gian được yêu cầu.");
      return workspace;
    }
  }
  // Retain legacy cookie/header access for migration and direct API callers.
  const headerToken = request.headers.get("x-stillroom-token");
  if (headerToken !== null) {
    const workspace = validAccessToken(headerToken) ? await findWorkspace(headerToken) : null;
    if (workspace) return workspace;
    throw new ApiError(401, "Kết nối không gian cần xác nhận lại.");
  }
  const cookieToken = (await cookies()).get(COOKIE)?.value;
  if (validAccessToken(cookieToken)) { const row = await findWorkspace(cookieToken); if (row) return row; }
  if (!create) throw new ApiError(401, "Quyền truy cập chưa được xác nhận. Bấm Kết nối lại quyền, không cần xóa dữ liệu.");
  return bootstrapWorkspace(request, randomBytes(32).toString("hex"));
}

export async function requestAccessToken(request: Request): Promise<string | null> {
  if (request.method !== "GET" && request.method !== "HEAD" && request.headers.get("content-type")?.includes("application/json")) {
    const proof = bodyProof(await rawRequestBody(request)); if (proof) return proof.token;
  }
  const header = request.headers.get("x-stillroom-token");
  if (header !== null) return validAccessToken(header) ? header : null;
  const token = (await cookies()).get(COOKIE)?.value;
  return validAccessToken(token) ? token : null;
}
