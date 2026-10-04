"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

type Room = {
  id: number;
  title: string;
  meetUrl: string;
  pinned: boolean;
  createdAt: string;
  creatorName: string;
  creatorEmail: string;
  admin: boolean;
};

export function SharedStudyRoom({ account, onNotice }: {
  account: DashboardData["account"];
  onNotice: (text: string, error?: boolean) => void;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [title, setTitle] = useState("");
  const [meetUrl, setMeetUrl] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/study-rooms", { cache: "no-store" });
      if (!response.ok) throw new Error("Không tải được danh sách phòng học.");
      setRooms(await response.json() as Room[]);
    } catch {
      onNotice("Chưa tải được danh sách phòng học chung.", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit() {
    if (!account) {
      onNotice("Đăng nhập Google để gửi link Google Meet.", true);
      return;
    }
    if (!meetUrl.trim()) {
      onNotice("Hãy dán link Google Meet.", true);
      return;
    }
    setPosting(true);
    try {
      const response = await fetch("/api/study-rooms", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Phòng học chung", meetUrl: meetUrl.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { room?: Room; error?: string };
      if (!response.ok || !payload.room) throw new Error(payload.error || "Không thể gửi phòng học.");
      setRooms((current) => [payload.room!, ...current]);
      setTitle("");
      setMeetUrl("");
      onNotice("Đã thêm phòng học chung.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể thêm phòng học.", true);
    } finally {
      setPosting(false);
    }
  }

  async function setPinned(room: Room, pinned: boolean) {
    try {
      const response = await fetch("/api/study-rooms/" + room.id, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      const payload = await response.json().catch(() => ({})) as { room?: Room; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể thay đổi ghim.");
      setRooms((current) => current.map((item) => ({ ...item, pinned: item.id === room.id ? pinned : false })));
      onNotice(pinned ? "Đã ghim phòng học chính." : "Đã bỏ ghim.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể cập nhật phòng học.", true);
    }
  }

  async function remove(room: Room) {
    try {
      const response = await fetch("/api/study-rooms/" + room.id, { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể xóa phòng học.");
      setRooms((current) => current.filter((item) => item.id !== room.id));
      onNotice("Đã xóa phòng học.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể xóa phòng học.", true);
    }
  }

  const pinned = rooms.find((room) => room.pinned);
  const publicRooms = rooms.filter((room) => !room.pinned);

  return <section className="panel shared-study-card" id="study-room">
    <div className="panel-heading shared-study-heading">
      <div>
        <span className="eyebrow"><span className="tiny-dot" /> HỌC CHUNG · GOOGLE MEET</span>
        <h2>Phòng học cùng nhau</h2>
        <p>Bật camera, mic và học trực tiếp với mọi người. still.room chỉ lưu link — cuộc gọi chạy trên Google Meet.</p>
      </div>
      <span className="stat-icon"><Icon name="radio" size={20} /></span>
    </div>

    {pinned && <div className="shared-pinned">
      <div><span className="small-label">PHÒNG HỌC CHÍNH</span><strong>{pinned.title}</strong><span>{pinned.creatorName} · được quản trị viên ghim</span></div>
      <div className="shared-pinned-actions">
        <a className="button-primary" href={pinned.meetUrl} target="_blank" rel="noreferrer"><Icon name="radio" size={15} /> Vào học</a>
        {account?.email === "vuongtuannghia585@gmail.com" && <button type="button" className="button-secondary" onClick={() => void setPinned(pinned, false)}>Bỏ ghim</button>}
      </div>
    </div>}

    <div className="shared-room-form">
      <div className="shared-field"><label htmlFor="study-room-title">Tên phòng</label><input id="study-room-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="VD: Ôn giải phẫu tối nay" disabled={!account || posting} /></div>
      <div className="shared-field"><label htmlFor="study-room-link">Link Google Meet</label><input id="study-room-link" value={meetUrl} onChange={(event) => setMeetUrl(event.target.value)} placeholder="https://meet.google.com/..." disabled={!account || posting} /></div>
      <button type="button" className="button-secondary shared-submit" onClick={() => void submit()} disabled={!account || posting}>{posting ? "Đang thêm…" : "Đăng phòng học"}</button>
    </div>

    {!account && <p className="shared-signin-note"><Icon name="signal" size={14} /> Đăng nhập Google để đăng link phòng học.</p>}

    <div className="shared-room-list">
      {loading ? <p className="empty-chart-note">Đang tải phòng học…</p> : publicRooms.length === 0 ? <p className="empty-chart-note">Chưa có phòng nào. Hãy tạo phòng Google Meet rồi chia sẻ link cho mọi người.</p> :
        publicRooms.map((room) => <article className="shared-room-item" key={room.id}>
          <div className="shared-room-main">
            <strong>{room.title}</strong>
            <span>{room.creatorName}</span>
          </div>
          <div className="shared-room-actions">
            <a className="button-secondary" href={room.meetUrl} target="_blank" rel="noreferrer"><Icon name="radio" size={14} /> Vào</a>
            {account && account.email === "vuongtuannghia585@gmail.com" && <>
              <button type="button" className="icon-button" title="Ghim phòng này" onClick={() => void setPinned(room, true)}><Icon name="target" size={15} /></button>
              <button type="button" className="icon-button" title="Xóa phòng này" onClick={() => void remove(room)}><Icon name="close" size={15} /></button>
            </>}
          </div>
        </article>)
      }
    </div>
  </section>;
}
