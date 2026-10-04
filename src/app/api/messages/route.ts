import { db } from "@/db";
import { accounts, directMessages, directThreads } from "@/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import { ApiError, apiError, json, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export const dynamic = "force-dynamic";

function validAccountId(value: unknown) { return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value); }

async function getOther(recipientId: string, currentId: string) {
  const [other] = await db.select({ id: accounts.id, name: accounts.name, picture: accounts.picture }).from(accounts).where(eq(accounts.id, recipientId)).limit(1);
  if (!other || other.id === currentId) throw new ApiError(404, "Không tìm thấy người dùng.");
  return other;
}
function orderedPair(a: string, b: string) { return a < b ? [a, b] as const : [b, a] as const; }

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    const recipientId = new URL(request.url).searchParams.get("with") ?? "";
    if (!validAccountId(recipientId)) throw new ApiError(400, "Người nhận không hợp lệ.");
    const other = await getOther(recipientId, current.id);
    const [a, b] = orderedPair(current.id, other.id);
    const [thread] = await db.select().from(directThreads).where(and(eq(directThreads.accountAId, a), eq(directThreads.accountBId, b))).limit(1);
    if (!thread) return json({ other, messages: [] });
    const messages = await db.select({ id: directMessages.id, senderId: directMessages.senderId, body: directMessages.body, createdAt: directMessages.createdAt, readAt: directMessages.readAt })
      .from(directMessages).where(eq(directMessages.threadId, thread.id)).orderBy(asc(directMessages.createdAt), asc(directMessages.id)).limit(300);
    await db.update(directMessages).set({ readAt: new Date() }).where(and(eq(directMessages.threadId, thread.id), ne(directMessages.senderId, current.id)));
    return json({ other, messages: messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: m.readAt?.toISOString() ?? null })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const current = await requireAccount(request);
    const body = await readBody(request);
    const recipientId = body.recipientId;
    if (!validAccountId(recipientId)) throw new ApiError(400, "Người nhận không hợp lệ.");
    const other = await getOther(recipientId as string, current.id);
    if (typeof body.body !== "string" || !body.body.trim() || body.body.trim().length > 4000) throw new ApiError(400, "Tin nhắn phải từ 1 đến 4000 ký tự.");
    const [a, b] = orderedPair(current.id, other.id);
    let [thread] = await db.select().from(directThreads).where(and(eq(directThreads.accountAId, a), eq(directThreads.accountBId, b))).limit(1);
    if (!thread) {
      [thread] = await db.insert(directThreads).values({ accountAId: a, accountBId: b }).onConflictDoNothing({ target: [directThreads.accountAId, directThreads.accountBId] }).returning();
      if (!thread) [thread] = await db.select().from(directThreads).where(and(eq(directThreads.accountAId, a), eq(directThreads.accountBId, b))).limit(1);
    }
    if (!thread) throw new ApiError(500, "Không tạo được cuộc trò chuyện.");
    const [message] = await db.insert(directMessages).values({ threadId: thread.id, senderId: current.id, body: body.body.trim() }).returning();
    return json({ message: { ...message, createdAt: message.createdAt.toISOString(), readAt: null }, other }, 201);
  } catch (error) { return apiError(error); }
}