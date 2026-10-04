"use client";

import { ReactNode } from "react";
import { AccountControl } from "./account-control";
import { Icon } from "../icons";

type Section = "home" | "study" | "forum" | "messages";

export function CommunityShell({ active, title, eyebrow, description, children }: {
  active: Section; title: string; eyebrow: string; description: string; children: ReactNode;
}) {
  const links = [
    { id: "home", label: "Tổng quan", href: "/", icon: "layout" },
    { id: "study", label: "Học chung", href: "/hoc-chung", icon: "radio" },
    { id: "forum", label: "Diễn đàn", href: "/dien-dan", icon: "book" },
    { id: "analytics", label: "Thống kê", href: "/#analytics", icon: "chart" },
    { id: "habits", label: "Thói quen", href: "/#habits", icon: "habit" },
    { id: "tasks", label: "Nhiệm vụ", href: "/#tasks", icon: "tasks" },
    { id: "history", label: "Lịch sử", href: "/#history", icon: "clock" },
  ] as const;

  return <div className="app-shell community-shell">
    <aside className="sidebar">
      <a href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>still<span className="brand-period">.</span><small>ROOM</small></span></a>
      <div className="workspace-label"><span className="workspace-icon"><Icon name="layout" size={19} /></span><div><strong>Không gian cá nhân</strong><span>Một nhịp cho riêng bạn</span></div><span className="workspace-badge">3.5</span></div>
      <span className="nav-label">KHÔNG GIAN</span>
      <nav className="side-nav" aria-label="Điều hướng chính">
        {links.map((item) => <a key={item.id} className={item.id === active ? "nav-link active" : "nav-link"} href={item.href}><Icon name={item.icon} size={19} /><span>{item.label}</span></a>)}
      </nav>
      <div className="sidebar-art"><div className="arch-art" aria-hidden="true"><i /><i /><i /></div><span className="small-label">LESS, BUT BETTER.</span><p>Ít hơn một chút.<br /><strong>Hiện diện nhiều hơn.</strong></p><a className="text-button" href="/">Vào phòng tập trung <Icon name="arrow" size={15} /></a></div>
      <div className="sidebar-account"><AccountControl data={null} onChanged={() => window.location.reload()} /></div>
      <div className="sidebar-bottom"><a className="sidebar-control" href="/#overview"><kbd>?</kbd><span>Phím tắt & dữ liệu</span></a><a className="sidebar-control" href="/#overview"><Icon name="sliders" size={18} /><span>Tùy chỉnh không gian</span></a></div>
    </aside>

    <main className="main-shell" id="main-content">
      <div className="mobile-topbar"><a href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>still<span className="brand-period">.</span><small>ROOM</small></span></a></div>
      <nav className="mobile-nav" aria-label="Điều hướng trên di động">
        {links.slice(0, 3).map((item) => <a key={item.id} className={item.id === active ? "active" : ""} href={item.href}><Icon name={item.icon} size={16} />{item.label}</a>)}
      </nav>
      <div className="page-content community-page-content">
        <header className="page-header community-page-header">
          <div><span className="eyebrow"><span className="tiny-dot" /> {eyebrow}</span><h1>{title}<span className="heading-period">.</span></h1><p>{description}</p></div>
        </header>
        {children}
        <footer className="page-footer"><span>Một không gian nhỏ để học cùng nhau.</span><span>still. room · community</span></footer>
      </div>
    </main>
  </div>;
}
