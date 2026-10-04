import type { MetadataRoute } from "next";

const SITE_URL = "https://still-room-original.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/hoc-chung`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/dien-dan`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];
}
