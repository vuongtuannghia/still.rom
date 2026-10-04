"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

type Person = {
  id: string; name: string; email: string; picture: string | null;
  relationship?: "friend" | "lookup" | "incoming" | "outgoing"; requestId?: number;
};
type Message = { id: number; senderId: string; body: string; createdAt: string; readAt: string | null };
type FriendRequest = { id: number; senderId?: string; recipientId?: string; senderName?: string; senderEmail?: string; recipientName?: string; recipientEmail?: string; senderPicture?: string | null; recipientPicture?: string | null; createdAt: string };
type FriendsPayload = { friends: Person[]; incoming: FriendRequest[]; outgoing: FriendRequest[] };

function initials(name: string) {
  return name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U";
}
function avatar(person: { name: string; picture: string | null }) {
  return person.picture ? <img src={person.picture} alt="" /> : initials(person.name);
}
function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function DirectMessagesPage() {
  const [account, setAccount] = useState<DashboardData["account"]>(null);
  const [friends, setFriends] = useState<Person[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<Person | null>(null);
  const [selected, setSelected] = useState<Person | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadStatus() {
    try {
      const response = await fetch("/api/account/status", { cache: "no-store" });
      if (response.ok) setAccount((await response.json() as { account: DashboardData["account"] }).account);
    } catch {}
  }

  async function loadFriends() {
    try {
      const response = await fetch("/api/friends", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as FriendsPayload | { error?: string };
      if (!response.ok || !("friends" in payload)) throw new Error(("error" in payload && payload.error) || "Không tải được danh sách bạn bè.");
      setFriends(payload.friends);
      setIncoming(payload.incoming);
      setOutgoing(payload.outgoing);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được bạn bè.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadStatus(); }, []);
  useEffect(() => { if (account) void loadFriends(); }, [account?.id]);

  // By default / empty search only shows friends. Typing anything searches by exact email.
  useEffect(() => {
    if (!account) return;
    if (!query.trim()) { setLookup(null); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/messages/users?q=${encodeURIComponent(query.trim())}`, { cache: "no-store", credentials: "same-origin" });
        const rows = response.ok ? await response.json() as Person[] : [];
        setLookup(rows[0] ?? null);
      } catch { setLookup(null); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, account?.id]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("user");
    const email = new URLSearchParams(window.location.search).get("email") ?? "";
    if (!id || !account) return;
    (async () => {
      try {
        const response = await fetch(`/api/messages/users?q=${encodeURIComponent(email)}`, { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const found = (await response.json() as Person[]).find(item => item.id === id);
        if (found) void openConversation(found);
      } catch {}
    })();
  }, [account?.id]);

  async function openConversation(person: Person) {
    setSelected(person);
    setSelectedEmail(person.email);
    setLoadingChat(true);
    try {
      const emailParam = person.relationship === "friend" ? "" : `&email=${encodeURIComponent(person.email)}`;
      const response = await fetch(`/api/messages?with=${person.id}${emailParam}`, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { other?: Person; messages?: Message[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể mở cuộc trò chuyện.");
      setSelected(payload.other ?? person);
      setSelectedEmail((payload.other ?? person).email);
      setMessages(payload.messages ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể mở cuộc trò chuyện.");
    } finally { setLoadingChat(false); }
  }

  async function sendFriendRequest() {
    if (!lookup) return;
    try {
      const response = await fetch("/api/friends", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lookup.email }),
      });
      const payload = await response.json().catch(() => ({})) as { request?: FriendRequest; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể gửi lời mời.");
      setLookup({ ...lookup, relationship: "outgoing", requestId: payload.request?.id });
      setOutgoing(current => payload.request ? [payload.request, ...current] : current);
      setNotice("Đã gửi lời mời kết bạn.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể gửi lời mời."); }
  }

  async function respondToRequest(requestId: number, action: "accept" | "reject") {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể xử lý lời mời.");
      await loadFriends();
      setNotice(action === "accept" ? "Đã chấp nhận lời mời." : "Đã từ chối lời mời.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể xử lý lời mời."); }
  }

  async function sendMessage() {
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selected.id, recipientEmail: selectedEmail, body: draft.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: Message; error?: string };
      if (!response.ok || !payload.message) throw new Error(payload.error || "Không thể gửi tin nhắn.");
      setMessages(current => [...current, payload.message!]);
      setDraft("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể gửi tin nhắn."); }
    finally { setSending(false); }
  }

  useEffect(() => {
    if (!selected || !account) return;
    const timer = window.setInterval(async () => {
      try {
        const emailParam = selected.relationship === "friend" ? "" : `&email=${encodeURIComponent(selectedEmail)}`;
        const response = await fetch(`/api/messages?with=${selected.id}${emailParam}`, { cache: "no-store", credentials: "same-origin" });
        if (response.ok) setMessages((await response.json() as { messages: Message[] }).messages);
      } catch {}
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selected?.id, selected?.relationship, selectedEmail, account?.id]);

  const shownFriends = useMemo(() => friends, [friends]);

  return <section className="messages-page">
    {notice && <div className="community-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}
    {!account ? <div className="messages-login-card"><span className="messages-big-icon"><Icon name="signal" size={23} /></span><h2>Đăng nhập để nhắn tin riêng.</h2><p>Bạn bè và tìm kiếm email đều được quản lý riêng tư.</p></div> :
      <div className="messages-layout">
        <aside className="messages-people panel">
          <div className="messages-panel-head"><div><span className="small-label">KẾT NỐI</span><h3>Bạn bè</h3></div><span>{friends.length}</span></div>
          <div className="messages-search"><Icon name="target" size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nhập đúng email để tìm…" /></div>

          {query.trim() && <div className="friend-lookup">
            {!lookup ? <span className="messages-muted">Không tìm thấy tài khoản với email này.</span> :
              <div className="lookup-card"><span className="community-avatar">{avatar(lookup)}</span><div><strong>{lookup.name}</strong><small>{lookup.email}</small></div>
                {lookup.relationship === "friend" ? <span className="relationship-label">Bạn bè</span> :
                 lookup.relationship === "outgoing" ? <span className="relationship-label">Đã gửi lời mời</span> :
                 lookup.relationship === "incoming" ? <div className="lookup-actions"><button type="button" onClick={() => void respondToRequest(lookup.requestId!, "accept")}>Chấp nhận</button><button type="button" onClick={() => void respondToRequest(lookup.requestId!, "reject")}>Từ chối</button></div> :
                 <button className="button-primary" type="button" onClick={() => void sendFriendRequest()}>Kết bạn</button>}
              </div>
            }
          </div>}

          {!query.trim() && <div className="friend-request-box">
            {incoming.length > 0 && <div><span className="small-label">LỜI MỜI MỚI</span>{incoming.map(request => <div className="friend-request-row" key={request.id}><span className="community-avatar small">{avatar({ name: request.senderName ?? "U", picture: request.senderPicture ?? null })}</span><span><strong>{request.senderName}</strong><small>{request.senderEmail}</small></span><button type="button" onClick={() => void respondToRequest(request.id, "accept")}>✓</button><button type="button" onClick={() => void respondToRequest(request.id, "reject")}>×</button></div>)}</div>}
            {outgoing.length > 0 && <div className="friend-outgoing"><span className="small-label">ĐÃ GỬI</span>{outgoing.map(request => <div key={request.id}>{request.recipientName} · đang chờ</div>)}</div>}
          </div>}

          <div className="messages-people-list">
            {loading ? <p className="messages-muted">Đang tải…</p> :
              shownFriends.length === 0 ? <p className="messages-muted">{query.trim() ? "Tìm bằng email để kết nối với người khác." : "Chưa có bạn bè. Nhập đúng email để tìm người."}</p> :
              shownFriends.map(person => <button type="button" key={person.id} className={selected?.id === person.id ? "message-person active" : "message-person"} onClick={() => void openConversation(person)}>
                <span className="community-avatar">{avatar(person)}</span><span><strong>{person.name}</strong><small>{person.email}</small></span><Icon name="arrow" size={13} />
              </button>)
            }
          </div>
        </aside>

        <section className="messages-chat panel">
          {selected ? <>
            <header className="messages-chat-head"><div className="message-person-head"><span className="community-avatar">{avatar(selected)}</span><div><h3>{selected.name}</h3><span>Cuộc trò chuyện riêng</span></div></div></header>
            <div className="messages-list">
              {loadingChat ? <div className="messages-muted centered">Đang mở cuộc trò chuyện…</div> :
                messages.length === 0 ? <div className="messages-empty"><div className="empty-orbit">+</div><strong>Bắt đầu bằng một câu đơn giản.</strong><span>Chào người bạn muốn học cùng.</span></div> :
                messages.map(message => <article key={message.id} className={message.senderId === account.id ? "message-bubble mine" : "message-bubble"}><p>{message.body}</p><small>{timeLabel(message.createdAt)}</small></article>)
              }
            </div>
            <div className="messages-composer"><input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Viết tin nhắn…" maxLength={4000} /><button className="button-primary" type="button" onClick={() => void sendMessage()} disabled={sending || !draft.trim()}><Icon name="arrow" size={15} /> Gửi</button></div>
          </> : <div className="messages-empty messages-empty-large"><div className="messages-big-icon"><Icon name="arrow" size={24} /></div><strong>Chọn một người bạn.</strong><span>Danh sách chỉ hiện bạn bè; tìm người khác bằng email chính xác.</span></div>}
        </section>
      </div>}
  </section>;
}
