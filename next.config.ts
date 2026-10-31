import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // PWA service worker is in public/sw.js and served at /sw.js.
};
export default nextConfig;
