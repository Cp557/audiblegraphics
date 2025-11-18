/**
 * FFmpeg configuration - platform-specific binary paths
 *
 * The installer packages don't export paths, so we manually construct them.
 * For production deployment on different platforms, update the paths below.
 */

import path from 'path';

// Manually construct the path to the FFmpeg binary
// Current platform: Windows x64
const ffmpegPath = path.join(
  process.cwd(),
  'node_modules',
  '@ffmpeg-installer',
  'win32-x64',
  'ffmpeg.exe'
);

// Manually construct the path to the FFprobe binary
const ffprobePath = path.join(
  process.cwd(),
  'node_modules',
  '@ffprobe-installer',
  'win32-x64',
  'ffprobe.exe'
);

export { ffmpegPath, ffprobePath };

/**
 * For production on different platforms:
 *
 * Linux (install @ffmpeg-installer/linux-x64 and @ffprobe-installer/linux-x64):
 * const ffmpegPath = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'linux-x64', 'ffmpeg');
 * const ffprobePath = path.join(process.cwd(), 'node_modules', '@ffprobe-installer', 'linux-x64', 'ffprobe');
 *
 * macOS Intel (install @ffmpeg-installer/darwin-x64 and @ffprobe-installer/darwin-x64):
 * const ffmpegPath = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'darwin-x64', 'ffmpeg');
 * const ffprobePath = path.join(process.cwd(), 'node_modules', '@ffprobe-installer', 'darwin-x64', 'ffprobe');
 *
 * macOS Apple Silicon (install @ffmpeg-installer/darwin-arm64 and @ffprobe-installer/darwin-arm64):
 * const ffmpegPath = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'darwin-arm64', 'ffmpeg');
 * const ffprobePath = path.join(process.cwd(), 'node_modules', '@ffprobe-installer', 'darwin-arm64', 'ffprobe');
 */

/**
 * Alternative: Dynamic platform detection (requires installing all platform packages)
 *
 * Uncomment this section and install all platform-specific packages if you need
 * cross-platform compatibility in development:
 *
 * export function getFfmpegPath(): string {
 *   const platform = process.platform;
 *   const arch = process.arch;
 *
 *   try {
 *     if (platform === 'win32' && arch === 'x64') {
 *       return require('@ffmpeg-installer/win32-x64').path;
 *     } else if (platform === 'linux' && arch === 'x64') {
 *       return require('@ffmpeg-installer/linux-x64').path;
 *     } else if (platform === 'darwin' && arch === 'x64') {
 *       return require('@ffmpeg-installer/darwin-x64').path;
 *     } else if (platform === 'darwin' && arch === 'arm64') {
 *       return require('@ffmpeg-installer/darwin-arm64').path;
 *     } else {
 *       throw new Error(`Unsupported platform: ${platform}-${arch}`);
 *     }
 *   } catch (error) {
 *     throw new Error(`FFmpeg binary not installed for platform: ${platform}-${arch}`);
 *   }
 * }
 *
 * export const ffmpegPath = getFfmpegPath();
 */
