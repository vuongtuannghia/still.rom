"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import type { DashboardData } from "@/lib/focus-domain";

const LOCAL_DATA_KEY = "stillroom.progress.v4";
const PENDING_IMPORT_KEY = "stillroom.pending-account-import.v1";
const TIMER_PREFIX = "stillroom.timer.v2:";
const OUTBOX_PREFIX = "stillroom.outbox.v2:";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean }) => void;
          renderButton: (parent: HTMLElement, options: { theme: string; size: string; width: number; text: string; shape: string; logo_alignment: string }) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

type Status = {
  account: DashboardData["account"];
  google: { configured: boolean; clientId: string | null; reason: string | null };
  hasSnapshot: boolean;
};

export function AccountControl({ data, onChanged }: {
  data: DashboardData | null;
  onChanged: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedClientId = useRef<string | null>(null);

  async function loadStatus() {
    try {
      const response = await fetch("/api/account/status", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      setStatus(await response.json() as Status);
    } catch {
      // Account status is optional UI metadata.
    }
  }

  async function completeGoogleLogin(credential: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/google/credential", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const payload = await response.json().catch(() => ({})) as { account?: DashboardData["account"]; hasSnapshot?: boolean; error?: string };
      if (!response.ok || !payload.account) throw new Error(payload.error || "Đăng nhập Google thất bại.");

      if (!payload.hasSnapshot) {
        const raw = localStorage.getItem(PENDING_IMPORT_KEY);
        if (raw) {
          try {
            const sync = await fetch("/api/account/sync", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ backup: JSON.parse(raw) }),
            });
            if (sync.ok) localStorage.removeItem(PENDING_IMPORT_KEY);
          } catch {
            // Keep the pending backup so a later attempt can retry it.
          }
        }
      } else {
        localStorage.removeItem(PENDING_IMPORT_KEY);
      }

      await loadStatus();
      await onChanged();
      setMessage("Đã đăng nhập và kết nối sao lưu.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng nhập Google thất bại.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadStatus();
    const id = window.setInterval(() => void loadStatus(), 10000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!status?.account && data) {
      try {
        localStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify({
          format: "stillroom-backup", version: 1, exportedAt: new Date().toISOString(),
          preferences: data.preferences, room: data.room, tasks: data.tasks, subtasks: data.subtasks,
          habits: data.habits, checkIns: data.checkIns, sessions: data.sessions,
        }));
      } catch {}
    }
  }, [status?.account, data]);



  useEffect(() => {
    if (status?.account) {
      if (buttonRef.current) buttonRef.current.innerHTML = "";
      initializedClientId.current = null;
      return;
    }
    const clientId = status?.google.clientId;
    if (!clientId || !buttonRef.current || initializedClientId.current === clientId) return;

    let cancelled = false;
    const render = () => {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
      initializedClientId.current = clientId;
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: (response) => { void completeGoogleLogin(response.credential); },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: Math.min(210, buttonRef.current.clientWidth || 210),
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
      });
    };

    if (window.google?.accounts?.id) {
      render();
      return () => { cancelled = true; };
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    return () => { cancelled = true; script.removeEventListener("load", render); };
  }, [status?.google.clientId, status?.account]);

  function rememberGuestBackup() {
    if (!data) return;
    try {
      localStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify({
        format: "stillroom-backup", version: 1, exportedAt: new Date().toISOString(),
        preferences: data.preferences, room: data.room, tasks: data.tasks, subtasks: data.subtasks,
        habits: data.habits, checkIns: data.checkIns, sessions: data.sessions,
      }));
    } catch {
      // Best effort only.
    }
  }

  async function logout() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      try {
        localStorage.removeItem(LOCAL_DATA_KEY);
        localStorage.removeItem(PENDING_IMPORT_KEY);
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(TIMER_PREFIX) || key.startsWith(OUTBOX_PREFIX)) localStorage.removeItem(key);
        }
      } catch {}
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
      <div className="account-user-meta"><strong>{account.name}</strong><span>{account.email}</span><small><Icon name="check" size={12} /> Đã sao lưu tiến độ</small></div>
      <button type="button" className="button-secondary account-logout" disabled={busy} onClick={() => void logout()}>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</button>
    </div> : <div className="account-sidebar-login">
      <div><strong>Sao lưu tiến độ</strong><span>{configured ? "Đăng nhập Google để dùng trên mọi thiết bị." : "Cần cấu hình Google OAuth để bật đăng nhập."}</span></div>
      <div ref={buttonRef} className="google-signin-button" aria-label="Đăng nhập bằng Google" />
      {configured && !buttonRef.current && <button type="button" className="button-secondary" disabled={busy} onClick={rememberGuestBackup}>Đăng nhập Google</button>}
    </div>}
    {message && <p className="account-feedback" role="alert">{message}</p>}
  </div>;
}
