import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/github-app-manager",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
