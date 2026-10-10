import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 15.2.x still uses `experimental.turbo` (turbopack moved to
  // top-level `turbopack` in later versions).
  turbopack: {
    // Pin the Turbopack root to this Next.js app folder.
    root: path.resolve(__dirname),
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // "require-corp" blocks WebContainer preview iframes — use credentialless instead
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin"  },
        ],
      },
    ];
  },

  // Silence the Chrome DevTools probe — harmless 404s from Chrome DevTools
  async rewrites() {
    return [
      {
        source: "/.well-known/appspecific/com.chrome.devtools.json",
        destination: "/api/devtools-stub",
      },
    ];
  },

  serverExternalPackages: [
    "mongoose",
    "groq-sdk",
  ],
};

export default nextConfig;