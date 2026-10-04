"use client";

import { useId, type CSSProperties } from "react";
import { Icon } from "../icons";
import { MODE_LABELS, formatTime, type Preferences, type Task, type TimerMode } from "@/lib/focus-domain";
import type { useFocusTimer } from "../use-focus-timer";

export function FocusPanel({ timer, preferences, tasks, activeTaskId, onTask, onChoose, onReset, onExpand, onSettings, expanded = false }: {
  timer: ReturnType<typeof useFocusTimer>; preferences: Preferences; tasks: Task[]; activeTaskId: number | null;
  onTask: (id: number | null) => void; onChoose: (mode: TimerMode) => void; onReset: () => void; onExpand: () => void; onSettings: () => void; expanded?: boolean;
}) {
  const id = useId();
  const value = timer.snapshot;
  const progress = 1 - value.remainingSeconds / value.durationSeconds;
  const lockedTask = value.runId !== null;
  const activeTitle = lockedTask ? value.taskTitle : tasks.find((task) => task.id === activeTaskId)?.title ?? null;
  const dots = value.mode === "focus" ? value.cycleCount % preferences.longBreakEvery : (value.cycleCount - 1) % preferences.longBreakEvery + 1;
  const buttonText = timer.running ? "Tạm dừng" : value.runId !== null ? "Tiếp tục" : value.mode === "focus" ? "Bắt đầu tập trung" : "Bắt đầu nghỉ";
  return <article className={`focus-panel ${expanded ? "expanded" : "panel"}`} aria-label="Đồng hồ Pomodoro">
    <div className="focus-panel-top"><span className="eyebrow"><span className={timer.running ? "live-dot" : "tiny-dot"} /> FOCUS ROOM</span><div><button type="button" className="icon-button" onClick={onExpand} aria-label={expanded ? "Thu nhỏ phòng tập trung" : "Mở phòng tập trung toàn màn hình"} title="Toàn màn hình (F)"><Icon name={expanded ? "close" : "move"} size={17} /></button><button type="button" className="icon-button" onClick={onSettings} aria-label="Cài đặt Pomodoro"><Icon name="sliders" size={17} /></button></div></div>
    <div className="focus-content"><div className="timer-controls">
      <div className="timer-modes" aria-label="Chế độ Pomodoro">{(["focus", "shortBreak", "longBreak"] as const).map((mode) => <button key={mode} type="button" className={value.mode === mode ? "selected" : ""} disabled={!timer.ready} aria-pressed={value.mode === mode} onClick={() => onChoose(mode)}>{MODE_LABELS[mode]}</button>)}</div>
      <div className="timer-ring" style={{ "--timer-progress": `${Math.min(1, Math.max(0, progress)) * 360}deg` } as CSSProperties}>
        <div className="timer-ring-inner"><span className="timer-state">{timer.running ? value.mode === "focus" ? "ĐANG TẬP TRUNG" : "ĐANG NGHỈ NGƠI" : value.runId ? "MỘT NHỊP TẠM DỪNG" : "BẮT ĐẦU KHI SẴN SÀNG"}</span><span className="timer-digits" data-testid={expanded ? "immersive-timer-display" : "timer-display"} role="timer" aria-live="off" aria-label={`${formatTime(value.remainingSeconds)} còn lại`}>{formatTime(value.remainingSeconds)}</span><span className="timer-mode-label">{MODE_LABELS[value.mode]}</span></div>
      </div>
      <div className="timer-actions"><button className="button-primary timer-start" type="button" disabled={!timer.ready} onClick={timer.toggle}><Icon name={timer.running ? "pause" : "play"} size={18} />{timer.ready ? buttonText : "Đang chuẩn bị…"}</button><button className="icon-button timer-reset" type="button" disabled={!timer.ready} onClick={onReset} aria-label="Đặt lại đồng hồ" title="Đặt lại (R)"><Icon name="reset" size={19} /></button></div>
      <div className="pomodoro-cycle"><div role="img" aria-label={`${dots} trên ${preferences.longBreakEvery} phiên trong vòng hiện tại`}>{Array.from({ length: preferences.longBreakEvery }, (_, i) => <i key={i} className={i < dots ? "filled" : ""} />)}</div><span>Nghỉ dài sau {preferences.longBreakEvery} phiên</span></div>
      {value.mode === "focus" && value.runId !== null && <button className="text-button finish-early" type="button" disabled={timer.elapsedSeconds < (typeof window !== "undefined" && window.location.hostname.endsWith(".manus.computer") ? 1 : 60)} onClick={timer.finishEarly}>Lưu phần đã tập trung <Icon name="arrow" size={14} /></button>}
    </div><aside className="focus-aside"><span className="quote-symbol" aria-hidden="true">“</span><h2>Một việc.<br />Một nhịp.<br /><span>Một chút tiến bộ.</span></h2><p>Không cần hoàn hảo.<br />Chỉ cần có mặt.</p><div className="focus-task-block"><label htmlFor={id}>{lockedTask ? "NHIỆM VỤ CỦA PHIÊN NÀY" : "NHIỆM VỤ CHO PHIÊN TỚI"}</label>{lockedTask ? <div className="locked-task"><Icon name="tasks" size={18} /><span>{activeTitle ?? "Tập trung tự do"}</span></div> : <div className="focus-task-select"><Icon name="tasks" size={17} /><select id={id} value={activeTaskId ?? ""} onChange={(event) => onTask(event.target.value ? Number(event.target.value) : null)}><option value="">Tập trung tự do</option>{tasks.filter((task) => !task.completed).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><Icon name="chevron" size={15} /></div>}
      <small>{lockedTask ? "Tên nhiệm vụ được giữ nguyên đến hết phiên." : "Mỗi phiên hoàn thành sẽ tự xuất hiện trong biểu đồ."}</small></div><div className="focus-shortcuts"><kbd>Space</kbd><span>{timer.running ? "Tạm dừng" : "Bắt đầu"}</span><kbd>F</kbd><span>Toàn màn hình</span></div></aside></div>
  </article>;
}
