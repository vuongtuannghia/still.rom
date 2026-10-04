"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { YouTubeScenePlayer } from "./youtube-scene";
import type { YouTubeScene } from "@/lib/scene-domain";

type Persisted = { scene: YouTubeScene; loop: boolean; muted: boolean };

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
  const [handoff, setHandoff] = useState(false);
  const [roomRect, setRoomRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const lastRoute = useRef(pathname);

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
    const sync = () => setPersisted(readPersisted());
    sync();

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) sync();
    };
    const onSync = () => sync();
    const onHandoff = (event: Event) => {
      const detail = (event as CustomEvent<Persisted>).detail;
      if (detail?.scene) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(detail));
        setPersisted(detail);
        setHandoff(true);
      }
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

  useEffect(() => {
    if (lastRoute.current !== pathname) {
      lastRoute.current = pathname;
      setHandoff(!isInternalDashboard(pathname));
    }
  }, [pathname]);

  const roomMode = pathname === "/hoc-chung" && Boolean(persisted?.scene);
  const dashboardMode = isInternalDashboard(pathname) && !handoff;
  const visible = Boolean(persisted?.scene) && !dashboardMode;

  useEffect(() => {
    if (!roomMode) {
      setRoomRect(null);
      return;
    }
    const update = () => {
      const target = document.querySelector<HTMLElement>(".ambient-video-area");
      if (!target) {
        setRoomRect(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setRoomRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    const target = document.querySelector<HTMLElement>(".ambient-video-area");
    if (target) observer.observe(target);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const timer = window.setInterval(update, 500);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(timer);
    };
  }, [roomMode]);

  const style = useMemo<React.CSSProperties>(() => {
    if (roomMode && roomRect) {
      return {
        position: "fixed",
        top: roomRect.top,
        left: roomRect.left,
        width: roomRect.width,
        height: roomRect.height,
        zIndex: 40,
      };
    }
    return {};
  }, [roomMode, roomRect]);

  if (!persisted?.scene) return null;

  return (
    <div
      className={[
        "persistent-youtube-player",
        roomMode ? "persistent-youtube-room" : "persistent-youtube-mini",
        visible ? "is-visible" : "is-hidden",
      ].join(" ")}
      style={style}
      aria-hidden={!visible}
    >
      <YouTubeScenePlayer
        scene={persisted.scene}
        loop={persisted.loop}
        muted={dashboardMode ? true : persisted.muted}
        onMuted={(value) => {
          setPersisted((current) => {
            if (!current) return current;
            const next = { ...current, muted: value };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent("stillroom-youtube-sync"));
            return next;
          });
        }}
        onFallback={() => setHandoff(false)}
        ambientView
        sessionRole="persistent"
        claimOwnership={!dashboardMode}
      />
      {roomMode && <span className="persistent-youtube-room-label">YouTube · đang phát</span>}
    </div>
  );
}
