"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { YouTubeScenePlayer } from "./youtube-scene";
import type { RoomSettings, YouTubeScene } from "@/lib/scene-domain";

type Props = {
  room: RoomSettings;
  immersive: boolean;
  onChange: (patch: Partial<RoomSettings>) => Promise<void>;
};

type Rect = { left: number; top: number; width: number; height: number };

export function SharedYouTubePlayer({ room, immersive, onChange }: Props) {
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [targetReady, setTargetReady] = useState(false);
  const scene = room.scenes.find((item) => item.id === room.selectedId) as YouTubeScene | undefined;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!scene) {
      setRect(null);
      setTargetReady(false);
      return;
    }

    let frame = 0;
    const measure = () => {
      const selector = immersive
        ? '[data-youtube-slot="room"]'
        : '[data-youtube-slot="dashboard"]';
      const slot = document.querySelector<HTMLElement>(selector);

      if (!slot) {
        setTargetReady(false);
        return;
      }

      const value = slot.getBoundingClientRect();
      if (value.width > 0 && value.height > 0) {
        setRect({
          left: value.left,
          top: value.top,
          width: value.width,
          height: value.height,
        });
        setTargetReady(true);
      }
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    update();
    const observer = new ResizeObserver(update);
    const target = document.querySelector<HTMLElement>(
      immersive ? '[data-youtube-slot="room"]' : '[data-youtube-slot="dashboard"]'
    );
    if (target) observer.observe(target);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [immersive, scene?.id]);

  const style = useMemo<React.CSSProperties>(() => ({
    position: "fixed",
    left: rect?.left ?? 0,
    top: rect?.top ?? 0,
    width: rect?.width ?? 0,
    height: rect?.height ?? 0,
    zIndex: immersive ? 1002 : 32,
  }), [rect, immersive]);

  if (!mounted || !scene || !targetReady || !rect) return null;

  return createPortal(
    <div
      className={"shared-youtube-player" + (immersive ? " shared-youtube-player-room" : " shared-youtube-player-dashboard")}
      style={style}
      data-shared-youtube-player
    >
      <YouTubeScenePlayer
        scene={scene}
        loop={room.loop}
        muted={room.youtubeMuted}
        onMuted={(value) => void onChange({ youtubeMuted: value })}
        onFallback={() => void onChange({ selectedId: "quiet-window" })}
        ambientView
        sessionRole="room"
        claimOwnership={false}
      />
    </div>,
    document.body
  );
}
