import { PresentationWithSlides, updatePresentationVideoUrl } from '@/lib/supabase/presentations';
import { updateVideoJob } from './job-store';
import { generatePresentationVideo, cleanupFile, VideoGenerationProgress } from './video-generator';
import { uploadPresentationVideo } from '@/lib/supabase/storage';
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
 * Generates video, uploads to Supabase, and saves URL to database
 */
export async function processVideoJob(
  jobId: string,
  presentation: PresentationWithSlides,
  userId: string
): Promise<void> {
  let outputPath: string | null = null;

  console.log(`[VideoJob ${jobId}] Starting video generation for presentation ${presentation.id}`);
  console.log(`[VideoJob ${jobId}] User: ${userId}`);
  console.log(`[VideoJob ${jobId}] Slides count: ${presentation.slides?.length || 0}`);

  try {
    // Update status to processing
    updateVideoJob(jobId, {
      status: 'processing',
      progress: 0,
    });

    // Ensure temp directory exists
    console.log(`[VideoJob ${jobId}] Creating temp directory...`);
    await ensureTempVideosDir();
    console.log(`[VideoJob ${jobId}] Temp directory: ${getTempVideosDir()}`);

    // Create temp file for output video in our managed temp directory
    outputPath = path.join(getTempVideosDir(), `${jobId}.mp4`);
    console.log(`[VideoJob ${jobId}] Output path: ${outputPath}`);

    // Generate video with progress tracking
    console.log(`[VideoJob ${jobId}] Starting FFmpeg video generation...`);
    await generatePresentationVideo(
      presentation.slides,
      outputPath,
      (progress: VideoGenerationProgress) => {
        // Update progress in memory
        updateVideoJob(jobId, {
          progress: progress.progress,
        });
        console.log(`[VideoJob ${jobId}] Progress: ${progress.progress}% - ${progress.stage}`);
      }
    );
    console.log(`[VideoJob ${jobId}] FFmpeg video generation completed`);

    // Check if output file exists
    try {
      const stats = await fs.stat(outputPath);
      console.log(`[VideoJob ${jobId}] Output file size: ${stats.size} bytes`);
    } catch (statError) {
      console.error(`[VideoJob ${jobId}] Output file does not exist!`, statError);
      throw new Error('Video file was not created');
    }

    // Upload video to Supabase storage
    updateVideoJob(jobId, {
      progress: 90,
    });
    
    console.log(`[VideoJob ${jobId}] Uploading video to Supabase...`);
    const uploadResult = await uploadPresentationVideo(outputPath, userId, presentation.id);
    console.log(`[VideoJob ${jobId}] Upload complete: ${uploadResult.path}`);
    
    // Save video URL to presentations table
    console.log(`[VideoJob ${jobId}] Saving video URL to database...`);
    await updatePresentationVideoUrl(presentation.id, userId, uploadResult.url);
    console.log(`[VideoJob ${jobId}] Video URL saved to database`);

    // Update job status to completed with the Supabase URL
    updateVideoJob(jobId, {
      status: 'completed',
      progress: 100,
      videoUrl: uploadResult.url,
      completedAt: new Date(),
    });

    // Cleanup temp file now that it's uploaded
    console.log(`[VideoJob ${jobId}] Cleaning up temp file...`);
    await cleanupFile(outputPath);
    console.log(`[VideoJob ${jobId}] Job completed successfully!`);
    
  } catch (error) {
    console.error(`[VideoJob ${jobId}] FAILED:`, error);
    console.error(`[VideoJob ${jobId}] Error stack:`, error instanceof Error ? error.stack : 'No stack');

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
  userId: string
): void {
  // Fire and forget - don't await
  processVideoJob(jobId, presentation, userId).catch((error) => {
    console.error('Fatal error in video generation:', error);
  });
}
