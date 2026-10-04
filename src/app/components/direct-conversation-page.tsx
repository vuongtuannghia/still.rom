"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";
import { ProfileAvatarMenu } from "./profile-avatar-menu";

type Relationship = "friend" | "lookup" | "incoming" | "outgoing" | "conversation" | "blocked";
type Person = { id: string; name: string; email: string; picture: string | null; relationship?: Relationship; requestId?: number };
type Message = { id: number; senderId: string; body: string; createdAt: string; readAt: string | null };
type BlockStatus = "none" | "blocked_by_me" | "blocked_you";

function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return minutes + " phút";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " giờ";
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function DirectConversationPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params.userId;
  const [account, setAccount] = useState<DashboardData["account"]>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [relationship, setRelationship] = useState<Relationship>("lookup");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [blockStatus, setBlockStatus] = useState<BlockStatus>("none");
  const [notice, setNotice] = useState("");

  async function loadIdentity() {
    const statusResponse = await fetch("/api/account/status", { cache: "no-store" });
    if (!statusResponse.ok) throw new Error("Đăng nhập Google để nhắn tin.");
    const status = await statusResponse.json() as { account: DashboardData["account"] };
    if (!status.account) throw new Error("Đăng nhập Google để nhắn tin.");
    setAccount(status.account);

    const profileResponse = await fetch("/api/users/" + encodeURIComponent(userId), { cache: "no-store", credentials: "same-origin" });
    const profilePayload = await profileResponse.json().catch(() => ({})) as { profile?: { id: string; name: string; email: string | null; picture: string | null }; relationship?: Relationship; relationshipRequestId?: number | null; error?: string };
    if (!profileResponse.ok || !profilePayload.profile) throw new Error(profilePayload.error || "Không tìm thấy tài khoản.");
    const nextPerson: Person = {
      id: profilePayload.profile.id,
      name: profilePayload.profile.name,
      email: profilePayload.profile.email ?? "",
      picture: profilePayload.profile.picture,
      relationship: profilePayload.relationship ?? "lookup",
      requestId: profilePayload.relationshipRequestId ?? undefined,
    };
    setPerson(nextPerson);
    setRelationship(nextPerson.relationship ?? "lookup");
  }

  async function loadMessages(currentPerson = person) {
    if (!currentPerson) return;
    const blockResponse = await fetch("/api/blocks?userId=" + encodeURIComponent(currentPerson.id), { cache: "no-store", credentials: "same-origin" });
    if (blockResponse.ok) {
      const block = await blockResponse.json() as { status: BlockStatus };
      setBlockStatus(block.status);
      if (block.status !== "none") {
        setMessages([]);
        return;
      }
    }
    const response = await fetch("/api/messages?with=" + encodeURIComponent(currentPerson.id) + "&email=" + encodeURIComponent(currentPerson.email), { cache: "no-store", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({})) as { messages?: Message[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Không thể mở cuộc trò chuyện.");
    setMessages(payload.messages ?? []);
  }

  async function refresh() {
    try {
      setLoading(true);
      await loadIdentity();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể mở tin nhắn.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, [userId]);

  useEffect(() => {
    if (!person || !account) return;
    void loadMessages(person).catch(error => setNotice(error instanceof Error ? error.message : "Không tải được tin nhắn."));
    const timer = window.setInterval(() => { void loadMessages(person).catch(() => {}); }, 3000);
    return () => window.clearInterval(timer);
  }, [person?.id, account?.id, blockStatus]);

  async function sendMessage() {
    if (!person || !draft.trim() || sending || blockStatus !== "none") return;
    setSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: person.id, recipientEmail: person.email, body: draft.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: Message; error?: string };
      if (!response.ok || !payload.message) throw new Error(payload.error || "Không thể gửi tin nhắn.");
      setMessages(current => [...current, payload.message!]);
      setDraft("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể gửi tin nhắn."); }
    finally { setSending(false); }
  }

  async function sendFriendRequest() {
    if (!person) return;
    try {
      const response = await fetch("/api/friends", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: person.id }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể gửi lời mời.");
      setRelationship("outgoing");
      setPerson(current => current ? { ...current, relationship: "outgoing" } : current);
      setNotice("Đã gửi lời mời kết bạn.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể gửi lời mời."); }
  }

  async function respondToIncoming(action: "accept" | "reject") {
    if (!person?.requestId) return;
    try {
      const response = await fetch("/api/friends/requests/" + person.requestId, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể xử lý lời mời.");
      setRelationship(action === "accept" ? "friend" : "lookup");
      setPerson(current => current ? { ...current, relationship: action === "accept" ? "friend" : "lookup", requestId: undefined } : current);
      setNotice(action === "accept" ? "Đã kết bạn." : "Đã từ chối lời mời.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể xử lý lời mời."); }
  }

  async function cancelRequest() {
    if (!person?.requestId) return;
    try {
      const response = await fetch("/api/friends/requests/" + person.requestId, { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể hủy lời mời.");
      setRelationship("lookup");
      setPerson(current => current ? { ...current, relationship: "lookup", requestId: undefined } : current);
      setNotice("Đã hủy lời mời.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể hủy lời mời."); }
  }

  async function unfriend() {
    if (!person || !window.confirm("Hủy kết bạn với tài khoản này?")) return;
    try {
      const response = await fetch("/api/friends?userId=" + encodeURIComponent(person.id), { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể hủy kết bạn.");
      setRelationship("lookup");
      setPerson(current => current ? { ...current, relationship: "lookup" } : current);
      setNotice("Đã hủy kết bạn.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể hủy kết bạn."); }
  }

  async function toggleBlock() {
    if (!person) return;
    const blocked = blockStatus === "blocked_by_me";
    try {
      const response = await fetch("/api/blocks", {
        method: blocked ? "DELETE" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: person.id }),
      });
      const payload = await response.json().catch(() => ({})) as { status?: BlockStatus; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể cập nhật chặn.");
      setBlockStatus(payload.status ?? (blocked ? "none" : "blocked_by_me"));
      setMessages([]);
      setNotice(blocked ? "Đã bỏ chặn." : "Đã chặn tài khoản này.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật chặn."); }
  }

  if (loading) return <section className="direct-chat-page"><div className="direct-chat-loading">Đang mở cuộc trò chuyện…</div></section>;

  return <section className="direct-chat-page">
    {notice && <div className="community-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}
    {!account || !person ? <div className="direct-chat-loading"><strong>Không thể mở cuộc trò chuyện.</strong><button type="button" className="button-secondary" onClick={() => router.push("/tin-nhan")}>Về tin nhắn</button></div> :
      <div className="direct-chat-card">
        <header className="direct-chat-header">
          <div className="direct-chat-person">
            <ProfileAvatarMenu id={person.id} name={person.name} picture={person.picture} size="large" />
            <div><h2>{person.name}</h2><span>{relationship === "friend" ? "Bạn bè · tin nhắn chính" : "Tin nhắn chờ · chưa kết bạn"}</span></div>
          </div>
          <div className="direct-chat-actions">
            <button type="button" className="button-secondary" onClick={() => router.push("/nguoi-dung/" + person.id)}>Xem hồ sơ</button>
            {relationship === "friend" ? <button type="button" className="button-secondary" onClick={() => void unfriend()}>Hủy kết bạn</button> :
             relationship === "outgoing" ? <button type="button" className="button-secondary" onClick={() => void cancelRequest()}>Hủy lời mời</button> :
             relationship === "incoming" ? <button type="button" className="button-secondary" onClick={() => void respondToIncoming("accept")}>Chấp nhận</button> :
             relationship !== "blocked" && <button type="button" className="button-secondary" onClick={() => void sendFriendRequest()}>Kết bạn</button>}
            <button type="button" className="chat-block-btn" onClick={() => void toggleBlock()} disabled={blockStatus === "blocked_you"}>{blockStatus === "blocked_by_me" ? "Bỏ chặn" : "Chặn"}</button>
          </div>
        </header>

        {relationship !== "friend" && <div className="pending-message-banner"><strong>Tin nhắn chờ</strong><span>Người này chưa là bạn bè. Bạn vẫn có thể trò chuyện hoặc gửi lời mời kết bạn.</span></div>}

        <div className="direct-chat-messages">
          {blockStatus === "blocked_by_me" ? <div className="direct-chat-empty"><strong>Bạn đã chặn người này.</strong><span>Bỏ chặn để tiếp tục.</span></div> :
           blockStatus === "blocked_you" ? <div className="direct-chat-empty"><strong>Bạn đã bị chặn.</strong><span>Bạn không thể gửi tin nhắn.</span></div> :
           messages.length === 0 ? <div className="direct-chat-empty"><strong>Bắt đầu cuộc trò chuyện.</strong><span>Gửi một lời chào.</span></div> :
           messages.map(message => <article key={message.id} className={message.senderId === account.id ? "direct-bubble mine" : "direct-bubble"}><p>{message.body}</p><small>{timeLabel(message.createdAt)}</small></article>)}
        </div>

        {blockStatus === "none" && <div className="direct-chat-composer"><input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Viết tin nhắn…" maxLength={4000} /><button className="button-primary" type="button" onClick={() => void sendMessage()} disabled={sending || !draft.trim()}>Gửi</button></div>}
      </div>}
  </section>;
}
