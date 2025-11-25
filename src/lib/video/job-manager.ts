import { PresentationWithSlides, updatePresentationVideoUrl } from '@/lib/supabase/presentations';
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
 * Processes a video generation job
 * Generates video, uploads to Supabase, and saves URL to database
 * 
 * This function should be called within after() to ensure the serverless
 * function stays alive until completion.
 */
export async function processVideoJob(
  jobId: string,
  presentation: PresentationWithSlides,
  userId: string
): Promise<void> {
  let outputPath: string | null = null;

  try {
    // Ensure temp directory exists
    await ensureTempVideosDir();

    // Create temp file for output video in our managed temp directory
    outputPath = path.join(getTempVideosDir(), `${jobId}.mp4`);

    // Generate video
    await generatePresentationVideo(
      presentation.slides,
      outputPath,
      () => {} // Progress callback (no-op for production)
    );

    // Check if output file exists
    try {
      await fs.stat(outputPath);
    } catch (statError) {
      console.error(`[VideoJob ${jobId}] Output file does not exist!`, statError);
      throw new Error('Video file was not created');
    }

    // Upload video to Supabase storage
    const uploadResult = await uploadPresentationVideo(outputPath, userId, presentation.id);
    
    // Save video URL to presentations table
    await updatePresentationVideoUrl(presentation.id, userId, uploadResult.url);

    // Cleanup temp file now that it's uploaded
    await cleanupFile(outputPath);
    
  } catch (error) {
    console.error(`[VideoJob ${jobId}] FAILED:`, error);

    // Cleanup temp file if it exists
    if (outputPath) {
      await cleanupFile(outputPath);
    }
    
    // Re-throw so the caller (after()) knows it failed
    throw error;
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
      }
    }
  } catch (error) {
    console.error('Error cleaning up old videos:', error);
  }
}
