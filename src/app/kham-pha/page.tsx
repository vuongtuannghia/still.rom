"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/icons";

type Person = { id: string; name: string; picture: string | null; bio: string | null; createdAt: string };

function initials(name: string) {
  return name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U";
}

export default function DiscoverPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function load(nextQuery = query) {
    setLoading(true);
    try {
      const response = await fetch("/api/users?q=" + encodeURIComponent(nextQuery.trim()), { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => []);
      if (!response.ok) throw new Error(payload?.error || "Không tải được danh sách.");
      setPeople(payload as Person[]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(""); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(query); }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  return <main className="discover-page">
    <header className="discover-hero">
      <div>
        <span className="community-kicker"><span /> STILL / PEOPLE</span>
        <h1>Gặp những người<br /><em>đang học cùng nhịp.</em></h1>
        <p>Tìm thành viên, mở trang cá nhân, xem hoạt động học tập và kết nối trực tiếp.</p>
      </div>
      <div className="discover-mark">01<br />PEOPLE</div>
    </header>

    {notice && <div className="community-alert"><Icon name="signal" size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}

    <section className="discover-search panel">
      <Icon name="target" size={16} />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc email…" aria-label="Tìm thành viên" />
      <span>{people.length} người</span>
    </section>

    <section className="discover-grid">
      {loading ? <div className="discover-empty">Đang tìm thành viên…</div> :
       people.length === 0 ? <div className="discover-empty"><strong>Không tìm thấy ai.</strong><span>Thử một tên khác hoặc email chính xác.</span></div> :
       people.map(person => <article className="discover-card" key={person.id}>
         <button type="button" className="discover-main" onClick={() => router.push("/nguoi-dung/" + person.id)}>
           <span className="profile-avatar xl-small">{person.picture ? <img src={person.picture} alt="" /> : initials(person.name)}</span>
           <span className="discover-copy"><strong>{person.name}</strong><small>{person.bio || "Thành viên still.room"}</small><em>Thành viên từ {new Date(person.createdAt).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })}</em></span>
         </button>
         <div className="discover-actions">
           <button type="button" className="button-secondary" onClick={() => router.push("/nguoi-dung/" + person.id)}>Xem hồ sơ</button>
           <button type="button" className="button-primary" onClick={() => router.push("/tin-nhan?user=" + person.id)}>Nhắn riêng</button>
         </div>
       </article>)}
    </section>
  </main>;
}
