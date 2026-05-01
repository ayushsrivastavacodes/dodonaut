import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@dodonaut/db", "@dodonaut/dodo", "@dodonaut/shared"],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
