import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError, json } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const current = await requireAccount(request);
    await db.update(notifications).set({ readAt: new Date() })
      .where(and(eq(notifications.accountId, current.id), eq(notifications.readAt, null as never)));
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
