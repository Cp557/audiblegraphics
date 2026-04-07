import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ['ffmpeg-static', 'ffprobe-static', 'fluent-ffmpeg'],
};

export default nextConfig;
