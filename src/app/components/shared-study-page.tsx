"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

type Room = {
  id: number; title: string; meetUrl: string; pinned: boolean; createdAt: string;
  creatorName: string; creatorEmail: string; admin: boolean;
};
type Comment = {
  id: number; roomId: number; parentId: number | null; body: string; createdAt: string;
  authorId: string; authorName: string; authorEmail: string; authorPicture: string | null;
};

const ADMIN = "vuongtuannghia585@gmail.com";

function avatar(name: string, picture: string | null) {
  return picture ? <img src={picture} alt="" /> : name.slice(0, 1).toUpperCase();
}
function timeLabel(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function SharedStudyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [account, setAccount] = useState<DashboardData["account"]>(null);
  const [title, setTitle] = useState("");
  const [meetUrl, setMeetUrl] = useState("");
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<number, number | null>>({});
  const [loadingComments, setLoadingComments] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const [roomsRes, statusRes] = await Promise.all([
        fetch("/api/study-rooms", { cache: "no-store" }),
        fetch("/api/account/status", { cache: "no-store" }),
      ]);
      if (roomsRes.ok) setRooms(await roomsRes.json() as Room[]);
      if (statusRes.ok) {
        const status = await statusRes.json() as { account: DashboardData["account"] };
        setAccount(status.account);
      }
    } catch {}
  }
  useEffect(() => { void load(); }, []);

  async function toggleComments(roomId: number) {
    if (openComments === roomId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(roomId);
    if (comments[roomId]) return;
    setLoadingComments(roomId);
    try {
      const response = await fetch(`/api/study-rooms/${roomId}/comments`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const next = await response.json() as Comment[];
      setComments((current) => ({ ...current, [roomId]: next }));
    } catch {
      setNotice("Chưa tải được bình luận.");
    } finally { setLoadingComments(null); }
  }

  async function refreshComments(roomId: number) {
    try {
      const response = await fetch(`/api/study-rooms/${roomId}/comments`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const next = await response.json() as Comment[];
      setComments((current) => ({ ...current, [roomId]: next }));
    } catch {}
  }

  async function addRoom() {
    if (!account) { setNotice("Đăng nhập Google để đăng phòng học."); return; }
    if (!meetUrl.trim()) { setNotice("Hãy dán link Google Meet."); return; }
    setPosting(true); setNotice("");
    try {
      const response = await fetch("/api/study-rooms", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Phòng học chung", meetUrl: meetUrl.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { room?: Room; error?: string };
      if (!response.ok || !payload.room) throw new Error(payload.error || "Không thể thêm phòng.");
      setRooms((current) => [payload.room!, ...current]);
      setTitle(""); setMeetUrl("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể thêm phòng."); }
    finally { setPosting(false); }
  }

  async function pin(roomId: number, pinned: boolean) {
    try {
      const response = await fetch(`/api/study-rooms/${roomId}`, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      const payload = await response.json().catch(() => ({})) as { room?: Room; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể cập nhật.");
      setRooms((current) => current.map((room) => ({ ...room, pinned: room.id === roomId ? pinned : false })));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật."); }
  }

  async function remove(roomId: number) {
    if (!confirm("Xóa phòng học này khỏi danh sách?")) return;
    try {
      const response = await fetch(`/api/study-rooms/${roomId}`, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      setRooms((current) => current.filter((room) => room.id !== roomId));
    } catch { setNotice("Không thể xóa phòng."); }
  }

  async function addComment(roomId: number) {
    if (!account) { setNotice("Đăng nhập Google để bình luận."); return; }
    const body = drafts[roomId]?.trim();
    if (!body) return;
    try {
      const response = await fetch(`/api/study-rooms/${roomId}/comments`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parentId: replyingTo[roomId] ?? null }),
      });
      const payload = await response.json().catch(() => ({})) as { comment?: Comment; error?: string };
      if (!response.ok || !payload.comment) throw new Error(payload.error || "Không thể gửi bình luận.");
      setComments((current) => ({ ...current, [roomId]: [...(current[roomId] ?? []), payload.comment!] }));
      setDrafts((current) => ({ ...current, [roomId]: "" }));
      setReplyingTo((current) => ({ ...current, [roomId]: null }));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể gửi bình luận."); }
  }

  const pinned = rooms.find((room) => room.pinned);
  const publicRooms = rooms.filter((room) => !room.pinned);
  const activeComments = openComments ? comments[openComments] ?? [] : [];
  const topComments = useMemo(() => activeComments.filter((item) => !item.parentId), [activeComments]);

  return <div className="shared-page-wrap">
    {notice && <div className="community-alert" role="status"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}

    <section className="shared-page-hero">
      <div>
        <span className="community-kicker"><span /> STILL / TOGETHER</span>
        <h2>Học chung,<br /><em>mỗi người một nhịp.</em></h2>
        <p>Chọn một phòng, bật camera trên Google Meet và bắt đầu học. Không cần cài thêm gì trong still.room.</p>
        <div className="community-hero-actions">
          <a className="button-primary" href="https://meet.google.com/new" target="_blank" rel="noreferrer"><Icon name="radio" size={15} /> Tạo phòng Meet</a>
          <span><Icon name="signal" size={14} /> {rooms.length} phòng đang chia sẻ</span>
        </div>
      </div>
      <div className="shared-page-visual" aria-hidden="true"><div className="visual-grid" /><div className="visual-ring ring-1" /><div className="visual-ring ring-2" /><div className="visual-dot dot-1" /><div className="visual-dot dot-2" /><strong>CAM<br />ON</strong></div>
    </section>

    {pinned && <section className="study-feature-room">
      <div className="study-feature-badge"><Icon name="target" size={13} /> PHÒNG HỌC CHÍNH</div>
      <div className="study-feature-main"><h3>{pinned.title}</h3><p>{pinned.creatorName} · được quản trị viên ghim</p></div>
      <div className="study-feature-actions"><a className="button-primary" href={pinned.meetUrl} target="_blank" rel="noreferrer"><Icon name="radio" size={15} /> Vào học</a><button className="button-secondary" type="button" onClick={() => void toggleComments(pinned.id)}><Icon name="book" size={14} /> Bình luận</button>{account?.email === ADMIN && <button className="button-secondary" type="button" onClick={() => void pin(pinned.id, false)}>Bỏ ghim</button>}</div>
      {openComments === pinned.id && <CommentThread account={account} roomId={pinned.id} comments={comments[pinned.id] ?? []} loading={loadingComments === pinned.id} draft={drafts[pinned.id] ?? ""} replyId={replyingTo[pinned.id] ?? null} onDraft={(value) => setDrafts((current) => ({ ...current, [pinned.id]: value }))} onReply={(id) => setReplyingTo((current) => ({ ...current, [pinned.id]: id }))} onSend={() => void addComment(pinned.id)} onRefresh={() => void refreshComments(pinned.id)} />}</section>}

    <section className="study-room-list-section">
      <div className="community-section-heading"><div><span className="small-label">MỌI NGƯỜI ĐANG HỌC</span><h3>Phòng đang mở</h3></div><span>Chia sẻ một link · người khác vào học</span></div>
      {!account && <div className="login-strip"><Icon name="signal" size={15} /><span>Đăng nhập Google để đăng phòng và bình luận.</span></div>}
      {publicRooms.length === 0 ? <div className="study-empty"><div className="empty-orbit">+</div><strong>Chưa có phòng nào.</strong><p>Hãy bấm “Tạo phòng Meet”, sau đó dán link vào đây.</p></div> :
        <div className="study-room-grid">{publicRooms.map((room) => <article className="study-room-card" key={room.id}>
          <div className="study-room-card-top"><span className="room-live"><i /> đang mở</span><span>{timeLabel(room.createdAt)}</span></div>
          <div className="study-room-person"><span className="community-avatar">{avatar(room.creatorName, null)}</span><div><h4>{room.title}</h4><p>{room.creatorName}</p></div></div>
          <div className="study-room-card-actions"><a className="button-primary" href={room.meetUrl} target="_blank" rel="noreferrer"><Icon name="radio" size={14} /> Vào học</a><button className="button-secondary" type="button" onClick={() => void toggleComments(room.id)}><Icon name="book" size={14} /> Bình luận{comments[room.id]?.length ? ` · ${comments[room.id].length}` : ""}</button></div>
          {account?.email === ADMIN && <div className="admin-room-actions"><button type="button" onClick={() => void pin(room.id, true)}><Icon name="target" size={13} /> Ghim</button><button type="button" onClick={() => void remove(room.id)}><Icon name="close" size={13} /> Xóa</button></div>}
          {openComments === room.id && <CommentThread account={account} roomId={room.id} comments={comments[room.id] ?? []} loading={loadingComments === room.id} draft={drafts[room.id] ?? ""} replyId={replyingTo[room.id] ?? null} onDraft={(value) => setDrafts((current) => ({ ...current, [room.id]: value }))} onReply={(id) => setReplyingTo((current) => ({ ...current, [room.id]: id }))} onSend={() => void addComment(room.id)} onRefresh={() => void refreshComments(room.id)} />}</article>)}</div>}

    </section>

    <section className="study-share-box">
      <div><span className="small-label">THÊM PHÒNG HỌC</span><h3>Có phòng rồi? Chia sẻ vào đây.</h3><p>Chỉ cần link Google Meet. Camera và mic vẫn chạy hoàn toàn trên Meet.</p></div>
      <div className="study-share-form"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên phòng · VD: Ôn sinh lý tối nay" disabled={!account || posting} /><input value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} placeholder="https://meet.google.com/..." disabled={!account || posting} /><button className="button-primary" type="button" disabled={!account || posting} onClick={() => void addRoom()}>{posting ? "Đang đăng…" : "Đăng phòng"}</button></div>
    </section>
  </div>;
}

function CommentThread({ account, roomId, comments, loading, draft, replyId, onDraft, onReply, onSend, onRefresh }: {
  account: DashboardData["account"]; roomId: number; comments: Comment[]; loading: boolean; draft: string; replyId: number | null;
  onDraft: (value: string) => void; onReply: (id: number | null) => void; onSend: () => void; onRefresh: () => void;
}) {
  const top = comments.filter((comment) => !comment.parentId);
  return <div className="comment-thread">
    <div className="comment-thread-heading"><strong>Trao đổi về phòng học</strong><button type="button" onClick={onRefresh}>{loading ? "Đang tải…" : "Làm mới"}</button></div>
    {!comments.length && !loading && <p className="comment-empty">Chưa có bình luận. Bắt đầu cuộc trò chuyện.</p>}
    <div className="comment-list">{top.map((comment) => <div className="comment-block" key={comment.id}>
      <CommentItem comment={comment} onReply={onReply} />
      <div className="comment-replies">{comments.filter((child) => child.parentId === comment.id).map((child) => <CommentItem key={child.id} comment={child} compact onReply={onReply} />)}</div>
    </div>)}</div>
    <div className="comment-composer">{replyId && <div className="replying">Đang trả lời một bình luận <button type="button" onClick={() => onReply(null)}>Hủy</button></div>}<div className="comment-input-row"><span className="community-avatar small">{account ? avatar(account.name, account.picture) : "?"}</span><input value={draft} onChange={(e) => onDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={account ? "Viết bình luận…" : "Đăng nhập để bình luận"} disabled={!account} maxLength={2000} /><button className="icon-button" type="button" onClick={onSend} disabled={!account || !draft.trim()} aria-label="Gửi bình luận"><Icon name="arrow" size={16} /></button></div></div>
  </div>;
}

function CommentItem({ comment, compact = false, onReply }: { comment: Comment; compact?: boolean; onReply: (id: number | null) => void }) {
  return <div className={compact ? "comment-item compact" : "comment-item"}><span className="community-avatar">{avatar(comment.authorName, comment.authorPicture)}</span><div className="comment-body"><div className="comment-meta"><strong>{comment.authorName}</strong><span>{timeLabel(comment.createdAt)}</span></div><p>{comment.body}</p><button type="button" className="comment-reply" onClick={() => onReply(comment.id)}>Trả lời</button><button type="button" className="comment-reply comment-direct-link" onClick={() => router.push("/tin-nhan?user=" + encodeURIComponent(comment.authorId) + "&email=" + encodeURIComponent(comment.authorEmail))}>Nhắn riêng</button></div></div>;
}
