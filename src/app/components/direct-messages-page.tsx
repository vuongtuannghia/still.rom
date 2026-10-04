"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";
import { ProfileActionMenu } from "./profile-action-menu";

type Relationship = "friend" | "lookup" | "incoming" | "outgoing" | "conversation" | "blocked";
type Person = { id: string; name: string; email: string; picture: string | null; relationship?: Relationship; requestId?: number };
type FriendRequest = {
  id: number;
  senderId?: string;
  recipientId?: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  senderPicture?: string | null;
  recipientPicture?: string | null;
  createdAt: string;
};
type Thread = {
  threadId: number;
  other: Person;
  isFriend: boolean;
  lastBody: string;
  lastSenderId: string;
  lastCreatedAt: string;
  unreadCount: number;
};
type FriendsPayload = { friends: Person[]; incoming: FriendRequest[]; outgoing: FriendRequest[]; blocks?: string[] };

function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return minutes + " phút";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " giờ";
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
function initial(name: string) {
  return name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U";
}

export function DirectMessagesPage({ initialUserId }: { initialUserId?: string } = {}) {
  const router = useRouter();
  const [account, setAccount] = useState<DashboardData["account"]>(null);
  const [friends, setFriends] = useState<Person[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
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
      if (!response.ok || !("friends" in payload)) throw new Error(("error" in payload && payload.error) || "Không tải được danh sách kết nối.");
      setFriends(payload.friends);
      setIncoming(payload.incoming);
      setOutgoing(payload.outgoing);
      setBlockedIds(payload.blocks ?? []);
      setSearchResults(current => current.map(person => {
        const friend = payload.friends.some(item => item.id === person.id);
        const incomingRequest = payload.incoming.find(item => item.senderId === person.id);
        const outgoingRequest = payload.outgoing.find(item => item.recipientId === person.id);
        return {
          ...person,
          relationship: friend ? "friend" : incomingRequest ? "incoming" : outgoingRequest ? "outgoing" : person.relationship === "blocked" ? "blocked" : "lookup",
          requestId: incomingRequest?.id ?? outgoingRequest?.id,
        };
      }));
      setSelected(current => {
        if (!current) return current;
        if ((payload.blocks ?? []).includes(current.id)) return { ...current, relationship: "blocked" };
        if (payload.friends.some(friend => friend.id === current.id)) return { ...current, relationship: "friend" };
        const outgoing = payload.outgoing.find(item => item.recipientId === current.id);
        if (outgoing) return { ...current, relationship: "outgoing", requestId: outgoing.id };
        const incoming = payload.incoming.find(item => item.senderId === current.id);
        if (incoming) return { ...current, relationship: "incoming", requestId: incoming.id };
        return { ...current, relationship: "conversation" };
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được kết nối.");
    } finally { setLoading(false); }
  }

  async function loadThreads() {
    try {
      const response = await fetch("/api/messages/threads", { cache: "no-store", credentials: "same-origin" });
      if (response.ok) setThreads(await response.json() as Thread[]);
    } catch {}
  }

  useEffect(() => { void loadStatus(); }, []);

  useEffect(() => {
    if (!account || !initialUserId) return;
    void (async () => {
      try {
        const response = await fetch("/api/users/" + encodeURIComponent(initialUserId), { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const payload = await response.json() as { profile: { id: string; name: string; email: string | null; picture: string | null }; relationship?: Relationship };
        if (payload.profile) {
          await openConversation({
            id: payload.profile.id,
            name: payload.profile.name,
            email: payload.profile.email ?? "",
            picture: payload.profile.picture,
            relationship: payload.relationship ?? "lookup",
          });
        }
      } catch {}
    })();
  }, [account?.id, initialUserId]);
  useEffect(() => {
    if (!account) return;
    void loadFriends();
    void loadThreads();
    const timer = window.setInterval(() => { void loadFriends(); void loadThreads(); }, 5000);
    return () => window.clearInterval(timer);
  }, [account?.id]);

  const relationshipFor = (id: string): Relationship => {
    if (blockedIds.includes(id)) return "blocked";
    if (friends.some(friend => friend.id === id)) return "friend";
    if (incoming.some(request => request.senderId === id)) return "incoming";
    if (outgoing.some(request => request.recipientId === id)) return "outgoing";
    return "lookup";
  };

  useEffect(() => {
    if (!account || !query.trim()) { setSearchResults([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/messages/users?q=" + encodeURIComponent(query.trim()), { cache: "no-store", credentials: "same-origin" });
        const rows = response.ok ? await response.json() as Person[] : [];
        setSearchResults(rows.map(person => ({ ...person, relationship: relationshipFor(person.id) })));
      } catch { setSearchResults([]); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, account?.id, friends, incoming, outgoing, blockedIds]);

  async function sendFriendRequest(person: Person) {
    try {
      const response = await fetch("/api/friends", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: person.id }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể gửi lời mời.");
      setNotice("Đã gửi lời mời kết bạn.");
      await loadFriends();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể gửi lời mời."); }
  }

  async function respondToRequest(requestId: number, action: "accept" | "reject") {
    try {
      const response = await fetch("/api/friends/requests/" + requestId, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể xử lý lời mời.");
      await loadFriends();
      await loadThreads();
      setNotice(action === "accept" ? "Đã kết bạn." : "Đã từ chối lời mời.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể xử lý lời mời."); }
  }

  async function cancelFriendRequest(requestId?: number) {
    if (!requestId) return;
    try {
      const response = await fetch("/api/friends/requests/" + requestId, { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể hủy lời mời.");
      await loadFriends();
      setNotice("Đã hủy lời mời kết bạn.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể hủy lời mời."); }
  }

  async function unfriend(userId: string) {
    if (!window.confirm("Hủy kết bạn với tài khoản này?")) return;
    try {
      const response = await fetch("/api/friends?userId=" + encodeURIComponent(userId), { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể hủy kết bạn.");
      await loadFriends();
      await loadThreads();
      setSearchResults(current => current.map(person => person.id === userId ? { ...person, relationship: "lookup", requestId: undefined } : person));
      setNotice("Đã hủy kết bạn.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể hủy kết bạn."); }
  }

  const primaryThreads = useMemo(() => threads.filter(thread => thread.isFriend && !blockedIds.includes(thread.other.id)), [threads, blockedIds]);
  const pendingThreads = useMemo(() => threads.filter(thread => !thread.isFriend && !blockedIds.includes(thread.other.id)), [threads, blockedIds]);
  const incomingCount = incoming.length;

  return <section className="messages-page">
    {notice && <div className="community-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}

    {!account ? <div className="messages-login-card"><div className="messages-big-icon"><Icon name="signal" size={23} /></div><h2>Đăng nhập để nhắn tin.</h2><p>Kết bạn, nhận tin nhắn chờ và trò chuyện riêng.</p></div> :
      <div className="messages-inbox-page">
        <header className="messages-inbox-hero">
          <div><span className="community-kicker"><span /> STILL / MESSAGES</span><h2>Tin nhắn.</h2><p>Bạn bè ở hộp thư chính. Người lạ sẽ đi vào Tin nhắn chờ.</p></div>
          <div className="messages-hero-mark">01<br />/—/</div>
        </header>

        <div className="messages-inbox-layout">
          <main className="messages-inbox-main">
            <section className="message-list-section">
              <div className="message-list-title"><div><span className="small-label">TIN NHẮN CHÍNH</span><h3>Bạn bè</h3></div><span>{primaryThreads.length}</span></div>
              {primaryThreads.length === 0 ? <div className="message-list-empty">Chưa có cuộc trò chuyện với bạn bè.</div> :
                primaryThreads.map(thread => <div className="message-row" role="button" tabIndex={0} key={thread.threadId} onClick={() => router.push("/tin-nhan?user=" + encodeURIComponent(thread.other.id) + (thread.other.email ? "&email=" + encodeURIComponent(thread.other.email) : ""))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") router.push("/tin-nhan?user=" + encodeURIComponent(thread.other.id) + (thread.other.email ? "&email=" + encodeURIComponent(thread.other.email) : "")); }}>
                  <ProfileActionMenu person={{ id: thread.other.id, name: thread.other.name, picture: thread.other.picture }}><span className="community-avatar">{thread.other.picture ? <img src={thread.other.picture} alt="" /> : initial(thread.other.name)}</span></ProfileActionMenu>
                  <span className="message-row-copy"><strong>{thread.other.name}</strong><small>{thread.lastBody}</small></span>
                  <span className="message-row-meta"><span>{timeLabel(thread.lastCreatedAt)}</span>{thread.unreadCount > 0 && <b>{thread.unreadCount}</b>}</span>
                </div>)
              }
            </section>

            <section className="message-list-section pending-message-section">
              <div className="message-list-title"><div><span className="small-label">TIN NHẮN CHỜ</span><h3>Người lạ</h3></div><span>{pendingThreads.length}</span></div>
              {pendingThreads.length === 0 ? <div className="message-list-empty">Không có tin nhắn chờ.</div> :
                pendingThreads.map(thread => <div className="message-row pending" role="button" tabIndex={0} key={thread.threadId} onClick={() => router.push("/tin-nhan?user=" + encodeURIComponent(thread.other.id) + (thread.other.email ? "&email=" + encodeURIComponent(thread.other.email) : ""))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") router.push("/tin-nhan/" + thread.other.id); }}>
                  <ProfileActionMenu person={{ id: thread.other.id, name: thread.other.name, picture: thread.other.picture }}><span className="community-avatar">{thread.other.picture ? <img src={thread.other.picture} alt="" /> : initial(thread.other.name)}</span></ProfileActionMenu>
                  <span className="message-row-copy"><strong>{thread.other.name}</strong><small>{thread.lastBody}</small></span>
                  <span className="message-row-meta"><span>{timeLabel(thread.lastCreatedAt)}</span>{thread.unreadCount > 0 && <b>{thread.unreadCount}</b>}</span>
                </div>)
              }
            </section>
          </main>

          <aside className="messages-inbox-side">
            <section className="messages-connection-card">
              <div className="message-list-title"><div><span className="small-label">KẾT NỐI</span><h3>Bạn bè</h3></div><span>{friends.length}</span></div>
              <div className="messages-search"><Icon name="target" size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nhập đúng email…" /></div>
              {query.trim() ? <div className="friend-search-results">
                {searchResults.length === 0 ? <p className="messages-muted">Không tìm thấy tài khoản.</p> :
                  searchResults.map(person => {
                    const relation = relationshipFor(person.id);
                    return <div className="friend-search-row" key={person.id}>
                      <ProfileActionMenu person={{ id: person.id, name: person.name, picture: person.picture }}><span className="community-avatar small">{person.picture ? <img src={person.picture} alt="" /> : initial(person.name)}</span></ProfileActionMenu>
                      <div className="friend-search-copy"><strong>{person.name}</strong><small>{person.email}</small></div>
                      {relation === "friend" ? <button type="button" onClick={() => void unfriend(person.id)}>Hủy kết bạn</button> :
                       relation === "outgoing" ? <button type="button" onClick={() => void cancelFriendRequest(person.requestId)}>Hủy lời mời</button> :
                       relation === "incoming" ? <div className="mini-request-actions"><button type="button" onClick={() => void respondToRequest(person.requestId!, "accept")}>Nhận</button><button type="button" onClick={() => void respondToRequest(person.requestId!, "reject")}>Từ</button></div> :
                       relation === "blocked" ? <span>Đã chặn</span> :
                       <button className="dark-mini-btn" type="button" onClick={() => void sendFriendRequest(person)}>Kết bạn</button>}
                    </div>;
                  })}
              </div> : <>
                {incomingCount > 0 && <div className="friend-requests-mini"><div className="small-label">LỜI MỜI MỚI</div>{incoming.slice(0, 4).map(request => <div className="mini-request-row" key={request.id}><ProfileActionMenu person={{ id: request.senderId!, name: request.senderName ?? "U", picture: request.senderPicture ?? null }}><span className="community-avatar small">{(request.senderName ?? "U").slice(0, 1).toUpperCase()}</span></ProfileActionMenu><span><strong>{request.senderName}</strong><small>{request.senderEmail}</small></span><button type="button" onClick={() => void respondToRequest(request.id, "accept")}>✓</button><button type="button" onClick={() => void respondToRequest(request.id, "reject")}>×</button></div>)}</div>}
                {outgoing.length > 0 && <div className="friend-outgoing-mini">{outgoing.slice(0, 4).map(request => <div key={request.id}><span>{request.recipientName}</span><button type="button" onClick={() => void cancelFriendRequest(request.id)}>Hủy</button></div>)}</div>}
              </>}
            </section>

            <section className="messages-tip-card">
              <span className="small-label">MỘT QUY TẮC NHỎ</span>
              <p>Bạn bè có thể nhắn ngay. Người lạ vẫn có thể gửi tin nhưng sẽ nằm ở Tin nhắn chờ.</p>
            </section>
          </aside>
        </div>
      </div>}
  </section>;
}
