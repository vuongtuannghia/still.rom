"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

export function ProfileNavItem() {
  const [account, setAccount] = useState<DashboardData["account"]>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/account/status", { cache: "no-store", credentials: "same-origin" })
      .then(response => response.ok ? response.json() as Promise<{ account: DashboardData["account"] }> : null)
      .then(payload => { if (active) setAccount(payload?.account ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!account) return null;

  return <a className="nav-link profile-nav-link" href={"/nguoi-dung/" + account.id}>
    <Icon name="user" size={19} />
    <span>Trang cá nhân</span>
  </a>;
}
