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
import "./persistent-youtube-fix.css";
import { NotificationBell } from "./components/notification-bell";
import { AccountLockGuard } from "./components/account-lock-guard";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://still-room-original.onrender.com"),
  applicationName: "still. room",
  keywords: [
    "still room",
    "still.room",
    "focus timer",
    "pomodoro timer",
    "study room",
    "study with me",
    "học cùng nhau",
    "phòng học online",
    "tập trung học",
    "quản lý thời gian học",
  ],
  title: {
    default: "still. room — Không gian tập trung & học cùng nhau",
    template: "%s · still. room",
  },
  description:
    "still. room là không gian học và tập trung tối giản: Pomodoro, focus timer, việc cần làm, thói quen, thống kê và phòng học cùng nhau.",
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://still-room-original.onrender.com/",
    siteName: "still. room",
    title: "still. room — Không gian tập trung & học cùng nhau",
    description:
      "Pomodoro, focus timer, thói quen, thống kê và phòng học cùng nhau trong một không gian tối giản.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "still. room — Tập trung hơn. Học cùng nhau.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "still. room — Không gian tập trung & học cùng nhau",
    description:
      "Một không gian tối giản để tập trung, học và theo dõi tiến độ mỗi ngày.",
    images: ["/twitter-image"],
  },
  verification: {
    google: "jRrDLgQsTU50xF6QiUY5cqm8tuLjXkKiK403BweeE7Y",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "still. room",
  url: "https://still-room-original.onrender.com/",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "vi-VN",
  description:
    "Không gian tối giản để tập trung, học cùng nhau, dùng Pomodoro và theo dõi tiến độ học tập.",
  featureList: [
    "Pomodoro focus timer",
    "Việc cần làm",
    "Theo dõi thói quen",
    "Thống kê thời gian tập trung",
    "Phòng học cùng nhau",
    "YouTube study room",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <html lang="vi">
        <body>
          {children}
          <NotificationBell />
          <AccountLockGuard />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        </body>
      </html>
    </>
  );
}
