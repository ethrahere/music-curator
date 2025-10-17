import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow all external images (simplest solution for user-generated content like Farcaster PFPs)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
