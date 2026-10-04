import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./experience.css";
import "./edge-video.css";
import "./account.css";
import "./ui-fixes.css";
import "./community.css";
import "./community-overrides.css";
import { NotificationBell } from "./components/notification-bell";

export const metadata: Metadata = {
  title: "still. room — Tập trung & tiến độ",
  description: "Một không gian đen trắng cho Pomodoro, nhiệm vụ, thói quen từng ngày và biểu đồ tiến độ của riêng bạn.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="vi"><body>{children}<NotificationBell /></body></html>;
}
