"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/icons";

type UserRow = {
  id: string; name: string; email: string; picture: string | null; role: "user" | "admin";
  lockedUntil: string | null; lockReason: string | null; createdAt: string; lastSignInAt: string;
};

const DURATIONS = [
  { value: 60, label: "1 giờ" },
  { value: 1440, label: "1 ngày" },
  { value: 10080, label: "7 ngày" },
  { value: 43200, label: "30 ngày" },
];

function initial(name: string) { return name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U"; }

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; email: string; role: "user" | "admin" } | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const status = await fetch("/api/account/status", { cache: "no-store" });
      const statusData = await status.json().catch(() => ({})) as { account?: { id: string; email: string; role: "user" | "admin" } | null };
      if (!statusData.account || (statusData.account.role !== "admin" && statusData.account.email.toLowerCase() !== "vuongtuannghia585@gmail.com")) {
        router.replace("/");
        return;
      }
      setMe(statusData.account);
      const response = await fetch("/api/admin/users", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ([])) as UserRow[] | { error?: string };
      if (!response.ok || !Array.isArray(payload)) throw new Error(("error" in payload && payload.error) || "Không tải được danh sách tài khoản.");
      setUsers(payload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được trang quản trị.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function action(userId: string, body: Record<string, unknown>) {
    setBusyId(userId);
    try {
      const response = await fetch("/api/admin/users/" + encodeURIComponent(userId), {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể thực hiện.");
      setNotice("Đã cập nhật.");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể thực hiện."); }
    finally { setBusyId(null); }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter(user => user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)) : users;
  }, [users, query]);

  return <main className="admin-page">
    {notice && <div className="community-alert admin-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}

    <header className="admin-hero">
      <div className="admin-hero-mark"><div className="admin-crown-logo"><img className="admin-crown-logo-image" src="data:image/webp;base64,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" alt="Biểu tượng quản trị viên" /></div></div>
      <div><span className="community-kicker light"><span /> STILL / ADMIN</span><h1>Quản trị viên.</h1><p>Quản lý thành viên, quyền hạn và nội dung cộng đồng từ một nơi.</p></div>
      <div className="admin-hero-user"><span>{me?.role === "admin" ? "ADMIN" : ""}</span><strong>{me?.email}</strong></div>
    </header>

    <section className="admin-toolbar"><div><span className="small-label">THÀNH VIÊN</span><strong>{users.length} tài khoản</strong></div><div className="admin-search"><Icon name="target" size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tên hoặc email…" /></div></section>

    {loading ? <div className="admin-empty">Đang tải…</div> :
      <section className="admin-users">
        {filtered.map(user => <article className={"admin-user-row" + (user.lockedUntil ? " locked" : "")} key={user.id}>
          <a href={"/nguoi-dung/" + user.id} className="admin-user-identity">
            <span className="admin-avatar">{user.picture ? <img src={user.picture} alt="" /> : initial(user.name)}</span>
            <span><strong>{user.name}</strong><small>{user.email}</small></span>
          </a>
          <div className="admin-user-state">
            {user.email.toLowerCase() === "vuongtuannghia585@gmail.com" ? <span className="admin-role-badge main">QUẢN TRỊ CHÍNH</span> :
             user.role === "admin" ? <span className="admin-role-badge">QUẢN TRỊ VIÊN</span> :
             <span className="admin-role-user">THÀNH VIÊN</span>}
            {user.lockedUntil && <span className="admin-lock-state">Khóa đến {new Date(user.lockedUntil).toLocaleString("vi-VN")}</span>}
          </div>
          <div className="admin-user-actions">
            <a className="admin-action ghost" href={"/nguoi-dung/" + user.id}>Xem hồ sơ</a>
            {me?.email.toLowerCase() === "vuongtuannghia585@gmail.com" && user.email.toLowerCase() !== "vuongtuannghia585@gmail.com" &&
              <button className="admin-action" disabled={busyId===user.id} onClick={() => void action(user.id,{action:"set-role",role:user.role==="admin"?"user":"admin"})}>{user.role==="admin"?"Thu quyền":"Cấp quản trị"}</button>}
            {user.lockedUntil
              ? <button className="admin-action" disabled={busyId===user.id} onClick={() => void action(user.id,{action:"unlock"})}>Mở khóa</button>
              : <select className="admin-duration" defaultValue="" disabled={busyId===user.id} onChange={event => {
                  const value=event.target.value; event.currentTarget.value="";
                  if (!value) return;
                  if (confirm("Khóa " + user.name + " và xóa toàn bộ bài đăng/bình luận của tài khoản này?")) {
                    const lockBody = value === "-1"
                      ? { action: "lock", permanent: true, purgeContent: true, reason: "Vi phạm quy tắc cộng đồng" }
                      : { action: "lock", durationMinutes: Number(value), purgeContent: true, reason: "Vi phạm quy tắc cộng đồng" };
                    void action(user.id, lockBody);
                  }
                }}><option value="">Khóa…</option>{DURATIONS.map(item=><option key={item.value} value={item.value}>{item.label} + xóa nội dung</option>)}<option value="-1">Vĩnh viễn + xóa nội dung</option></select>}
            <button className="admin-action danger" disabled={busyId===user.id} onClick={() => { if(confirm("Xóa toàn bộ bài đăng và bình luận của tài khoản này?")) void action(user.id,{action:"purge-content"}); }}>Xóa nội dung</button>
          </div>
        </article>)}
        {!filtered.length && <div className="admin-empty">Không tìm thấy tài khoản.</div>}
      </section>
    }
  </main>;
}
