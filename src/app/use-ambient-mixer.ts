"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SOUND_CATALOG, emptyLevels, prepareLoop, synthesizeSound, type MixerLevels, type SoundId } from "@/lib/sound-engine";
import { isRecord } from "@/lib/focus-domain";

type Channel = { source: AudioBufferSourceNode; highpass: BiquadFilterNode; filter: BiquadFilterNode; gain: GainNode };
type Engine = { context: AudioContext; master: GainNode; channels: Map<SoundId, Channel>; buffers: Map<SoundId, AudioBuffer>; pending: Map<SoundId, Promise<void>>; controller: AbortController };
export function useAmbientMixer(workspaceId: string | null) {
  const [levels, setLevelsState] = useState<MixerLevels>(() => ({ ...emptyLevels(), rain: 24 }));
  const [master, setMasterState] = useState(60);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState<SoundId[]>([]);
  const [failed, setFailed] = useState<Partial<Record<SoundId, string>>>({});
  const [error, setError] = useState("");
  const engine = useRef<Engine | null>(null);
  const latest = useRef({ levels, master, playing: false });
  const remembered = useRef<Partial<MixerLevels>>({});
  const generation = useRef(0);
  const mounted = useRef(false);
  const key = workspaceId ? `stillroom.mixer.v5:${workspaceId}` : "";
  const invalidatePending = useCallback(() => { generation.current += 1; }, []);

  useEffect(() => {
    if (!workspaceId) return;
    mounted.current = true;
    let restored = { ...emptyLevels(), rain: 24 };
    let restoredMaster = 60;
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      if (isRecord(value) && isRecord(value.levels)) {
        restored = emptyLevels();
        for (const sound of SOUND_CATALOG) {
          const level = value.levels[sound.id]; restored[sound.id] = typeof level === "number" && Number.isFinite(level) ? Math.max(0, Math.min(100, Math.round(level))) : 0;
        }
        restoredMaster = typeof value.master === "number" && Number.isFinite(value.master) ? Math.max(0, Math.min(100, Math.round(value.master))) : 60;
      }
    } catch { /* Mixer controls stay available without storage. */ }
    latest.current = { levels: restored, master: restoredMaster, playing: false };
    setLevelsState(restored); setMasterState(restoredMaster); setPlaying(false);
    return () => {
      mounted.current = false; invalidatePending();
      const active = engine.current; engine.current = null;
      active?.controller.abort();
      for (const channel of active?.channels.values() ?? []) { try { channel.source.stop(); } catch { /* Already stopped. */ } channel.source.disconnect(); channel.highpass.disconnect(); channel.filter.disconnect(); channel.gain.disconnect(); }
      void active?.context.close().catch(() => {});
    };
  }, [workspaceId, key, invalidatePending]);
  useEffect(() => {
    const resumeIfPlaying = () => {
      const active = engine.current;
      if (active && latest.current.playing && active.context.state === "suspended") {
        void active.context.resume().catch(() => {});
      }
    };
    window.addEventListener("focus", resumeIfPlaying);
    document.addEventListener("visibilitychange", resumeIfPlaying);
    return () => {
      window.removeEventListener("focus", resumeIfPlaying);
      document.removeEventListener("visibilitychange", resumeIfPlaying);
    };
  }, []);

  function persist() { if (key) try { localStorage.setItem(key, JSON.stringify({ levels: latest.current.levels, master: latest.current.master })); } catch { /* Optional settings persistence. */ } }
  function gainFor(id: SoundId) {
    const count = Object.values(latest.current.levels).filter((level) => level > 0).length;
    const level = Math.max(0, Math.min(100, latest.current.levels[id] ?? 0)) / 100;
    // Gentle perceptual curve + automatic headroom when several layers are stacked.
    return Math.pow(level, 1.25) * 0.19 / Math.sqrt(Math.max(1, count * 0.72));
  }
  function startChannel(active: Engine, id: SoundId) {
    if (engine.current !== active || !latest.current.playing || latest.current.levels[id] <= 0 || active.channels.has(id)) return;
    const buffer = active.buffers.get(id); if (!buffer) return;
    const source = active.context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const gain = active.context.createGain(); gain.gain.setValueAtTime(0, active.context.currentTime);
    const filter = active.context.createBiquadFilter();
    filter.type = "lowpass";
    const cutoff: Record<SoundId, number> = {
      lofi: 9000, rain: 8500, roof: 8200, thunder: 3600, ocean: 7600, river: 8200, wind: 6500,
      forest: 7600, birds: 6500, fireplace: 7000, cafe: 7800, keyboard: 6500, chimes: 7000, purr: 4800,
      "forest-night": 7200, waterfall: 8200, "storm-rain": 5200, "mountain-stream": 8200,
      white: 6500, pink: 7200, brown: 4200,
    };
    filter.frequency.value = cutoff[id];
    filter.Q.value = 0.22;
    const highpass = active.context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = id === "thunder" || id === "brown" ? 28 : 55;
    highpass.Q.value = 0.16;
    source.connect(highpass).connect(filter).connect(gain).connect(active.master);
    source.onended = () => { source.disconnect(); highpass.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(); active.channels.set(id, { source, highpass, filter, gain });
    gain.gain.setTargetAtTime(gainFor(id), active.context.currentTime, 0.28);
  }
  function ensureChannel(active: Engine, id: SoundId) {
    if (active.buffers.has(id)) { startChannel(active, id); return; }
    if (active.pending.has(id)) return;
    const definition = SOUND_CATALOG.find((sound) => sound.id === id)!;
    setLoading((current) => current.includes(id) ? current : [...current, id]);
    setFailed((current) => { const next = { ...current }; delete next[id]; return next; });
    const job = (async () => {
      let buffer: AudioBuffer;
      if (definition.recording) {
        const response = await fetch(definition.recording.src, { signal: AbortSignal.any([active.controller.signal, AbortSignal.timeout(25000)]), cache: "force-cache" });
        if (!response.ok) throw new Error("Tải bản thu chưa thành công. Kiểm tra mạng rồi thử lại.");
        const decoded = await active.context.decodeAudioData(await response.arrayBuffer());
        // Remove seam/cut clicks and normalize real recordings before looping.
        buffer = prepareLoop(active.context, decoded);
      } else buffer = synthesizeSound(active.context, id);
      if (engine.current !== active || !mounted.current) return;
      active.buffers.set(id, buffer); startChannel(active, id);
    })().catch((reason) => {
      if (engine.current === active && mounted.current && !active.controller.signal.aborted) {
        try {
          const fallback = synthesizeSound(active.context, id);
          active.buffers.set(id, fallback);
          startChannel(active, id);
        } catch {
          setFailed((current) => ({ ...current, [id]: reason instanceof Error ? reason.message : "Chưa tải được âm thanh." }));
        }
      }
    }).finally(() => {
      active.pending.delete(id);
      if (mounted.current && engine.current === active) setLoading((current) => current.filter((value) => value !== id));
    });
    active.pending.set(id, job);
  }
  function reconcile() {
    const active = engine.current; if (!active) return;
    for (const sound of SOUND_CATALOG) {
      const channel = active.channels.get(sound.id);
      if (latest.current.levels[sound.id] > 0) {
        if (channel) channel.gain.gain.setTargetAtTime(gainFor(sound.id), active.context.currentTime, 0.22);
        else if (latest.current.playing) ensureChannel(active, sound.id);
      } else if (channel) {
        channel.gain.gain.setTargetAtTime(0, active.context.currentTime, 0.20);
        channel.source.stop(active.context.currentTime + 0.4); active.channels.delete(sound.id);
      }
    }
  }
  async function play() {
    if (!workspaceId) return;
    const token = ++generation.current; setBusy(true); setError("");
    try {
      const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) throw new Error("Trình duyệt này chưa hỗ trợ Web Audio.");
      if (!engine.current) {
        const context = new Constructor({ sampleRate: 44100, latencyHint: "playback" });
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 26;
        compressor.ratio.value = 1.8;
        compressor.attack.value = 0.045;
        compressor.release.value = 0.55;
        const masterGain = context.createGain(); masterGain.gain.value = 0; masterGain.connect(compressor).connect(context.destination);
        engine.current = { context, master: masterGain, channels: new Map(), buffers: new Map(), pending: new Map(), controller: new AbortController() };
      }
      await engine.current.context.resume();
      if (token !== generation.current || !engine.current || !mounted.current) return;
      latest.current.playing = true; setPlaying(true);
      engine.current.master.gain.setTargetAtTime(latest.current.master / 100, engine.current.context.currentTime, 0.12);
      reconcile();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không bật được âm thanh."); latest.current.playing = false; setPlaying(false); }
    finally { if (token === generation.current) setBusy(false); }
  }
  function pause() {
    const token = ++generation.current;
    latest.current.playing = false; setPlaying(false); setBusy(false);
    const active = engine.current;
    if (active) {
      active.master.gain.setTargetAtTime(0, active.context.currentTime, 0.06);
      window.setTimeout(() => { if (generation.current === token && !latest.current.playing && engine.current === active) void active.context.suspend().catch(() => {}); }, 300);
    }
  }
  function updateLevels(value: MixerLevels) {
    latest.current.levels = value; setLevelsState(value); persist(); reconcile();
    if (!Object.values(value).some((level) => level > 0)) pause();
  }
  function togglePlayback() {
    if (latest.current.playing) { pause(); return; }
    if (!Object.values(latest.current.levels).some((level) => level > 0)) updateLevels({ ...latest.current.levels, rain: 32 });
    void play();
  }
  function toggleChannel(id: SoundId) {
    const value = latest.current.levels;
    if (value[id] > 0) remembered.current[id] = value[id];
    const next = { ...value, [id]: value[id] > 0 ? 0 : remembered.current[id] ?? 35 };
    const wasPlaying = latest.current.playing;
    updateLevels(next); if (!wasPlaying && next[id] > 0) void play();
  }
  function setLevel(id: SoundId, level: number) { updateLevels({ ...latest.current.levels, [id]: Math.max(0, Math.min(100, Math.round(level))) }); }
  function setMaster(value: number) {
    latest.current.master = value; setMasterState(value); persist();
    if (engine.current && latest.current.playing) engine.current.master.gain.setTargetAtTime(value / 100, engine.current.context.currentTime, 0.08);
  }
  function preset(value: Partial<MixerLevels>) { updateLevels({ ...emptyLevels(), ...value }); if (!latest.current.playing) void play(); }
  function clear() { updateLevels(emptyLevels()); setFailed({}); setError(""); }
  function retry(id: SoundId) { if (!latest.current.playing) void play(); else if (engine.current) ensureChannel(engine.current, id); }
  return { levels, master, playing, busy, loading, failed, error, enabledCount: Object.values(levels).filter((level) => level > 0).length,
    togglePlayback, toggleChannel, setLevel, setMaster, preset, clear, retry };
}
export type AmbientMixer = ReturnType<typeof useAmbientMixer>;
