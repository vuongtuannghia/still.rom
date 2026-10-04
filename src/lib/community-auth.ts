import { accountForWorkspace } from "./account-sessions";
import { ApiError, getWorkspace } from "./server-api";

export async function requireAccount(request: Request) {
  const workspace = await getWorkspace(request);
  const account = await accountForWorkspace(workspace.id);
  if (!account) throw new ApiError(401, "Đăng nhập Google để sử dụng tính năng này.");
  return account;
}
