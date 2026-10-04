"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { ProfileActionMenu } from "./profile-action-menu";

type Mode = "day" | "week" | "month";
type Row = { rank: number; id: string; name: string; picture: string | null; seconds: number; label: string; me: boolean };
type Board = { rows: Row[]; me: Row | null; totalAccounts: number };
type Payload = Record<Mode, Board>;

const tabs: Array<[Mode, string]> = [
  ["day", "Ngày"],
  ["week", "Tuần"],
  ["month", "Tháng"],
];

function initial(name: string) {
  return name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "U";
}

export function FocusLeaderboard() {
  const [mode, setMode] = useState<Mode>("day");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store", credentials: "same-origin" });
      if (response.ok) setData(await response.json() as Payload);
    } catch {
      // The dashboard remains usable when the public ranking is temporarily unavailable.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const board = data?.[mode];

  return <section className="focus-leaderboard panel" aria-label="Bảng xếp hạng thời gian tập trung">
    <div className="focus-leaderboard-head">
      <div>
        <span className="eyebrow"><span className="tiny-dot" /> RANKING</span>
        <h2>Bảng xếp hạng</h2>
        <p>Ai tích lũy nhiều thời gian tập trung nhất trong từng giai đoạn.</p>
      </div>
      <Icon name="chart" size={21} />
    </div>

    <div className="focus-leaderboard-tabs" role="tablist" aria-label="Giai đoạn xếp hạng">
      {tabs.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={mode === key} className={mode === key ? "active" : ""} onClick={() => setMode(key)}>{label}</button>)}
    </div>

    {loading && !data ? <div className="focus-leaderboard-empty">Đang tải bảng xếp hạng…</div> :
      !board || board.rows.length === 0 ? <div className="focus-leaderboard-empty"><strong>Chưa có dữ liệu.</strong><span>Hãy hoàn thành một phiên tập trung để xuất hiện trên bảng.</span></div> :
      <div className="focus-leaderboard-body">
        <div className="focus-leaderboard-list">
          {board.rows.map(row => <div className={"focus-rank-row" + (row.me ? " me" : "")} key={row.id}>
            <span className={"focus-rank-number rank-" + Math.min(row.rank, 4)}>{row.rank}</span>
            <ProfileActionMenu person={{ id: row.id, name: row.name, picture: row.picture }}><span className="focus-rank-avatar">{row.picture ? <img src={row.picture} alt="" /> : initial(row.name)}</span></ProfileActionMenu>
            <div className="focus-rank-person"><strong>{row.name}{row.me && <em>Bạn</em>}</strong><small>{row.rank === 1 ? "Dẫn đầu" : "Thời gian tập trung"}</small></div>
            <strong className="focus-rank-time">{row.label}</strong>
          </div>)}
        </div>
        {board.me && <div className="focus-rank-me"><span>Vị trí của bạn</span><strong>#{board.me.rank}</strong><b>{board.me.label}</b></div>}
      </div>}
  </section>;
}
