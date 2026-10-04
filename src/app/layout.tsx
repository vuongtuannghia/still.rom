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
  metadataBase: new URL("https://still-room-original.onrender.com"),
  title: {
    default: "still. room — Tập trung & học cùng nhau",
    template: "%s · still. room",
  },
  description: "still.room là không gian tập trung đen trắng để học, theo dõi Pomodoro, tiến độ, thói quen và học cùng nhau qua Google Meet.",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "https://still-room-original.onrender.com/",
    siteName: "still. room",
    title: "still. room — Tập trung & học cùng nhau",
    description: "Không gian tập trung tối giản để học, theo dõi tiến độ và học cùng nhau.",
  },
  verification: {
    google: "60AZJX28Fhl1X0rdSnAZ9qt-5u7OVactK34Ukmw2i7s",
  },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="vi"><body>{children}<PersistentYouTubePlayer /><NotificationBell /><AccountLockGuard /></body></html>;
}
