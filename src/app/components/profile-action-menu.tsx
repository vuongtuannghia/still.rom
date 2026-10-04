"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icon } from "../icons";

type Person = { id: string; name: string; picture: string | null };
type Relationship = "friend" | "none" | "pending" | "incoming" | "outgoing" | "blocked_by_me" | "blocked_you";

export function ProfileActionMenu({ person, children, placement = "left", self = false }: {
  person: Person;
  children: ReactNode;
  placement?: "left" | "right";
  self?: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [relationship, setRelationship] = useState<Relationship>("none");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || self) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetch("/api/users/" + encodeURIComponent(person.id), { cache: "no-store", credentials: "same-origin" });
        const payload = await profile.json().catch(() => ({})) as {
          relationship?: Relationship | "blocked";
          blockStatus?: "none" | "blocked_by_me" | "blocked_you";
          relationshipRequestId?: number | null;
        };
        if (!cancelled && profile.ok) {
          setRelationship(
            payload.blockStatus === "blocked_by_me" ? "blocked_by_me" :
            payload.blockStatus === "blocked_you" ? "blocked_you" :
            (payload.relationship === "blocked" ? "blocked_by_me" : payload.relationship ?? "none")
          );
          setRequestId(payload.relationshipRequestId ?? null);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [open, self, person.id]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = ref.current?.querySelector<HTMLElement>(".profile-action-trigger");
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = 210;
      const gap = 8;
      const left = placement === "left"
        ? Math.max(8, rect.right - width)
        : Math.min(window.innerWidth - width - 8, rect.left);
      const estimatedHeight = 300;
      const top = rect.bottom + gap + estimatedHeight <= window.innerHeight
        ? rect.bottom + gap
        : Math.max(8, rect.top - estimatedHeight - gap);
      setPopoverPosition({ top, left });
    };

    updatePosition();
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if ((target as HTMLElement | null)?.closest?.(".profile-action-popover")) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, placement, person.id]);

  async function sendFriendRequest() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/friends", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: person.id }),
      });
      const payload = await response.json().catch(() => ({})) as { request?: { id?: number }; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể gửi lời mời.");
      setRelationship("outgoing");
      setRequestId(payload.request?.id ?? null);
    } finally { setBusy(false); }
  }

  async function respondRequest(action: "accept" | "reject") {
    if (!requestId || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/friends/requests/" + requestId, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        setRelationship(action === "accept" ? "friend" : "none");
        setRequestId(null);
      }
    } finally { setBusy(false); }
  }

  async function cancelRequest() {
    if (!requestId || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/friends/requests/" + requestId, { method: "DELETE", credentials: "same-origin" });
      if (response.ok) {
        setRelationship("none");
        setRequestId(null);
      }
    } finally { setBusy(false); }
  }

  async function unfriend() {
    if (busy || !window.confirm("Hủy kết bạn với " + person.name + "?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/friends/" + encodeURIComponent(person.id), { method: "DELETE", credentials: "same-origin" });
      if (response.ok) {
        setRelationship("none");
        setOpen(false);
      }
    } finally { setBusy(false); }
  }

  async function toggleBlock() {
    if (busy) return;
    setBusy(true);
    try {
      const blocked = relationship === "blocked_by_me";
      const response = await fetch("/api/blocks", {
        method: blocked ? "DELETE" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: person.id }),
      });
      if (response.ok) {
        setRelationship(blocked ? "none" : "blocked_by_me");
        setOpen(false);
      }
    } finally { setBusy(false); }
  }

  return <div className="profile-action-menu" ref={ref}>
    <span
      className="profile-action-trigger"
      role="button"
      tabIndex={0}
      aria-label={"Tùy chọn " + person.name}
      aria-expanded={open}
      onClick={(event) => { event.stopPropagation(); setOpen(current => !current); }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault(); event.stopPropagation(); setOpen(current => !current);
        }
      }}
    >
      {children}
    </span>

    {open && typeof document !== "undefined" && createPortal(
      <div
        className={"profile-action-popover " + placement}
        role="menu"
        style={{ position: "fixed", top: popoverPosition.top, left: popoverPosition.left, zIndex: 9999 }}
      >
      <div className="profile-action-person">
        <strong>{person.name}</strong>
        <span>Tùy chọn nhanh</span>
      </div>
      {!self && <>
        <button type="button" role="menuitem" onClick={() => router.push("/tin-nhan/" + encodeURIComponent(person.id))}>
          <Icon name="arrow" size={14} /> Nhắn tin riêng
        </button>
        <button type="button" role="menuitem" onClick={() => router.push("/nguoi-dung/" + encodeURIComponent(person.id))}>
          <Icon name="layout" size={14} /> Xem trang cá nhân
        </button>
        {relationship === "none" && <button type="button" role="menuitem" disabled={busy} onClick={() => void sendFriendRequest()}>
          <Icon name="plus" size={14} /> Kết bạn
        </button>}
        {relationship === "incoming" && <><button type="button" role="menuitem" className="profile-action-primary" disabled={busy} onClick={() => void respondRequest("accept")}>
          <Icon name="check" size={14} /> Chấp nhận kết bạn
        </button><button type="button" role="menuitem" disabled={busy} onClick={() => void respondRequest("reject")}>
          <Icon name="close" size={14} /> Từ chối lời mời
        </button></>}
        {relationship === "friend" && <button type="button" role="menuitem" className="profile-action-danger" disabled={busy} onClick={() => void unfriend()}>
          <Icon name="close" size={14} /> Hủy kết bạn
        </button>}
        {relationship === "outgoing" && <button type="button" role="menuitem" disabled={busy} onClick={() => void cancelRequest()}>
          <Icon name="close" size={14} /> Hủy lời mời
        </button>}
        {relationship === "incoming" && <button type="button" role="menuitem" onClick={() => router.push("/tin-nhan/" + encodeURIComponent(person.id))}>
          <Icon name="arrow" size={14} /> Xem lời mời
        </button>}
        {relationship !== "blocked_you" && <button type="button" role="menuitem" className="profile-action-danger" disabled={busy} onClick={() => void toggleBlock()}>
          <Icon name="close" size={14} /> {relationship === "blocked_by_me" ? "Bỏ chặn" : "Chặn"}
        </button>}
      </>}
      {self && <button type="button" role="menuitem" onClick={() => router.push("/nguoi-dung/" + encodeURIComponent(person.id))}>
        <Icon name="layout" size={14} /> Xem trang cá nhân
      </button>}
      </div>,
      document.body
    )}
  </div>;
}
