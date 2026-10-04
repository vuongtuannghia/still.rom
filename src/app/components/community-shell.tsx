"use client";

import { ReactNode } from "react";
import { AccountControl } from "./account-control";
import { Icon } from "../icons";
import { ProfileNavItem } from "./profile-nav-item";

type Section = "home" | "study" | "forum" | "messages";


const COMMUNITY_STYLES = String.raw`
.community-shell{min-height:100vh;background:#f7f7f4;color:#1e1e1b}
.community-shell .main-shell{min-width:0;background:#f7f7f4}
.community-shell .page-content{width:100%;max-width:1280px;margin:0 auto;padding:34px 38px 50px}
.community-page-header{padding:0 0 26px!important;margin:0!important}
.community-page-header h1{margin:8px 0 7px!important;font-size:38px!important;line-height:1.02!important;letter-spacing:-.055em!important;font-weight:620!important;color:#1e1e1b!important}
.community-page-header p{margin:0!important;color:#73736e!important;font-size:12px!important;line-height:1.7!important}
.eyebrow{font-size:9px!important;letter-spacing:.13em!important;font-weight:700!important}
.community-alert{display:flex;align-items:center;gap:10px;margin:0 0 14px;padding:10px 12px;border:1px solid #d8d8d2;border-radius:10px;background:#20201e;color:#f6f6f2;font-size:10px}
.community-alert span{flex:1;min-width:0}.community-alert button{display:grid;width:25px;height:25px;place-items:center;border:0;background:transparent;color:inherit;cursor:pointer}
.community-kicker{display:inline-flex;align-items:center;gap:8px;font-size:9px;font-weight:700;letter-spacing:.14em}
.community-kicker>span{width:7px;height:7px;border-radius:50%;background:currentColor}.community-kicker.light{color:#e3e3dc}.community-kicker.light>span{background:#fff}
.community-hero-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:17px}.community-hero-actions>span{display:inline-flex;align-items:center;gap:6px;color:#bdbdb5;font-size:9px}
.community-section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:0 0 12px}.community-section-heading h3{margin:5px 0 0;font-size:20px;line-height:1.05;letter-spacing:-.035em}.community-section-heading>span{color:#8b8b85;font-size:9px}
.community-avatar{display:grid;width:38px;height:38px;place-items:center;flex:0 0 auto;overflow:hidden;border:1px solid #deded7;border-radius:50%;background:#ecece7;color:#262623;font-size:11px;font-weight:700}.community-avatar img{width:100%;height:100%;object-fit:cover}.community-avatar.small{width:28px;height:28px;font-size:9px}
.login-strip{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:10px 12px;border:1px solid #dddcd5;border-radius:10px;background:#efefe9;color:#6f6f6a;font-size:10px}

/* Shared study */
.shared-page-wrap{display:block}
.shared-page-hero{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);min-height:300px!important;overflow:hidden!important;border:1px solid #262624!important;border-radius:18px!important;background:#22221f!important;color:#f4f4ee!important;box-shadow:0 20px 55px rgba(0,0,0,.08)!important}
.shared-page-hero>div:first-child{padding:38px 38px 34px!important;display:flex;flex-direction:column;justify-content:center}
.shared-page-hero h2{margin:17px 0 12px!important;font-size:44px!important;line-height:.99!important;letter-spacing:-.065em!important;font-weight:620!important;color:#f6f6f1!important}
.shared-page-hero h2 em{font-style:normal;color:#a9a9a1}.shared-page-hero p{max-width:650px;margin:0!important;color:#b9b9b0!important;font-size:11px!important;line-height:1.8!important}
.shared-page-hero .button-primary{background:#f4f4ef!important;color:#22221f!important;border-color:#f4f4ef!important}
.shared-page-visual{position:relative!important;min-height:300px!important;overflow:hidden;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.12),transparent 58%)!important}
.visual-grid{position:absolute;inset:0;opacity:.16;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:30px 30px;mask-image:linear-gradient(to bottom,transparent,#000)}
.visual-ring{position:absolute;top:50%;left:50%;border:1px solid rgba(255,255,255,.16);border-radius:50%;transform:translate(-50%,-50%)}.ring-1{width:230px;height:230px}.ring-2{width:148px;height:148px;border-style:dashed}.visual-dot{position:absolute;width:9px;height:9px;border-radius:50%;background:#fff}.dot-1{left:25%;top:25%}.dot-2{right:23%;bottom:25%;width:6px;height:6px;background:#aaa}
.shared-page-visual strong{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-size:23px;line-height:.9;letter-spacing:.13em}
.study-feature-room{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center;gap:14px;margin:16px 0 18px!important;padding:17px!important;border:1px solid #dddcd6!important;border-radius:12px!important;background:#efefea!important}
.study-feature-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 9px;border-radius:999px;background:#232321;color:#f2f2ed;font-size:8px;font-weight:700;letter-spacing:.08em;white-space:nowrap}
.study-feature-main{min-width:0}.study-feature-main h3{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px}.study-feature-main p{margin:4px 0 0;color:#777770;font-size:9px}
.study-feature-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.study-feature-actions>*{white-space:nowrap}
.study-room-list-section{margin-top:24px}.study-room-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
.study-room-card{padding:16px!important;border:1px solid #deddd7!important;border-radius:12px!important;background:#fff!important;box-shadow:0 6px 20px rgba(0,0,0,.025);transition:.16s ease}
.study-room-card:hover{transform:translateY(-2px);border-color:#c8c8c1;box-shadow:0 14px 30px rgba(0,0,0,.06)}
.study-room-card-top{display:flex;justify-content:space-between;gap:8px;color:#8b8b84;font-size:8px}.room-live{display:inline-flex;align-items:center;gap:5px;color:#262622;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.room-live i{width:6px;height:6px;border-radius:50%;background:#262622}
.study-room-person{display:flex;align-items:center;gap:10px;margin:22px 0 16px}.study-room-person h4{margin:0;font-size:15px}.study-room-person p{margin:3px 0 0;color:#8a8a84;font-size:9px}
.study-room-card-actions{display:flex;gap:7px}.study-room-card-actions>*{flex:1;justify-content:center}.admin-room-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:10px}.admin-room-actions button{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:#8a8a84;font-size:9px;cursor:pointer}
.study-empty{display:flex;align-items:center;flex-direction:column;justify-content:center;min-height:205px;padding:28px;border:1px dashed #d8d7d0;border-radius:12px;background:linear-gradient(180deg,#f1f1ec,#fff);text-align:center}.study-empty strong{font-size:13px}.study-empty p{margin:6px 0 0;color:#8b8b85;font-size:10px}
.study-share-box{display:grid!important;grid-template-columns:.8fr 1.2fr!important;gap:22px!important;padding:19px!important;margin-top:24px!important;border:1px solid #deddd7!important;border-radius:12px!important;background:#efefe9!important}.study-share-box h3{margin:5px 0;font-size:18px;letter-spacing:-.03em}.study-share-box p{margin:0;color:#80807a;font-size:9px;line-height:1.7}.study-share-form{display:grid!important;grid-template-columns:.72fr 1.28fr auto!important;gap:8px!important}.study-share-form input{width:100%;min-width:0;min-height:40px;padding:9px 11px;border:1px solid #cfcfc8;border-radius:8px;background:#fff;color:#242421;font-size:10px}.study-share-form button{min-height:40px;white-space:nowrap}

/* Forum */
.forum-page-grid{display:grid!important;grid-template-columns:minmax(0,1.55fr) minmax(290px,.72fr)!important;gap:16px!important;align-items:start!important}.forum-main,.forum-side{min-width:0}
.forum-intro{display:flex!important;justify-content:space-between;gap:22px;padding:30px!important;margin:0 0 14px!important;border-radius:15px!important;background:#20201e!important;color:#f3f3ed!important;overflow:hidden!important}.forum-intro h2{margin:16px 0 11px!important;font-size:34px!important;line-height:.99!important;letter-spacing:-.06em!important;color:#f3f3ed!important}.forum-intro h2 em{font-style:normal;color:#a8a8a1}.forum-intro p{max-width:600px;margin:0!important;color:#b9b9b1!important;font-size:10px!important;line-height:1.8!important}.forum-intro-mark{align-self:flex-end;color:#77776f;font-size:34px;letter-spacing:.16em}
.forum-compose{display:flex!important;gap:12px;margin-bottom:15px!important;padding:14px!important;border:1px solid #deddd7!important;border-radius:12px!important;background:#fff!important}.compose-avatar{display:grid;width:42px;height:42px;place-items:center;flex:0 0 auto;overflow:hidden;border:1px solid #dddcd5;border-radius:50%;background:#eded e8;font-size:11px;font-weight:700}.compose-fields{flex:1;min-width:0}.compose-fields input,.compose-fields textarea{width:100%;border:0!important;outline:none!important;background:transparent!important;color:#222;font:inherit}.compose-fields input{padding:5px 2px;font-size:14px;font-weight:650}.compose-fields textarea{min-height:76px;padding:7px 2px;resize:vertical;font-size:10px;line-height:1.65}.compose-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:9px;border-top:1px solid #e3e2dc}.compose-footer span{color:#8a8a84;font-size:8px}
.forum-feed{display:grid!important;gap:10px!important}.forum-post-card{padding:17px!important;border:1px solid #deddd7!important;border-radius:12px!important;background:#fff!important;box-shadow:0 6px 20px rgba(0,0,0,.025)}.forum-post-author{display:flex;align-items:center;gap:9px}.forum-post-author>div{display:flex;flex-direction:column;min-width:0}.forum-post-author strong{font-size:10px}.forum-post-author span{color:#8a8a84;font-size:8px}.forum-post-card>h3{margin:13px 0 7px!important;font-size:17px!important;letter-spacing:-.03em!important}.forum-post-body{margin:0!important;color:#555550!important;font-size:10px!important;line-height:1.8!important;white-space:pre-wrap}.forum-meet-chip{display:flex;align-items:center;gap:7px;margin-top:12px;padding:9px 10px;border:1px solid #deddd7;border-radius:8px;color:#242421;font-size:9px;text-decoration:none;background:#f5f5f0}.forum-meet-chip span{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.forum-post-actions{display:flex;gap:4px;margin-top:12px;padding-top:9px;border-top:1px solid #e5e4de}.forum-post-actions button,.comment-line-actions button{border:0;background:transparent;color:#7f7f79;font-size:8px;cursor:pointer;padding:5px 7px}.forum-post-actions button:hover,.comment-line-actions button:hover{color:#222}
.forum-comments{margin-top:12px;padding-top:12px;border-top:1px solid #e3e2dc}.comment-block{padding:8px 0}.comment-line{display:flex;align-items:flex-start;gap:8px}.comment-line.compact{margin-left:30px;margin-top:8px;padding-left:10px;border-left:1px solid #deddd7}.comment-line>div{min-width:0;flex:1}.comment-line-meta{display:flex;align-items:center;gap:7px}.comment-line-meta strong{font-size:9px}.comment-line-meta span{color:#999991;font-size:7px}.comment-line p{margin:4px 0!important;font-size:9px;line-height:1.65;white-space:pre-wrap}.comment-line-actions{display:flex;gap:3px}.comment-composer{margin-top:10px;padding-top:10px;border-top:1px solid #e3e2dc}.comment-input-row{display:flex;align-items:center;gap:7px}.comment-input-row input{flex:1;min-width:0;min-height:34px;padding:8px 10px;border:1px solid #dddcd5;border-radius:8px;background:#f7f7f3;font-size:9px}.replying{display:flex;justify-content:space-between;margin-bottom:7px;color:#8a8a84;font-size:8px}.replying button{border:0;background:transparent;color:#222;font-size:8px;cursor:pointer}.comment-empty{margin:0 0 9px;color:#8a8a84;font-size:9px}
.dm-card,.dm-conversation,.community-guideline{padding:15px!important;border:1px solid #deddd7!important;border-radius:12px!important;background:#fff!important}.dm-heading{display:flex;align-items:flex-start;justify-content:space-between}.dm-heading h3{margin:5px 0 0;font-size:17px}.dm-search{display:flex;align-items:center;gap:7px;margin:11px 0 8px;padding:9px 10px;border:1px solid #deddd7;border-radius:8px;background:#f5f5f0}.dm-search input{width:100%;min-width:0;border:0;outline:none;background:transparent;font-size:9px}.people-list{display:grid;max-height:360px;overflow:auto}.person-row{display:flex!important;align-items:center;gap:8px;width:100%;padding:10px 6px!important;border:0!important;border-bottom:1px solid #ecebe5!important;background:transparent!important;text-align:left;cursor:pointer}.person-row>span:nth-child(2){display:flex;flex:1;min-width:0;flex-direction:column}.person-row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px}.person-row small{color:#8a8a84;font-size:7px}.dm-conversation{margin-top:10px!important;padding:0!important;overflow:hidden}.dm-conversation-head{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-bottom:1px solid #e3e2dc}.dm-messages{display:grid;gap:7px;max-height:370px;overflow:auto;padding:12px}.dm-bubble{justify-self:start;max-width:84%;padding:9px 10px;border:1px solid #deddd7;border-radius:10px 10px 10px 3px;background:#f3f3ee}.dm-bubble.mine{justify-self:end;border-color:#222;background:#222;color:#f7f7f3;border-radius:10px 10px 3px 10px}.dm-bubble p{margin:0;font-size:9px;line-height:1.6}.dm-bubble small{display:block;margin-top:3px;opacity:.62;font-size:7px}.dm-composer{display:flex;gap:7px;padding:9px;border-top:1px solid #e3e2dc}.dm-composer input{flex:1;min-width:0;padding:8px 9px;border:1px solid #deddd7;border-radius:7px;background:#f7f7f3;font-size:9px}.dm-empty,.dm-locked{display:flex;align-items:center;flex-direction:column;gap:6px;padding:30px 12px;text-align:center;color:#8a8a84;font-size:9px}
.messages-layout{display:grid!important;grid-template-columns:300px minmax(0,1fr)!important;gap:14px!important;min-height:620px}.messages-chat{display:flex!important;flex-direction:column}.messages-search{display:flex!important}.message-person,.messages-people-list{font-size:9px}.message-bubble{max-width:72%}
.messages-login-card{display:flex;align-items:center;justify-content:center;flex-direction:column;min-height:480px;text-align:center}.messages-login-card h2{font-size:16px}.messages-login-card p{font-size:10px;color:#8a8a84}

@media(max-width:900px){
  .community-shell .page-content{padding:22px 16px 35px}
  .shared-page-hero,.forum-page-grid,.study-share-box,.messages-layout{grid-template-columns:1fr!important}
  .shared-page-visual{min-height:170px!important}.shared-page-hero h2{font-size:31px!important}
  .study-room-grid{grid-template-columns:1fr!important}.study-feature-room{grid-template-columns:1fr!important}.study-feature-actions>*{flex:1;justify-content:center}
  .study-share-form{grid-template-columns:1fr!important}.study-share-form button{width:100%}
  .forum-intro{padding:22px!important}.forum-intro-mark{display:none}.forum-compose{padding:12px!important}
  .messages-layout{min-height:auto!important}.messages-people-list{max-height:250px}.messages-list{min-height:350px!important}
}
`;


export function CommunityShell({ active, title, eyebrow, description, children }: {
  active: Section; title: string; eyebrow: string; description: string; children: ReactNode;
}) {
  const links = [
    { id: "home", label: "Tổng quan", href: "/", icon: "layout" },
    { id: "study", label: "Học chung", href: "/hoc-chung", icon: "radio" },
    { id: "forum", label: "Diễn đàn", href: "/dien-dan", icon: "book" },
    { id: "messages", label: "Tin nhắn", href: "/tin-nhan", icon: "arrow" },
    { id: "discover", label: "Khám phá", href: "/kham-pha", icon: "target" },
    { id: "analytics", label: "Thống kê", href: "/#analytics", icon: "chart" },
    { id: "habits", label: "Thói quen", href: "/#habits", icon: "habit" },
    { id: "tasks", label: "Nhiệm vụ", href: "/#tasks", icon: "tasks" },
    { id: "history", label: "Lịch sử", href: "/#history", icon: "clock" },
  ] as const;

  return <div className="app-shell community-shell"><style dangerouslySetInnerHTML={{ __html: COMMUNITY_STYLES }} />
    <aside className="sidebar">
      <a href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>still<span className="brand-period">.</span><small>ROOM</small></span></a>
      <div className="workspace-label"><span className="workspace-icon"><Icon name="layout" size={19} /></span><div><strong>Không gian cá nhân</strong><span>Một nhịp cho riêng bạn</span></div><span className="workspace-badge">3.5</span></div>
      <span className="nav-label">KHÔNG GIAN</span>
      <nav className="side-nav" aria-label="Điều hướng chính">
        <ProfileNavItem />{links.map((item) => <a key={item.id} className={item.id === active ? "nav-link active" : "nav-link"} href={item.href}><Icon name={item.icon} size={19} /><span>{item.label}</span></a>)}
      </nav>
      <div className="sidebar-art"><div className="arch-art" aria-hidden="true"><i /><i /><i /></div><span className="small-label">LESS, BUT BETTER.</span><p>Ít hơn một chút.<br /><strong>Hiện diện nhiều hơn.</strong></p><a className="text-button" href="/">Vào phòng tập trung <Icon name="arrow" size={15} /></a></div>
      <div className="sidebar-account"><AccountControl data={null} onChanged={() => window.location.reload()} /></div>
      <div className="sidebar-bottom"><a className="sidebar-control" href="/#overview"><kbd>?</kbd><span>Phím tắt & dữ liệu</span></a><a className="sidebar-control" href="/#overview"><Icon name="sliders" size={18} /><span>Tùy chỉnh không gian</span></a></div>
    </aside>

    <main className="main-shell" id="main-content">
      <div className="mobile-topbar"><a href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>still<span className="brand-period">.</span><small>ROOM</small></span></a></div>
      <div className="mobile-account-control"><AccountControl data={null} onChanged={() => window.location.reload()} /></div>
      <nav className="mobile-nav" aria-label="Điều hướng trên di động">
        <ProfileNavItem />{links.map((item) => <a key={item.id} className={item.id === active ? "active" : ""} href={item.href}><Icon name={item.icon} size={16} />{item.label}</a>)}
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
