import { db } from "@/db";
import { accountSnapshots, accounts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiError, getWorkspace, json, readBody, ApiError } from "@/lib/server-api";
import { accountForWorkspace } from "@/lib/account-sessions";
import type { WorkspaceBackup } from "@/lib/account-domain";

export const dynamic = "force-dynamic";

function validBackup(value: unknown): value is WorkspaceBackup {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<WorkspaceBackup>;
  return backup.format === "stillroom-backup" &&
    backup.version === 1 &&
    typeof backup.exportedAt === "string" &&
    !!backup.preferences && !!backup.room &&
    Array.isArray(backup.tasks) && Array.isArray(backup.subtasks) &&
    Array.isArray(backup.habits) && Array.isArray(backup.checkIns) &&
    Array.isArray(backup.sessions);
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    if (!validBackup(body.backup)) throw new ApiError(400, "Bản sao tiến độ không hợp lệ.");
    const workspace = await getWorkspace(request);
    const account = await accountForWorkspace(workspace.id);
    if (!account) throw new ApiError(401, "Cần đăng nhập Google để sao lưu tiến độ.");
    const data = body.backup;
    const [existing] = await db.select({ id: accountSnapshots.id }).from(accountSnapshots)
      .where(eq(accountSnapshots.accountId, account.id)).orderBy(desc(accountSnapshots.createdAt)).limit(1);
    if (existing) {
      await db.update(accountSnapshots).set({ data, sourceWorkspaceId: workspace.id, createdAt: new Date() }).where(eq(accountSnapshots.id, existing.id));
    } else {
      await db.insert(accountSnapshots).values({ accountId: account.id, sourceWorkspaceId: workspace.id, data });
    }
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
