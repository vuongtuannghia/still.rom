import { db } from "@/db";
import { accountBlocks } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

export async function isBlockedEither(a: string, b: string) {
  const [row] = await db.select({ id: accountBlocks.id }).from(blocks).where(
    or(
      and(eq(accountBlocks.blockerId, a), eq(accountBlocks.blockedId, b)),
      and(eq(accountBlocks.blockerId, b), eq(accountBlocks.blockedId, a)),
    )
  ).limit(1);
  return Boolean(row);
}
