import type { NextConfig } from "next";

// basePath is required for GitHub Pages (served under /github-app-manager),
// but in local development it makes the root URL 404. Apply it only for
// production builds so `next dev` serves the app at "/".
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/github-app-manager" : "",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
