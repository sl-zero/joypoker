import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@poker/cards-core", "@poker/rules-schema"],
  allowedDevOrigins: ["10.243.40.171", "localhost"],
};

export default nextConfig;
