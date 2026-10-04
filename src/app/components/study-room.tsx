"use client";

import { useCallback, useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Dialog } from "./dialogs";
import { FocusPanel } from "./focus-panel";
import { AmbientPlayer } from "./ambient-player";
import { SceneChoices } from "./scene-picker";
import { YouTubeScenePlayer } from "./youtube-scene";
import { WorkspaceAccessBar } from "./workspace-access";
import { SceneBackdrop } from "./scene-backdrop";
import { RoomAppearance } from "./room-appearance";
import { Icon } from "../icons";
import { BUILTIN_SCENES, type RoomSettings } from "@/lib/scene-domain";
import type { AmbientMixer } from "../use-ambient-mixer";
import { formatTime } from "@/lib/focus-domain";
import { useVideoOnlyNavigation } from "../use-video-only-navigation";
import { useRoomDock } from "../use-room-dock";

type Tool = "timer" | "sounds" | "tasks" | "scenes" | "appearance";
const TOOLS = [
  { id: "timer", label: "Timer", icon: "clock" }, { id: "sounds", label: "Âm thanh", icon: "headphones" },
  { id: "tasks", label: "Nhiệm vụ", icon: "tasks" }, { id: "scenes", label: "Quang cảnh", icon: "leaf" },
  { id: "appearance", label: "Nền mờ", icon: "sliders" },
] as const;
export function StudyRoom({ room, onChange, onClose, focusProps, mixer, tasksPanel, time, date }: {
  room: RoomSettings; onChange: (patch: Partial<RoomSettings>) => Promise<void>; onClose: () => void;
  focusProps: Omit<ComponentProps<typeof FocusPanel>, "expanded">; mixer: AmbientMixer; tasksPanel: ReactNode; time: string; date: string;
}) {
  const screen = useRef<HTMLDivElement>(null);
  const youtube = room.scenes.find((scene) => scene.id === room.selectedId);
  const still = BUILTIN_SCENES.find((scene) => scene.id === room.selectedId) ?? BUILTIN_SCENES[0];
  const [panel, setPanel] = useState<{ sceneId: string; tool: Tool | null }>({ sceneId: room.selectedId, tool: youtube ? null : "timer" });
  const [pure, setPure] = useState<{ sceneId: string; active: boolean }>({ sceneId: room.selectedId, active: false });
  const [videoTools, setVideoTools] = useState(false);
  const [visualPreview, setVisualPreview] = useState<{ ambientBlur: number; ambientDim: number } | null>(null);
  const [changeError, setChangeError] = useState("");
  const [viewBusy, setViewBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenBusy, setFullscreenBusy] = useState(false);
  const [fullscreenNotice, setFullscreenNotice] = useState("");
  const [playingVideo, setPlayingVideo] = useState<{ sceneId: string; id: string }>({ sceneId: room.selectedId, id: youtube?.videoId ?? "" });
  const id = useId();
  const dock = useRoomDock(room, screen, onChange);
  const tool = panel.sceneId === room.selectedId ? panel.tool : null;
  const videoOnly = Boolean(youtube) && pure.sceneId === room.selectedId && pure.active;
  const backdropRoom = visualPreview ? { ...room, ...visualPreview } : room;
  const revealControls = useCallback(() => { setPure({ sceneId: room.selectedId, active: false }); window.requestAnimationFrame(() => screen.current?.querySelector<HTMLButtonElement>(".room-close")?.focus({ preventScroll: true })); }, [room.selectedId]);
  const revealLatest = useRef(revealControls);
  useEffect(() => { revealLatest.current = revealControls; });
  useVideoOnlyNavigation(videoOnly, revealControls);
  useEffect(() => {
    const element = screen.current;
    const update = () => { setFullscreen(document.fullscreenElement === element); };
    document.addEventListener("fullscreenchange", update);
    return () => { document.removeEventListener("fullscreenchange", update); if (element && document.fullscreenElement === element) void document.exitFullscreen().catch(() => {}); };
  }, []);
  function chooseTool(next: Tool) {
    setPanel({ sceneId: room.selectedId, tool: tool === next ? null : next });
    setVisualPreview(null);
  }
  function openScenes() { revealControls(); setPanel({ sceneId: room.selectedId, tool: "scenes" }); setVisualPreview(null); }
  function enterVideoOnly() { setPure({ sceneId: room.selectedId, active: true }); setPanel({ sceneId: room.selectedId, tool: null }); setVideoTools(false); setVisualPreview(null); }
  async function closeRoom() {
    if (screen.current && document.fullscreenElement === screen.current) try { await document.exitFullscreen(); } catch { /* Closing still works. */ }
    onClose();
  }
  async function toggleFullscreen() {
    if (fullscreenBusy) return;
    setFullscreenNotice("");
    const element = screen.current;
    if (!element || !document.fullscreenEnabled || !element.requestFullscreen) { setFullscreenNotice("Khung preview chưa cho phép toàn màn hình. Nền mờ vẫn phủ kín khung này; mở website riêng để dùng fullscreen."); return; }
    setFullscreenBusy(true);
    try { if (document.fullscreenElement === element) await document.exitFullscreen(); else await element.requestFullscreen({ navigationUI: "hide" }); }
    catch { setFullscreenNotice("Trình duyệt chưa cho phép fullscreen trong khung này. Bạn vẫn có thể học với nền lan tỏa hoặc mở website riêng."); }
    finally { setFullscreenBusy(false); }
  }
  async function change(patch: Partial<RoomSettings>) {
    setChangeError("");
    try { await onChange(patch); } catch (reason) { setChangeError(reason instanceof Error ? reason.message : "Chưa lưu được thay đổi."); }
  }
  async function toggleView() {
    if (viewBusy) return;
    setViewBusy(true); setChangeError("");
    try { await onChange({ videoView: room.videoView === "studio" ? "ambient" : "studio" }); }
    catch (reason) { setChangeError(reason instanceof Error ? reason.message : "Chưa đổi được chế độ xem."); }
    finally { setViewBusy(false); }
  }
  const currentVideoId = playingVideo.sceneId === room.selectedId ? playingVideo.id : youtube?.videoId;
  return <Dialog title="Một việc tại một thời điểm." onClose={() => { if (videoOnly) revealControls(); else void closeRoom(); }} hideHeading className="study-room-dialog ambient-room-dialog">
    <div ref={screen} className="room-screen ambient-room-screen" data-video-view={youtube ? room.videoView : "still"} data-dock-side={dock.side} data-panels-open={String(Boolean(tool))} data-video-only={String(videoOnly)} data-drag-side={dock.target ?? "none"}>
      <SceneBackdrop room={backdropRoom} currentVideoId={currentVideoId} />
      <div className="ambient-room-workspace">
        {!videoOnly && <div className="room-rail-slot"><nav className="room-side-rail" aria-label="Thanh công cụ bên của phòng học">
          <button className="rail-grip" type="button" disabled={dock.busy} aria-label="Kéo thanh công cụ sang trái hoặc phải" title="Giữ và kéo sang mép bên kia. Phím ← / → cũng đổi bên." {...dock.dragHandlers}><Icon name="dots" size={19} /><span className="sr-only">Kéo thanh công cụ</span></button>
          <button className="rail-button room-close" type="button" aria-label="Đóng cửa sổ" title="Trở về dashboard" onClick={() => void closeRoom()}><Icon name="close" size={20} /><span>Trở về</span></button>
          <div className="rail-divider" />
          <div className="room-dock-tabs" role="tablist" aria-label="Widget trong phòng học" aria-orientation="vertical">{TOOLS.map((item, index) => <button type="button" role="tab" key={item.id} id={`${id}-${item.id}`} aria-selected={tool === item.id} aria-controls={tool === item.id ? `${id}-panel` : undefined} tabIndex={tool === item.id || (tool === null && index === 0) ? 0 : -1} className={`rail-button ${tool === item.id ? "active" : ""}`} onClick={() => chooseTool(item.id)} onKeyDown={(event) => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); const next = TOOLS[(index + (event.key === "ArrowDown" ? 1 : TOOLS.length - 1)) % TOOLS.length]; setPanel({ sceneId: room.selectedId, tool: next.id }); document.getElementById(`${id}-${next.id}`)?.focus(); } }} title={item.label}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}</div>
          <button className="rail-mini-timer" type="button" disabled={!focusProps.timer.ready} aria-label={focusProps.timer.running ? "Tạm dừng Pomodoro" : "Chạy Pomodoro"} onClick={focusProps.timer.toggle}><Icon name={focusProps.timer.running ? "pause" : "play"} size={13} /><strong data-testid="room-mini-timer">{formatTime(focusProps.timer.snapshot.remainingSeconds)}</strong></button>
          <div className="rail-divider" />
          <button className="rail-button" type="button" aria-label={tool ? "Ẩn bảng điều khiển" : "Hiện bảng điều khiển"} aria-pressed={Boolean(tool)} onClick={() => { setPanel({ sceneId: room.selectedId, tool: tool ? null : "timer" }); setVisualPreview(null); }} title={tool ? "Thu gọn bảng" : "Mở bảng học"}><Icon name="layout" size={19} /><span>{tool ? "Thu gọn" : "Bảng học"}</span></button>
          <button className="rail-button" type="button" aria-label="Đổi cảnh / YouTube" onClick={openScenes} title="Dán link YouTube hoặc chọn cảnh"><Icon name="plus" size={19} /><span>YouTube</span></button>
          {youtube && <button className="rail-button" type="button" aria-label="Điều khiển video" aria-pressed={videoTools} onClick={() => setVideoTools(!videoTools)}><Icon name="volume" size={19} /><span>Video</span></button>}
          <button className="rail-button" type="button" aria-label={room.videoView === "studio" ? "Bật nền lan tỏa" : "Chuyển sang vừa khung"} disabled={viewBusy} onClick={() => void toggleView()}><Icon name="leaf" size={19} /><span>{room.videoView === "studio" ? "Lan tỏa" : "Vừa khung"}</span></button>
          <button className="rail-button" type="button" disabled={dock.busy} aria-label={dock.side === "left" ? "Chuyển công cụ sang phải" : "Chuyển công cụ sang trái"} onClick={() => void dock.swap()}><Icon name="arrow" size={19} className={dock.side === "left" ? "" : "rail-flip-icon"} /><span>Đổi bên</span></button>
          <button className="rail-button" type="button" disabled={fullscreenBusy} aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} onClick={() => void toggleFullscreen()}><Icon name="move" size={19} /><span>{fullscreen ? "Thu nhỏ" : "Full"}</span></button>
          {youtube && <button className="rail-button" type="button" aria-label="Chỉ video, ẩn toàn bộ công cụ" onClick={enterVideoOnly}><Icon name="play" size={19} /><span>Chỉ video</span></button>}
        </nav></div>}
        {!videoOnly && tool && <aside className="study-room-dock ambient-tool-panel" aria-label="Điều khiển phòng học" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tool}`}>
          <div className="ambient-panel-heading"><button className="panel-drag-grip" type="button" disabled={dock.busy} aria-label="Kéo bảng công cụ sang bên" title="Kéo sang trái hoặc phải" {...dock.dragHandlers}><Icon name="move" size={15} /></button><strong>{TOOLS.find((item) => item.id === tool)?.label}</strong><button className="icon-button" type="button" aria-label="Thu gọn bảng công cụ" onClick={() => { setPanel({ sceneId: room.selectedId, tool: null }); setVisualPreview(null); }}><Icon name="close" size={15} /></button></div>
          <div className="room-dock-scroll">
            {tool === "timer" && <div className="room-timer-card"><FocusPanel {...focusProps} expanded /></div>}
            {tool === "sounds" && <AmbientPlayer mixer={mixer} compact />}
            {tool === "tasks" && <section className="room-task-panel"><span className="eyebrow">MỘT BƯỚC NHỎ TIẾP THEO</span><h3>Nhiệm vụ của bạn</h3>{tasksPanel}</section>}
            {tool === "scenes" && <><WorkspaceAccessBar compact /><SceneChoices room={room} onChange={onChange} onEnter={() => setPanel({ sceneId: room.selectedId, tool: null })} compact /></>}
            {tool === "appearance" && <RoomAppearance key={`${room.selectedId}:${room.ambientBlur}:${room.ambientDim}`} room={room} onChange={onChange} onPreview={setVisualPreview} />}
          </div>
          <div className="ambient-panel-footer"><Icon name="dots" size={14} /><span>Kéo tay nắm để đổi bên · {dock.busy ? "Đang lưu…" : dock.side === "left" ? "Neo trái" : "Neo phải"}</span></div>
        </aside>}
        <section className="study-room-scene ambient-media-column" aria-label="Quang cảnh trong phòng học">
          {!videoOnly && <header className="ambient-scene-heading"><div><span className="eyebrow">STILL / ROOM · {room.videoView === "studio" ? "VỪA KHUNG" : "AMBIENT VIEW"}</span><h3>{youtube?.title ?? still.title}</h3></div><span className="ambient-room-clock">{time}<small>{date}</small></span></header>}
          <div className="ambient-video-area">{youtube ? <YouTubeScenePlayer key={`${youtube.id}:${room.loop}`} scene={youtube} loop={room.loop} muted={room.youtubeMuted} onMuted={(value) => void change({ youtubeMuted: value })} onFallback={() => void change({ selectedId: "quiet-window" })} edgeToEdge={videoOnly} ambientView={!videoOnly} sessionRole="room" showControls={videoTools} onPause={videoOnly ? revealControls : undefined} onVideoChange={(videoId) => setPlayingVideo((previous) => previous.sceneId === room.selectedId && previous.id === videoId ? previous : { sceneId: room.selectedId, id: videoId })} /> : <div className="ambient-still-scene"><div className="still-scene-caption"><span className="eyebrow">Ở ĐÂY, KHÔNG CẦN VỘI.</span><h3>Một khoảng yên<br />cho điều quan trọng.</h3><p>Mở video YouTube hoặc để ánh sáng ngoài cửa sổ<br />đồng hành với một nhịp tập trung.</p></div></div>}</div>
          {!videoOnly && <div className="ambient-scene-footer"><span><span className="tiny-dot" />{dock.target ? `Thả để neo công cụ sang ${dock.target === "left" ? "trái" : "phải"}` : "Nền mở rộng từ ảnh đại diện · video chính không bị cắt"}</span><button className="text-button" type="button" onClick={() => setPanel({ sceneId: room.selectedId, tool: "appearance" })}>Chỉnh nền <Icon name="sliders" size={13} /></button></div>}
          {(changeError || dock.error) && <p className="form-error" role="alert">{changeError || dock.error}</p>}
          {fullscreenNotice && <div className="room-fullscreen-notice" role="status"><span>{fullscreenNotice}</span><a href="/" target="_blank" rel="noopener" className="text-button">Mở website riêng <Icon name="arrow" size={13} /></a><button className="icon-button" type="button" aria-label="Đóng hướng dẫn toàn màn hình" onClick={() => setFullscreenNotice("")}><Icon name="close" size={13} /></button></div>}
        </section>
      </div>
      {videoOnly && <button type="button" className="video-only-keyboard-return" aria-label="Hiện thanh công cụ video" onFocus={revealControls} onClick={revealControls}>Hiện thanh công cụ — Back, Tab hoặc pause video.</button>}
    </div>
  </Dialog>;
}
