import ffmpeg from 'fluent-ffmpeg';
import { ffmpegPath, ffprobePath } from './ffmpeg-config';
import { createSlideFrame, getFrameDimensions } from './frame-generator';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Generates a video from a local image and audio file.
 * The output is written directly to outputPath.
 *
 * @param imagePath - Absolute path to the local image file
 * @param audioPath - Absolute path to the local audio file
 * @param outputPath - Absolute path for the output MP4
 * @param aspectRatio - Video aspect ratio ('16:9' or '9:16')
 */
export async function generatePresentationVideo(
  imagePath: string,
  audioPath: string,
  outputPath: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> {
  console.log(`[generatePresentationVideo] image: ${imagePath}`);
  console.log(`[generatePresentationVideo] audio: ${audioPath}`);
  console.log(`[generatePresentationVideo] output: ${outputPath}`);
  console.log(`[generatePresentationVideo] aspectRatio: ${aspectRatio}`);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-gen-'));

  try {
    const { width, height } = getFrameDimensions(aspectRatio);
    const sizeString = `${width}x${height}`;

    // Render the image into a properly-sized frame
    const frameBuffer = await createSlideFrame(imagePath, aspectRatio);
    const framePath = path.join(tempDir, `frame_${uuidv4()}.jpg`);
    await fs.writeFile(framePath, frameBuffer);

    // Write to a temp file first, then rename atomically to prevent
    // the polling endpoint from serving a partial/corrupt file
    const tmpOutputPath = outputPath + '.tmp';
    await generateSegment(framePath, audioPath, tmpOutputPath, sizeString);
    await fs.rename(tmpOutputPath, outputPath);

    console.log(`[generatePresentationVideo] Completed: ${outputPath}`);
    return outputPath;

  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch((e) =>
      console.warn('[generatePresentationVideo] Failed to cleanup temp dir:', e)
    );
  }
}

/**
 * Combines an image frame and audio file into an MP4 segment using FFmpeg
 */
function generateSegment(
  framePath: string,
  audioPath: string,
  outputPath: string,
  sizeString: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // Loop the still image as video input
    command.input(framePath).loop();
    command.input(audioPath);

    command
      .outputOptions([
        '-f mp4',
        '-c:v libx264',
        '-tune stillimage',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        '-shortest',
        '-movflags +faststart',
      ])
      .size(sizeString)
      .on('start', (cmd) => console.log(`[FFmpeg] ${cmd}`))
      .on('error', (err, _stdout, stderr) => {
        console.error('[FFmpeg] Error:', err.message);
        console.error('[FFmpeg] stderr:', stderr);
        reject(err);
      })
      .on('end', () => {
        console.log(`[FFmpeg] Segment completed: ${outputPath}`);
        resolve();
      })
      .save(outputPath);
  });
}
