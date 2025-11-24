/**
 * FFmpeg configuration - platform-specific binary paths
 *
 * Dynamically selects the correct FFmpeg binaries based on the platform.
 * Safe to import in Edge Runtime (will use fallback values).
 */

let ffmpegPath = '';
let ffprobePath = '';

// Wrap initialization in try-catch to handle Edge Runtime where Node.js APIs aren't available
try {
  // Only run if we're in Node.js runtime (not Edge)
  if (typeof process !== 'undefined' && process.versions?.node) {
    const path = require('path');
    const os = require('os');

    // Detect platform
    const platform = os.platform();
    const arch = os.arch();

    // Manually construct paths based on platform
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
      // macOS paths
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
  }
} catch (error) {
  // Silently fail in Edge Runtime - FFmpeg won't be available there anyway
  console.warn('FFmpeg config initialization failed (likely Edge Runtime):', error);
  ffmpegPath = 'ffmpeg';
  ffprobePath = 'ffprobe';
}

export { ffmpegPath, ffprobePath };
