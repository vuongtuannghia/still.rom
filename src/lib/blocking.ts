import { db } from "@/db";
import { blocks } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

export async function isBlockedEither(a: string, b: string) {
  const [row] = await db.select({ id: blocks.id }).from(blocks).where(
    or(
      and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
      and(eq(blocks.blockerId, b), eq(blocks.blockedId, a)),
    )
  ).limit(1);
  return Boolean(row);
}
