import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["3000-it6bni9o0r01127ubhggq-cb51c435.sg2.manus.computer"],
  async headers() {
    return [
      {
        source: "/auth/google",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};
export default nextConfig;
