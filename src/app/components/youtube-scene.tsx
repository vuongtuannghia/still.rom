"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "../icons";
import { isVideoId, youtubeWatchUrl, type YouTubeScene } from "@/lib/scene-domain";

type Player = { playVideo: () => void; pauseVideo: () => void; mute: () => void; unMute: () => void; setVolume: (value: number) => void; destroy: () => void; getCurrentTime?: () => number; seekTo?: (seconds: number, allowSeekAhead?: boolean) => void; getVideoData?: () => { video_id?: string } };
type PlayerOptions = {
  videoId?: string;
  playerVars?: Record<string, number | string>;
  events: { onReady: (event: PlayerEvent) => void; onError: (event: PlayerEvent) => void; onStateChange: (event: PlayerEvent) => void; onAutoplayBlocked: () => void };
};
type PlayerEvent = { target: Player; data?: number };
type YouTubeAPI = { Player: new (element: HTMLElement, options: PlayerOptions) => Player };
type YouTubeWindow = Window & { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YouTubeAPI> | null = null;
function loadYouTubeAPI() {
  const scope = window as YouTubeWindow;
  if (scope.YT?.Player) return Promise.resolve(scope.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = scope.onYouTubeIframeAPIReady;
    const fail = () => { apiPromise = null; reject(new Error("Điều khiển nhanh chưa tải được. Nút ▶ bên trong video vẫn có thể dùng.")); };
    const timeout = window.setTimeout(fail, 16000);
    scope.onYouTubeIframeAPIReady = () => { window.clearTimeout(timeout); previous?.(); if (scope.YT?.Player) resolve(scope.YT); else fail(); };
    document.getElementById("stillroom-youtube-api")?.remove();
    const script = document.createElement("script"); script.id = "stillroom-youtube-api"; script.src = "https://www.youtube.com/iframe_api"; script.async = true; script.referrerPolicy = "strict-origin-when-cross-origin";
    script.onerror = () => { window.clearTimeout(timeout); fail(); };
    document.head.appendChild(script);
  });
  return apiPromise;
}
const errorMessages: Record<number, string> = {
  2: "Đường dẫn video/playlist không hợp lệ.", 5: "Trình duyệt chưa phát được video này. Có thể thử trình phát tiêu chuẩn bên dưới.",
  100: "Video đã bị xóa hoặc đặt riêng tư. Hãy chọn một video công khai khác.",
  101: "Chủ video không cho phép nhúng. Hãy dùng video khác hoặc mở trên YouTube.",
  150: "Chủ video không cho phép nhúng. Hãy dùng video khác hoặc mở trên YouTube.",
  153: "YouTube chưa nhận được nguồn trang trong khung preview. Thử trình phát tiêu chuẩn hoặc mở website trong tab riêng.",
};

type Props = { scene: YouTubeScene; loop: boolean; muted: boolean; onMuted: (value: boolean) => void; onFallback: () => void; onPause?: () => void; onVideoChange?: (videoId: string) => void; ambientView?: boolean; edgeToEdge?: boolean; showControls?: boolean };
function VideoSession({ scene, loop, muted, onMuted, onFallback, onPause, onVideoChange, ambientView = false, edgeToEdge = false, showControls = false, standard, onRetry, onStandard }: Props & { standard: boolean; onRetry: () => void; onStandard: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ width: 0, height: 0 });
  const player = useRef<Player | null>(null);
  const preferences = useRef({ muted, onPause, onVideoChange });
  const userMuted = useRef(false);
  const mutePreferenceLoaded = useRef(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Nhấn ▶ trên video nếu trình duyệt không tự phát.");
  const [fatal, setFatal] = useState("");
  const [apiNotice, setApiNotice] = useState("");
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [playerMuted, setPlayerMuted] = useState(muted);
  const progressKey = `stillroom.youtube.progress:${scene.videoId || scene.playlistId || scene.id}`;
  const savedProgress = useRef(0);

  useEffect(() => {
    preferences.current.onPause = onPause;
    preferences.current.onVideoChange = onVideoChange;
  }, [onPause, onVideoChange]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(progressKey);
      const parsed = raw ? Number(raw) : 0;
      savedProgress.current = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

      const muteKey = `stillroom.youtube.muted:${scene.videoId || scene.playlistId || scene.id}`;
      const storedMute = sessionStorage.getItem(muteKey);
      if (storedMute === "1") userMuted.current = true;
      else if (storedMute === "0") userMuted.current = false;
      else userMuted.current = Boolean(muted);
      setPlayerMuted(userMuted.current);
      mutePreferenceLoaded.current = true;
      preferences.current.muted = userMuted.current;
    } catch {
      savedProgress.current = 0;
      userMuted.current = false;
      mutePreferenceLoaded.current = true;
      preferences.current.muted = false;
    }
  }, [progressKey, scene.videoId, scene.playlistId, scene.id, muted, onMuted]);

  useEffect(() => {
    if (!ambientView || !root.current) return;
    const element = root.current;
    const observer = new ResizeObserver(() => {
      const availableWidth = Math.max(200, element.clientWidth);
      const availableHeight = Math.max(200, element.clientHeight - (info.current?.offsetHeight ?? 0));
      const width = Math.floor(Math.min(availableWidth, availableHeight * 16 / 9));
      const height = Math.max(200, Math.floor(width * 9 / 16));
      setFit((current) => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(element);
    if (info.current) observer.observe(info.current);
    return () => observer.disconnect();
  }, [ambientView]);

  useEffect(() => {
    const container = host.current; if (!container) return;
    let disposed = false, becameReady = false, hasPlayed = false;
    container.replaceChildren();
    const timeout = window.setTimeout(() => { if (!disposed && !becameReady) setApiNotice("YouTube đang tải chậm. Bạn có thể nhấn ▶ trực tiếp trong video phía trên."); }, 11000);
    const unlockAudio = () => {
      if (disposed || userMuted.current || !player.current) return;
      try {
        player.current.setVolume(35);
        player.current.unMute();
        if (!hasPlayed) player.current.playVideo();
      } catch { /* Browser may still require a direct click on the player. */ }
    };
    function reportVideo(target: Player) {
      try { const videoId = target.getVideoData?.().video_id; if (isVideoId(videoId)) preferences.current.onVideoChange?.(videoId); } catch { /* Playlist may not expose an id immediately. */ }
    }
    function rememberProgress() {
      try {
        const current = player.current?.getCurrentTime?.() ?? 0;
        if (Number.isFinite(current) && current >= 0) sessionStorage.setItem(progressKey, String(Math.floor(current)));
      } catch { /* Storage is optional. */ }
    }
    let progressTimer = 0;
    void loadYouTubeAPI().then((api) => {
      if (disposed) return;
      const playerVars: Record<string, number | string> = {
        enablejsapi: 1,
        origin: window.location.origin,
        autoplay: 1,
        mute: 1,
        playsinline: 1,
        controls: 1,
        rel: 0,
        hl: "vi",
        start: scene.startSeconds,
      };
      if (!scene.videoId && scene.playlistId) {
        playerVars.list = scene.playlistId;
        playerVars.listType = "playlist";
        if (loop) playerVars.loop = 1;
      } else if (loop && scene.videoId) {
        playerVars.loop = 1;
        playerVars.playlist = scene.videoId;
      }
      player.current = new api.Player(container, { videoId: scene.videoId || undefined, playerVars, events: {
        onReady: (event) => {
          if (disposed) return;
          becameReady = true; window.clearTimeout(timeout); setReady(true); setApiNotice("");
          reportVideo(event.target);
          // Start muted. For a normal embedded player this is the most reliable way to
          // satisfy browser autoplay rules while keeping the video playable in a small window.
          event.target.mute();
          const resumeAt = Math.max(savedProgress.current, scene.startSeconds);
          if (resumeAt > 0 && event.target.seekTo) event.target.seekTo(resumeAt, true);
          const startVisiblePlayback = () => {
            if (disposed || !document.documentElement.contains(container)) return;
            try { event.target.playVideo(); } catch { setAutoplayBlocked(true); }
          };
          globalThis.requestAnimationFrame(startVisiblePlayback);
          if (!userMuted.current) {
            // The player starts muted to satisfy autoplay. When the room has already received
            // a user gesture, immediately restore the user's sound preference.
            if (document.hasFocus()) {
              event.target.setVolume(35);
              try { event.target.unMute(); } catch {}
            }
          }
          progressTimer = window.setInterval(rememberProgress, 1000);
        },
        onStateChange: (event) => {
          if (disposed) return;
          if (event.data === 1) setAutoplayBlocked(false);
          setPlaying(event.data === 1);
          if (event.data === 1) { reportVideo(event.target); hasPlayed = true; setFatal(""); setStatus("Video đang phát"); }
          else if (event.data === 2) { rememberProgress(); setStatus("Video đang tạm dừng"); if (hasPlayed) preferences.current.onPause?.(); }
          else if (event.data === 3) setStatus("Đang tải video…");
          else if (event.data === 0) { rememberProgress(); setStatus("Video đã kết thúc"); }
        },
        onError: (event) => { if (!disposed) { rememberProgress(); setFatal(errorMessages[event.data ?? 0] ?? "Video chưa phát được. Thử một link khác hoặc mở trên YouTube."); setPlaying(false); } },
        onAutoplayBlocked: () => { if (!disposed) { setAutoplayBlocked(true); setStatus("Tự phát bị trình duyệt chặn. Bấm Phát video — không cần phóng to."); setPlaying(false); } },
      } });
    }).catch((reason) => { if (!disposed) setApiNotice(reason instanceof Error ? reason.message : "Bạn có thể nhấn ▶ trực tiếp trong video."); });
    const saveOnVisibility = () => { if (document.visibilityState === "hidden") rememberProgress(); };
    document.addEventListener("visibilitychange", saveOnVisibility);
    return () => {
      rememberProgress();
      if (progressTimer) window.clearInterval(progressTimer);
      document.removeEventListener("visibilitychange", saveOnVisibility);
      void unlockAudio;
      disposed = true; window.clearTimeout(timeout);
      try { player.current?.destroy(); } catch { /* Native frame may already be gone. */ }
      player.current = null; container.replaceChildren();
    };
  }, [scene.videoId, scene.playlistId, scene.startSeconds, scene.title, loop, standard, progressKey]);

  function playPause() {
    if (ready && player.current) {
      if (playing) player.current.pauseVideo();
      else {
        if (!muted) { player.current.setVolume(35); player.current.unMute(); }
        player.current.playVideo();
      }
    } else {
      host.current?.querySelector("iframe")?.focus();
      setApiNotice("Bấm nút ▶ của YouTube trong vùng video phía trên. Nếu khung B chặn YouTube, hãy thử Mở website riêng.");
    }
  }
  return <div ref={root} className={`youtube-scene-player ${ambientView ? "ambient-player" : edgeToEdge ? "edge-player" : ""}`} data-player-view={ambientView ? "ambient" : edgeToEdge ? "edge" : "studio"}>
    <div className="youtube-stage" ref={host} data-video-id={scene.videoId}>
      {autoplayBlocked && <button
        type="button"
        className="youtube-autoplay-overlay"
        onClick={() => {
          setAutoplayBlocked(false);
          if (player.current) {
            try { player.current.mute(); player.current.playVideo(); } catch {}
            if (!muted) {
              player.current.setVolume(35);
              player.current.unMute();
            }
          }
        }}
      >
        <Icon name="play" size={18} />
        <span>Phát video</span>
      </button>}
    </div>
    <div ref={info} className="youtube-player-info" hidden={(edgeToEdge || ambientView) && !showControls && !fatal && !apiNotice}>
      <div className="youtube-controls"><span className="youtube-status" role="status"><span className={playing ? "live-dot" : "tiny-dot"} />{status}</span><div><button type="button" className="button-secondary" disabled={Boolean(fatal)} onClick={playPause}><Icon name={playing ? "pause" : "play"} size={15} />{playing ? "Dừng video" : "Phát video"}</button><button type="button" className="button-secondary" aria-pressed={!muted} onClick={() => {
        const nextMuted = !userMuted.current;
        userMuted.current = nextMuted;
        preferences.current.muted = nextMuted;
        setPlayerMuted(nextMuted);
        try { sessionStorage.setItem(`stillroom.youtube.muted:${scene.videoId || scene.playlistId || scene.id}`, nextMuted ? "1" : "0"); } catch {}
        onMuted(nextMuted);
        if (ready && player.current) {
          if (nextMuted) player.current.mute();
          else { player.current.setVolume(35); player.current.unMute(); player.current.playVideo(); }
        } else setApiNotice("Bạn có thể bật hoặc tắt tiếng bằng nút loa của YouTube trong video.");
      }}><Icon name="volume" size={15} />{playerMuted ? "Bật tiếng video" : "Tắt tiếng video"}</button></div></div>
      {apiNotice && !fatal && <p className="youtube-api-notice" role="status">{apiNotice}</p>}
      {fatal && <div className="youtube-error" role="alert"><p>{fatal}</p><div><button type="button" className="button-secondary" onClick={onRetry}>Thử lại</button>{!standard && <button type="button" className="button-secondary" onClick={onStandard}>Thử trình phát tiêu chuẩn</button>}<button type="button" className="button-secondary" onClick={onFallback}>Dùng cảnh tĩnh</button></div></div>}
      <div className="youtube-external-actions"><a href={youtubeWatchUrl(scene)} target="_blank" rel="noopener" className="text-button">Mở trên YouTube <Icon name="arrow" size={13} /><span className="sr-only">, tab mới</span></a><a href="/" target="_blank" rel="noopener" className="text-button">Mở website riêng <Icon name="arrow" size={13} /><span className="sr-only">, tab mới</span></a></div>
      <p className="youtube-disclosure">Video phát từ YouTube, có thể có quảng cáo/hạn chế nhúng. Điều khiển và thương hiệu YouTube được giữ nguyên. Nền mờ mở rộng từ ảnh đại diện; video chính và điều khiển không bị cắt.</p>
    </div>
  </div>;
}
export function YouTubeScenePlayer(props: Props) {
  const [attempt, setAttempt] = useState(0);
  const [standard, setStandard] = useState(false);
  return <VideoSession {...props} key={`${attempt}:${standard}`} standard={standard} onRetry={() => setAttempt(attempt + 1)} onStandard={() => setStandard(true)} />;
}
