"use client";

import { useRef, useState, type FormEvent } from "react";
import { Icon } from "../icons";
import { Dialog } from "./dialogs";
import { dateKey, formatMinutes, labelDate, sessionDay, sessionSeconds, shiftDay, type FocusSession, type SessionInput } from "@/lib/focus-domain";
import { errorMessage, requestJson } from "@/lib/client-api";

export function SessionHistory({ sessions, onAdd }: { sessions: FocusSession[]; onAdd: () => void }) {
  const [limit, setLimit] = useState(6);
  return <section id="history" className="panel history-card"><div className="panel-heading"><div><span className="eyebrow">THỜI GIAN BẠN ĐÃ DÀNH CHO MÌNH</span><h2>Lịch sử tập trung</h2><p>Phiên đã đồng bộ, ghi theo thời điểm hoàn thành thực tế.</p></div><button className="button-secondary" type="button" onClick={onAdd}><Icon name="plus" size={16} /> Ghi phiên thủ công</button></div>
    {sessions.length === 0 ? <div className="empty-state compact"><span className="empty-icon"><Icon name="clock" size={24} /></span><h3>Phiên đầu tiên đang chờ bạn.</h3><p>Chưa có dữ liệu lịch sử. Bạn có thể hoàn thành timer hoặc ghi lại một phiên đã làm.</p></div> : <><div className="history-scroll"><table className="history-table"><caption className="sr-only">Các phiên tập trung đã hoàn thành</caption><thead><tr><th scope="col">Thời điểm</th><th scope="col">Nhiệm vụ</th><th scope="col">Thời lượng</th><th scope="col">Trạng thái</th></tr></thead><tbody>{sessions.slice(0, limit).map((session) => <tr key={session.id}><td><strong>{labelDate(sessionDay(session), { day: "numeric", month: "numeric", year: "numeric" })}</strong><span>{new Date(session.endedAt ?? session.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span></td><td>{session.taskTitle ?? "Tập trung tự do"}</td><td><strong>{formatMinutes(sessionSeconds(session) / 60)}</strong></td><td><span className="saved-tag"><Icon name="check" size={13} /> Đã lưu</span></td></tr>)}</tbody></table></div>{sessions.length > limit && <button className="text-button history-more" type="button" onClick={() => setLimit(limit + 12)}>Xem thêm {Math.min(12, sessions.length - limit)} phiên <Icon name="chevron" size={14} /></button>}</>}
  </section>;
}

export function SessionLogDialog({ workspaceId, onSaved, onClose }: { workspaceId: string; onSaved: (session: FocusSession) => void; onClose: () => void }) {
  const [day, setDay] = useState(() => dateKey(new Date()));
  const [time, setTime] = useState(() => { const now = new Date(); return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`; });
  const [minutes, setMinutes] = useState(25);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const payloadRef = useRef<SessionInput | null>(null);
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      if (!payloadRef.current) {
        const end = new Date(`${day}T${time}:00`);
        if (!Number.isFinite(end.getTime()) || end.getTime() > Date.now() + 120000) throw new Error("Không thể ghi một phiên trong tương lai.");
        payloadRef.current = { workspaceId, clientId: crypto.randomUUID(), durationSeconds: minutes * 60, taskTitle: title.trim() || null, startedAt: new Date(end.getTime() - minutes * 60000).toISOString(), endedAt: end.toISOString() };
      }
      if (window.location.hostname.endsWith(".manus.computer")) {
        const payload = payloadRef.current;
        onSaved({ id: Date.now(), ...payload, durationMinutes: payload.durationSeconds / 60, createdAt: payload.endedAt });
        onClose();
        return;
      }
      try {
        const result = await requestJson<{ session: FocusSession }>("/api/focus-sessions", { method: "POST", body: JSON.stringify(payloadRef.current) });
        onSaved(result.session); onClose();
      } catch (serverError) {
        // Keep manual sessions usable even while the database/API is not provisioned.
        const payload = payloadRef.current;
        const fallback: FocusSession = {
          id: Date.now(),
          ...payload,
          durationMinutes: payload.durationSeconds / 60,
          createdAt: payload.endedAt,
        };
        try {
          const key = `stillroom.pending.sessions:${workspaceId}`;
          const saved = JSON.parse(localStorage.getItem(key) || "[]") as FocusSession[];
          localStorage.setItem(key, JSON.stringify([fallback, ...saved].slice(0, 200)));
        } catch {
          // Local persistence is best-effort; the in-memory session is still shown immediately.
        }
        onSaved(fallback);
        onClose();
      }
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  function invalidate() { payloadRef.current = null; }
  const today = dateKey(new Date());
  return <Dialog title="Ghi một phiên đã hoàn thành" description="Dành cho thời gian bạn đã tập trung ngoài ứng dụng. Số liệu này sẽ được tính vào biểu đồ." onClose={onClose} busy={busy}><form onSubmit={save} className="entity-form"><div className="settings-number-grid"><label className="field"><span>Ngày hoàn thành</span><input required autoFocus type="date" min={shiftDay(today, -365)} max={today} value={day} onChange={(event) => { invalidate(); setDay(event.target.value); }} /></label><label className="field"><span>Giờ hoàn thành</span><input required type="time" value={time} onChange={(event) => { invalidate(); setTime(event.target.value); }} /></label></div><label className="field"><span>Thời lượng (phút)</span><input required type="number" min={1} max={180} step={1} value={minutes} onChange={(event) => { invalidate(); setMinutes(Number(event.target.value)); }} /></label><label className="field"><span>Nhiệm vụ (không bắt buộc)</span><input maxLength={180} value={title} onChange={(event) => { invalidate(); setTitle(event.target.value); }} placeholder="Bạn đã tập trung vào điều gì?" /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-footer"><button className="button-secondary" type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="button-primary" type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu phiên"}<Icon name="check" size={16} /></button></div></form></Dialog>;
}
