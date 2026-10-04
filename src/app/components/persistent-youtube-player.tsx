"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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

export function PersistentYouTubePlayer() {
  const pathname = usePathname();
  const [persisted, setPersisted] = useState<Persisted | null>(null);
  const [target, setTarget] = useState<"dashboard" | "room" | "mini">(() => pathname === "/" ? "dashboard" : "mini");
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const sync = () => setPersisted(readPersisted());
    sync();
    const onSync = () => sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) sync();
    };
    const onHandoff = (event: Event) => {
      const detail = (event as CustomEvent<Persisted>).detail;
      if (!detail?.scene) return;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(detail)); } catch {}
      setPersisted(detail);
    };
    window.addEventListener("stillroom-youtube-sync", onSync);
    window.addEventListener("storage", onStorage);
    window.addEventListener("stillroom-youtube-handoff", onHandoff);
    return () => {
      window.removeEventListener("stillroom-youtube-sync", onSync);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("stillroom-youtube-handoff", onHandoff);
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const roomSlot = document.querySelector<HTMLElement>('[data-youtube-slot="room"]');
      const dashboardSlot = document.querySelector<HTMLElement>('[data-youtube-slot="dashboard"]');
      const slot = roomSlot ?? dashboardSlot;

      if (roomSlot) setTarget("room");
      else if (dashboardSlot && pathname === "/") setTarget("dashboard");
      else setTarget("mini");

      if (!slot) {
        setRect(null);
        return;
      }

      const next = slot.getBoundingClientRect();
      if (next.width > 0 && next.height > 0) {
        setRect({ left: next.left, top: next.top, width: next.width, height: next.height });
      }
    };

    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const frame = window.requestAnimationFrame(measure);
    const timer = window.setInterval(measure, 350);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [pathname]);

  const style = useMemo<CSSProperties | undefined>(() => {
    if ((target === "dashboard" || target === "room") && rect) {
      return {
        position: "fixed",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }
    return undefined;
  }, [target, rect]);

  if (!persisted?.scene) return null;

  const visible = target === "mini" || Boolean(rect);

  return (
    <div
      className={`persistent-youtube-player ${target === "mini" ? "persistent-youtube-mini" : "persistent-youtube-slot-player"} ${visible ? "is-visible" : "is-hidden"}`}
      style={style}
      aria-hidden={!visible}
      data-youtube-owner={target}
    >
      <YouTubeScenePlayer
        scene={persisted.scene}
        loop={persisted.loop}
        muted={persisted.muted}
        onMuted={(value) => {
          setPersisted((current) => {
            if (!current) return current;
            const next = { ...current, muted: value };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              localStorage.setItem(`stillroom.youtube.muted:${next.scene.videoId || next.scene.playlistId || next.scene.id}`, value ? "1" : "0");
            } catch {}
            window.dispatchEvent(new CustomEvent("stillroom-youtube-sync"));
            return next;
          });
        }}
        onFallback={() => {}}
        ambientView
        sessionRole="persistent"
        claimOwnership={false}
      />
    </div>
  );
}
