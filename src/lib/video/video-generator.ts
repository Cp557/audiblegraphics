import ffmpeg from 'fluent-ffmpeg';
import { ffmpegPath, ffprobePath } from './ffmpeg-config';
import tmp from 'tmp';
import { promises as fs } from 'fs';
import path from 'path';
import { Slide } from '@/lib/supabase/presentations';
import { createSlideFrame } from './frame-generator';

// Set FFmpeg and FFprobe paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Configure tmp to cleanup automatically
tmp.setGracefulCleanup();

export interface VideoGenerationProgress {
  currentSlide: number;
  totalSlides: number;
  progress: number; // 0-100
  stage: 'downloading' | 'generating' | 'concatenating' | 'complete';
}

export type ProgressCallback = (progress: VideoGenerationProgress) => void;

/**
 * Downloads a file from URL to a temporary file
 */
async function downloadToTempFile(url: string, extension: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const tmpFile = tmp.fileSync({ postfix: extension });
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(tmpFile.name, Buffer.from(arrayBuffer));

  return tmpFile.name;
}

/**
 * Gets the duration of an audio file in seconds
 */
export function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Creates a video segment from a single slide
 */
async function generateSlideVideo(
  slide: Slide,
  frameBuffer: Buffer,
  outputPath: string
): Promise<void> {
  // Save frame to temp file
  const frameTmpFile = tmp.fileSync({ postfix: '.jpg' });
  await fs.writeFile(frameTmpFile.name, frameBuffer);

  return new Promise(async (resolve, reject) => {
    try {
      let duration = 5; // Default duration if no audio

      if (slide.audio_url) {
        // Download audio to temp file
        const audioPath = await downloadToTempFile(slide.audio_url, '.wav');
        duration = await getAudioDuration(audioPath);

        // Create video with audio
        ffmpeg()
          .input(frameTmpFile.name)
          .inputOptions(['-loop 1', '-framerate 30'])
          .input(audioPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-t', duration.toString(),
            '-pix_fmt yuv420p',
            '-preset medium',
            '-tune stillimage',
            '-crf 23',
          ])
          .size('1280x720')
          .on('end', () => {
            // Cleanup
            frameTmpFile.removeCallback();
            fs.unlink(audioPath).catch(() => {});
            resolve();
          })
          .on('error', (err) => {
            frameTmpFile.removeCallback();
            fs.unlink(audioPath).catch(() => {});
            reject(err);
          })
          .save(outputPath);
      } else {
        // Create video without audio (static image for 5 seconds)
        ffmpeg()
          .input(frameTmpFile.name)
          .inputOptions(['-loop 1', '-framerate 30'])
          .videoCodec('libx264')
          .outputOptions([
            '-t', duration.toString(),
            '-pix_fmt yuv420p',
            '-preset medium',
            '-tune stillimage',
            '-crf 23',
          ])
          .size('1280x720')
          .noAudio()
          .on('end', () => {
            frameTmpFile.removeCallback();
            resolve();
          })
          .on('error', (err) => {
            frameTmpFile.removeCallback();
            reject(err);
          })
          .save(outputPath);
      }
    } catch (error) {
      frameTmpFile.removeCallback();
      reject(error);
    }
  });
}

/**
 * Concatenates multiple video files into a single MP4
 */
async function concatenateVideos(videoPaths: string[], outputPath: string): Promise<void> {
  // Create concat file list
  const concatFile = tmp.fileSync({ postfix: '.txt' });
  const concatContent = videoPaths.map((p) => `file '${p}'`).join('\n');
  await fs.writeFile(concatFile.name, concatContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFile.name)
      .inputOptions(['-f concat', '-safe 0'])
      .videoCodec('copy')
      .audioCodec('copy')
      .on('end', () => {
        concatFile.removeCallback();
        resolve();
      })
      .on('error', (err) => {
        concatFile.removeCallback();
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Generates a complete video from all slides
 */
export async function generatePresentationVideo(
  slides: Slide[],
  outputPath: string,
  onProgress?: ProgressCallback,
  options: { darkMode: boolean } = { darkMode: false }
): Promise<void> {
  const segmentPaths: string[] = [];
  const totalSlides = slides.length;

  try {
    // Generate video segments for each slide
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];

      // Report progress: downloading assets
      if (onProgress) {
        onProgress({
          currentSlide: i + 1,
          totalSlides,
          progress: Math.floor((i / totalSlides) * 80), // Reserve 0-80% for generation
          stage: 'generating',
        });
      }

      // Create frame for this slide
      const frameBuffer = await createSlideFrame({ 
        slide,
        darkMode: options.darkMode 
      });

      // Generate video segment
      const segmentPath = tmp.tmpNameSync({ postfix: '.mp4' });
      await generateSlideVideo(slide, frameBuffer, segmentPath);
      segmentPaths.push(segmentPath);
    }

    // Report progress: concatenating
    if (onProgress) {
      onProgress({
        currentSlide: totalSlides,
        totalSlides,
        progress: 85,
        stage: 'concatenating',
      });
    }

    // Concatenate all segments
    if (segmentPaths.length === 1) {
      // Single slide - just copy the file
      await fs.copyFile(segmentPaths[0], outputPath);
    } else {
      // Multiple slides - concatenate
      await concatenateVideos(segmentPaths, outputPath);
    }

    // Report progress: complete
    if (onProgress) {
      onProgress({
        currentSlide: totalSlides,
        totalSlides,
        progress: 100,
        stage: 'complete',
      });
    }
  } finally {
    // Cleanup all segment files
    await Promise.all(
      segmentPaths.map((p) => fs.unlink(p).catch(() => {}))
    );
  }
}

/**
 * Cleanup utility to remove a file
 */
export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Failed to cleanup file:', error);
  }
}
