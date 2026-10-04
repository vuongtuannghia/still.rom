"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../icons";

type Person = { id: string; name: string; picture: string | null };

export function ProfileActionMenu({ person, children, placement = "left" }: {
  person: Person;
  children: ReactNode;
  placement?: "left" | "right";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return <div className="profile-action-menu" ref={rootRef}>
    <button type="button" className="profile-action-trigger" aria-label={"Tùy chọn " + person.name} aria-expanded={open} onClick={(event) => { event.stopPropagation(); setOpen(current => !current); }}>
      {children}
    </button>
    {open && <div className={"profile-action-popover " + placement} role="menu">
      <div className="profile-action-person"><strong>{person.name}</strong><span>Tùy chọn nhanh</span></div>
      <button type="button" role="menuitem" onClick={() => router.push("/nguoi-dung/" + person.id)}>
        <Icon name="layout" size={14} /> Xem trang cá nhân
      </button>
      <button type="button" role="menuitem" onClick={() => router.push("/tin-nhan?user=" + encodeURIComponent(person.id) + (person.picture === null ? "" : ""))}>
        <Icon name="arrow" size={14} /> Nhắn tin riêng
      </button>
    </div>}
  </div>;
}
