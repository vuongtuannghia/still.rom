import { db } from "@/db";
import { friendships } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export function orderedAccountPair(a: string, b: string) {
  return a < b ? [a, b] as const : [b, a] as const;
}

export async function areFriends(a: string, b: string) {
  if (a === b) return false;
  const [accountAId, accountBId] = orderedAccountPair(a, b);
  const [row] = await db.select({ id: friendships.id }).from(friendships)
    .where(and(eq(friendships.accountAId, accountAId), eq(friendships.accountBId, accountBId)))
    .limit(1);
  return Boolean(row);
}
