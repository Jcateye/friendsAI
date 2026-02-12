import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@assistant-ui/react', '@assistant-ui/react-markdown'],
  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
