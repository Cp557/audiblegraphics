import { PresentationWithSlides } from '@/lib/supabase/presentations';
import { updateVideoJob } from './job-store';
import { generatePresentationVideo, cleanupFile, VideoGenerationProgress } from './video-generator';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

/**
 * Get the temporary videos directory
 */
function getTempVideosDir(): string {
  return path.join(os.tmpdir(), 'audible-slides-videos');
}

/**
 * Ensure the temp videos directory exists
 */
async function ensureTempVideosDir(): Promise<void> {
  const dir = getTempVideosDir();
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Processes a video generation job in the background
 * This function is designed to be fire-and-forget (async processing)
 */
export async function processVideoJob(
  jobId: string,
  presentation: PresentationWithSlides,
  options: { darkMode: boolean } = { darkMode: false }
): Promise<void> {
  let outputPath: string | null = null;

  try {
    // Update status to processing
    updateVideoJob(jobId, {
      status: 'processing',
      progress: 0,
    });

    // Ensure temp directory exists
    await ensureTempVideosDir();

    // Create temp file for output video in our managed temp directory
    outputPath = path.join(getTempVideosDir(), `${jobId}.mp4`);

    // Generate video with progress tracking
    await generatePresentationVideo(
      presentation.slides,
      outputPath,
      (progress: VideoGenerationProgress) => {
        // Update progress in memory
        updateVideoJob(jobId, {
          progress: progress.progress,
        });
      },
      options
    );

    // Update job status to completed with server endpoint URL
    // The video file stays on the server temporarily
    updateVideoJob(jobId, {
      status: 'completed',
      progress: 100,
      videoUrl: `/api/video-jobs/${jobId}/download`,
      completedAt: new Date(),
    });

    // Note: We don't cleanup the file immediately - it will be cleaned up after download
    // or by a scheduled cleanup task
  } catch (error) {
    console.error('Video generation failed:', error);

    // Update job status to failed
    updateVideoJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });

    // Cleanup temp file if it exists
    if (outputPath) {
      await cleanupFile(outputPath);
    }
  }
}

/**
 * Get the file path for a completed video job
 */
export function getVideoFilePath(jobId: string): string {
  return path.join(getTempVideosDir(), `${jobId}.mp4`);
}

/**
 * Cleanup old video files (for scheduled maintenance)
 * Removes files older than the specified age
 */
export async function cleanupOldVideos(maxAgeMinutes: number = 30): Promise<void> {
  const dir = getTempVideosDir();
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;

  try {
    const files = await fs.readdir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > maxAgeMs) {
        await cleanupFile(filePath);
        console.log(`Cleaned up old video file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old videos:', error);
  }
}

/**
 * Initiates video generation without waiting for completion
 * Returns immediately after starting the job
 */
export function startVideoGeneration(
  jobId: string,
  presentation: PresentationWithSlides,
  options: { darkMode: boolean } = { darkMode: false }
): void {
  // Fire and forget - don't await
  processVideoJob(jobId, presentation, options).catch((error) => {
    console.error('Fatal error in video generation:', error);
  });
}
