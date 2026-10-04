"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons";
import { dateRange, labelDate, monthDays, shiftDay, shiftMonth, shortWeekday, type CheckIn, type Habit } from "@/lib/focus-domain";

export const HabitMatrix = memo(function HabitMatrix({ habits, checkIns, today, pending, onToggle, onAdd, onEdit, onDelete }: {
  habits: Habit[]; checkIns: CheckIn[]; today: string; pending: Set<string>;
  onToggle: (habit: Habit, day: string, completed: boolean) => void;
  onAdd: () => void; onEdit: (habit: Habit) => void; onDelete: (habit: Habit) => void;
}) {
  const [period, setPeriod] = useState<"week" | "month">(() => typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches ? "week" : "month");
  const [month, setMonth] = useState(today.slice(0, 7));
  const scrollRef = useRef<HTMLDivElement>(null);
  const earliest = shiftDay(today, -365);
  const days = useMemo(() => period === "week" ? dateRange(today, 7) : monthDays(month), [period, month, today]);
  const keys = useMemo(() => new Set(checkIns.map((check) => `${check.habitId}|${check.date}`)), [checkIns]);
  const validDays = days.filter((day) => day <= today && day >= earliest);
  const checked = habits.reduce((sum, habit) => sum + validDays.filter((day) => keys.has(`${habit.id}|${day}`)).length, 0);
  const possible = validDays.length * habits.length;
  const percent = possible ? Math.round(checked / possible * 100) : 0;
  const completedToday = habits.filter((habit) => keys.has(`${habit.id}|${today}`)).length;
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const viewport = scrollRef.current;
      const cell = viewport?.querySelector<HTMLElement>("[data-today='true']");
      if (!viewport || !cell) return;
      const right = cell.getBoundingClientRect().right - viewport.getBoundingClientRect().right;
      if (right > -40) viewport.scrollLeft += right + 48;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [period, month, today, habits.length]);
  function jumpToToday() {
    setMonth(today.slice(0, 7));
    window.requestAnimationFrame(() => {
      const cell = scrollRef.current?.querySelector<HTMLElement>("[data-today='true']");
      if (scrollRef.current && cell) scrollRef.current.scrollTo({ left: Math.max(0, cell.offsetLeft - scrollRef.current.clientWidth + 100), behavior: "smooth" });
    });
  }
  return <section id="habits" className="panel matrix-card">
    <div className="panel-heading"><div><span className="eyebrow">XÂY MỘT NHỊP ĐỀU ĐẶN</span><h2>Những thói quen nhỏ.</h2><p>Chạm vào từng ô để ghi lại ngày của bạn.</p></div><button className="button-primary" type="button" onClick={onAdd}><Icon name="plus" size={17} /> Thêm thói quen</button></div>
    <div className="matrix-toolbar"><div className="segmented" aria-label="Chọn kiểu theo dõi"><button type="button" className={period === "week" ? "active" : ""} aria-pressed={period === "week"} onClick={() => setPeriod("week")}>7 ngày</button><button type="button" className={period === "month" ? "active" : ""} aria-pressed={period === "month"} onClick={() => setPeriod("month")}>Theo tháng</button></div>
      {period === "month" && <div className="month-switch"><button className="icon-button" type="button" aria-label="Tháng trước" disabled={month <= earliest.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="chevron" className="chevron-left" size={16} /></button><strong>{labelDate(`${month}-01`, { month: "long", year: "numeric" })}</strong><button className="icon-button" type="button" aria-label="Tháng sau" disabled={month >= today.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="chevron" className="chevron-right" size={16} /></button></div>}
      <button className="text-button" type="button" onClick={jumpToToday}><span className="tiny-dot" /> {completedToday}/{habits.length} hôm nay</button>
    </div>
    {habits.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="leaf" size={26} /></span><h3>Một điều nhỏ cho hôm nay.</h3><p>Thêm thói quen đầu tiên. Danh sách trống sẽ được giữ nguyên, không tự thêm lại mục mẫu.</p><button className="button-secondary" type="button" onClick={onAdd}>Tạo thói quen đầu tiên <Icon name="plus" size={16} /></button></div> : <div className="matrix-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Bảng thói quen, có thể cuộn ngang"><table className="habit-matrix">
      <caption className="sr-only">Theo dõi thói quen {period === "week" ? "7 ngày gần nhất" : labelDate(`${month}-01`, { month: "long", year: "numeric" })}</caption>
      <thead>{period === "month" && <tr className="week-band"><th className="sticky-cell">THÓI QUEN CỦA BẠN</th>{Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => <th key={i} colSpan={Math.min(7, days.length - i * 7)}>TUẦN {i + 1}</th>)}<th>TỔNG</th></tr>}
        <tr><th scope="col" className="sticky-cell">Thói quen</th>{days.map((day) => <th scope="col" key={day} className={day === today ? "today-head" : ""} data-today={day === today}><strong>{Number(day.slice(8))}</strong><small>{shortWeekday(day)}</small></th>)}<th scope="col" className="matrix-rate-head">Tiến độ</th></tr>
        <tr className="day-progress"><th scope="row" className="sticky-cell">Tiến độ / ngày</th>{days.map((day) => { const count = habits.filter((habit) => keys.has(`${habit.id}|${day}`)).length; return <td key={day}><span className="daily-mini-bar" title={`${labelDate(day)}: ${count}/${habits.length}`}><i style={{ height: `${day > today ? 0 : Math.max(3, count / habits.length * 100)}%` }} /></span></td>; })}<td /></tr>
      </thead><tbody>{habits.map((habit, index) => {
        const count = validDays.filter((day) => keys.has(`${habit.id}|${day}`)).length;
        const waiting = [...pending].some((key) => key.startsWith(`${habit.id}|`));
        return <tr key={habit.id}><th scope="row" className="sticky-cell"><div className="matrix-habit-name"><span className="habit-number">{String(index + 1).padStart(2, "0")}</span><span title={habit.title}>{habit.title}</span><div className="matrix-row-actions"><button className="icon-button" type="button" disabled={waiting} onClick={() => onEdit(habit)} aria-label={`Sửa thói quen ${habit.title}`}><Icon name="sliders" size={14} /></button><button className="icon-button" type="button" disabled={waiting} onClick={() => onDelete(habit)} aria-label={`Xóa thói quen ${habit.title}`}><Icon name="trash" size={14} /></button></div></div></th>
          {days.map((day) => { const key = `${habit.id}|${day}`; const isChecked = keys.has(key); const disabled = day > today || day < earliest; return <td key={day} className={day === today ? "today-column" : ""}><button type="button" className={`habit-check ${isChecked ? "checked" : ""} ${pending.has(key) ? "is-pending" : ""}`} disabled={disabled || pending.has(key)} aria-pressed={isChecked} aria-label={`${isChecked ? "Bỏ đánh dấu" : "Đánh dấu"} ${habit.title}, ${labelDate(day, { day: "numeric", month: "numeric", year: "numeric" })}`} title={`${habit.title} · ${labelDate(day)}`} onClick={() => onToggle(habit, day, !isChecked)}>{pending.has(key) ? <span className="spinner" /> : isChecked ? <Icon name="check" size={15} /> : null}</button></td>; })}
          <td className="matrix-row-total"><strong>{count}</strong><span>/{validDays.length}</span></td></tr>;
      })}</tbody></table></div>}
    <div className="matrix-footer"><div className="matrix-overall"><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><strong>{percent}%</strong><span>ô hoàn thành trong {period === "week" ? "7 ngày" : "tháng"}</span></div><div className="matrix-key"><i /><span>Chưa xong</span><i className="done"><Icon name="check" size={11} /></i><span>Đã xong</span></div></div>
  </section>;
});
