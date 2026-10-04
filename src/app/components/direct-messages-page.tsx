"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

type Relationship = "friend" | "lookup" | "incoming" | "outgoing" | "conversation" | "blocked";

type Person = {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  relationship?: Relationship;
  requestId?: number;
};

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

type FriendsPayload = {
  friends: Person[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  blocks?: string[];
};

type Message = {
  id: number;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
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

type BlockStatus = "none" | "blocked_by_me" | "blocked_you";

function initials(name: string) {
  return name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U";
}

function Avatar({ person, small = false }: { person: { name: string; picture: string | null }; small?: boolean }) {
  return <span className={small ? "community-avatar small" : "community-avatar"}>
    {person.picture ? <img src={person.picture} alt="" /> : initials(person.name)}
  </span>;
}

function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return minutes + " phút";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " giờ";
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function DirectMessagesPage() {
  const router = useRouter();
  const [account, setAccount] = useState<DashboardData["account"]>(null);
  const [friends, setFriends] = useState<Person[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingOpen, setPendingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [blockStatus, setBlockStatus] = useState<BlockStatus>("none");

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
      if (!response.ok || !("friends" in payload)) throw new Error(("error" in payload && payload.error) || "Không tải được bạn bè.");
      setFriends(payload.friends);
      setIncoming(payload.incoming);
      setOutgoing(payload.outgoing);
      setBlockedIds(payload.blocks ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được bạn bè.");
    } finally {
      setLoading(false);
    }
  }

  async function loadThreads() {
    try {
      const response = await fetch("/api/messages/threads", { cache: "no-store", credentials: "same-origin" });
      if (response.ok) setThreads(await response.json() as Thread[]);
    } catch {}
  }

  useEffect(() => { void loadStatus(); }, []);

  useEffect(() => {
    if (!account) return;
    void loadFriends();
    void loadThreads();
    const timer = window.setInterval(() => {
      void loadFriends();
      void loadThreads();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [account?.id]);

  const relationshipFor = (id: string): Relationship => {
    if (blockedIds.includes(id)) return "blocked";
    if (friends.some(friend => friend.id === id)) return "friend";
    const incomingRequest = incoming.find(request => request.senderId === id);
    if (incomingRequest) return "incoming";
    const outgoingRequest = outgoing.find(request => request.recipientId === id);
    if (outgoingRequest) return "outgoing";
    return "lookup";
  };

  useEffect(() => {
    if (!account || !query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/messages/users?q=" + encodeURIComponent(query.trim()), { cache: "no-store", credentials: "same-origin" });
        const rows = response.ok ? await response.json() as Person[] : [];
        setSearchResults(rows.map(person => ({ ...person, relationship: relationshipFor(person.id) })));
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, account?.id, friends, incoming, outgoing, blockedIds]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("user");
    if (!account || !id) return;
    const thread = threads.find(item => item.other.id === id);
    if (thread) {
      void openConversation({ ...thread.other, relationship: thread.isFriend ? "friend" : "conversation" });
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/users/" + encodeURIComponent(id), { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const payload = await response.json() as { profile: Person; relationship?: Relationship };
        if (payload.profile) {
          void openConversation({
            id: payload.profile.id,
            name: payload.profile.name,
            email: payload.profile.email ?? "",
            picture: payload.profile.picture,
            relationship: payload.relationship ?? relationshipFor(payload.profile.id),
          });
        }
      } catch {}
    })();
  }, [account?.id, threads.length]);

  async function openConversation(person: Person) {
    if (relationshipFor(person.id) === "blocked") {
      setNotice("Tài khoản này đang bị chặn.");
      return;
    }
    const relationship = friends.some(friend => friend.id === person.id)
      ? "friend"
      : relationshipFor(person.id) === "outgoing"
      ? "outgoing"
      : relationshipFor(person.id) === "incoming"
      ? "incoming"
      : person.relationship === "conversation"
      ? "conversation"
      : "lookup";

    setSelected({ ...person, relationship });
    setLoadingChat(true);
    setBlockStatus("none");
    try {
      const blockResponse = await fetch("/api/blocks?userId=" + encodeURIComponent(person.id), { cache: "no-store", credentials: "same-origin" });
      if (blockResponse.ok) {
        const block = await blockResponse.json() as { status: BlockStatus };
        setBlockStatus(block.status);
        if (block.status !== "none") {
          setLoadingChat(false);
          return;
        }
      }

      const response = await fetch("/api/messages?with=" + encodeURIComponent(person.id), { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { other?: Person; messages?: Message[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể mở cuộc trò chuyện.");
      const other = payload.other ?? person;
      setSelected({ ...other, relationship });
      setMessages(payload.messages ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể mở cuộc trò chuyện.");
    } finally {
      setLoadingChat(false);
    }
  }

  async function sendFriendRequest(person: Person) {
    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: person.id }),
      });
      const payload = await response.json().catch(() => ({})) as { request?: FriendRequest; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể gửi lời mời.");
      setNotice("Đã gửi lời mời kết bạn.");
      await loadFriends();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể gửi lời mời.");
    }
  }

  async function cancelFriendRequest(requestId?: number) {
    if (!requestId) return;
    try {
      const response = await fetch("/api/friends/requests/" + requestId, { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể hủy lời mời.");
      setNotice("Đã hủy lời mời kết bạn.");
      await loadFriends();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể hủy lời mời.");
    }
  }

  async function respondToRequest(requestId: number, action: "accept" | "reject") {
    try {
      const response = await fetch("/api/friends/requests/" + requestId, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể xử lý lời mời.");
      await loadFriends();
      await loadThreads();
      setNotice(action === "accept" ? "Đã kết bạn." : "Đã từ chối lời mời.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể xử lý lời mời.");
    }
  }

  async function toggleBlock(userId: string) {
    const blocked = blockStatus === "blocked_by_me";
    try {
      const response = await fetch("/api/blocks", {
        method: blocked ? "DELETE" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; status?: BlockStatus };
      if (!response.ok) throw new Error(payload.error || "Không thể cập nhật chặn.");
      if (!blocked) {
        setBlockedIds(current => current.includes(userId) ? current : [...current, userId]);
        setFriends(current => current.filter(friend => friend.id !== userId));
        setSelected(null);
        setMessages([]);
        setBlockStatus("blocked_by_me");
        await loadFriends();
        await loadThreads();
        setNotice("Đã chặn tài khoản này.");
      } else {
        setBlockedIds(current => current.filter(id => id !== userId));
        setBlockStatus("none");
        setNotice("Đã bỏ chặn.");
        await loadFriends();
        await loadThreads();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể cập nhật chặn.");
    }
  }

  async function sendMessage() {
    if (!selected || !draft.trim() || sending || blockStatus !== "none") return;
    setSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selected.id, recipientEmail: selected.email, body: draft.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: Message; error?: string };
      if (!response.ok || !payload.message) throw new Error(payload.error || "Không thể gửi tin nhắn.");
      setMessages(current => [...current, payload.message!]);
      setDraft("");
      void loadThreads();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!selected || !account || blockStatus !== "none") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/messages?with=" + encodeURIComponent(selected.id), { cache: "no-store", credentials: "same-origin" });
        if (response.ok) setMessages((await response.json() as { messages: Message[] }).messages);
      } catch {}
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selected?.id, account?.id, blockStatus]);

  const primaryThreads = useMemo(() => threads.filter(thread => thread.isFriend && !blockedIds.includes(thread.other.id)), [threads, blockedIds]);
  const requestThreads = useMemo(() => threads.filter(thread => !thread.isFriend && !blockedIds.includes(thread.other.id)), [threads, blockedIds]);

  return <section className="messages-page">
    {notice && <div className="community-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}

    {!account
      ? <div className="messages-login-card"><div className="messages-big-icon"><Icon name="signal" size={23} /></div><h2>Đăng nhập để nhắn tin riêng.</h2><p>Kết bạn, trò chuyện và nhận tin nhắn chờ ở một chỗ.</p></div>
      : <div className="messages-layout">
        <aside className="messages-people panel">
          <div className="messages-panel-head"><div><span className="small-label">KẾT NỐI</span><h3>Bạn bè</h3></div><span>{friends.length}</span></div>

          <div className="friend-add-heading"><div><span className="small-label">KHÁM PHÁ</span><strong>Tìm người</strong></div><span>Tên / email</span></div>
          <div className="messages-search"><Icon name="target" size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nhập tên hoặc email…" /></div>

          {query.trim() && <div className="friend-lookup">
            {searchResults.length === 0
              ? <span className="messages-muted">Không tìm thấy người phù hợp.</span>
              : searchResults.map(person => {
                const relation = relationshipFor(person.id);
                return <div className="lookup-card" key={person.id}>
                  <button type="button" className="lookup-profile" onClick={() => router.push("/nguoi-dung/" + person.id)}>
                    <Avatar person={person} /><span><strong>{person.name}</strong><small>{person.email}</small></span>
                  </button>
                  {relation === "friend"
                    ? <button type="button" className="relationship-action" onClick={() => void openConversation({ ...person, relationship: "friend" })}>Nhắn</button>
                    : relation === "outgoing"
                    ? <button type="button" className="relationship-action" onClick={() => void cancelFriendRequest(person.requestId)}>Hủy KB</button>
                    : relation === "incoming"
                    ? <div className="lookup-actions"><button type="button" onClick={() => void respondToRequest(person.requestId!, "accept")}>Chấp nhận</button><button type="button" onClick={() => void respondToRequest(person.requestId!, "reject")}>Từ chối</button></div>
                    : relation === "blocked"
                    ? <button type="button" className="relationship-action" onClick={() => void toggleBlock(person.id)}>Bỏ chặn</button>
                    : <div className="lookup-actions"><button type="button" className="button-primary" onClick={() => void sendFriendRequest(person)}>Kết bạn</button><button type="button" onClick={() => void openConversation({ ...person, relationship: "lookup" })}>Nhắn</button></div>}
                </div>;
              })}
          </div>}

          {!query.trim() && <div className="friend-request-box">
            {incoming.length > 0 && <div className="request-section"><div className="request-section-head"><span className="small-label">LỜI MỜI</span><strong>{incoming.length}</strong></div>{incoming.slice(0, 4).map(request => <div className="friend-request-row" key={request.id}><Avatar small person={{ name: request.senderName ?? "U", picture: request.senderPicture ?? null }} /><span><strong>{request.senderName}</strong><small>{request.senderEmail}</small></span><button type="button" aria-label="Chấp nhận" onClick={() => void respondToRequest(request.id, "accept")}>✓</button><button type="button" aria-label="Từ chối" onClick={() => void respondToRequest(request.id, "reject")}>×</button></div>)}{incoming.length > 4 && <span className="pending-more">+{incoming.length - 4} lời mời khác</span>}</div>}
            {outgoing.length > 0 && <div className="friend-outgoing"><span className="small-label">ĐÃ GỬI</span>{outgoing.slice(0, 3).map(request => <div className="friend-outgoing-row" key={request.id}><span>{request.recipientName}</span><button type="button" onClick={() => void cancelFriendRequest(request.id)}>Hủy</button></div>)}</div>}
          </div>}

          <div className="message-inbox-box">
            <div className="messages-subheading"><span className="small-label">TIN NHẮN CHÍNH</span><strong>Bạn bè</strong>{primaryThreads.some(thread => thread.unreadCount > 0) && <span>• mới</span>}</div>
            {primaryThreads.length === 0 ? <p className="messages-muted">Chưa có cuộc trò chuyện.</p> :
              primaryThreads.slice(0, 8).map(thread => <div className="message-thread-wrap" key={thread.threadId}>
                <button type="button" className={selected?.id === thread.other.id ? "message-thread active" : "message-thread"} onClick={() => void openConversation({ ...thread.other, relationship: "friend" })}>
                  <Avatar small person={thread.other} /><span className="message-thread-copy"><strong>{thread.other.name}</strong><small>{thread.lastBody}</small></span>{thread.unreadCount > 0 && <b className="message-unread">{thread.unreadCount}</b>}
                </button>
                <button type="button" className="thread-profile" onClick={() => router.push("/nguoi-dung/" + thread.other.id)} aria-label="Xem hồ sơ">↗</button>
              </div>)}
          </div>

          <div className={pendingOpen ? "pending-compact open" : "pending-compact"}>
            <button type="button" className="pending-compact-toggle" onClick={() => setPendingOpen(current => !current)} disabled={!requestThreads.length}>
              <span><span className="small-label">TIN NHẮN CHỜ</span><strong>{requestThreads.length ? requestThreads.length + " cuộc trò chuyện" : "Trống"}</strong></span>
              <span className="pending-compact-meta">{requestThreads.reduce((sum, item) => sum + item.unreadCount, 0) ? requestThreads.reduce((sum, item) => sum + item.unreadCount, 0) + " mới" : ""} {requestThreads.length ? (pendingOpen ? "⌃" : "⌄") : ""}</span>
            </button>
            {pendingOpen && requestThreads.length > 0 && <div className="pending-compact-list">
              {requestThreads.map(thread => <div className="pending-person-wrap" key={thread.threadId}><button type="button" className="pending-person" onClick={() => void openConversation({ ...thread.other, relationship: "conversation" })}><Avatar small person={thread.other} /><span>{thread.other.name}</span>{thread.unreadCount > 0 && <b>{thread.unreadCount}</b>}</button><button type="button" className="thread-profile" onClick={() => router.push("/nguoi-dung/" + thread.other.id)} aria-label="Xem hồ sơ">↗</button></div>)}
            </div>}
          </div>
        </aside>

        <section className="messages-chat panel">
          {selected
            ? <>
              <header className="messages-chat-head">
                <div className="message-person-head">
                  <button type="button" className="chat-avatar-button" onClick={() => router.push("/nguoi-dung/" + selected.id)}><Avatar person={selected} /></button>
                  <div><h3><button type="button" className="message-profile-name" onClick={() => router.push("/nguoi-dung/" + selected.id)}>{selected.name}</button></h3><span>{selected.relationship === "friend" ? "Bạn bè · tin nhắn riêng" : "Tin nhắn chờ · chưa kết bạn"}</span></div>
                </div>
                <div className="chat-head-actions">
                  <button type="button" className="button-secondary" onClick={() => router.push("/nguoi-dung/" + selected.id)}>Hồ sơ</button>
                  {selected.relationship !== "friend" && selected.relationship !== "outgoing" && selected.relationship !== "blocked" && <button type="button" className="button-secondary" onClick={() => void sendFriendRequest(selected)}>Kết bạn</button>}
                  {selected.relationship === "outgoing" && <button type="button" className="relationship-action" onClick={() => void cancelFriendRequest(selected.requestId)}>Hủy KB</button>}
                  <button type="button" className="chat-block-btn" onClick={() => void toggleBlock(selected.id)} disabled={blockStatus === "blocked_you"}>{blockStatus === "blocked_by_me" ? "Bỏ chặn" : "Chặn"}</button>
                </div>
              </header>
              <div className="messages-list">
                {blockStatus === "blocked_by_me"
                  ? <div className="messages-empty"><div className="messages-big-icon">×</div><strong>Bạn đã chặn người này.</strong><span>Bỏ chặn để tiếp tục trò chuyện.</span></div>
                  : blockStatus === "blocked_you"
                  ? <div className="messages-empty"><div className="messages-big-icon">×</div><strong>Bạn đã bị chặn.</strong><span>Không thể gửi tin nhắn cho người này.</span></div>
                  : loadingChat
                  ? <div className="messages-muted centered">Đang mở cuộc trò chuyện…</div>
                  : messages.length === 0
                  ? <div className="messages-empty"><div className="empty-orbit">+</div><strong>Bắt đầu cuộc trò chuyện.</strong><span>Chào nhau một câu trước.</span></div>
                  : messages.map(message => <article key={message.id} className={message.senderId === account.id ? "message-bubble mine" : "message-bubble"}><p>{message.body}</p><small>{timeLabel(message.createdAt)}</small></article>)
                }
              </div>
              {blockStatus === "none"
                ? <div className="messages-composer"><input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Viết tin nhắn…" maxLength={4000} /><button type="button" className="button-primary" onClick={() => void sendMessage()} disabled={sending || !draft.trim()}>Gửi</button></div>
                : <div className="messages-blocked-note">Tạm dừng tin nhắn trong cuộc trò chuyện này.</div>}
            </>
            : <div className="messages-empty messages-empty-large"><div className="messages-big-icon"><Icon name="arrow" size={24} /></div><strong>Chọn một cuộc trò chuyện.</strong><span>Bạn bè ở Tin nhắn chính; người lạ ở Tin nhắn chờ.</span></div>}
        </section>
      </div>}
  </section>;
}
