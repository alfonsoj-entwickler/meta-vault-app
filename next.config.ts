import type { NextConfig } from "next";

// const withPWA = require('next-pwa')({
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === 'development',
// });

// const ContentSecurityPolicy = [
//   "default-src 'self'",
//   "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
//   "style-src 'self' 'unsafe-inline'",
//   "img-src 'self' blob: data: https://*.tile.openstreetmap.org",
//   "font-src 'self' https://fonts.gstatic.com",
//   "connect-src 'self' https://fonts.googleapis.com https://*.tile.openstreetmap.org",
//   "worker-src blob:",
//   "frame-ancestors 'none'",
// ].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  // async headers() {
  //   return [
  //     {
  //       source: "/(.*)",
  //       headers: [
  //         {
  //           key: "X-Frame-Options",
  //           value: "DENY",
  //         },
  //         {
  //           key: "X-Content-Type-Options",
  //           value: "nosniff",
  //         },
  //         {
  //           key: "Referrer-Policy",
  //           value: "strict-origin-when-cross-origin",
  //         },
  //         {
  //           key: "Permissions-Policy",
  //           value: "camera=(), microphone=(), geolocation=(self)",
  //         },
  //         {
  //           key: "Strict-Transport-Security",
  //           value: "max-age=63072000; includeSubDomains; preload",
  //         },
  //         {
  //           key: "Content-Security-Policy",
  //           value: ContentSecurityPolicy,
  //         },
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;
