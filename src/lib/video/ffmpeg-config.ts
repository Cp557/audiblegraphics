/**
 * FFmpeg configuration - platform-specific binary paths
 *
 * Dynamically selects the correct FFmpeg binaries based on the platform.
 */

import path from 'path';
import os from 'os';
import { existsSync } from 'fs';

// Detect platform
const platform = os.platform();
const arch = os.arch();

console.log(`[FFmpeg Config] Platform: ${platform}, Arch: ${arch}`);
console.log(`[FFmpeg Config] process.cwd(): ${process.cwd()}`);

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
  console.warn(`[FFmpeg Config] Unsupported platform: ${platform}-${arch}, falling back to system FFmpeg`);
  ffmpegPath = 'ffmpeg';
  ffprobePath = 'ffprobe';
}

// Log the paths and check if they exist
console.log(`[FFmpeg Config] ffmpegPath: ${ffmpegPath}`);
console.log(`[FFmpeg Config] ffprobePath: ${ffprobePath}`);
console.log(`[FFmpeg Config] ffmpeg exists: ${existsSync(ffmpegPath)}`);
console.log(`[FFmpeg Config] ffprobe exists: ${existsSync(ffprobePath)}`);

export { ffmpegPath, ffprobePath };
