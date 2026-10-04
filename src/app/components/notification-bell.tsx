"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  requestId: number | null;
  threadId: number | null;
  readAt: string | null;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
  actorPicture: string | null;
};

type Payload = { unreadCount: number; notifications: NotificationItem[] };

function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function NotificationBell() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store", credentials: "same-origin" });
      if (response.ok) setPayload(await response.json() as Payload);
    } catch {}
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  async function markRead(id: number) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH", credentials: "same-origin" }).catch(() => {});
    setPayload(current => current ? {
      ...current,
      unreadCount: current.notifications.filter(n => n.id !== id && !n.readAt).length,
      notifications: current.notifications.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n),
    } : current);
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST", credentials: "same-origin" }).catch(() => {});
    setPayload(current => current ? {
      ...current, unreadCount: 0,
      notifications: current.notifications.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    } : current);
  }

  return <div className="global-notification" ref={rootRef}>
    <button type="button" className="global-notification-button" aria-label="Thông báo" onClick={() => { setOpen(current => !current); void load(); }}>
      <Icon name="bell" size={18} />
      {(payload?.unreadCount ?? 0) > 0 && <span className="notification-badge">{Math.min(payload?.unreadCount ?? 0, 99)}</span>}
    </button>
    {open && <div className="notification-popover">
      <div className="notification-head"><div><span className="small-label">CẬP NHẬT</span><strong>Thông báo</strong></div><button type="button" onClick={() => void markAllRead()} disabled={!payload?.unreadCount}>Đọc hết</button></div>
      <div className="notification-list">
        {!payload?.notifications.length ? <div className="notification-empty">Chưa có thông báo.</div> :
          payload.notifications.slice(0, 20).map(item => <button type="button" key={item.id} className={item.readAt ? "notification-item" : "notification-item unread"} onClick={() => {
              void markRead(item.id);
              if (item.type === "message") window.location.href = item.actorId ? "/tin-nhan?user=" + encodeURIComponent(item.actorId) : "/tin-nhan";
              else if (item.type === "friend_request" || item.type === "friend_accepted") window.location.href = item.actorId ? "/nguoi-dung/" + encodeURIComponent(item.actorId) : "/tin-nhan";
              else if (item.actorId) window.location.href = "/nguoi-dung/" + encodeURIComponent(item.actorId);
            }}>
            <span className="notification-avatar">{item.actorPicture ? <img src={item.actorPicture} alt="" /> : (item.actorName?.slice(0,1) ?? "!")}</span>
            <span><strong>{item.title}</strong><small>{item.body ?? ""}</small><em>{timeLabel(item.createdAt)}</em></span>
          </button>)
        }
      </div>
    </div>}
  </div>;
}
