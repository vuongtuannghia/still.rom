"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "../icons";
import { errorMessage, requestJson } from "@/lib/client-api";
import { type Habit, type Preferences, type Task } from "@/lib/focus-domain";

export function Dialog({ title, description, onClose, children, className = "", busy = false, hideHeading = false }: {
  title: string; description?: string; onClose: () => void; children: ReactNode; className?: string; busy?: boolean; hideHeading?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog ref={ref} className={`room-dialog ${className}`} aria-labelledby={id} aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={(event) => {
        if (event.target !== ref.current || busy) return;
        const rect = ref.current.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}>
      {hideHeading ? <div className="sr-only"><h2 id={id}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div> : <div className="dialog-heading"><div><span className="eyebrow">STILL / ROOM</span><h2 id={id}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div>
        <button className="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="Đóng cửa sổ"><Icon name="close" /></button>
      </div>}
      {children}
    </dialog>
  );
}

export function SettingsDialog({ preferences, onSaved, onClose }: { preferences: Preferences; onSaved: (preferences: Preferences) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Preferences>(() => structuredClone(preferences));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {\n    event.preventDefault(); if (busy) return;\n    setBusy(true); setError("");\n    try {\n      try {\n        const result = await requestJson<{ preferences: Preferences }>("/api/preferences", { method: "PATCH", body: JSON.stringify(draft) });\n        onSaved(result.preferences);\n      } catch {\n        onSaved(draft);\n      }\n      onClose();\n    } catch (error) {\n      setError(errorMessage(error));\n    } finally {\n      setBusy(false);\n    }\n  }\n  const numericFields = [
    ["focusMinutes", "Tập trung", 1, 90], ["shortBreakMinutes", "Nghỉ ngắn", 1, 30],
    ["longBreakMinutes", "Nghỉ dài", 5, 60], ["dailyGoalMinutes", "Mục tiêu mỗi ngày", 15, 600],
  ] as const;
  return <Dialog title="Không gian của riêng bạn" description="Cài đặt được lưu cho trình duyệt này. Thời lượng mới không thay đổi phiên đang chạy." onClose={onClose} busy={busy}>
    <form onSubmit={save} className="settings-form">
      <label className="field"><span>Tên của bạn</span><input autoFocus required maxLength={40} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <div className="settings-block"><h3>Nhịp tập trung</h3><div className="settings-number-grid">
        {numericFields.map(([key, label, min, max]) => <label className="field" key={key}><span>{label} (phút)</span><input type="number" required min={min} max={max} step={1} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })} /></label>)}
      </div><label className="field cycle-field"><span>Nghỉ dài sau mỗi</span><select value={draft.longBreakEvery} onChange={(event) => setDraft({ ...draft, longBreakEvery: Number(event.target.value) })}>{[2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n} phiên tập trung</option>)}</select></label>
        {([
          ["autoStartBreak", "Tự bắt đầu giờ nghỉ", "Chỉ khi timer vừa kết thúc, không tự chạy khi mở lại tab cũ."],
          ["autoStartFocus", "Tự bắt đầu phiên tiếp theo", "Sau khi nghỉ xong."],
          ["completionSound", "Âm báo hoàn thành", "Một âm thanh nhẹ khi chuyển chặng."],
        ] as const).map(([key, title, detail]) => <label key={key} className="toggle-row"><span><strong>{title}</strong><small>{detail}</small></span><input type="checkbox" checked={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })} /><i aria-hidden="true" /></label>)}
      </div>
      <div className="settings-block"><h3>Đen & trắng. Theo cách của bạn.</h3><div className="theme-options" aria-label="Chọn giao diện">
        {(["paper", "graphite"] as const).map((theme) => <button key={theme} type="button" className={`theme-option ${draft.theme === theme ? "selected" : ""}`} aria-pressed={draft.theme === theme} onClick={() => setDraft({ ...draft, theme })}><span className={`theme-preview ${theme}`}><i /><i /><i /></span><strong>{theme === "paper" ? "Giấy trắng" : "Graphite"}</strong>{draft.theme === theme && <Icon name="check" size={15} />}</button>)}
      </div><label className="field"><span>Phông phòng tập trung</span><select value={draft.wallpaper} onChange={(event) => setDraft({ ...draft, wallpaper: event.target.value as Preferences["wallpaper"] })}><option value="grid">Lưới tối giản</option><option value="calm">Ánh sáng dịu</option><option value="grain">Vân giấy</option></select></label></div>
      <div className="settings-block"><h3>Widget hiển thị</h3>{([
        ["chart", "Biểu đồ & hoạt động"], ["habits", "Bảng thói quen"], ["tasks", "Danh sách nhiệm vụ"], ["sound", "Âm thanh không gian"], ["history", "Lịch sử phiên"],
      ] as const).map(([key, label]) => <label key={key} className="toggle-row compact"><span><strong>{label}</strong></span><input type="checkbox" checked={draft.widgets[key]} onChange={(event) => setDraft({ ...draft, widgets: { ...draft.widgets, [key]: event.target.checked } })} /><i aria-hidden="true" /></label>)}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-footer"><button className="button-secondary" type="button" disabled={busy} onClick={onClose}>Hủy</button><button className="button-primary" type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu thay đổi"}<Icon name="check" size={16} /></button></div>
    </form>
  </Dialog>;
}

export type EntityEditor = { kind: "task" | "habit"; entity: Task | Habit | null };
export function EntityDialog({ editor, onSaved, onClose }: { editor: EntityEditor; onSaved: (kind: "task" | "habit", entity: Task | Habit) => void; onClose: () => void }) {
  const [title, setTitle] = useState(editor.entity?.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const clientId = useRef<string | null>(null);
  const noun = editor.kind === "habit" ? "thói quen" : "nhiệm vụ";
  async function save(event: FormEvent) {\n    event.preventDefault(); if (busy || !title.trim()) return;\n    setBusy(true); setError("");\n    try {\n      clientId.current ??= crypto.randomUUID();\n      try {\n        const endpoint = editor.kind === "habit" ? "/api/habits" : "/api/tasks";\n        const response = await requestJson<{ habit?: Habit; task?: Task }>(\n          endpoint + (editor.entity ? "/" + editor.entity.id : ""),\n          { method: editor.entity ? "PATCH" : "POST", body: JSON.stringify({ title: title.trim(), clientId: clientId.current }) },\n        );\n        const entity = response.habit ?? response.task;\n        if (entity) onSaved(editor.kind, entity);\n      } catch {\n        const now = new Date().toISOString();\n        if (editor.kind === "habit") {\n          const current = editor.entity as Habit | null;\n          onSaved("habit", { id: current?.id ?? Date.now(), title: title.trim(), createdAt: current?.createdAt ?? now });\n        } else {\n          const current = editor.entity as Task | null;\n          onSaved("task", { id: current?.id ?? Date.now(), title: title.trim(), completed: current?.completed ?? false, completedAt: current?.completedAt ?? null, createdAt: current?.createdAt ?? now });\n        }\n      }\n      onClose();\n    } catch (error) {\n      setError(errorMessage(error));\n    } finally {\n      setBusy(false);\n    }\n  }\n  return <Dialog title={`${editor.entity ? "Chỉnh sửa" : "Thêm"} ${noun}`} description={editor.kind === "habit" ? "Một hành động nhỏ, lặp lại mỗi ngày." : "Đặt tên rõ ràng cho việc bạn muốn hoàn thành."} onClose={onClose} busy={busy}>
    <form onSubmit={save} className="entity-form"><label className="field"><span>Tên {noun}</span><input autoFocus required maxLength={editor.kind === "habit" ? 80 : 180} value={title} onChange={(event) => { clientId.current = null; setTitle(event.target.value); }} placeholder={editor.kind === "habit" ? "Ví dụ: Viết nhật ký 5 phút" : "Ví dụ: Hoàn thiện đề cương"} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-footer"><button type="button" className="button-secondary" disabled={busy} onClick={onClose}>Hủy</button><button className="button-primary" type="submit" disabled={busy || !title.trim()}>{busy ? "Đang lưu…" : "Lưu"}</button></div></form>
  </Dialog>;
}

export type Confirmation = { title: string; description: string; label: string; danger?: boolean; action: () => void | Promise<void> };
export function ConfirmDialog({ confirmation, onClose }: { confirmation: Confirmation; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (busy) return;
    setBusy(true);
    try { await confirmation.action(); onClose(); }
    catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <Dialog title={confirmation.title} description={confirmation.description} onClose={onClose} busy={busy}>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-footer"><button className="button-secondary" type="button" disabled={busy} onClick={onClose}>Giữ lại</button><button className={`button-primary ${confirmation.danger ? "danger-button" : ""}`} type="button" disabled={busy} onClick={() => void confirm()}>{busy ? "Đang xử lý…" : confirmation.label}</button></div>
  </Dialog>;
}
