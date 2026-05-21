import type { NextConfig } from "next";

const ContentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' and 'unsafe-eval' are required by Leaflet and tsparticles —
  // both libraries generate and eval code at runtime and cannot work without them.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // blob: and data: are needed for image previews; OpenStreetMap for Leaflet map tiles.
  "img-src 'self' blob: data: https://*.tile.openstreetmap.org",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://fonts.googleapis.com https://*.tile.openstreetmap.org",
  // tsparticles spawns Web Workers via blob: URLs, so worker-src must allow it.
  "worker-src blob:",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
