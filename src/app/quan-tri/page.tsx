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
      <div className="admin-hero-mark"><div className="admin-crown-logo"><span>♛</span></div></div>
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
                  if (confirm("Khóa " + user.name + " và xóa toàn bộ bài đăng/bình luận của tài khoản này?")) void action(user.id,{action:"lock",durationMinutes:Number(value),purgeContent:true,reason:"Vi phạm quy tắc cộng đồng"});
                }}><option value="">Khóa…</option>{DURATIONS.map(item=><option key={item.value} value={item.value}>{item.label} + xóa nội dung</option>)}<option value="-1">Vĩnh viễn + xóa nội dung</option></select>}
            <button className="admin-action danger" disabled={busyId===user.id} onClick={() => { if(confirm("Xóa toàn bộ bài đăng và bình luận của tài khoản này?")) void action(user.id,{action:"purge-content"}); }}>Xóa nội dung</button>
          </div>
        </article>)}
        {!filtered.length && <div className="admin-empty">Không tìm thấy tài khoản.</div>}
      </section>
    }
  </main>;
}
