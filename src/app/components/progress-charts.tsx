"use client";

import { memo, useMemo, useState, type CSSProperties } from "react";
import { Icon } from "../icons";
import { dateRange, formatMinutes, labelDate, sessionDay, sessionSeconds, shiftDay, shortWeekday, type CheckIn, type FocusSession, type Habit } from "@/lib/focus-domain";

const HEAT_LEVELS = [
  { level: 0, label: "0–1 giờ" },
  { level: 1, label: "1–2 giờ" },
  { level: 2, label: "2–3 giờ" },
  { level: 3, label: "4 giờ trở lên" },
] as const;

export const ProgressCharts = memo(function ProgressCharts({ sessions, habits, checkIns, today, goal, onExport }: {
  sessions: FocusSession[]; habits: Habit[]; checkIns: CheckIn[]; today: string; goal: number; onExport: () => void;
}) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const [selectedDay, setSelectedDay] = useState(today);
  const dates = useMemo(() => dateRange(today, period), [today, period]);
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const session of sessions) { const day = sessionDay(session); map.set(day, (map.get(day) ?? 0) + sessionSeconds(session) / 60); }
    return map;
  }, [sessions]);
  const checks = useMemo(() => {
    const map = new Map<string, number>();
    for (const check of checkIns) map.set(check.date, (map.get(check.date) ?? 0) + 1);
    return map;
  }, [checkIns]);
  const points = dates.map((day) => ({ day, minutes: totals.get(day) ?? 0 }));
  const total = points.reduce((sum, point) => sum + point.minutes, 0);
  const maximum = Math.max(60, Math.ceil(Math.max(goal * 1.25, ...points.map((point) => point.minutes)) / 60) * 60);
  const selectedSessions = sessions.filter((session) => sessionDay(session) === selectedDay);
  const todayChecks = checks.get(today) ?? 0;
  const heatEnd = shiftDay(today, (7 - new Date(`${today}T12:00:00Z`).getUTCDay()) % 7);
  const heatDays = dateRange(heatEnd, 84);
  const activeDays = heatDays.filter((day) => (totals.get(day) ?? 0) > 0 || (checks.get(day) ?? 0) > 0).length;
  return <section id="analytics" className="analytics-section" aria-label="Thống kê tiến độ">
    <div className="section-title-row"><div><span className="eyebrow">ĐIỀU NHỎ, TIẾN BỘ LỚN</span><h2>Nhìn lại nhịp của bạn.</h2></div><button className="button-secondary" onClick={onExport} type="button"><Icon name="arrow" size={16} /> Xuất CSV</button></div>
    <div className="analytics-grid">
      <article className="panel focus-chart-card">
        <div className="panel-heading"><div><span className="small-label">THỜI GIAN TẬP TRUNG</span><div className="chart-main-value">{formatMinutes(total)}<span>trong {period} ngày</span></div></div><div className="segmented" aria-label="Khoảng thời gian"><button type="button" aria-pressed={period === 7} className={period === 7 ? "active" : ""} onClick={() => setPeriod(7)}>7 ngày</button><button type="button" aria-pressed={period === 30} className={period === 30 ? "active" : ""} onClick={() => setPeriod(30)}>30 ngày</button></div></div>
        <div className="chart-legend"><span><i className="legend-solid" /> Tập trung</span><span><i className="legend-dash" /> Mục tiêu {goal} phút</span></div>
        <div className={`bar-chart-scroll ${period === 30 ? "long-chart" : ""}`}>
          <div className="bar-chart">
            <div className="chart-y-axis"><span>{formatMinutes(maximum)}</span><span>{formatMinutes(maximum / 2)}</span><span>0</span></div>
            <div className="chart-plot">
              <div className="chart-lines" aria-hidden="true"><span /><span /><span /></div>
              <div className="goal-line" style={{ bottom: `${(goal / maximum) * 100}%` }} aria-hidden="true" />
              <div className="chart-columns" style={{ gridTemplateColumns: `repeat(${period}, minmax(0, 1fr))` }}>
                {points.map((point, index) => <div className="chart-column" key={point.day}><button type="button" className={`bar-hit ${selectedDay === point.day ? "selected" : ""}`} aria-label={`${labelDate(point.day, { weekday: "long", day: "numeric", month: "numeric" })}: ${formatMinutes(point.minutes)}`} aria-pressed={selectedDay === point.day} onClick={() => setSelectedDay(point.day)} title={`${labelDate(point.day)} · ${formatMinutes(point.minutes)}`}>
                  <span className={`chart-bar ${point.minutes === 0 ? "empty" : ""}`} style={{ "--bar-height": `${point.minutes / maximum * 100}%` } as CSSProperties} />
                </button><span className={`bar-label ${point.day === today ? "today" : ""}`}>{period === 7 ? shortWeekday(point.day) : index % 5 === 0 || index === period - 1 ? Number(point.day.slice(8)) : ""}</span></div>)}
              </div>
            </div>
          </div>
        </div>
        <div className="selected-day-detail" aria-live="polite"><div><Icon name="calendar" size={16} /><strong>{selectedDay === today ? "Hôm nay" : labelDate(selectedDay)}</strong><span>{selectedSessions.length} phiên</span></div><strong>{formatMinutes(totals.get(selectedDay) ?? 0)}</strong></div>
        {total === 0 && <p className="empty-chart-note">Chưa có phiên nào. Hoàn thành một Pomodoro để bắt đầu biểu đồ của bạn.</p>}
      </article>
      <article className="panel habit-chart-card"><div className="panel-heading"><div><span className="small-label">THÓI QUEN HÔM NAY</span><div className="chart-main-value">{habits.length ? Math.round(todayChecks / habits.length * 100) : 0}<span>% hoàn thành</span></div></div><span className="stat-icon"><Icon name="habit" size={20} /></span></div>
        <div className="habit-week-chart" aria-label="Tỷ lệ hoàn thành thói quen hiện có trong 7 ngày">
          {dateRange(today, 7).map((day) => { const percent = habits.length ? Math.round((checks.get(day) ?? 0) / habits.length * 100) : 0; return <div key={day} className="habit-week-column"><span>{percent}%</span><button type="button" aria-label={`${labelDate(day)}: ${percent}% thói quen hoàn thành`} onClick={() => setSelectedDay(day)} title={`${labelDate(day)} · ${percent}%`}><i style={{ height: `${Math.max(3, percent)}%` }} /></button><small className={day === today ? "today" : ""}>{shortWeekday(day)}</small></div>; })}
        </div>
        <div className="heatmap-heading"><strong>Mỗi ngày một chút</strong><span>{activeDays} ngày hoạt động · 12 tuần</span></div>
        <div className="heatmap-grid" aria-label="Lịch hoạt động tập trung 12 tuần">
          {heatDays.map((day) => { const minutes = totals.get(day) ?? 0; const checkCount = checks.get(day) ?? 0; const level = minutes < 60 ? (checkCount ? 1 : 0) : minutes < 120 ? 1 : minutes < 240 ? 2 : 3; return <button type="button" key={day} className={`heat-cell level-${level} ${selectedDay === day ? "selected" : ""}`} disabled={day > today} onClick={() => setSelectedDay(day)} aria-label={`${labelDate(day, { day: "numeric", month: "numeric" })}: ${formatMinutes(minutes)}${checkCount ? `, ${checkCount} check-in` : ""}`} title={`${labelDate(day)} · ${formatMinutes(minutes)}${checkCount ? ` · ${checkCount} check-in` : ""}`} />; })}
        </div>
        <div className="heatmap-key" aria-label="Bốn nấc thời gian tập trung: 0 đến 1 giờ, 1 đến 2 giờ, 2 đến 3 giờ, 4 giờ trở lên"><span>Ít</span>{HEAT_LEVELS.map(({ level, label }) => <i key={level} className={`level-${level}`} title={label} aria-label={label} />)}<span>Nhiều</span><small>Thời gian tập trung</small></div>
      </article>
    </div>
  </section>;
});
