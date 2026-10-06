import type { MetadataRoute } from "next";

const SITE_URL = "https://still-room-original.onrender.com";

const SLUGS = [
  "pomodoro",
  "focus-timer",
  "hoc-cung-nhau",
  "study-with-me",
  "study-timer",
  "lofi-focus",
  "body-doubling",
  "phong-hoc-online",
  "timer-on-thi",
  "habit-tracker",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...SLUGS.map((slug) => ({
      url: `${SITE_URL}/cong-cu/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
