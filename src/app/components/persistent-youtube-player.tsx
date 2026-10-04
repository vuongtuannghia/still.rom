"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { YouTubeScenePlayer } from "./youtube-scene";
import type { YouTubeScene } from "@/lib/scene-domain";

type Persisted = { scene: YouTubeScene; loop: boolean; muted: boolean };
type Rect = { left: number; top: number; width: number; height: number };

const STORAGE_KEY = "stillroom.youtube.persistent.v1";

function readPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Persisted>;
    if (!value.scene || typeof value.scene.videoId !== "string") return null;
    return {
      scene: value.scene as YouTubeScene,
      loop: value.loop !== false,
      muted: value.muted === true,
    };
  } catch {
    return null;
  }
}

function isInternalDashboard(pathname: string | null) {
  return pathname === "/" || pathname === null;
}

export function PersistentYouTubePlayer() {
  const pathname = usePathname();
  const router = useRouter();
  const [persisted, setPersisted] = useState<Persisted | null>(null);
  const [roomRect, setRoomRect] = useState<Rect | null>(null);

  useEffect(() => {
    const sync = () => setPersisted(readPersisted());
    sync();

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) sync();
    };
    const onSync = () => sync();
    const onHandoff = (event: Event) => {
      const detail = (event as CustomEvent<Persisted>).detail;
      if (!detail?.scene) return;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(detail)); } catch {}
      setPersisted(detail);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("stillroom-youtube-sync", onSync);
    window.addEventListener("stillroom-youtube-handoff", onHandoff);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("stillroom-youtube-sync", onSync);
      window.removeEventListener("stillroom-youtube-handoff", onHandoff);
    };
  }, []);

  // Keep the player component mounted. Next navigation must not recreate the
  // YouTube iframe: recreating it is what causes the audio/autoplay reset.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = (event.target as Element | null)?.closest("a");
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        event.preventDefault();
        router.push(url.pathname + url.search + url.hash);
      } catch {}
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  useEffect(() => {
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const silenceDuplicateRoomPlayer = (room: HTMLElement) => {
      const iframe = room.querySelector<HTMLIFrameElement>(".youtube-scene-player iframe");
      if (!iframe?.contentWindow) return;
      // The visible/authoritative iframe is this persistent player. If the room
      // component creates its legacy local iframe, silence it immediately so it
      // cannot steal audio or fight the persistent player.
      const message = (func: "mute" | "pauseVideo") => {
        try {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "https://www.youtube.com");
        } catch {}
      };
      message("mute");
    };

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const room = document.querySelector<HTMLElement>(".ambient-room-screen .ambient-video-area");
        if (!room) {
          setRoomRect(null);
          document.documentElement.classList.remove("stillroom-room-player-active");
          return;
        }
        const rect = room.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        setRoomRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
        document.documentElement.classList.add("stillroom-room-player-active");
        silenceDuplicateRoomPlayer(room);
      });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    const room = document.querySelector<HTMLElement>(".ambient-room-screen .ambient-video-area");
    if (room) resizeObserver = new ResizeObserver(measure);
    if (room) resizeObserver.observe(room);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      document.documentElement.classList.remove("stillroom-room-player-active");
    };
  }, [pathname]);

  // If the room creates a different selected YouTube video, follow that id while
  // keeping the same persistent iframe instance otherwise.
  useEffect(() => {
    const syncRoomVideo = () => {
      if (!persisted) return;
      const roomPlayer = document.querySelector<HTMLElement>(".ambient-room-screen .youtube-scene-player");
      const roomVideoId = roomPlayer?.getAttribute("data-video-id") || "";
      if (!roomVideoId || roomVideoId === persisted.scene.videoId) return;
      const next: Persisted = { ...persisted, scene: { ...persisted.scene, videoId: roomVideoId, startSeconds: 0 } };
      setPersisted(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    const observer = new MutationObserver(syncRoomVideo);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-video-id"] });
    syncRoomVideo();
    return () => observer.disconnect();
  }, [persisted]);

  const dashboardMode = isInternalDashboard(pathname);
  const inRoom = Boolean(roomRect);
  const visible = Boolean(persisted?.scene) && (!dashboardMode || inRoom);
  if (!persisted?.scene) return null;

  const style = inRoom && roomRect
    ? { left: roomRect.left, top: roomRect.top, width: roomRect.width, height: roomRect.height }
    : undefined;

  return (
    <div
      className={`persistent-youtube-player ${inRoom ? "persistent-youtube-room" : "persistent-youtube-mini"} ${visible ? "is-visible" : "is-hidden"}`}
      aria-hidden={!visible}
      style={style}
    >
      <YouTubeScenePlayer
        scene={persisted.scene}
        loop={persisted.loop}
        muted={persisted.muted}
        onMuted={(value) => {
          setPersisted((current) => {
            if (!current) return current;
            const next = { ...current, muted: value };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
            window.dispatchEvent(new CustomEvent("stillroom-youtube-sync"));
            return next;
          });
        }}
        onFallback={() => {}}
        ambientView
        sessionRole="persistent"
        claimOwnership={true}
      />
    </div>
  );
}
