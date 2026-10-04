import { db } from "@/db";
import { habits, habitCheckIns } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ApiError, apiError, getWorkspace, json, readBody } from "@/lib/server-api";
import { isCalendarDate } from "@/lib/focus-domain";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const workspace = await getWorkspace(request);
    const { habitId, date, completed } = body;
    if (typeof habitId !== "number" || !Number.isSafeInteger(habitId) || habitId < 1 || !isCalendarDate(date) || typeof completed !== "boolean") {
      throw new ApiError(400, "Ngày, thói quen hoặc trạng thái không hợp lệ.");
    }
    const upper = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const lower = new Date(Date.now() - 367 * 86400000).toISOString().slice(0, 10);
    if (date < lower || date > upper) throw new ApiError(400, "Chỉ có thể check-in trong 12 tháng gần nhất.");
    await db.transaction(async (tx) => {
      const [habit] = await tx.select({ id: habits.id }).from(habits).where(and(eq(habits.id, habitId), eq(habits.workspaceId, workspace.id))).for("update");
      if (!habit) throw new ApiError(404, "Không tìm thấy thói quen.");
      if (completed) {
        await tx.insert(habitCheckIns).values({ habitId, date }).onConflictDoNothing({ target: [habitCheckIns.habitId, habitCheckIns.date] });
      } else {
        await tx.delete(habitCheckIns).where(and(eq(habitCheckIns.habitId, habitId), eq(habitCheckIns.date, date)));
      }
    });
    return json({ habitId, date, completed });
  } catch (error) { return apiError(error); }
}
