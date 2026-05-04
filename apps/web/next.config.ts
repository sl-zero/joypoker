import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@poker/cards-core", "@poker/rules-schema"],
};

export default nextConfig;
