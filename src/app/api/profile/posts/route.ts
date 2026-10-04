import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { profilePosts } from "@/db/schema";
import { ApiError, apiError, json, readBody } from "@/lib/server-api";
import { requireAccount } from "@/lib/community-auth";

export async function POST(request: Request) {
  try {
    const account = await requireAccount(request);
    const body = await readBody(request);
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const imageData = body.imageData === null ? null : (typeof body.imageData === "string" ? body.imageData : null);
    if (!text && !imageData) throw new ApiError(400, "Hãy viết gì đó hoặc chọn một ảnh.");
    if (text.length > 2000) throw new ApiError(400, "Bài đăng tối đa 2000 ký tự.");
    if (imageData && (!imageData.startsWith("data:image/") || imageData.length > 1000000))
      throw new ApiError(400, "Ảnh không hợp lệ hoặc quá lớn.");
    const [post] = await db.insert(profilePosts).values({
      accountId: account.id,
      body: text || null,
      imageData,
    }).returning();
    return json({
      post: {
        id: post.id, body: post.body, imageData: post.imageData,
        createdAt: post.createdAt.toISOString(),
      },
    }, 201);
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const account = await requireAccount(request);
    const id = Number(new URL(request.url).searchParams.get("id") ?? "");
    if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "Mã bài viết không hợp lệ.");

    const [post] = await db.select({ id: profilePosts.id, accountId: profilePosts.accountId })
      .from(profilePosts).where(eq(profilePosts.id, id)).limit(1);
    if (!post) throw new ApiError(404, "Không tìm thấy bài viết.");
    const admin = account.email.toLowerCase() === "vuongtuannghia585@gmail.com";
    if (post.accountId !== account.id && !admin) throw new ApiError(403, "Bạn không có quyền xóa bài viết này.");

    await db.delete(profilePosts).where(eq(profilePosts.id, id));
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
