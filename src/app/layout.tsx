import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./experience.css";
import "./edge-video.css";
import "./account.css";
import "./ui-fixes.css";
import "./community.css";
import "./community-overrides.css";
import "./admin.css";
import { NotificationBell } from "./components/notification-bell";
import { AccountLockGuard } from "./components/account-lock-guard";
import { PersistentYouTubePlayer } from "./components/persistent-youtube-player";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "still. room — Tập trung & tiến độ",
  description: "Một không gian đen trắng cho Pomodoro, nhiệm vụ, thói quen từng ngày và biểu đồ tiến độ của riêng bạn.",
  verification: {
    google: "60AZJX28Fhl1X0rdSnAZ9qt-5u7OVactK34Ukmw2i7s",
  },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="vi"><body>{children}<PersistentYouTubePlayer /><NotificationBell /><AccountLockGuard /></body></html>;
}
