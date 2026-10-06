import type { MetadataRoute } from "next";

const SITE_URL = "https://still-room-original.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/cong-cu/pomodoro`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/cong-cu/focus-timer`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/cong-cu/hoc-cung-nhau`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/cong-cu/study-with-me`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/hoc-chung`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/dien-dan`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];
}
