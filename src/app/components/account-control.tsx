"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import type { DashboardData } from "@/lib/focus-domain";

const LOCAL_DATA_KEY = "stillroom.progress.v4";
const PENDING_IMPORT_KEY = "stillroom.pending-account-import.v1";
const TIMER_PREFIX = "stillroom.timer.v2:";
const OUTBOX_PREFIX = "stillroom.outbox.v2:";

type Status = {
  account: DashboardData["account"];
  google: { configured: boolean; reason: string | null };
  hasSnapshot: boolean;
};

export function AccountControl({ data, onChanged }: {
  data: DashboardData | null;
  onChanged: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const loaded = useRef(false);

  async function loadStatus() {
    try {
      const response = await fetch("/api/account/status", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json() as Status;
      setStatus(next);
      if (next.account && !next.hasSnapshot && !loaded.current) {
        loaded.current = true;
        const raw = localStorage.getItem(PENDING_IMPORT_KEY);
        if (raw) {
          try {
            const backup = JSON.parse(raw);
            await fetch("/api/account/sync", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ backup }),
            });
            localStorage.removeItem(PENDING_IMPORT_KEY);
            await onChanged();
          } catch {
            // Retry on next status check; never delete the pending guest backup.
          }
        }
      }
    } catch {
      // Account controls remain usable when status is temporarily unavailable.
    }
  }

  useEffect(() => { void loadStatus(); const id = window.setInterval(() => void loadStatus(), 6000); return () => window.clearInterval(id); }, []);

  function login() {
    if (!data) return;
    try { localStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify({
      format: "stillroom-backup", version: 1, exportedAt: new Date().toISOString(),
      preferences: data.preferences, room: data.room, tasks: data.tasks, subtasks: data.subtasks,
      habits: data.habits, checkIns: data.checkIns, sessions: data.sessions,
    })); } catch { /* Login still works; there may simply be no guest backup to import. */ }
    window.location.href = "/api/auth/google/start";
  }

  async function logout() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      try {
        localStorage.removeItem(LOCAL_DATA_KEY);
        localStorage.removeItem(PENDING_IMPORT_KEY);
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(TIMER_PREFIX) || key.startsWith(OUTBOX_PREFIX)) localStorage.removeItem(key);
        }
      } catch { /* Best effort; reload below switches the visible workspace. */ }
      window.location.href = "/";
    } catch {
      setMessage("Chưa thể đăng xuất. Hãy thử lại.");
      setBusy(false);
    }
  }

  const account = status?.account ?? data?.account ?? null;
  const configured = status?.google.configured ?? false;

  return <div className="account-control">
    {account ? <div className="account-connected account-sidebar">
      <span className="account-avatar">{account.picture ? <img src={account.picture} alt="" /> : account.name.slice(0, 1).toUpperCase()}</span>
      <div><strong>{account.name}</strong><span>{account.email}</span><small><Icon name="check" size={12} /> Đã sao lưu tiến độ</small></div>
      <button type="button" className="icon-button" aria-label="Đăng xuất" disabled={busy} onClick={() => void logout()}><Icon name="logout" size={16} /></button>
    </div> : <div className="account-sidebar-login">
      <div><strong>Sao lưu tiến độ</strong><span>{configured ? "Đăng nhập Google để dùng trên mọi thiết bị." : "Cần cấu hình Google OAuth để bật đăng nhập."}</span></div>
      <button type="button" className="button-secondary account-google-small" disabled={!configured || busy} onClick={login}><span className="google-letter">G</span> Đăng nhập Google</button>
    </div>}
    {message && <p className="account-feedback" role="alert">{message}</p>}
  </div>;
}
