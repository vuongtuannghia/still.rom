import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, apiError, getWorkspace, json, readBody, titleValue } from "@/lib/server-api";
import { isRecord, normalizePreferences } from "@/lib/focus-domain";

export const dynamic = "force-dynamic";
export async function PATCH(request: Request) {
  try {
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    const bounds: Record<string, [number, number]> = {
      focusMinutes: [1, 90], shortBreakMinutes: [1, 30], longBreakMinutes: [5, 60],
      longBreakEvery: [2, 8], dailyGoalMinutes: [15, 600],
    };
    for (const [key, [min, max]] of Object.entries(bounds)) {
      const value = body[key];
      if (value !== undefined && (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)) throw new ApiError(400, `${key}: giá trị phải từ ${min} đến ${max}.`);
    }
    for (const key of ["autoStartBreak", "autoStartFocus", "completionSound"]) {
      if (body[key] !== undefined && typeof body[key] !== "boolean") throw new ApiError(400, "Cài đặt không hợp lệ.");
    }
    if (body.name !== undefined) body.name = titleValue(body.name, 40);
    if (body.theme !== undefined && !["paper", "graphite"].includes(String(body.theme))) throw new ApiError(400, "Giao diện không hợp lệ.");
    if (body.wallpaper !== undefined && !["grid", "calm", "grain"].includes(String(body.wallpaper))) throw new ApiError(400, "Phông nền không hợp lệ.");
    if (body.widgets !== undefined && (!isRecord(body.widgets) || Object.values(body.widgets).some((v) => typeof v !== "boolean"))) throw new ApiError(400, "Widget không hợp lệ.");
    const previous = normalizePreferences(workspace.preferences);
    const preferences = normalizePreferences({ ...previous, ...body, widgets: { ...previous.widgets, ...(isRecord(body.widgets) ? body.widgets : {}) } });
    await db.update(workspaces).set({ preferences }).where(eq(workspaces.id, workspace.id));
    return json({ preferences });
  } catch (error) { return apiError(error); }
}
