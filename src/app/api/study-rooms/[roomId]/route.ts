import { db } from "@/db";
import { accounts, sharedStudyRooms } from "@/db/schema";
import { accountForWorkspace } from "@/lib/account-sessions";
import { apiError, ApiError, getWorkspace, json, readBody, positiveId } from "@/lib/server-api";
import { isAdminAccount } from "@/lib/admin";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function currentAccount(request: Request) {
  const workspace = await getWorkspace(request);
  const account = await accountForWorkspace(workspace.id);
  if (!account) throw new ApiError(401, "Đăng nhập Google để quản lý phòng học.");
  return account;
}

export async function PATCH(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const account = await currentAccount(request);
    if (!isAdminAccount(account)) throw new ApiError(403, "Chỉ quản trị viên mới được ghim phòng học.");
    const roomId = positiveId((await context.params).roomId);
    const body = await readBody(request);
    if (typeof body.pinned !== "boolean") throw new ApiError(400, "Trạng thái ghim không hợp lệ.");
    const pinned = body.pinned;

    const room = await db.transaction(async (tx) => {
      if (pinned) await tx.update(sharedStudyRooms).set({ pinned: false });
      const [updated] = await tx.update(sharedStudyRooms)
        .set({ pinned })
        .where(eq(sharedStudyRooms.id, roomId))
        .returning();
      if (!updated) throw new ApiError(404, "Không tìm thấy phòng học.");
      return updated;
    });
    return json({ room: { ...room, createdAt: room.createdAt.toISOString() } });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const account = await currentAccount(request);
    if (!isAdminAccount(account)) throw new ApiError(403, "Chỉ quản trị viên mới được xóa phòng học.");
    const roomId = positiveId((await context.params).roomId);
    const [deleted] = await db.delete(sharedStudyRooms).where(eq(sharedStudyRooms.id, roomId)).returning({ id: sharedStudyRooms.id });
    if (!deleted) throw new ApiError(404, "Không tìm thấy phòng học.");
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
