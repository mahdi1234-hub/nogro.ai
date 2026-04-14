import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@deck.gl/core", "@deck.gl/layers", "@deck.gl/react"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

export default nextConfig;
