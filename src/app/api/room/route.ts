import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, apiError, getWorkspace, json, readBody } from "@/lib/server-api";
import { isRecord, isUuid } from "@/lib/focus-domain";
import { BUILTIN_SCENES, isYouTubeMedia, normalizeRoom } from "@/lib/scene-domain";

export const dynamic = "force-dynamic";
export async function PATCH(request: Request) {
  try {
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    for (const key of ["loop", "youtubeMuted", "stillMonochrome", "pageBackdrop"]) if (body[key] !== undefined && typeof body[key] !== "boolean") throw new ApiError(400, "Cài đặt cảnh không hợp lệ.");
    if (body.videoView !== undefined && body.videoView !== "edge" && body.videoView !== "studio" && body.videoView !== "ambient") throw new ApiError(400, "Chế độ xem video không hợp lệ.");
    if (body.dockSide !== undefined && body.dockSide !== "left" && body.dockSide !== "right") throw new ApiError(400, "Vị trí thanh công cụ không hợp lệ.");
    for (const [key, min, max] of [["ambientBlur", 12, 64], ["ambientDim", 15, 75]] as const) {
      const value = body[key];
      if (value !== undefined && (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)) throw new ApiError(400, "Độ mờ hoặc độ tối nền không hợp lệ.");
    }
    if (body.scenes !== undefined) {
      if (!Array.isArray(body.scenes) || body.scenes.length > 12) throw new ApiError(400, "Có thể lưu tối đa 12 cảnh YouTube.");
      const ids = new Set<string>();
      for (const scene of body.scenes) {
        if (!isRecord(scene) || !isUuid(scene.id) || !isYouTubeMedia(scene) || typeof scene.title !== "string" || !scene.title.trim() || scene.title.length > 80 || typeof scene.startSeconds !== "number" || !Number.isInteger(scene.startSeconds) || scene.startSeconds < 0 || scene.startSeconds > 86400 || ids.has(scene.id)) throw new ApiError(400, "Thông tin cảnh YouTube không hợp lệ.");
        ids.add(scene.id);
      }
    }
    const room = await db.transaction(async (tx) => {
      const [row] = await tx.select({ room: workspaces.roomSettings }).from(workspaces).where(eq(workspaces.id, workspace.id)).for("update");
      const previous = normalizeRoom(row.room);
      const combined = { ...previous, ...body };
      if (body.selectedId !== undefined && (typeof body.selectedId !== "string" || !(BUILTIN_SCENES.some((scene) => scene.id === body.selectedId) || (Array.isArray(combined.scenes) && combined.scenes.some((scene) => isRecord(scene) && scene.id === body.selectedId))))) throw new ApiError(400, "Không tìm thấy cảnh đã chọn.");
      const result = normalizeRoom(combined);
      await tx.update(workspaces).set({ roomSettings: result }).where(eq(workspaces.id, workspace.id));
      return result;
    });
    return json({ room });
  } catch (error) { return apiError(error); }
}
