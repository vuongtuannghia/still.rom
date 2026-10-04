"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/focus-domain";
import { Icon } from "../icons";

const UI_FIXES = `
/* Community navigation + pinned Meet + persistent video presentation */
.community-shell .side-nav .profile-nav-link,
.community-shell .mobile-nav .profile-nav-link { display: none !important; }
.community-shell .side-nav .nav-link[href="/xep-hang"] {
  display: flex !important;
  order: 5;
  margin: 2px 0 3px;
  border-color: #d2d2cb;
  background: #eeeee9;
  color: #20201e;
  font-weight: 650;
}
.community-shell .side-nav .nav-link[href="/xep-hang"] > span { font-weight: 650; }
.community-shell .side-nav .nav-link[href="/xep-hang"]:hover { background: #e5e5df; border-color: #bdbdb5; }
.community-shell .mobile-nav a[href="/xep-hang"] { display: inline-flex !important; font-weight: 650; }
.study-feature-room {
  position: relative !important;
  grid-template-columns: auto minmax(0,1fr) auto !important;
  padding: 18px 19px !important;
  border: 1px solid #252523 !important;
  background: linear-gradient(135deg,#252523 0%,#30302d 55%,#1f1f1d 100%) !important;
  color: #f6f6f1 !important;
  box-shadow: 0 16px 38px rgba(0,0,0,.14), 0 0 0 1px rgba(255,255,255,.05) inset !important;
}
.study-feature-room::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(circle at 8% 50%,rgba(255,255,255,.13),transparent 30%),radial-gradient(circle at 92% 20%,rgba(255,255,255,.08),transparent 25%);
}
.study-feature-room > * { position: relative; z-index: 1; }
.study-feature-badge { background:#f4f4ef !important; color:#22221f !important; }
.study-feature-main h3 { color:#fff !important; font-size:17px !important; }
.study-feature-main p { color:#bdbdb5 !important; }
.study-feature-actions .button-primary { background:#f4f4ef !important; color:#22221f !important; border-color:#f4f4ef !important; }
.study-feature-actions .button-secondary { background:rgba(255,255,255,.06) !important; color:#f1f1ec !important; border-color:rgba(255,255,255,.22) !important; }
.study-feature-actions .button-secondary:hover { background:rgba(255,255,255,.12) !important; }
.ambient-player .youtube-stage { transition: width .18s ease,height .18s ease; }
.youtube-scene-player[data-player-view="ambient"] .youtube-stage { cursor: default; }
@media (max-width: 900px) {
  .study-feature-room { grid-template-columns: 1fr !important; align-items: start !important; }
  .study-feature-actions { margin-top: 2px; }
}
`;

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

  return <>
    <style dangerouslySetInnerHTML={{ __html: UI_FIXES }} />
    {account && <a className="nav-link profile-nav-link" href={"/nguoi-dung/" + account.id}>
      <Icon name="user" size={19} />
      <span>Trang cá nhân</span>
    </a>}
  </>;
}
