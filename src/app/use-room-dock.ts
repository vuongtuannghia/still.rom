"use client";

import { useRef, useState, type PointerEvent, type KeyboardEvent, type RefObject } from "react";
import { errorMessage } from "@/lib/client-api";
import type { RoomSettings } from "@/lib/scene-domain";

export function useRoomDock(room: RoomSettings, screen: RefObject<HTMLDivElement | null>, save: (patch: Partial<RoomSettings>) => Promise<void>) {
  const [optimistic, setOptimistic] = useState<"left" | "right" | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<"left" | "right" | null>(null);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const side = optimistic ?? room.dockSide;
  async function setSide(next: "left" | "right") {
    if (pending.current || next === side) return;
    pending.current = true; setBusy(true); setOptimistic(next); setError("");
    try { await save({ dockSide: next }); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setOptimistic(null); pending.current = false; setBusy(false); }
  }
  function direction(clientX: number) {
    const bounds = screen.current?.getBoundingClientRect();
    return clientX < (bounds ? bounds.x + bounds.width / 2 : window.innerWidth / 2) ? "left" : "right";
  }
  const dragHandlers = {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0 || pending.current) return;
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId); setTarget(side); event.preventDefault();
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      if (gesture.current?.id === event.pointerId) setTarget(direction(event.clientX));
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      const start = gesture.current; if (!start || start.id !== event.pointerId) return;
      gesture.current = null; setTarget(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (Math.abs(event.clientX - start.x) > 24) void setSide(direction(event.clientX));
    },
    onPointerCancel() { gesture.current = null; setTarget(null); },
    onLostPointerCapture() { gesture.current = null; setTarget(null); },
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); void setSide(event.key === "ArrowLeft" ? "left" : "right"); }
    },
  };
  return { side, busy, target, error, dragHandlers, setSide, swap: () => setSide(side === "left" ? "right" : "left") };
}
