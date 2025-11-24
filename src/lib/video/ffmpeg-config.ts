/**
 * FFmpeg configuration - platform-specific binary paths
 *
 * Dynamically selects the correct FFmpeg binaries based on the platform.
 */

import path from 'path';
import os from 'os';

// Detect platform
const platform = os.platform();
const arch = os.arch();

let ffmpegPath = '';
let ffprobePath = '';

// Manually construct paths based on platform
// This avoids require() calls that Next.js can't resolve at build time
if (platform === 'win32') {
  // Windows paths
  ffmpegPath = path.join(
    process.cwd(),
    'node_modules',
    '@ffmpeg-installer',
    'win32-x64',
    'ffmpeg.exe'
  );
  ffprobePath = path.join(
    process.cwd(),
    'node_modules',
    '@ffprobe-installer',
    'win32-x64',
    'ffprobe.exe'
  );
} else if (platform === 'linux') {
  // Linux paths (Vercel)
  ffmpegPath = path.join(
    process.cwd(),
    'node_modules',
    '@ffmpeg-installer',
    'linux-x64',
    'ffmpeg'
  );
  ffprobePath = path.join(
    process.cwd(),
    'node_modules',
    '@ffprobe-installer',
    'linux-x64',
    'ffprobe'
  );
} else if (platform === 'darwin') {
  // macOS paths (if needed in the future)
  ffmpegPath = path.join(
    process.cwd(),
    'node_modules',
    '@ffmpeg-installer',
    'darwin-x64',
    'ffmpeg'
  );
  ffprobePath = path.join(
    process.cwd(),
    'node_modules',
    '@ffprobe-installer',
    'darwin-x64',
    'ffprobe'
  );
} else {
  // Fallback to system PATH
  console.warn(`Unsupported platform: ${platform}-${arch}, falling back to system FFmpeg`);
  ffmpegPath = 'ffmpeg';
  ffprobePath = 'ffprobe';
}

export { ffmpegPath, ffprobePath };
