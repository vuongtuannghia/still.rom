import { db } from "@/db";
import { accounts, sharedStudyRooms } from "@/db/schema";
import { accountForWorkspace } from "@/lib/account-sessions";
import { apiError, ApiError, getWorkspace, json, readBody, titleValue } from "@/lib/server-api";
import { isWebAdmin, normalizeMeetUrl } from "@/lib/study-room";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select({
      id: sharedStudyRooms.id,
      title: sharedStudyRooms.title,
      meetUrl: sharedStudyRooms.meetUrl,
      pinned: sharedStudyRooms.pinned,
      createdAt: sharedStudyRooms.createdAt,
      creatorId: accounts.id,
      creatorName: accounts.name,
      creatorEmail: accounts.email,
      creatorPicture: accounts.customPicture,
      creatorPicture: accounts.customPicture,
    }).from(sharedStudyRooms)
      .innerJoin(accounts, eq(accounts.id, sharedStudyRooms.accountId))
      .orderBy(desc(sharedStudyRooms.pinned), desc(sharedStudyRooms.createdAt))
      .limit(50);
    return json(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), admin: isWebAdmin(row.creatorEmail) })));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    const account = await accountForWorkspace(workspace.id);
    if (!account) throw new ApiError(401, "Đăng nhập Google để gửi phòng học.");
    const title = titleValue(body.title || "Phòng học chung", 120);
    let meetUrl = "";
    try { meetUrl = normalizeMeetUrl(body.meetUrl); }
    catch (error) { throw new ApiError(400, error instanceof Error ? error.message : "Link Google Meet không hợp lệ."); }

    const [room] = await db.insert(sharedStudyRooms).values({
      accountId: account.id,
      title,
      meetUrl,
      pinned: false,
    }).returning();

    return json({
      room: { ...room, createdAt: room.createdAt.toISOString(), creatorId: account.id, creatorName: account.name, creatorEmail: account.email, creatorPicture: account.customPicture || account.picture, admin: isWebAdmin(account.email) },
    }, 201);
  } catch (error) {
    return apiError(error);
  }
}
