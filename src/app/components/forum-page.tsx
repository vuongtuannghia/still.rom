"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

const ADMIN = "vuongtuannghia585@gmail.com";

type Post = {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorPicture: string | null;
  commentCount: number;
};

type Comment = {
  id: number;
  postId: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorPicture: string | null;
};

function avatar(name: string, picture: string | null) {
  return picture ? <img src={picture} alt="" /> : name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U";
}

function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function ForumPage() {
  const router = useRouter();
  const [account, setAccount] = useState<DashboardData["account"]>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [replyTo, setReplyTo] = useState<Record<number, number | null>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const [statusRes, postsRes] = await Promise.all([
        fetch("/api/account/status", { cache: "no-store" }),
        fetch("/api/forum/posts", { cache: "no-store" }),
      ]);
      if (statusRes.ok) setAccount((await statusRes.json() as { account: DashboardData["account"] }).account);
      if (postsRes.ok) setPosts(await postsRes.json() as Post[]);
    } catch {
      setNotice("Chưa tải được diễn đàn.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function createPost() {
    if (!account) { setNotice("Đăng nhập Google để tạo chủ đề."); return; }
    if (!title.trim() || !body.trim()) return;
    setPosting(true);
    try {
      const response = await fetch("/api/forum/posts", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { post?: Post; error?: string };
      if (!response.ok || !payload.post) throw new Error(payload.error || "Không thể đăng bài.");
      setPosts(current => [payload.post!, ...current]);
      setTitle(""); setBody("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể đăng bài.");
    } finally { setPosting(false); }
  }

  async function openComments(postId: number) {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    setExpandedPost(postId);
    if (comments[postId]) return;
    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, { cache: "no-store" });
      const payload = response.ok ? await response.json() as Comment[] : [];
      setComments(current => ({ ...current, [postId]: payload }));
    } catch { setNotice("Chưa tải được bình luận."); }
  }

  async function addComment(postId: number) {
    if (!account) { setNotice("Đăng nhập Google để bình luận."); return; }
    const text = drafts[postId]?.trim();
    if (!text) return;
    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, parentId: replyTo[postId] ?? null }),
      });
      const payload = await response.json().catch(() => ({})) as { comment?: Comment; error?: string };
      if (!response.ok || !payload.comment) throw new Error(payload.error || "Không thể gửi bình luận.");
      setComments(current => ({ ...current, [postId]: [...(current[postId] ?? []), payload.comment!] }));
      setDrafts(current => ({ ...current, [postId]: "" }));
      setReplyTo(current => ({ ...current, [postId]: null }));
      setPosts(current => current.map(post => post.id === postId ? { ...post, commentCount: post.commentCount + 1 } : post));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể gửi bình luận.");
    }
  }

  async function pinPost(post: Post, pinned: boolean) {
    if (account?.email !== ADMIN) return;
    try {
      const response = await fetch(`/api/forum/posts/${post.id}`, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể cập nhật ghim.");
      setPosts(current => current.map(item => ({ ...item, pinned: item.id === post.id ? pinned : false }))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật ghim."); }
  }

  async function deletePost(post: Post) {
    if (account?.email !== ADMIN) return;
    if (!window.confirm("Xóa bài đăng và toàn bộ bình luận?")) return;
    try {
      const response = await fetch(`/api/forum/posts/${post.id}`, { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể xóa bài.");
      setPosts(current => current.filter(item => item.id !== post.id));
      setComments(current => { const next = { ...current }; delete next[post.id]; return next; });
      if (expandedPost === post.id) setExpandedPost(null);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể xóa bài."); }
  }

  const pinnedPosts = posts.filter(post => post.pinned);
  const normalPosts = posts.filter(post => !post.pinned);

  return <div className="forum-page">
    {notice && <div className="community-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}

    <section className="forum-hero">
      <span className="community-kicker light"><span /> STILL / DISCUSS</span>
      <h2>Nói chuyện.<br /><em>Hỏi nhau. Học cùng nhau.</em></h2>
      <p>Chia sẻ kinh nghiệm học, đặt câu hỏi, rủ nhau vào phòng học và kết nối với những người cùng nhịp.</p>
      <div className="forum-hero-actions"><a className="button-primary" href="/hoc-chung"><Icon name="radio" size={15} /> Phòng học chung</a><a className="forum-hero-link" href="/tin-nhan"><Icon name="arrow" size={14} /> Tin nhắn riêng</a></div>
    </section>

    <div className="forum-layout">
      <main>
        <section className="forum-compose">
          <div className="compose-avatar">{account ? avatar(account.name, account.picture) : "?"}</div>
          <div className="compose-fields">
            <input value={title} onChange={e => setTitle(e.target.value)} disabled={!account || posting} placeholder="Tiêu đề cuộc trò chuyện" maxLength={160} />
            <textarea value={body} onChange={e => setBody(e.target.value)} disabled={!account || posting} placeholder={account ? "Bạn muốn chia sẻ điều gì?" : "Đăng nhập Google để bắt đầu viết…"} maxLength={5000} />
            <div className="compose-footer"><span>{account ? "Bài viết công khai với cộng đồng." : "Chỉ thành viên đã đăng nhập mới có thể đăng."}</span><button className="button-primary" type="button" onClick={() => void createPost()} disabled={!account || posting || !title.trim() || !body.trim()}>{posting ? "Đang đăng…" : "Đăng chủ đề"}</button></div>
          </div>
        </section>

        {pinnedPosts.length > 0 && <section className="forum-pinned-list">
          <div className="forum-section-title"><div><span>ĐƯỢC GHIM</span><h3>Thông tin nổi bật</h3></div><small>Quản trị viên chọn</small></div>
          {pinnedPosts.map(post => <PostCard key={post.id} post={post} account={account} comments={comments[post.id] ?? []} router={router} expanded={expandedPost === post.id} draft={drafts[post.id] ?? ""} replyId={replyTo[post.id] ?? null} onOpen={() => void openComments(post.id)} onDraft={text => setDrafts(current => ({ ...current, [post.id]: text }))} onReply={id => setReplyTo(current => ({ ...current, [post.id]: id }))} onSend={() => void addComment(post.id)} onPin={pinned => void pinPost(post, pinned)} onDelete={() => void deletePost(post)} />)}
        </section>}

        <section className="forum-feed">
          <div className="forum-section-title"><div><span>MỚI NHẤT</span><h3>Cuộc trò chuyện</h3></div><small>{posts.length} chủ đề</small></div>
          {normalPosts.length === 0 ? <div className="forum-empty"><div className="empty-orbit">+</div><strong>Hãy là người mở đầu.</strong><p>Chia sẻ câu hỏi hoặc kinh nghiệm học đầu tiên.</p></div> :
            normalPosts.map(post => <PostCard key={post.id} post={post} account={account} comments={comments[post.id] ?? []} router={router} expanded={expandedPost === post.id} draft={drafts[post.id] ?? ""} replyId={replyTo[post.id] ?? null} onOpen={() => void openComments(post.id)} onDraft={text => setDrafts(current => ({ ...current, [post.id]: text }))} onReply={id => setReplyTo(current => ({ ...current, [post.id]: id }))} onSend={() => void addComment(post.id)} onPin={pinned => void pinPost(post, pinned)} onDelete={() => void deletePost(post)} />)}
        </section>
      </main>

      <aside className="forum-sidebar">
        <section className="forum-side-card dark-card"><span className="small-label">CỘNG ĐỒNG</span><strong>Học đều.<br />Nói thật.</strong><p>Không spam. Không quảng cáo. Tôn trọng nhịp học của người khác.</p></section>
        <a className="forum-side-card side-link-card" href="/tin-nhan"><div><span className="small-label">TIN NHẮN RIÊNG</span><strong>Nhắn với bạn bè</strong><span>Tìm người bằng email chính xác hoặc chọn bạn bè.</span></div><Icon name="arrow" size={16} /></a>
        <a className="forum-side-card side-link-card" href="/hoc-chung"><div><span className="small-label">GOOGLE MEET</span><strong>Vào phòng học</strong><span>Bật camera và học cùng mọi người.</span></div><Icon name="radio" size={16} /></a>
      </aside>
    </div>
  </div>;
}

function PostCard({ post, account, comments, expanded, draft, replyId, onOpen, onDraft, onReply, onSend, onPin, onDelete }: {
  post: Post; account: DashboardData["account"]; comments: Comment[]; expanded: boolean; draft: string; replyId: number | null; router: ReturnType<typeof useRouter>;
  onOpen: () => void; onDraft: (value: string) => void; onReply: (id: number | null) => void; onSend: () => void; onPin: (pinned: boolean) => void; onDelete: () => void;
}) {
  return <article className={post.pinned ? "forum-post-card pinned" : "forum-post-card"}>
    <div className="forum-post-top"><div className="forum-post-author"><span className="community-avatar">{avatar(post.authorName, post.authorPicture)}</span><div><strong>{post.authorName}</strong><span>{timeLabel(post.createdAt)}</span></div></div>{post.pinned && <span className="pinned-chip"><Icon name="target" size={11} /> Ghim</span>}</div>
    <h3>{post.title}</h3><p className="forum-post-body">{post.body}</p>
    <div className="forum-post-actions"><button type="button" onClick={onOpen}><Icon name="book" size={14} /> {post.commentCount ? `${post.commentCount} bình luận` : "Bình luận"}</button><button type="button" className="forum-action-link" onClick={() => router.push("/tin-nhan?user=" + encodeURIComponent(post.authorId) + "&email=" + encodeURIComponent(post.authorEmail))}><Icon name="arrow" size={14} /> Nhắn riêng</button>{account?.email === ADMIN && <><button type="button" onClick={() => onPin(!post.pinned)}><Icon name="target" size={14} /> {post.pinned ? "Bỏ ghim" : "Ghim"}</button><button type="button" onClick={onDelete}><Icon name="close" size={14} /> Xóa</button></>}</div>
    {expanded && <div className="forum-comments">
      {!comments.length ? <p className="comment-empty">Chưa có bình luận. Hãy mở lời trước.</p> : comments.filter(comment => !comment.parentId).map(comment => <div className="comment-block" key={comment.id}>
        <CommentLine comment={comment} onReply={onReply} router={router} />
        <div className="comment-replies">{comments.filter(child => child.parentId === comment.id).map(child => <CommentLine key={child.id} comment={child} compact onReply={onReply} router={router} />)}</div>
      </div>)}
      <div className="comment-composer">{replyId && <div className="replying">Đang trả lời một bình luận <button type="button" onClick={() => onReply(null)}>Hủy</button></div>}<div className="comment-input-row"><span className="community-avatar small">{account ? avatar(account.name, account.picture) : "?"}</span><input value={draft} onChange={e => onDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={account ? "Viết bình luận…" : "Đăng nhập để bình luận"} disabled={!account} maxLength={2000} /><button className="icon-button" type="button" onClick={onSend} disabled={!account || !draft.trim()}><Icon name="arrow" size={15} /></button></div></div>
    </div>}
  </article>;
}

function CommentLine({ comment, compact = false, onReply, router }: { comment: Comment; compact?: boolean; onReply: (id: number | null) => void; router: ReturnType<typeof useRouter> }) {
  return <div className={compact ? "comment-line compact" : "comment-line"}><span className="community-avatar small">{avatar(comment.authorName, comment.authorPicture)}</span><div><div className="comment-line-meta"><strong>{comment.authorName}</strong><span>{timeLabel(comment.createdAt)}</span></div><p>{comment.body}</p><div className="comment-line-actions"><button type="button" onClick={() => onReply(comment.id)}>Trả lời</button><button type="button" className="comment-direct-link" onClick={() => router.push("/tin-nhan?user=" + encodeURIComponent(comment.authorId) + "&email=" + encodeURIComponent(comment.authorEmail))}>Nhắn riêng</button></div></div></div>;
}
