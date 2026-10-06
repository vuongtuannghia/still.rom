"use client";

import { useEffect, useState } from "react";

type Agent = {
  role: string;
  provider: string;
  model: string | null;
  ok: boolean;
  text: string;
  error: string | null;
};

type CompanyResult = {
  task: string;
  boss: string;
  agents: Agent[];
  freeMode: boolean;
};

export default function AiCompanyPage() {
  const [task, setTask] = useState("Lập kế hoạch quảng bá still. room trong 30 ngày bằng các kênh miễn phí.");
  const [result, setResult] = useState<CompanyResult | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/ai-company")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Không tải được trạng thái.");
        setStatus(data);
      })
      .catch((e) => setNotice(e instanceof Error ? e.message : "Không tải được trạng thái."));
  }, []);

  async function run() {
    if (!task.trim() || busy) return;
    setBusy(true);
    setNotice("");
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
    <main style={{ minHeight: "100vh", background: "#f4f4f0", color: "#111", padding: "32px 20px 70px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", color: "#777", fontWeight: 800 }}>STILL. ROOM / AI COMPANY</div>
          <h1 style={{ margin: "12px 0 8px", fontSize: "clamp(42px, 7vw, 76px)", letterSpacing: "-.06em", lineHeight: .95 }}>BOSS ROOM</h1>
          <p style={{ margin: 0, color: "#666", maxWidth: 750 }}>Một bộ điều phối trung tâm để giao việc cho Research, Marketing và Engineering AI.</p>
        </header>

        {notice && <div style={{ background: "#fff", border: "1px solid #e0d0d0", borderRadius: 16, padding: 14, marginBottom: 16 }}>{notice}</div>}

        <section style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16, alignItems: "start" }}>
          <div style={{ background: "#111", color: "#fff", borderRadius: 24, padding: 24 }}>
            <div style={{ color: "#999", fontSize: 11, letterSpacing: ".14em" }}>BOSS</div>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={8}
              style={{ width: "100%", marginTop: 12, boxSizing: "border-box", resize: "vertical", border: "1px solid #333", borderRadius: 16, padding: 14, background: "#181818", color: "#fff", outline: "none", fontSize: 16, lineHeight: 1.5 }}
            />
            <button
              onClick={run}
              disabled={busy}
              style={{ marginTop: 12, border: 0, borderRadius: 999, padding: "12px 18px", background: "#fff", color: "#111", fontWeight: 800, cursor: busy ? "wait" : "pointer" }}
            >
              {busy ? "Đang điều phối…" : "Giao nhiệm vụ"}
            </button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {["research", "marketing", "engineering"].map((role) => {
              const a = status?.agents?.[role];
              return (
                <div key={role} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 20, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong style={{ textTransform: "uppercase" }}>{role}</strong>
                    <span style={{ fontSize: 12, color: a?.configured ? "#222" : "#999" }}>{a?.configured ? "CONNECTED" : "NOT CONNECTED"}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#777" }}>{a?.provider || "—"} · {a?.model || "—"}</div>
                </div>
              );
            })}
          </div>
        </section>

        {result && (
          <section style={{ marginTop: 16, display: "grid", gap: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 24, padding: 24 }}>
              <div style={{ fontSize: 11, color: "#777", letterSpacing: ".14em", fontWeight: 800 }}>BOSS DECISION</div>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, margin: "12px 0 0" }}>{result.boss}</pre>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {result.agents.map((agent) => (
                <article key={agent.role} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 20, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{agent.role.toUpperCase()}</strong>
                    <span style={{ color: agent.ok ? "#222" : "#999", fontSize: 12 }}>{agent.ok ? agent.provider : "OFFLINE"}</span>
                  </div>
                  {agent.ok ? (
                    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.65, color: "#555", margin: "12px 0 0" }}>{agent.text}</pre>
                  ) : (
                    <p style={{ color: "#999" }}>{agent.error || "Chưa kết nối."}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
