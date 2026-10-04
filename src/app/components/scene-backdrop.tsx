"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { BUILTIN_SCENES, type RoomSettings } from "@/lib/scene-domain";

export function sceneArtwork(room: RoomSettings, currentVideoId?: string) {
  const video = room.scenes.find((scene) => scene.id === room.selectedId);
  const videoId = currentVideoId || video?.videoId;
  if (videoId) return { source: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, fallback: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, kind: "youtube-thumbnail" as const };
  const still = BUILTIN_SCENES.find((scene) => scene.id === room.selectedId) ?? BUILTIN_SCENES[0];
  return { source: still.image, fallback: still.image, kind: "still-image" as const };
}
function BackdropImage({ source, fallback }: { source: string; fallback: string }) {
  const [step, setStep] = useState(0);
  const src = step === 0 ? source : step === 1 ? fallback : "/scenes/quiet-window.jpg";
  return <Image src={src} alt="" fill unoptimized sizes="100vw" priority onError={() => setStep((current) => Math.min(2, current + 1))} onLoad={(event) => { if (event.currentTarget.naturalWidth < 200 && step === 0 && source !== fallback) setStep(1); }} />;
}
export function SceneBackdrop({ room, currentVideoId, page = false }: { room: RoomSettings; currentVideoId?: string; page?: boolean }) {
  const artwork = sceneArtwork(room, currentVideoId);
  const style = { "--scene-blur": `${room.ambientBlur}px`, "--scene-dim": room.ambientDim / 100, "--scene-grayscale": room.stillMonochrome ? 1 : 0 } as CSSProperties;
  return <div className={`scene-ambient-backdrop ${page ? "page-scene-backdrop" : "room-scene-backdrop"}`} style={style} data-artwork-source={artwork.kind} data-scene-id={room.selectedId} aria-hidden="true">
    <div className="ambient-backdrop-image"><BackdropImage key={artwork.source} source={artwork.source} fallback={artwork.fallback} /></div><div className="ambient-backdrop-shade" />
  </div>;
}
