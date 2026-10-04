"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../icons";
import { errorMessage, getAccessStatus, getServerAccessStatus, reconnectWorkspace, subscribeAccess } from "@/lib/client-api";

export function WorkspaceAccessBar({ compact = false, onReconnected, disabled = false }: {
  compact?: boolean; onReconnected?: () => void | Promise<void>; disabled?: boolean;
}) {
  const status = useSyncExternalStore(subscribeAccess, getAccessStatus, getServerAccessStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const pending = useRef(false);
  const preview = typeof window !== "undefined" && window.location.hostname.endsWith(".manus.computer");
  const ready = (preview && hydrated) || status.phase === "ready";
  const connecting = !preview && (status.phase === "connecting" || status.phase === "reconnecting");
  async function reconnect() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await reconnectWorkspace(); await onReconnected?.(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { pending.current = false; setBusy(false); }
  }
  useEffect(() => { setHydrated(true); if (!preview) void reconnect(); }, [preview]);
  return <section className={`workspace-access-bar ${compact ? "compact-access" : ""} ${ready ? "access-ready" : ""}`} aria-label="Quyền của không gian cá nhân" data-access-state={status.phase}>
    <div className="workspace-access-message" role="status" aria-live="polite"><span className="access-state-icon">{connecting || busy ? <span className="spinner" /> : <Icon name={ready ? "check" : "signal"} size={16} />}</span><div><strong>{ready ? "Quyền đọc và lưu đã xác nhận" : status.message}</strong>{!compact && <span>{ready ? "Bạn có thể lưu YouTube, thói quen, nhiệm vụ và phiên tập trung trong không gian cá nhân này." : "Không cần đăng nhập hoặc xóa dữ liệu trình duyệt."}</span>}</div></div>
    <button type="button" className="button-secondary access-reconnect" disabled={busy || connecting || disabled} onClick={() => void reconnect()} aria-label="Kết nối lại quyền"><Icon name="reset" size={14} />{busy ? "Đang xác nhận…" : "Kết nối lại quyền"}</button>
    {error && <p className="access-reconnect-error" role="alert">{error}</p>}
  </section>;
}
