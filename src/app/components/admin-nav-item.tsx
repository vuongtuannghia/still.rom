"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

export function AdminNavItem({ mobile = false }: { mobile?: boolean }) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/account/status", { cache: "no-store", credentials: "same-origin" })
      .then(r => r.ok ? r.json() as Promise<{ account: DashboardData["account"] }> : null)
      .then(payload => { if (alive) setIsAdmin(payload?.account?.role === "admin" || payload?.account?.email?.toLowerCase() === "vuongtuannghia585@gmail.com"); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!isAdmin) return null;
  return <a className={mobile ? "admin-nav-mobile" : "nav-link admin-nav-link"} href="/quan-tri"><Icon name="target" size={19} /><span>Quản trị</span></a>;
}
