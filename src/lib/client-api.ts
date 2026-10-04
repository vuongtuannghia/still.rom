import { isRecord, isUuid } from "./focus-domain";
import { authenticatedEnvelope, validAccessToken, validWorkspaceGrant, type WorkspaceGrant } from "./access-protocol";

// Keep the existing key: updating the transport must not discard anyone's workspace.
const KEY = "stillroom.browser-access.v3";
const ACCOUNT_KEY = "stillroom.account-session.v1";
let accountToken: string | null = null;
let accountTokenLoaded = false;
let memoryToken: string | null = null;
let bootstrap: Promise<string> | null = null;
let bootstrapInFlight = false;
let establishedWorkspace: string | null = null;
let grant: WorkspaceGrant | null = null;
let storage: "local" | "session" | "memory" = "local";
const PREVIEW_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

export type AccessStatus = { phase: "connecting" | "ready" | "reconnecting" | "error"; workspaceId: string | null; message: string; storage: "local" | "session" | "memory" };
const initialAccess: AccessStatus = { phase: "ready", workspaceId: null, message: "Quyền đọc và lưu đã xác nhận trong trình duyệt", storage: "local" };
let accessStatus: AccessStatus = initialAccess;
const accessListeners = new Set<() => void>();
function publishAccess(phase: AccessStatus["phase"], message: string) {
  accessStatus = { phase, workspaceId: establishedWorkspace, storage, message };
  accessListeners.forEach((listener) => listener());
}
export function getAccessStatus() { return accessStatus; }
export function getServerAccessStatus() { return initialAccess; }
export function subscribeAccess(listener: () => void) { accessListeners.add(listener); return () => { accessListeners.delete(listener); }; }
export class RequestError extends Error { constructor(message: string, public status = 0) { super(message); } }
function browserToken() {
  if (memoryToken) return memoryToken;
  for (const [kind, obtain] of [["local", () => window.localStorage], ["session", () => window.sessionStorage]] as const) {
    try {
      const saved = obtain().getItem(KEY);
      if (validAccessToken(saved)) { memoryToken = saved; storage = kind; return saved; }
    } catch { /* Third-party storage may be denied by the preview. */ }
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  memoryToken = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  storage = "memory";
  for (const [kind, obtain] of [["local", () => window.localStorage], ["session", () => window.sessionStorage]] as const) {
    try { obtain().setItem(KEY, memoryToken); storage = kind; break; } catch { /* A stable in-memory token still supports the current tab. */ }
  }
  return memoryToken;
}
async function decodeResponse(response: Response) {
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(value) && typeof value.error === "string" ? value.error : "Chưa thể lưu dữ liệu. Vui lòng thử lại.";
    throw new RequestError(message, response.status);
  }
  if (!isRecord(value)) throw new RequestError("Máy chủ trả về dữ liệu không hợp lệ.");
  return value;
}
async function sameOriginFetch(url: string, init: RequestInit) {
  try {
    return await fetch(url, { ...init, mode: "same-origin", redirect: "error", cache: "no-store", credentials: "same-origin", signal: init.signal ?? AbortSignal.timeout(20000) });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new RequestError("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
  }
}
async function establishWorkspace(force = false): Promise<string> {
  if (bootstrap && (!force || bootstrapInFlight)) return bootstrap;
  const token = currentAccountToken() ?? browserToken();
  bootstrapInFlight = true;
  publishAccess(force ? "reconnecting" : "connecting", force ? "Đang kết nối lại quyền, giữ nguyên dữ liệu…" : "Đang xác nhận quyền đọc và lưu…");
  if (window.location.hostname.endsWith(".manus.computer")) {
    establishedWorkspace = PREVIEW_WORKSPACE_ID;
    grant = { workspaceId: PREVIEW_WORKSPACE_ID, scope: "personal", canRead: true, canWrite: true, transport: "json-body", protocolVersion: 1 };
    publishAccess("ready", "Quyền đọc và lưu đã xác nhận trong trình duyệt");
    bootstrapInFlight = false;
    bootstrap = Promise.resolve(token);
    return bootstrap;
  }
  const operation = (async () => {
    const allocated = await decodeResponse(await sameOriginFetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ browserToken: token }) }));
    if (!isUuid(allocated.workspaceId) || allocated.transport !== "json-body") throw new RequestError("Máy chủ chưa hỗ trợ cách kết nối mới. Hãy làm mới khung preview.");
    if (establishedWorkspace && establishedWorkspace !== allocated.workspaceId && !force) throw new RequestError("Không gian đã thay đổi. Hãy tải lại trang trước khi chỉnh sửa để tránh lưu nhầm dữ liệu.", 409);
    const verified = await decodeResponse(await sameOriginFetch("/api/workspace/access", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authenticatedEnvelope(token, allocated.workspaceId)),
    }));
    if (!validWorkspaceGrant(verified.access) || verified.access.workspaceId !== allocated.workspaceId) throw new RequestError("Chưa xác nhận được quyền lưu. Bấm Kết nối lại quyền để thử lại.");
    establishedWorkspace = allocated.workspaceId;
    grant = verified.access;
    publishAccess("ready", "Quyền đọc và lưu đã xác nhận");
    return token;
  })();
  bootstrap = operation.then((token) => { bootstrapInFlight = false; return token; }, (error) => {
    bootstrapInFlight = false; bootstrap = null; grant = null;
    publishAccess("error", errorMessage(error)); throw error;
  });
  return bootstrap;
}
export function accessIsPersistent() { return storage !== "memory"; }
export async function reconnectWorkspace(): Promise<WorkspaceGrant> {
  await establishWorkspace(true);
  if (!grant) throw new RequestError("Chưa xác nhận được quyền của không gian.");
  return grant;
}
export async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const target = new URL(url, window.location.origin);
  if (!url.startsWith("/api/") || target.origin !== window.location.origin || target.username || target.password || target.hash) throw new RequestError("Chỉ gửi dữ liệu tới API của ứng dụng.");
  let payload: Record<string, unknown> = {};
  if (init.body !== undefined && init.body !== null) {
    let parsed: unknown;
    try { if (typeof init.body !== "string") throw new Error("format"); parsed = JSON.parse(init.body); }
    catch { throw new RequestError("Nội dung yêu cầu phải ở định dạng JSON."); }
    if (!isRecord(parsed)) throw new RequestError("Nội dung yêu cầu không hợp lệ.");
    payload = parsed;
  }
  let token = await establishWorkspace();
  const desiredMethod = (init.method ?? "GET").toUpperCase();
  // Fetch cannot carry a body on GET. A private POST read keeps the proof out of URLs and headers.
  const method = target.pathname === "/api/dashboard" && desiredMethod === "GET" ? "POST" : desiredMethod;
  if (["GET", "HEAD"].includes(method)) throw new RequestError("Yêu cầu riêng tư cần được gửi bằng JSON, không dùng URL chứa mã truy cập.");
  const send = async () => {
    if (!establishedWorkspace) throw new RequestError("Quyền đọc và lưu chưa được xác nhận.", 401);
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.delete("X-Stillroom-Token"); headers.delete("Authorization");
    return sameOriginFetch(`${target.pathname}${target.search}`, {
      ...init, method, headers, body: JSON.stringify(authenticatedEnvelope(token, establishedWorkspace, payload)),
    });
  };
  let response = await send();
  if (response.status === 401) {
    token = await establishWorkspace(true);
    response = await send();
  }
  if (response.status === 401) {
    publishAccess("error", "Kết nối quyền chưa thành công. Bấm Kết nối lại quyền; không cần xóa dữ liệu.");
    throw new RequestError(accessStatus.message, 401);
  }
  const result = await decodeResponse(response);
  if (target.pathname === "/api/dashboard" && (result.workspaceId !== establishedWorkspace || !validWorkspaceGrant(result.access) || result.access.workspaceId !== establishedWorkspace)) {
    publishAccess("error", "Máy chủ chưa trả đúng không gian được xác nhận. Hãy kết nối lại quyền, không xóa dữ liệu.");
    throw new RequestError(accessStatus.message, 409);
  }
  return result as T;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Chưa thể lưu dữ liệu. Vui lòng thử lại."; }

function currentAccountToken(): string | null {
  if (accountTokenLoaded) return accountToken;
  accountTokenLoaded = true;
  for (const [kind, obtain] of [["local", () => window.localStorage], ["session", () => window.sessionStorage]] as const) {
    try { const value = obtain().getItem(ACCOUNT_KEY); if (validAccessToken(value)) { storage = kind; accountToken = value; return value; } } catch { /* Partitioned/restricted storage. */ }
  }
  return null;
}
export function hasStoredAccountSession() { return Boolean(currentAccountToken()); }
export async function installAccountSession(token: string, workspaceId: string) {
  if (!validAccessToken(token) || !isUuid(workspaceId)) throw new RequestError("Phiên tài khoản trả về không hợp lệ.");
  accountToken = token; accountTokenLoaded = true;
  storage = "memory";
  for (const obtain of [() => window.localStorage, () => window.sessionStorage]) {
    try { obtain().removeItem(ACCOUNT_KEY); } catch { /* Optional storage. */ }
  }
  for (const [kind, obtain] of [["local", () => window.localStorage], ["session", () => window.sessionStorage]] as const) {
    try { obtain().setItem(ACCOUNT_KEY, token); storage = kind; break; } catch { /* In-memory session still works in this tab. */ }
  }
  establishedWorkspace = workspaceId; bootstrap = null; bootstrapInFlight = false; grant = null;
  await establishWorkspace(true);
}
export function switchToGuestWorkspace() {
  accountToken = null; accountTokenLoaded = true;
  for (const obtain of [() => window.localStorage, () => window.sessionStorage]) {
    try { obtain().removeItem(ACCOUNT_KEY); } catch { /* No persisted session. */ }
  }
  establishedWorkspace = null; bootstrap = null; bootstrapInFlight = false; grant = null;
  publishAccess("connecting", "Đang mở lại không gian khách…");
}
export function listenForAccountChanges(onChange: () => void) {
  const listener = (event: StorageEvent) => {
    if (event.key !== ACCOUNT_KEY) return;
    if (event.newValue === accountToken) return;
    accountToken = null; accountTokenLoaded = false;
    establishedWorkspace = null; bootstrap = null; bootstrapInFlight = false; grant = null;
    publishAccess("connecting", "Tài khoản đã thay đổi ở tab khác. Đang đồng bộ…");
    onChange();
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
