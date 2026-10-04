"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../icons";

export function ProfileAvatarMenu({
  id,
  name,
  picture,
  size = "normal",
  self = false,
}: {
  id: string;
  name: string;
  picture: string | null;
  size?: "tiny" | "small" | "normal" | "large";
  self?: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const initial = name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U";

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return <div className={"avatar-menu-wrap size-" + size} ref={ref}>
    <button
      type="button"
      className={"profile-avatar-menu-button avatar-" + size}
      aria-label={"Mở tùy chọn cho " + name}
      onClick={(event) => { event.stopPropagation(); setOpen(current => !current); }}
    >
      {picture ? <img src={picture} alt="" /> : initial}
    </button>
    {open && <div className="avatar-action-popover" onClick={event => event.stopPropagation()}>
      <strong>{name}</strong>
      {!self && <button type="button" onClick={() => router.push("/tin-nhan?user=" + encodeURIComponent(id))}><Icon name="arrow" size={13} /> Nhắn tin riêng</button>}
      <button type="button" onClick={() => router.push("/nguoi-dung/" + encodeURIComponent(id))}><Icon name="sliders" size={13} /> Xem trang cá nhân</button>
    </div>}
  </div>;
}
