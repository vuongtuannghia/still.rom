"use client";

import { useEffect, useMemo, useState } from "react";

type Agent = {
  role: string;
  provider: string;
  model: string | null;
  ok: boolean;
  text: string;
  error: string | null;
};

type ChatMessage = {
  id: string;
  speaker: "boss" | "research" | "marketing" | "engineering";
  name: string;
  provider?: string;
  text: string;
  status?: "sent" | "error";
};

type CompanyResult = {
  task: string;
  boss: string;
  chat: ChatMessage[];
  agents: Agent[];
  bossModel: string | null;
  freeMode: boolean;
};

const roleMeta: Record<string, { title: string; avatar: string; hint: string }> = {
  research: { title: "Research AI", avatar: "R", hint: "Tìm dữ kiện & chiến lược" },
  engineering: { title: "Engineering AI", avatar: "E", hint: "Code & triển khai" },
  marketing: { title: "Marketing AI", avatar: "M", hint: "SEO & tăng trưởng" },
};

export default function AiCompanyPage() {
  const [task, setTask] = useState("Quảng bá still. room trong 30 ngày bằng các kênh miễn phí.");
  const [result, setResult] = useState<CompanyResult | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    fetch("/api/ai-company")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Không tải được trạng thái.");
        setStatus(data);
      })
      .catch((e) => setNotice(e instanceof Error ? e.message : "Không tải được trạng thái."));
  }, []);

  const connectedCount = useMemo(() => {
    const agents = status?.agents || {};
    return Object.values(agents).filter((a: any) => a?.configured).length;
  }, [status]);

  const teamOnline = Boolean(status?.boss?.configured);

  async function run() {
    if (!task.trim() || busy) return;
    setBusy(true);
    setNotice("");
    setResult(null);
    try {
      const response = await fetch("/api/ai-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI Company request failed.");
      setResult(data);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Không chạy được nhiệm vụ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f3f3ef", color: "#111", padding: "28px 18px 70px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", color: "#777", fontWeight: 800 }}>STILL. ROOM / AI COMPANY</div>
          <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: "10px 0 8px", fontSize: "clamp(42px, 7vw, 78px)", letterSpacing: "-.065em", lineHeight: .9 }}>BOSS ROOM</h1>
              <p style={{ margin: 0, color: "#666", maxWidth: 760 }}>Bạn giao việc cho BOSS. BOSS chia việc cho các AI, nhận báo cáo của nhau và chốt phương án ngay trong cùng một cuộc trò chuyện.</p>
            </div>
            <div style={{ fontSize: 12, color: teamOnline ? "#111" : "#999" }}>{teamOnline ? "TEAM ONLINE" : "TEAM OFFLINE"} · {connectedCount}/3 nhân viên</div>
          </div>
        </header>

        {notice && <div style={{ background: "#fff", border: "1px solid #dfd4d4", borderRadius: 16, padding: 14, marginBottom: 14 }}>{notice}</div>}

        <section style={{ display: "grid", gridTemplateColumns: "300px minmax(0,1fr)", gap: 14, alignItems: "stretch" }}>
          <aside style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 22, padding: 16, position: "sticky", top: 18, alignSelf: "start" }}>
            <div style={{ fontSize: 11, color: "#777", letterSpacing: ".16em", fontWeight: 800 }}>COMPANY</div>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div style={{ background: "#111", color: "#fff", borderRadius: 16, padding: 14 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#fff", color: "#111", display: "grid", placeItems: "center", fontWeight: 900 }}>B</div>
                  <div><strong>BOSS AI</strong><div style={{ color: "#999", fontSize: 12 }}>Nhận nhiệm vụ · phân công · chốt</div></div>
                </div>
              </div>

              {Object.entries(roleMeta).map(([role, meta]) => {
                const a = status?.agents?.[role];
                return (
                  <div key={role} style={{ background: "#fafafa", border: "1px solid #e3e3e3", borderRadius: 16, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>{meta.avatar}</div>
                        <div><strong>{meta.title}</strong><div style={{ color: "#888", fontSize: 12 }}>{meta.hint}</div></div>
                      </div>
                      <span style={{ fontSize: 10, letterSpacing: ".08em", color: a?.configured ? "#222" : "#aaa" }}>{a?.configured ? "ON" : "OFF"}</span>
                    </div>
                    <div style={{ marginTop: 8, color: "#999", fontSize: 11 }}>{a?.provider || "—"} · {a?.model || "—"}</div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowSetup(v => !v)}
              style={{ marginTop: 12, width: "100%", border: "1px solid #ddd", background: "#fff", borderRadius: 12, padding: "10px 12px", fontWeight: 700, cursor: "pointer" }}
            >
              {showSetup ? "Ẩn hướng dẫn kết nối" : "Xem hướng dẫn kết nối"}
            </button>

            {showSetup && (
              <div style={{ marginTop: 10, padding: 12, borderRadius: 14, background: "#f4f4f0", color: "#666", fontSize: 12, lineHeight: 1.6 }}>
                <strong style={{ color: "#111" }}>Chỉ cần 1 key để chạy cả đội</strong>
                <p style={{ margin: "8px 0" }}>Render → Environment Variables → thêm:</p>
                <code style={{ display: "block", background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 9, color: "#333" }}>OPENROUTER_API_KEY</code>
                <p style={{ margin: "8px 0 0" }}>Hệ thống dùng OpenRouter Free Router cho BOSS, Engineering và Marketing. Gemini là nhân viên Research tùy chọn; không có Gemini vẫn chạy được.</p>
              </div>
            )}
          </aside>

          <section style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 22, overflow: "hidden", minHeight: 650 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e4e4e4", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div><strong>still. room — AI team</strong><div style={{ color: "#999", fontSize: 11, marginTop: 2 }}>Private work chat · BOSS điều phối · AI thấy báo cáo của nhau</div></div>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: busy ? "#111" : (teamOnline ? "#222" : "#bbb") }} />
            </div>

            <div style={{ minHeight: 420, maxHeight: 620, overflowY: "auto", padding: "22px 18px", background: "#f8f8f5" }}>
              {!result && !busy && (
                <div style={{ maxWidth: 700, margin: "38px auto", textAlign: "center", color: "#888" }}>
                  <div style={{ fontSize: 12, letterSpacing: ".15em", fontWeight: 800 }}>BOSS CHAT</div>
                  <h2 style={{ color: "#111", fontSize: 34, margin: "10px 0" }}>Giao việc cho BOSS.</h2>
                  <p style={{ margin: 0, lineHeight: 1.7 }}>BOSS sẽ gọi từng thành viên, chuyển báo cáo cho thành viên tiếp theo và cuối cùng chốt phương án cho bạn.</p>
                </div>
              )}

              {busy && (
                <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 10 }}>
                  {[
                    ["BOSS", "Tôi đang nhận nhiệm vụ và chia việc…", true],
                    ["RESEARCH", "Đang nghiên cứu…", false],
                    ["ENGINEERING", "Đang đọc báo cáo Research…", false],
                    ["MARKETING", "Đang đọc báo cáo của đội…", false],
                    ["BOSS", "Đang phản biện và chốt…", true],
                  ].map(([name, text, active], i) => (
                    <div key={String(name) + i} style={{ display: "flex", gap: 10, justifyContent: name === "BOSS" ? "flex-end" : "flex-start" }}>
                      {name !== "BOSS" && <div style={{ flex: "0 0 32px", width: 32, height: 32, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900 }}>{name === "RESEARCH" ? "R" : name === "ENGINEERING" ? "E" : "M"}</div>}
                      <div style={{ maxWidth: "82%", padding: "11px 13px", borderRadius: 16, background: name === "BOSS" ? "#111" : "#fff", color: name === "BOSS" ? "#fff" : "#444", border: name === "BOSS" ? "0" : "1px solid #e1e1e1" }}>
                        <div style={{ fontSize: 10, letterSpacing: ".08em", opacity: .65, marginBottom: 4 }}>{name}</div>
                        <div>{text}</div>
                        {active && <div style={{ marginTop: 6, fontSize: 11, opacity: .65 }}>●</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result && (
                <div style={{ display: "grid", gap: 14 }}>
                  {result.chat.map((m) => {
                    const mine = m.speaker === "boss";
                    const meta = m.speaker === "boss"
                      ? { avatar: "B", title: "BOSS AI" }
                      : { avatar: roleMeta[m.speaker]?.avatar || "A", title: roleMeta[m.speaker]?.title || m.name };
                    return (
                      <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-end", justifyContent: mine ? "flex-end" : "flex-start" }}>
                        {!mine && <div style={{ flex: "0 0 32px", width: 32, height: 32, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900 }}>{meta.avatar}</div>}
                        <div style={{ maxWidth: "82%" }}>
                          <div style={{ fontSize: 10, color: "#999", margin: "0 6px 4px", letterSpacing: ".08em", textAlign: mine ? "right" : "left" }}>{meta.title}{m.provider ? " · " + m.provider : ""}</div>
                          <div style={{ padding: "12px 14px", borderRadius: 17, background: mine ? "#111" : "#fff", color: mine ? "#fff" : "#333", border: mine ? "0" : "1px solid #e0e0e0", boxShadow: mine ? "none" : "0 2px 10px rgba(0,0,0,.03)" }}>
                            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.65, margin: 0, fontSize: 14 }}>{m.text}</pre>
                          </div>
                        </div>
                        {mine && <div style={{ flex: "0 0 32px", width: 32, height: 32, borderRadius: "50%", background: "#111", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900 }}>B</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: 14, borderTop: "1px solid #e4e4e4", background: "#fff" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  rows={3}
                  placeholder="Giao nhiệm vụ cho BOSS…"
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: "1px solid #ddd", borderRadius: 16, padding: 12, outline: "none", fontSize: 14, lineHeight: 1.5 }}
                />
                <button
                  onClick={run}
                  disabled={busy || !task.trim()}
                  style={{ border: 0, borderRadius: 999, padding: "12px 18px", background: "#111", color: "#fff", fontWeight: 800, cursor: busy ? "wait" : "pointer", opacity: busy || !task.trim() ? .55 : 1 }}
                >
                  {busy ? "Đang họp…" : "Giao cho BOSS"}
                </button>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
