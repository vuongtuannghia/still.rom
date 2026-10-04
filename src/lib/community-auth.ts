import { accountForWorkspace } from "./account-sessions";
import { ApiError, getWorkspace } from "./server-api";

export async function requireAccount(request: Request) {
  const workspace = await getWorkspace(request);
  const account = await accountForWorkspace(workspace.id);
  if (!account) throw new ApiError(401, "Đăng nhập Google để sử dụng tính năng này.");
  if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
    throw new ApiError(403, "Tài khoản đang bị khóa cho đến " + account.lockedUntil.toLocaleString("vi-VN") + ".");
  }
  return account;
}
