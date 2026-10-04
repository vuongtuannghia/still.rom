"use client";

import Image from "next/image";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Icon } from "../icons";
import { BUILTIN_SCENES, parseYouTubeLink, type RoomSettings, type YouTubeScene } from "@/lib/scene-domain";
import { errorMessage } from "@/lib/client-api";
import { ConfirmDialog, Dialog, type Confirmation } from "./dialogs";

type SceneProps = { room: RoomSettings; onChange: (patch: Partial<RoomSettings>) => Promise<void> };
export function YouTubeLinkForm({ room, onChange, onPlay, quick = false }: SceneProps & { onPlay?: () => void; quick?: boolean }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const intent = useRef<{ key: string; scene: YouTubeScene } | null>(null);
  const lock = useRef(false);
  const id = useId();
  const parsed = useMemo(() => { try { return url.trim() ? parseYouTubeLink(url) : null; } catch { return null; } }, [url]);
  async function clipboard() {
    setError(""); setNotice("");
    try {
      if (!navigator.clipboard?.readText) throw new Error("clipboard");
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error("empty");
      setUrl(text.trim().slice(0, 4096)); input.current?.focus();
    } catch {
      input.current?.focus();
      setNotice("Khung preview không cho đọc clipboard tự động. Bấm vào ô và dùng Ctrl+V / ⌘V, hoặc nhấn giữ để dán trên điện thoại.");
    }
  }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!url.trim() || lock.current) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const playNow = quick || submitter?.value === "play";
    let media: ReturnType<typeof parseYouTubeLink>;
    try { media = parseYouTubeLink(url); } catch (reason) { setError(errorMessage(reason)); return; }
    const existing = room.scenes.find((scene) => scene.videoId === media.videoId && scene.playlistId === media.playlistId && scene.startSeconds === media.startSeconds);
    if (!existing && room.scenes.length >= 12) { setError("Đã có 12 cảnh. Xóa một cảnh cũ trước khi thêm nhé."); return; }
    const key = `${media.videoId}|${media.playlistId ?? ""}|${media.startSeconds}|${title.trim()}`;
    if (!intent.current || intent.current.key !== key) intent.current = { key, scene: { id: crypto.randomUUID(), ...media, title: title.trim() || (media.playlistId ? "Playlist của bạn" : "Quang cảnh của bạn") } };
    const scene = existing ? { ...existing, title: title.trim() || existing.title } : intent.current.scene;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await onChange({ scenes: existing ? room.scenes.map((item) => item.id === scene.id ? scene : item) : [...room.scenes, scene], selectedId: scene.id, videoView: "ambient" });
      setUrl(""); setTitle(""); intent.current = null;
      setNotice("Đã lưu và chọn video. Bạn có thể phát ngay trong phòng học.");
      if (playNow) onPlay?.();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form className={`youtube-link-form ${quick ? "quick-link-form" : ""}`} onSubmit={(event) => void add(event)} aria-label="Thêm video YouTube">
    {!quick && <div className="scene-form-heading"><span className="youtube-wordmark"><Icon name="play" size={15} /></span><div><strong>Quang cảnh từ YouTube</strong><span>Video rõ ở giữa, nền mờ lan tỏa khắp trang.</span></div></div>}
    <div className="youtube-input-row"><label className="field" htmlFor={id}><span className={quick ? "sr-only" : ""}>{quick ? "Link YouTube nhanh" : "Link YouTube"}</span><input ref={input} id={id} aria-label={quick ? "Link YouTube nhanh" : "Link YouTube"} type="text" inputMode="url" autoComplete="off" spellCheck={false} maxLength={4096} placeholder="Dán link YouTube của bạn vào đây…" value={url} disabled={busy}
      onChange={(event) => { setUrl(event.target.value); setError(""); setNotice(""); }}
      onPaste={(event) => { const text = event.clipboardData.getData("text/plain"); if (!text) return; event.preventDefault(); event.stopPropagation(); const start = event.currentTarget.selectionStart ?? 0; const end = event.currentTarget.selectionEnd ?? start; setUrl((current) => `${current.slice(0, start)}${text}${current.slice(end)}`.slice(0, 4096)); setError(""); setNotice(""); }}
      onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && ["v", "c", "x", "a"].includes(event.key.toLowerCase())) event.stopPropagation(); }} /></label>
      <button type="button" className="button-secondary clipboard-button" disabled={busy} onClick={() => void clipboard()} title="Dán từ clipboard">Dán</button>
      {quick && <button type="submit" name="action" value="play" className="button-primary" disabled={busy || !url.trim()}>{busy ? "Đang mở…" : "Phát ngay"}<Icon name="play" size={16} /></button>}
    </div>
    {!quick && <><label className="field scene-name-field"><span>Tên quang cảnh <small>(không bắt buộc)</small></span><input type="text" maxLength={80} placeholder="Ví dụ: Mưa bên cửa sổ" value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} /></label>
      {parsed && <div className="youtube-link-preview"><span className="preview-media-icon"><Icon name="check" size={16} /></span><div><strong>{parsed.playlistId ? "Playlist hợp lệ" : "Link video hợp lệ"}</strong><span>{parsed.playlistId ?? parsed.videoId}{parsed.startSeconds > 0 ? ` · từ ${parsed.startSeconds}s` : ""}</span></div></div>}
      <div className="youtube-submit-actions"><button type="submit" name="action" value="play" className="button-primary" disabled={busy || !url.trim()}>{busy ? "Đang lưu…" : "Phát ngay"}<Icon name="play" size={16} /></button><button type="submit" name="action" value="save" className="button-secondary" disabled={busy || !url.trim()}>Lưu và chọn video</button></div>
      <p className="youtube-link-help">Nhận watch, youtu.be, Shorts, live, playlist và mã video. Trình duyệt có thể yêu cầu bạn nhấn ▶ trực tiếp trên video để bắt đầu.</p></>}
    <p className="video-only-explanation"><strong>Nền lan tỏa và công cụ ở bên.</strong> Kéo tay nắm thanh công cụ sang trái/phải. Nền mở rộng từ ảnh đại diện YouTube; video chính vẫn giữ nguyên chất lượng và điều khiển.</p>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="scene-success" role="status">{notice}</p>}
  </form>;
}

export function SceneChoices({ room, onChange, onEnter, compact = false }: SceneProps & { onEnter?: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const lock = useRef(false);
  async function patch(value: Partial<RoomSettings>) {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError("");
    try { await onChange(value); return true; }
    catch (reason) { setError(errorMessage(reason)); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className={`scene-choices ${compact ? "compact-scenes" : ""}`}>
    <YouTubeLinkForm room={room} onChange={onChange} onPlay={onEnter} />
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="scene-library-heading"><h3>Quang cảnh đã lưu</h3><span>{room.scenes.length}/12</span></div>
    <div className="scene-library">{BUILTIN_SCENES.map((scene) => <button type="button" disabled={busy} key={scene.id} className={`scene-choice ${room.selectedId === scene.id ? "selected" : ""}`} aria-pressed={room.selectedId === scene.id} onClick={() => void patch({ selectedId: scene.id })}><span className="scene-thumbnail"><Image src={scene.image} alt="" fill sizes="(max-width: 540px) 160px, 240px" style={{ objectPosition: scene.position }} />{room.selectedId === scene.id && <i><Icon name="check" size={16} /></i>}</span><strong>{scene.title}</strong><small>Ảnh tĩnh · {scene.detail}</small></button>)}
      {room.scenes.map((scene) => <div className={`saved-scene ${room.selectedId === scene.id ? "selected" : ""}`} key={scene.id}><button type="button" disabled={busy} className="scene-choice" aria-pressed={room.selectedId === scene.id} onClick={() => void patch({ selectedId: scene.id })}><span className="scene-thumbnail"><Image src={scene.videoId ? `https://i.ytimg.com/vi/${scene.videoId}/hqdefault.jpg` : "/scenes/quiet-window.jpg"} alt="" fill unoptimized sizes="200px" /><span className="youtube-thumbnail-badge">{scene.playlistId ? "Playlist" : "YouTube"}</span>{room.selectedId === scene.id && <i><Icon name="check" size={16} /></i>}</span><strong>{scene.title}</strong><small>{scene.startSeconds ? `Bắt đầu từ ${scene.startSeconds}s` : "Nhấn để chọn"}</small></button><button className="scene-remove" type="button" disabled={busy} aria-label={`Xóa cảnh ${scene.title}`} onClick={() => setConfirmation({ title: "Xóa cảnh đã lưu?", description: `Chỉ xóa “${scene.title}” khỏi danh sách của bạn, không ảnh hưởng tới video gốc.`, label: "Xóa cảnh", action: async () => { const scenes = room.scenes.filter((item) => item.id !== scene.id); if (!(await patch({ scenes, selectedId: room.selectedId === scene.id ? "quiet-window" : room.selectedId }))) throw new Error("Chưa xóa được cảnh. Hãy thử lại."); } })}><Icon name="trash" size={14} /></button></div>)}
    </div>
    <div className="scene-options"><label><input type="checkbox" checked={room.loop} disabled={busy} onChange={(event) => void patch({ loop: event.target.checked })} /> Lặp lại video</label><label><input type="checkbox" checked={room.youtubeMuted} disabled={busy} onChange={(event) => void patch({ youtubeMuted: event.target.checked })} /> Tắt tiếng YouTube khi mở</label><label><input type="checkbox" checked={room.stillMonochrome} disabled={busy} onChange={(event) => void patch({ stillMonochrome: event.target.checked })} /> Cảnh tĩnh đen trắng</label></div>
    {onEnter && <button className="button-primary scene-enter" type="button" disabled={busy} onClick={onEnter}>Vào phòng học <Icon name="move" size={16} /></button>}
    {confirmation && <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />}
  </div>;
}
export function ScenePickerDialog({ room, onChange, onEnter, onClose }: SceneProps & { onEnter: () => void; onClose: () => void }) {
  return <Dialog title="Quang cảnh học tập" description="Dán link và Phát ngay. Video, timer và âm thanh có điều khiển riêng." onClose={onClose} className="scene-picker-dialog"><SceneChoices room={room} onChange={onChange} onEnter={onEnter} /></Dialog>;
}
export function SceneBanner({ room, onChange, onEnter, onChoose }: SceneProps & { onEnter: () => void; onChoose: () => void }) {
  const youtube = room.scenes.find((scene) => scene.id === room.selectedId);
  const still = BUILTIN_SCENES.find((scene) => scene.id === room.selectedId) ?? BUILTIN_SCENES[0];
  return <section className="scene-banner panel" id="study-room">
    <div className="scene-banner-copy">
      <span className="eyebrow"><Icon name="leaf" size={14} /> MỘT GÓC HỌC. MỘT THẾ GIỚI YÊN.</span>
      <h2>Ở đây, chỉ cần có mặt.</h2>
      <p>Video của bạn, tiếng mưa thật và một việc nhỏ để bắt đầu.</p>
      <YouTubeLinkForm room={room} onChange={onChange} onPlay={onEnter} quick />
      <div className="scene-banner-actions">
        <button className="button-primary" type="button" onClick={onEnter}>Mở phòng học <Icon name="move" size={16} /></button>
        <button className="button-secondary" type="button" onClick={onChoose}><Icon name="plus" size={16} /> Dán link YouTube</button>
      </div>
      <small><span className="tiny-dot" />Đang chọn: {youtube?.title ?? still.title}</small>
    </div>
    {youtube ? (
      <div className="scene-banner-youtube-preview-wrap">
        <div className="scene-banner-preview scene-banner-youtube-preview youtube-single-player-slot" data-youtube-slot="dashboard" aria-label="Video YouTube đang phát"></div>
        <div className="scene-preview-meta">
          <span>YOUTUBE SCENE · XEM NGAY</span>
          <strong>{youtube.title}</strong>
        </div>
      </div>
    ) : (
      <button className="scene-banner-preview" type="button" onClick={onEnter} aria-label="Mở quang cảnh trong phòng học">
        <Image src={still.image} alt="" fill sizes="(max-width: 760px) 100vw, 500px" style={{ objectPosition: still.position, filter: room.stillMonochrome ? "grayscale(1)" : undefined }} />
        <span className="scene-preview-caption"><span>STILL / ROOM</span><strong>{still.title}</strong><i><Icon name="play" size={21} /></i></span>
      </button>
    )}
  </section>;
}