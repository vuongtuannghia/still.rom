"use client";

import { useId, useState } from "react";
import { Icon } from "../icons";
import type { AmbientMixer } from "../use-ambient-mixer";
import { MIX_PRESETS, SOUND_CATALOG } from "@/lib/sound-engine";

export function AmbientPlayer({ mixer, compact = false }: { mixer: AmbientMixer; compact?: boolean }) {
  const id = useId();
  const [group, setGroup] = useState<"Tất cả" | "Thiên nhiên" | "Không gian" | "Noise">("Tất cả");
  const [search, setSearch] = useState("");
  const sounds = SOUND_CATALOG.filter((sound) => (group === "Tất cả" || sound.group === group) && sound.label.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const loadingCount = mixer.loading.filter((sound) => mixer.levels[sound] > 0).length;
  const failedCount = Object.keys(mixer.failed).filter((key) => mixer.levels[key as keyof typeof mixer.levels] > 0).length;
  return <article className={`panel ambient-card mixer-card ${compact ? "compact-mixer" : ""}`} aria-labelledby={id} data-state={mixer.playing ? "playing" : "paused"}>
    <div className="panel-heading"><div><span className="eyebrow">SOUND / STUDIO</span><h2 id={id}>Âm thanh không gian</h2><p><span className="recordings-count">16 bản thu CC0</span> + piano, chuông và 3 loại noise.</p></div><button className="sound-play" type="button" disabled={mixer.busy} aria-label={mixer.playing ? "Tạm dừng âm thanh" : "Phát âm thanh"} onClick={mixer.togglePlayback}>{mixer.busy ? <span className="spinner" /> : <Icon name={mixer.playing ? "pause" : "play"} size={21} />}</button></div>
    <div className="mixer-status"><span><span className={mixer.playing && !loadingCount && !failedCount ? "live-dot" : "tiny-dot"} />{mixer.playing ? loadingCount > 0 ? `Đang tải ${loadingCount} bản thu…` : failedCount > 0 ? `${mixer.enabledCount - failedCount} lớp phát · ${failedCount} lớp cần thử lại` : `${mixer.enabledCount} lớp đang phát` : `${mixer.enabledCount} lớp đã chọn · đang tạm dừng`}</span><button className="text-button" type="button" onClick={mixer.clear} disabled={mixer.enabledCount === 0}>Tắt hết</button></div>
    <div className="mixer-master-box"><label className="ambient-volume mixer-master"><Icon name="volume" size={18} /><span>Âm lượng tổng</span><input aria-label="Âm lượng tổng" type="range" min={0} max={100} value={mixer.master} onChange={(event) => mixer.setMaster(Number(event.target.value))} /><output>{mixer.master}%</output></label><small>Đặt âm lượng vừa đủ nghe. Các lớp có thể bật cùng lúc.</small></div>
    <div className="mixer-presets" aria-label="Phối âm sẵn">{MIX_PRESETS.map((preset) => <button type="button" key={preset.id} disabled={mixer.busy} title={preset.detail} onClick={() => mixer.preset(preset.levels)}><Icon name="spark" size={13} />{preset.label}</button>)}</div>
    <div className="mixer-filter-bar"><div className="sound-group-tabs" aria-label="Nhóm âm thanh">{(["Tất cả", "Thiên nhiên", "Không gian", "Noise"] as const).map((name) => <button type="button" key={name} aria-pressed={group === name} className={group === name ? "active" : ""} onClick={() => setGroup(name)}>{name}</button>)}</div><label className="mixer-search"><span className="sr-only">Tìm âm thanh</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm âm thanh…" /></label></div>
    <div className="sound-channel-list">{sounds.map((sound) => {
      const level = mixer.levels[sound.id]; const pending = mixer.loading.includes(sound.id); const failure = mixer.failed[sound.id];
      return <div className={`sound-channel ${level > 0 ? "enabled" : ""} ${failure ? "load-failed" : ""}`} key={sound.id} data-sound-id={sound.id} data-level={level} data-source={sound.recording ? "recording" : "synthesized"} data-loaded={pending ? "loading" : failure ? "error" : "ready"}>
        <div className="sound-channel-heading"><button className="channel-toggle" type="button" disabled={mixer.busy} aria-pressed={level > 0} aria-label={`${level > 0 ? "Tắt" : "Bật"} ${sound.label}`} onClick={() => mixer.toggleChannel(sound.id)}>{pending ? <span className="spinner" /> : <Icon name={sound.icon} size={18} />}</button><div className="channel-title"><strong>{sound.label}</strong><span>{sound.detail}</span></div><span className="sound-source-tag">{sound.recording ? "Bản thu" : "Tổng hợp"}</span></div>
        <label className="channel-volume"><span className="sr-only">{`Âm lượng ${sound.label}`}</span><input aria-label={`Âm lượng ${sound.label}`} type="range" min={0} max={100} value={level} onChange={(event) => mixer.setLevel(sound.id, Number(event.target.value))} /><output>{level}%</output></label>
        {failure && level > 0 && <div className="sound-load-error"><span>{failure}</span><button className="text-button" type="button" onClick={() => mixer.retry(sound.id)}>Thử lại</button></div>}
      </div>;
    })}{sounds.length === 0 && <p className="mixer-empty">Không thấy âm thanh này. Thử từ khóa khác nhé.</p>}</div>
    {mixer.error && <p className="form-error" role="alert">{mixer.error}</p>}
    <details className="sound-credits"><summary>Nguồn âm thanh & cách hoạt động</summary><p>16 tiếng môi trường là bản thu của Joseph SARDIN / BigSoundBank (CC0), đã cân bằng âm lượng và làm mượt vòng lặp. Piano, chuông và noise là âm tổng hợp. Bản thu được tải lần đầu khi bật; sau khi tải, âm thanh tiếp tục khi mất mạng trong cùng tab.</p><a href="/audio/credits.json" target="_blank" rel="noopener noreferrer">Xem nguồn từng bản thu <Icon name="arrow" size={12} /></a></details>
  </article>;
}
