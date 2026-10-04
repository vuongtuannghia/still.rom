"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    if (!open || self) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetch("/api/users/" + encodeURIComponent(person.id), { cache: "no-store", credentials: "same-origin" });
        const payload = await profile.json().catch(() => ({})) as { relationship?: Relationship; relationshipRequestId?: number | null };
        if (!cancelled && profile.ok) {
          setRelationship(payload.relationship ?? "none");
          setRequestId(payload.relationshipRequestId ?? null);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [open, self, person.id]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

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
      if (response.ok) setRelationship("none");
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
      if (response.ok) setRelationship(blocked ? "none" : "blocked_by_me");
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

    {open && <div className={"profile-action-popover " + placement} role="menu">
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
    </div>}
  </div>;
}
