import { db } from "@/db";
import { accounts, directMessages, directThreads, friendships, notifications } from "@/db/schema";
import { and, asc, eq, ne, or } from "drizzle-orm";
import { ApiError, apiError, json, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";
import { orderedAccountPair } from "@/lib/friendship";

export const dynamic = "force-dynamic";

function validAccountId(value: unknown) { return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value); }

async function getOther(recipientId: string, currentId: string) {
  const [other] = await db.select({ id: accounts.id, name: accounts.name, email: accounts.email, picture: accounts.picture })
    .from(accounts).where(eq(accounts.id, recipientId)).limit(1);
  if (!other || other.id === currentId) throw new ApiError(404, "Không tìm thấy người dùng.");
  return other;
}

async function canMessage(currentId: string, otherId: string) {
  if (currentId === otherId) return false;
  const [a, b] = orderedAccountPair(currentId, otherId);
  const [friend] = await db.select({ id: friendships.id }).from(friendships)
    .where(and(eq(friendships.accountAId, a), eq(friendships.accountBId, b))).limit(1);
  // Friends and non-friends can both message. The client separates non-friend threads
  // into the "Tin nhắn chờ" inbox to make unsolicited conversations visible.
  return Boolean(friend) || Boolean(otherId);
}

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    const params = new URL(request.url).searchParams;
    const recipientId = params.get("with") ?? "";
    const recipientEmail = params.get("email") ?? "";
    if (!validAccountId(recipientId)) throw new ApiError(400, "Người nhận không hợp lệ.");
    const other = await getOther(recipientId, current.id);
    if (!(await canMessage(current.id, other.id))) {
      throw new ApiError(403, "Không thể mở cuộc trò chuyện.");
    }

    const [a, b] = orderedAccountPair(current.id, other.id);
    const [thread] = await db.select().from(directThreads)
      .where(and(eq(directThreads.accountAId, a), eq(directThreads.accountBId, b))).limit(1);
    if (!thread) return json({ other, messages: [] });

    const messages = await db.select({
      id: directMessages.id, senderId: directMessages.senderId, body: directMessages.body,
      createdAt: directMessages.createdAt, readAt: directMessages.readAt,
    }).from(directMessages).where(eq(directMessages.threadId, thread.id))
      .orderBy(asc(directMessages.createdAt), asc(directMessages.id)).limit(300);

    await db.update(directMessages).set({ readAt: new Date() })
      .where(and(eq(directMessages.threadId, thread.id), ne(directMessages.senderId, current.id)));

    return json({ other, messages: messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: m.readAt?.toISOString() ?? null })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const current = await requireAccount(request);
    const body = await readBody(request);
    const recipientId = body.recipientId;
    const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail : "";
    if (!validAccountId(recipientId)) throw new ApiError(400, "Người nhận không hợp lệ.");
    const other = await getOther(recipientId as string, current.id);
    if (!(await canMessage(current.id, other.id))) {
      throw new ApiError(403, "Không thể gửi tin nhắn.");
    }
    const messageBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!messageBody || messageBody.length > 4000) {
      throw new ApiError(400, "Tin nhắn phải từ 1 đến 4000 ký tự.");
    }

    const [a, b] = orderedAccountPair(current.id, other.id);
    let [thread] = await db.select().from(directThreads)
      .where(and(eq(directThreads.accountAId, a), eq(directThreads.accountBId, b))).limit(1);
    if (!thread) {
      [thread] = await db.insert(directThreads).values({ accountAId: a, accountBId: b })
        .onConflictDoNothing({ target: [directThreads.accountAId, directThreads.accountBId] }).returning();
      if (!thread) [thread] = await db.select().from(directThreads)
        .where(and(eq(directThreads.accountAId, a), eq(directThreads.accountBId, b))).limit(1);
    }
    if (!thread) throw new ApiError(500, "Không tạo được cuộc trò chuyện.");

    const result = await db.transaction(async tx => {
      const [message] = await tx.insert(directMessages).values({
        threadId: thread.id, senderId: current.id, body: messageBody,
      }).returning();
      if (!message) throw new ApiError(500, "Không thể lưu tin nhắn.");
      await tx.insert(notifications).values({
        accountId: other.id,
        actorId: current.id,
        type: "message",
        title: "Tin nhắn mới",
        body: `${current.name} đã gửi cho bạn một tin nhắn.`,
        threadId: thread.id,
      });
      return message;
    });

    return json({
      message: { ...result, createdAt: result.createdAt.toISOString(), readAt: null },
      other,
    }, 201);
  } catch (error) { return apiError(error); }
}
