"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "../icons";
import { errorMessage } from "@/lib/client-api";
import type { RoomSettings } from "@/lib/scene-domain";

export function RoomAppearance({ room, onChange, onPreview }: { room: RoomSettings; onChange: (patch: Partial<RoomSettings>) => Promise<void>; onPreview: (patch: { ambientBlur: number; ambientDim: number }) => void }) {
  const [blur, setBlur] = useState(room.ambientBlur);
  const [dim, setDim] = useState(room.ambientDim);
  const [page, setPage] = useState(room.pageBackdrop);
  const [mono, setMono] = useState(room.stillMonochrome);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setSaved(false);
    try { await onChange({ ambientBlur: blur, ambientDim: dim, pageBackdrop: page, stillMonochrome: mono }); setSaved(true); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }
  return <form className="room-appearance-form" onSubmit={(event) => void save(event)}><span className="eyebrow">AMBIENT / VIEW</span><h3>Nền lan tỏa</h3><p>Video rõ ở giữa. Màu cảnh mở rộng nhẹ nhàng ra cả trang.</p>
    <label className="appearance-slider"><span>Độ mờ nền <output>{blur}px</output></span><input aria-label="Độ mờ nền" type="range" min={12} max={64} step={1} value={blur} onChange={(event) => { const next = Number(event.target.value); setBlur(next); onPreview({ ambientBlur: next, ambientDim: dim }); setSaved(false); }} /></label>
    <label className="appearance-slider"><span>Độ tối nền <output>{dim}%</output></span><input aria-label="Độ tối nền" type="range" min={15} max={75} step={1} value={dim} onChange={(event) => { const next = Number(event.target.value); setDim(next); onPreview({ ambientBlur: blur, ambientDim: next }); setSaved(false); }} /></label>
    <label className="appearance-check"><input type="checkbox" checked={page} onChange={(event) => { setPage(event.target.checked); setSaved(false); }} /><span>Nền mờ phủ cả dashboard</span></label>
    <label className="appearance-check"><input type="checkbox" checked={mono} onChange={(event) => { setMono(event.target.checked); setSaved(false); }} /><span>Nền đen trắng</span></label>
    <p className="appearance-source-note">Nền mở rộng từ ảnh đại diện của video YouTube, không phải bản sao video trực tiếp. Video chính vẫn phát một lần.</p>
    {error && <p className="form-error" role="alert">{error}</p>}{saved && <p className="appearance-saved" role="status"><Icon name="check" size={15} />Đã lưu nền của bạn.</p>}
    <button className="button-primary" type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu nền"}<Icon name="check" size={15} /></button>
  </form>;
}
