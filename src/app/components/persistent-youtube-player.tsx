"use client";

import { useEffect, useState } from "react";
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

export function PersistentYouTubePlayer() {
  const pathname = usePathname();
  const router = useRouter();
  const [persisted, setPersisted] = useState<Persisted | null>(null);
  const [roomPresent, setRoomPresent] = useState(false);

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

  // Keep Next.js client navigation so the player stays mounted between sections.
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

  // A study-room dialog is top-layer content, so the background player must yield
  // to the local player inside that dialog instead of trying to overlay it.
  useEffect(() => {
    const update = () => setRoomPresent(Boolean(document.querySelector(".ambient-room-screen")));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  const dashboard = pathname === "/" || pathname === null;
  const active = Boolean(persisted?.scene) && !dashboard && !roomPresent;

  if (!persisted?.scene) return null;

  return (
    <div className={"persistent-youtube-player persistent-youtube-mini" + (active ? " is-visible" : " is-hidden")} aria-hidden={!active}>
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
        claimOwnership={false}
        active={active}
      />
    </div>
  );
}
