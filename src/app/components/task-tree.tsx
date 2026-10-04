"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Icon } from "../icons";
import { errorMessage, requestJson } from "@/lib/client-api";
import type { Subtask, Task } from "@/lib/focus-domain";
import { ConfirmDialog, type Confirmation } from "./dialogs";

export type TaskTreeResult = { task: Task; subtasks: Subtask[] };
export function TaskTree({ task, subtasks, pending, selected, onToggle, onEdit, onDelete, onFocus, onChanged, onBusy, onError }: {
  task: Task; subtasks: Subtask[]; pending: boolean; selected: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void; onFocus: () => void;
  onChanged: (result: TaskTreeResult) => void; onBusy: (busy: boolean) => void; onError: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(subtasks.length > 0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const lock = useRef(false);
  const intent = useRef<{ title: string; clientId: string } | null>(null);
  const regionId = useId();
  const done = subtasks.filter((item) => item.completed).length;
  async function mutate(url: string, method: string, body?: object) {
    if (lock.current || pending) return false;
    lock.current = true; setBusy(true); onBusy(true);
    try {
      const result = await requestJson<TaskTreeResult>(url, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      onChanged(result); return true;
    } catch (error) { onError(errorMessage(error)); return false; }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  }
  async function add(event: FormEvent) {
    event.preventDefault(); const title = draft.trim(); if (!title) return;
    if (intent.current?.title !== title) intent.current = { title, clientId: crypto.randomUUID() };
    if (await mutate(`/api/tasks/${task.id}/subtasks`, "POST", intent.current)) { setDraft(""); intent.current = null; }
  }
  async function saveEdit(event: FormEvent, child: Subtask) {
    event.preventDefault(); if (!editTitle.trim()) return;
    if (await mutate(`/api/tasks/${task.id}/subtasks/${child.id}`, "PATCH", { title: editTitle.trim() })) setEditing(null);
  }
  return <div className={`task-tree ${task.completed ? "completed" : ""}`} data-task-id={task.id}>
    <div className={`task-row ${task.completed ? "completed" : ""}`}>
      <button className="task-checkbox" type="button" disabled={pending || busy} aria-label={`${task.completed ? "Bỏ hoàn thành" : "Hoàn thành"}: ${task.title}`} aria-pressed={task.completed} onClick={onToggle}>{pending || busy ? <span className="spinner" /> : task.completed ? <Icon name="check" size={14} /> : null}</button>
      <span className="task-title" title={task.title}>{task.title}</span>
      {selected && !task.completed && <span className="chosen-tag">Đã chọn</span>}
      <div className="task-row-actions">
        {!task.completed && <button className="icon-button" type="button" disabled={pending || busy} aria-label={`Chọn ${task.title} để tập trung`} onClick={onFocus}><Icon name="target" size={15} /></button>}
        <button className="icon-button" type="button" disabled={pending || busy} aria-label={`Sửa nhiệm vụ ${task.title}`} onClick={onEdit}><Icon name="sliders" size={15} /></button>
        <button className="icon-button" type="button" disabled={pending || busy} aria-label={`Xóa nhiệm vụ ${task.title}`} onClick={onDelete}><Icon name="trash" size={15} /></button>
      </div>
    </div>
    <div className="task-tree-meta"><button type="button" className="subtask-disclosure" aria-expanded={expanded} aria-controls={regionId} onClick={() => setExpanded(!expanded)}><Icon name={subtasks.length ? "chevron" : "plus"} size={13} className={expanded && subtasks.length ? "rotated" : ""} />{subtasks.length ? `${done}/${subtasks.length} mục nhỏ` : "Chia thành mục nhỏ"}</button>{subtasks.length > 0 && <span className="subtask-progress" title={`${done}/${subtasks.length} mục nhỏ hoàn thành`}><i style={{ width: `${done / subtasks.length * 100}%` }} /></span>}</div>
    {expanded && <div className="subtask-region" id={regionId}>
      <ul className="subtask-list">{subtasks.map((child) => <li className={child.completed ? "completed" : ""} key={child.id}>
        <button className="task-checkbox" type="button" disabled={pending || busy} aria-pressed={child.completed} aria-label={`${child.completed ? "Bỏ hoàn thành mục nhỏ" : "Hoàn thành mục nhỏ"}: ${child.title}`} onClick={() => void mutate(`/api/tasks/${task.id}/subtasks/${child.id}`, "PATCH", { completed: !child.completed })}>{child.completed && <Icon name="check" size={12} />}</button>
        {editing === child.id ? <form className="subtask-edit" onSubmit={(event) => void saveEdit(event, child)}><input autoFocus required maxLength={180} aria-label="Sửa tên mục nhỏ" value={editTitle} disabled={busy} onChange={(event) => setEditTitle(event.target.value)} /><button type="submit" className="icon-button" disabled={busy || !editTitle.trim()} aria-label="Lưu mục nhỏ"><Icon name="check" size={13} /></button><button type="button" className="icon-button" disabled={busy} aria-label="Hủy sửa mục nhỏ" onClick={() => setEditing(null)}><Icon name="close" size={13} /></button></form> : <><span className="subtask-title">{child.title}</span><button className="icon-button" type="button" disabled={pending || busy} aria-label={`Sửa mục nhỏ ${child.title}`} onClick={() => { setEditTitle(child.title); setEditing(child.id); }}><Icon name="sliders" size={13} /></button><button className="icon-button" type="button" disabled={pending || busy} aria-label={`Xóa mục nhỏ ${child.title}`} onClick={() => setConfirmation({ title: "Xóa mục nhỏ?", description: `“${child.title}” sẽ được xóa. Các mục nhỏ khác vẫn được giữ nguyên.`, label: "Xóa mục nhỏ", action: async () => { if (!(await mutate(`/api/tasks/${task.id}/subtasks/${child.id}`, "DELETE"))) throw new Error("Chưa xóa được mục nhỏ. Hãy thử lại."); } })}><Icon name="trash" size={13} /></button></>}
      </li>)}</ul>
      <form className="subtask-create" onSubmit={(event) => void add(event)}><Icon name="plus" size={13} /><input aria-label={`Thêm mục nhỏ cho ${task.title}`} maxLength={180} value={draft} disabled={pending || busy || subtasks.length >= 40} onChange={(event) => setDraft(event.target.value)} placeholder="Một bước nhỏ, dễ bắt đầu…" /><button type="submit" className="icon-button" disabled={pending || busy || !draft.trim() || subtasks.length >= 40} aria-label={`Lưu mục nhỏ cho ${task.title}`}><Icon name="arrow" size={14} /></button></form>
      <small className="subtask-hint">Xong tất cả mục nhỏ → hoàn thành nhiệm vụ. Đánh dấu nhiệm vụ sẽ cập nhật toàn bộ mục nhỏ.</small>
    </div>}
    {confirmation && <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />}
  </div>;
}
