"use client";

import { useEffect, useId, useRef } from "react";

/** A reversible history entry gives mobile users a native Back gesture to reveal controls. */
export function useVideoOnlyNavigation(videoOnly: boolean, onReveal: () => void) {
  const id = useId();
  const reveal = useRef(onReveal);
  useEffect(() => { reveal.current = onReveal; });

  useEffect(() => {
    if (!videoOnly) return;
    const marker = `still-video:${id}`;
    let ownsEntry = false;
    try {
      const previous = window.history.state;
      const state = typeof previous === "object" && previous !== null ? previous : {};
      window.history.pushState({ ...state, __stillroomVideoOnly: marker }, "", window.location.href);
      ownsEntry = true;
    } catch { /* Escape and keyboard recovery still work when history is restricted. */ }
    const onPopState = (event: PopStateEvent) => {
      if (ownsEntry && event.state?.__stillroomVideoOnly !== marker) {
        ownsEntry = false;
        reveal.current();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // Remove only our own entry. Never navigate away from a different route.
      if (ownsEntry && window.history.state?.__stillroomVideoOnly === marker) window.history.back();
    };
  }, [videoOnly, id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const recover = event.key.toLowerCase() === "h" || (event.key === "Escape" && videoOnly && document.fullscreenElement === null);
      if (!recover) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']") || document.querySelector("dialog[open]:not(.study-room-dialog)")) return;
      event.preventDefault(); event.stopImmediatePropagation();
      reveal.current();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [videoOnly]);
}
