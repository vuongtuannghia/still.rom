"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

type Person = { id: string; name: string; picture: string | null };
type Message = { id: number; senderId: string; body: string; createdAt: string; readAt: string | null };

function initials(name: string) {
  return name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U";
}
function avatar(person: Person) {
  return person.picture ? <img src={person.picture} alt="" /> : initials(person.name);
}
function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function DirectMessagesPage() {
  const [account, setAccount] = useState<DashboardData["account"]>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadStatus() {
    try {
      const response = await fetch("/api/account/status", { cache: "no-store" });
      if (response.ok) setAccount((await response.json() as { account: DashboardData["account"] }).account);
    } catch {}
  }
  async function loadPeople(term = "") {
    if (!account) return;
    setLoadingPeople(true);
    try {
      const response = await fetch(`/api/messages/users?q=${encodeURIComponent(term)}`, { cache: "no-store", credentials: "same-origin" });
      if (response.ok) setPeople(await response.json() as Person[]);
    } catch { setNotice("Chưa tải được danh sách người dùng."); }
    finally { setLoadingPeople(false); }
  }
  useEffect(() => { void loadStatus(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadPeople(query), 200);
    return () => window.clearTimeout(timer);
  }, [account, query]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("user");
    if (!id || !account) return;
    (async () => {
      try {
        const response = await fetch("/api/messages/users", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const found = (await response.json() as Person[]).find(item => item.id === id);
        if (found) void openConversation(found);
      } catch {}
    })();
  }, [account?.id]);

  async function openConversation(person: Person) {
    setSelected(person);
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages?with=${person.id}`, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { other?: Person; messages?: Message[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể mở cuộc trò chuyện.");
      setSelected(payload.other ?? person);
      setMessages(payload.messages ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể mở cuộc trò chuyện.");
    } finally { setLoadingMessages(false); }
  }

  async function sendMessage() {
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selected.id, body: draft.trim() }),
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
        const response = await fetch(`/api/messages?with=${selected.id}`, { cache: "no-store", credentials: "same-origin" });
        if (response.ok) setMessages((await response.json() as { messages: Message[] }).messages);
      } catch {}
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selected?.id, account?.id]);

  const visiblePeople = useMemo(() => people.filter(person => person.id !== selected?.id), [people, selected]);

  return <section className="messages-page">
    {notice && <div className="community-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}
    {!account ? <div className="messages-login-card"><span className="messages-big-icon"><Icon name="signal" size={23} /></span><h2>Đăng nhập để nhắn tin riêng.</h2><p>Tìm một người trong cộng đồng và bắt đầu cuộc trò chuyện.</p></div> :
      <div className="messages-layout">
        <aside className="messages-people panel">
          <div className="messages-panel-head"><div><span className="small-label">CỘNG ĐỒNG</span><h3>Mọi người</h3></div><span>{people.length}</span></div>
          <div className="messages-search"><Icon name="target" size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo tên…" /></div>
          <div className="messages-people-list">
            {loadingPeople ? <p className="messages-muted">Đang tải…</p> :
              visiblePeople.length === 0 ? <p className="messages-muted">Chưa tìm thấy người phù hợp.</p> :
              visiblePeople.map(person => <button type="button" key={person.id} className={selected?.id === person.id ? "message-person active" : "message-person"} onClick={() => void openConversation(person)}>
                <span className="community-avatar">{avatar(person)}</span><span><strong>{person.name}</strong><small>Nhắn riêng</small></span><Icon name="arrow" size={13} />
              </button>)
            }
          </div>
        </aside>

        <section className="messages-chat panel">
          {selected ? <>
            <header className="messages-chat-head"><div className="message-person-head"><span className="community-avatar">{avatar(selected)}</span><div><h3>{selected.name}</h3><span>Cuộc trò chuyện riêng</span></div></div></header>
            <div className="messages-list">
              {loadingMessages ? <div className="messages-muted centered">Đang mở cuộc trò chuyện…</div> :
                messages.length === 0 ? <div className="messages-empty"><div className="empty-orbit">+</div><strong>Bắt đầu bằng một câu đơn giản.</strong><span>Chào người bạn muốn học cùng.</span></div> :
                messages.map(message => <article key={message.id} className={message.senderId === account.id ? "message-bubble mine" : "message-bubble"}><p>{message.body}</p><small>{timeLabel(message.createdAt)}</small></article>)
              }
            </div>
            <div className="messages-composer"><input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Viết tin nhắn…" maxLength={4000} /><button className="button-primary" type="button" onClick={() => void sendMessage()} disabled={sending || !draft.trim()}><Icon name="arrow" size={15} /> Gửi</button></div>
          </> : <div className="messages-empty messages-empty-large"><div className="messages-big-icon"><Icon name="arrow" size={24} /></div><strong>Chọn một người.</strong><span>Tin nhắn riêng chỉ giữa bạn và người đó.</span></div>}
        </section>
      </div>
    }
  </section>;
}
