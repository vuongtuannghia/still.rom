import { ApiError } from "./server-api";
import { isWebAdmin } from "./study-room";

export function isAdminAccount(account: { email: string; role?: string | null }) {
  return isWebAdmin(account.email) || account.role === "admin";
}

export function isRootAdmin(account: { email: string }) {
  return isWebAdmin(account.email);
}

export function assertAdmin(account: { email: string; role?: string | null }) {
  if (!isAdminAccount(account)) throw new ApiError(403, "Chỉ quản trị viên mới có quyền này.");
}

export function assertRootAdmin(account: { email: string }) {
  if (!isRootAdmin(account)) throw new ApiError(403, "Chỉ quản trị viên chính mới có quyền này.");
}
