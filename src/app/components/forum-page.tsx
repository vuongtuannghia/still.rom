"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

type Post = {
  id: number; title: string; body: string; meetRoomId: number | null;
  createdAt: string; updatedAt: string; authorId: string; authorName: string;
  authorPicture: string | null; meetTitle?: string | null; meetUrl?: string | null; commentCount: number;
};
type Comment = {
  id: number; postId: number; parentId: number | null; body: string; createdAt: string;
  authorId: string; authorName: string; authorPicture: string | null;
};
type Person = { id: string; name: string; picture: string | null };
type Message = { id: number; senderId: string; body: string; createdAt: string; readAt: string | null };

const ADMIN = "vuongtuannghia585@gmail.com";

function initials(name: string) { return name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U"; }
function avatar(name: string, picture: string | null) { return picture ? <img src={picture} alt="" /> : initials(name); }
function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function ForumPage() {
  const [account, setAccount] = useState<DashboardData["account"]>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState<Record<number, string>>({});
  const [replyTo, setReplyTo] = useState<Record<number, number | null>>({});
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [personQuery, setPersonQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadCore() {
    try {
      const [statusRes, postsRes] = await Promise.all([
        fetch("/api/account/status", { cache: "no-store" }),
        fetch("/api/forum/posts", { cache: "no-store" }),
      ]);
      if (statusRes.ok) setAccount((await statusRes.json() as { account: DashboardData["account"] }).account);
      if (postsRes.ok) setPosts(await postsRes.json() as Post[]);
    } catch { setNotice("Chưa tải được diễn đàn."); }
  }
  async function loadPeople(query = "") {
    try {
      const response = await fetch(`/api/messages/users?q=${encodeURIComponent(query)}`, { cache: "no-store", credentials: "same-origin" });
      if (response.ok) setPeople(await response.json() as Person[]);
    } catch {}
  }
  useEffect(() => { void loadCore(); void loadPeople(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("user");
    if (!userId) return;
    (async () => {
      try {
        const response = await fetch("/api/messages/users", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const list = await response.json() as Person[];
        const person = list.find(item => item.id === userId);
        if (person) setSelectedPerson(person);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (account) void loadPeople(personQuery); }, 250);
    return () => window.clearTimeout(timer);
  }, [personQuery, account]);

  async function openPost(postId: number) {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    setExpandedPost(postId);
    if (comments[postId]) return;
    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const next = await response.json() as Comment[];
      setComments((current) => ({ ...current, [postId]: next }));
    } catch { setNotice("Chưa tải được bình luận."); }
  }

  async function addPost() {
    if (!account) { setNotice("Đăng nhập Google để tạo chủ đề."); return; }
    if (!postTitle.trim() || !postBody.trim()) return;
    setPosting(true);
    try {
      const response = await fetch("/api/forum/posts", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: postTitle.trim(), body: postBody.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { post?: Post; error?: string };
      if (!response.ok || !payload.post) throw new Error(payload.error || "Không thể đăng chủ đề.");
      setPosts((current) => [payload.post!, ...current]);
      setPostTitle(""); setPostBody("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể đăng chủ đề."); }
    finally { setPosting(false); }
  }

  async function deletePost(postId: number) {
    if (account?.email !== ADMIN) return;
    if (!window.confirm("Xóa bài đăng này và toàn bộ bình luận?")) return;
    try {
      const response = await fetch(`/api/forum/posts/${postId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể xóa bài đăng.");
      setPosts((current) => current.filter(post => post.id !== postId));
      setComments((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
      if (expandedPost === postId) setExpandedPost(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể xóa bài đăng.");
    }
  }

  async function addComment(postId: number) {
    if (!account) { setNotice("Đăng nhập Google để bình luận."); return; }
    const body = commentDraft[postId]?.trim();
    if (!body) return;
    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parentId: replyTo[postId] ?? null }),
      });
      const payload = await response.json().catch(() => ({})) as { comment?: Comment; error?: string };
      if (!response.ok || !payload.comment) throw new Error(payload.error || "Không thể gửi bình luận.");
      setComments((current) => ({ ...current, [postId]: [...(current[postId] ?? []), payload.comment!] }));
      setCommentDraft((current) => ({ ...current, [postId]: "" }));
      setReplyTo((current) => ({ ...current, [postId]: null }));
      setPosts((current) => current.map(post => post.id === postId ? { ...post, commentCount: post.commentCount + 1 } : post));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể gửi bình luận."); }
  }

  async function openDirect(person: Person) {
    setSelectedPerson(person);
    try {
      const response = await fetch(`/api/messages?with=${person.id}`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { other: Person; messages: Message[] };
      setSelectedPerson(payload.other);
      setMessages(payload.messages);
    } catch { setNotice("Chưa mở được tin nhắn riêng."); }
  }
  async function sendMessage() {
    if (!selectedPerson || !messageDraft.trim()) return;
    setSendingMessage(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selectedPerson.id, body: messageDraft.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: Message; error?: string };
      if (!response.ok || !payload.message) throw new Error(payload.error || "Không thể gửi tin nhắn.");
      setMessages((current) => [...current, payload.message!]);
      setMessageDraft("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể gửi tin nhắn."); }
    finally { setSendingMessage(false); }
  }

  useEffect(() => {
    if (!selectedPerson || !account) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/messages?with=${selectedPerson.id}`, { cache: "no-store", credentials: "same-origin" });
        if (response.ok) setMessages((await response.json() as { messages: Message[] }).messages);
      } catch {}
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedPerson?.id, account?.id]);

  const onlinePeople = useMemo(() => people.filter(person => person.id !== selectedPerson?.id), [people, selectedPerson]);

  return <div className="forum-page-grid">
    {notice && <div className="community-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}

    <section className="forum-main">
      <div className="forum-intro">
        <div><span className="community-kicker light"><span /> STILL / DISCUSS</span><h2>Nói chuyện.<br /><em>Hỏi nhau. Học cùng nhau.</em></h2><p>Đặt câu hỏi, chia sẻ tài liệu, rủ nhau vào phòng học. Bạn cũng có thể nhắn riêng bất kỳ người nào.</p></div>
        <div className="forum-intro-mark">/ / /</div>
      </div>

      <div className="forum-compose">
        <div className="compose-avatar">{account ? avatar(account.name, account.picture) : "?"}</div>
        <div className="compose-fields"><input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Tiêu đề cuộc trò chuyện" disabled={!account || posting} maxLength={160} /><textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder={account ? "Bạn đang nghĩ gì về việc học?" : "Đăng nhập Google để bắt đầu trò chuyện"} disabled={!account || posting} maxLength={5000} /><div className="compose-footer"><span>{account ? "Bài viết công khai trong diễn đàn." : "Chỉ thành viên đã đăng nhập mới có thể đăng."}</span><button className="button-primary" type="button" onClick={() => void addPost()} disabled={!account || posting || !postTitle.trim() || !postBody.trim()}>{posting ? "Đang đăng…" : "Đăng chủ đề"}</button></div></div>
      </div>

      <div className="forum-feed">
        <div className="community-section-heading"><div><span className="small-label">MỚI NHẤT</span><h3>Cuộc trò chuyện</h3></div><span>{posts.length} chủ đề</span></div>
        {posts.length === 0 ? <div className="forum-empty"><Icon name="book" size={26} /><strong>Hãy là người mở đầu.</strong><p>Tạo chủ đề đầu tiên cho cộng đồng.</p></div> :
          posts.map(post => <article className="forum-post-card" key={post.id}>
            <div className="forum-post-author"><span className="community-avatar">{avatar(post.authorName, post.authorPicture)}</span><div><strong>{post.authorName}</strong><span>{timeLabel(post.createdAt)}</span></div></div>
            <h3>{post.title}</h3><p className="forum-post-body">{post.body}</p>
            {post.meetTitle && post.meetUrl && <a className="forum-meet-chip" href={post.meetUrl} target="_blank" rel="noreferrer"><Icon name="radio" size={14} /><span>{post.meetTitle}</span><Icon name="arrow" size={13} /></a>}
            <div className="forum-post-actions"><button type="button" onClick={() => void openPost(post.id)}><Icon name="book" size={14} /> {post.commentCount ? `${post.commentCount} bình luận` : "Bình luận"}</button><button type="button" onClick={() => openDirect({ id: post.authorId, name: post.authorName, picture: post.authorPicture })}><Icon name="arrow" size={14} /> Nhắn riêng</button>{account?.email === ADMIN && <button type="button" className="forum-delete-button" onClick={() => void deletePost(post.id)}><Icon name="close" size={14} /> Xóa bài</button>}</div>
            {expandedPost === post.id && <ForumComments account={account} comments={comments[post.id] ?? []} draft={commentDraft[post.id] ?? ""} replyId={replyTo[post.id] ?? null} onDraft={(value) => setCommentDraft(current => ({ ...current, [post.id]: value }))} onReply={(id) => setReplyTo(current => ({ ...current, [post.id]: id }))} onSend={() => void addComment(post.id)} onDirect={(person) => void openDirect(person)} />}
          </article>)
        }
      </div>
    </section>

    <aside className="forum-side">
      <section className="dm-card">
        <div className="dm-heading"><div><span className="small-label">TIN NHẮN RIÊNG</span><h3>Nhắn với nhau</h3></div><Icon name="arrow" size={17} /></div>
        {!account ? <div className="dm-locked"><Icon name="signal" size={19} /><strong>Đăng nhập Google</strong><span>Để tìm và nhắn riêng với mọi người.</span></div> :
          <><div className="dm-search"><Icon name="target" size={14} /><input value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} placeholder="Tìm người…" /></div>
          <div className="people-list">{onlinePeople.map(person => <button type="button" className="person-row" key={person.id} onClick={() => void openDirect(person)}><span className="community-avatar small">{avatar(person.name, person.picture)}</span><span><strong>{person.name}</strong><small>Nhắn riêng</small></span><Icon name="arrow" size={13} /></button>)}</div></>}
      </section>

      {selectedPerson && account && <section className="dm-conversation">
        <div className="dm-conversation-head"><div className="forum-post-author"><span className="community-avatar">{avatar(selectedPerson.name, selectedPerson.picture)}</span><div><strong>{selectedPerson.name}</strong><span>Tin nhắn riêng</span></div></div><button type="button" className="icon-button" aria-label="Đóng trò chuyện" onClick={() => setSelectedPerson(null)}><Icon name="close" size={15} /></button></div>
        <div className="dm-messages">{messages.length === 0 ? <div className="dm-empty">Bắt đầu cuộc trò chuyện.</div> : messages.map(message => <div className={message.senderId === account.id ? "dm-bubble mine" : "dm-bubble"} key={message.id}><p>{message.body}</p><small>{timeLabel(message.createdAt)}</small></div>)}</div>
        <div className="dm-composer"><input value={messageDraft} onChange={e => setMessageDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Viết tin nhắn…" maxLength={4000} /><button className="icon-button" type="button" onClick={() => void sendMessage()} disabled={sendingMessage || !messageDraft.trim()} aria-label="Gửi"><Icon name="arrow" size={15} /></button></div>
      </section>}

      {account && <section className="community-guideline"><span className="small-label">MỘT QUY ƯỚC NHỎ</span><p>Tôn trọng nhau. Chia sẻ điều hữu ích. Không spam link. Phòng Meet là nơi học, diễn đàn là nơi nói chuyện.</p></section>}
    </aside>
  </div>;
}

function ForumComments({ account, comments, draft, replyId, onDraft, onReply, onSend, onDirect }: {
  account: DashboardData["account"]; comments: Comment[]; draft: string; replyId: number | null;
  onDraft: (value: string) => void; onReply: (id: number | null) => void; onSend: () => void; onDirect: (person: Person) => void;
}) {
  const top = comments.filter(comment => !comment.parentId);
  return <div className="forum-comments">
    {comments.length === 0 ? <p className="comment-empty">Chưa có bình luận. Hãy mở lời trước.</p> : top.map(comment => <div className="comment-block" key={comment.id}>
      <CommentLine comment={comment} onReply={onReply} onDirect={onDirect} />
      <div className="comment-replies">{comments.filter(child => child.parentId === comment.id).map(child => <CommentLine compact key={child.id} comment={child} onReply={onReply} onDirect={onDirect} />)}</div>
    </div>)}
    <div className="comment-composer">{replyId && <div className="replying">Đang trả lời một bình luận <button type="button" onClick={() => onReply(null)}>Hủy</button></div>}<div className="comment-input-row"><span className="community-avatar small">{account ? avatar(account.name, account.picture) : "?"}</span><input value={draft} onChange={e => onDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={account ? "Viết bình luận…" : "Đăng nhập để bình luận"} disabled={!account} maxLength={2000} /><button className="icon-button" type="button" onClick={onSend} disabled={!account || !draft.trim()}><Icon name="arrow" size={15} /></button></div></div>
  </div>;
}
function CommentLine({ comment, compact = false, onReply, onDirect }: { comment: Comment; compact?: boolean; onReply: (id: number | null) => void; onDirect: (person: Person) => void }) {
  return <div className={compact ? "comment-line compact" : "comment-line"}><span className="community-avatar small">{avatar(comment.authorName, comment.authorPicture)}</span><div><div className="comment-line-meta"><strong>{comment.authorName}</strong><span>{timeLabel(comment.createdAt)}</span></div><p>{comment.body}</p><div className="comment-line-actions"><button type="button" onClick={() => onReply(comment.id)}>Trả lời</button><button type="button" onClick={() => onDirect({ id: comment.authorId, name: comment.authorName, picture: comment.authorPicture })}>Nhắn riêng</button></div></div></div>;
}
