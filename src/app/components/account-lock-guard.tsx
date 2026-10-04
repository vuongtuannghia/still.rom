"use client";

import { useEffect, useMemo, useState } from "react";

type AccountStatus = {
  account: {
    name: string;
    email: string;
    picture: string | null;
    lockedUntil: string | null;
  } | null;
};

function formatRemaining(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? days + " ngày " + hours + " giờ" : days + " ngày";
  if (hours > 0) return minutes > 0 ? hours + " giờ " + minutes + " phút" : hours + " giờ";
  return Math.max(1, minutes) + " phút";
}

export function AccountLockGuard() {
  const [account, setAccount] = useState<AccountStatus["account"]>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/account/status", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json() as AccountStatus;
        if (!cancelled) setAccount(payload.account);
      } catch {
        // Lock state is best-effort UI metadata; protected APIs still enforce it.
      }
    };

    void load();
    const refresh = window.setInterval(() => void load(), 5000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelled = true;
      window.clearInterval(refresh);
      window.clearInterval(tick);
    };
  }, []);

  const lock = useMemo(() => {
    if (!account?.lockedUntil) return null;
    const until = Date.parse(account.lockedUntil);
    if (!Number.isFinite(until) || until <= now) return null;
    return { until, remaining: until - now };
  }, [account, now]);

  useEffect(() => {
    document.body.classList.toggle("account-is-locked", Boolean(lock));
    return () => document.body.classList.remove("account-is-locked");
  }, [lock]);

  if (!lock || !account) return null;

  const permanent = lock.until > Date.parse("2090-01-01T00:00:00.000Z");

  return (
    <div className="account-lock-overlay" role="alertdialog" aria-modal="true" aria-labelledby="account-lock-title">
      <div className="account-lock-card">
        <div className="account-lock-mark" aria-hidden="true">!</div>
        <span className="account-lock-kicker">THÔNG BÁO TÀI KHOẢN</span>
        <h1 id="account-lock-title">Bạn đã bị khóa<br /><em>tài khoản.</em></h1>
        <p className="account-lock-lead">
          Tài khoản vẫn được giữ đăng nhập. Trong thời gian khóa, bạn không thể sử dụng các tính năng của still. room.
        </p>

        <div className="account-lock-time">
          <span>THỜI GIAN KHÓA CÒN LẠI</span>
          <strong>{permanent ? "Vĩnh viễn" : formatRemaining(lock.remaining)}</strong>
        </div>

        {account.lockReason && (
          <div className="account-lock-reason">
            <span>LÝ DO</span>
            <p>{account.lockReason}</p>
          </div>
        )}

        <p className="account-lock-note">
          {permanent
            ? "Tài khoản sẽ chỉ hoạt động lại khi quản trị viên mở khóa."
            : "Màn hình này sẽ tự biến mất khi thời gian khóa kết thúc hoặc quản trị viên mở khóa."}
        </p>
        <div className="account-lock-user">
          {account.picture ? <img src={account.picture} alt="" /> : <span>{account.name.trim().charAt(0).toUpperCase() || "U"}</span>}
          <div><strong>{account.name}</strong><small>{account.email}</small></div>
        </div>
      </div>
    </div>
  );
}
