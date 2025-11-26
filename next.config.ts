import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  // Turbopack config (empty to acknowledge we're using Turbopack)
  turbopack: {},
  // Ensure server components don't bundle these packages
  /* serverExternalPackages: [
    '@ffmpeg-installer/win32-x64',
    '@ffmpeg-installer/linux-x64',
    '@ffprobe-installer/win32-x64',
    '@ffprobe-installer/linux-x64',
  ], */
};

export default nextConfig;
