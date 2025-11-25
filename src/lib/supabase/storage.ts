/**
 * Supabase Storage utilities for slideshow files
 * Handles uploading images and audio to storage buckets
 */

import { readFile, rm } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

// Create admin client for storage operations (bypasses RLS during upload)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload an image file to the slide-images bucket
 * @param filePath - Local file path to upload
 * @param userId - User ID for folder organization
 * @param presentationId - Presentation ID for folder organization
 * @param slideId - Slide ID for filename
 * @returns Storage URL and path
 */
export async function uploadSlideImage(
  filePath: string,
  userId: string,
  presentationId: string,
  slideId: string
): Promise<UploadResult> {
  try {
    // Read file from local filesystem
    const fileBuffer = await readFile(filePath);

    // Construct storage path: {user_id}/{presentation_id}/{slide_id}.jpg
    const storagePath = `${userId}/${presentationId}/${slideId}.jpg`;

    // Upload to slide-images bucket
    const { data, error } = await supabaseAdmin.storage
      .from('slide-images')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get signed URL (for private buckets with RLS)
    // Expires in 1 year (max allowed)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('slide-images')
      .createSignedUrl(storagePath, 31536000); // 1 year in seconds

    if (urlError) {
      throw new Error(`Failed to create signed URL: ${urlError.message}`);
    }

    return {
      url: urlData.signedUrl,
      path: storagePath,
    };
  } catch (error) {
    console.error(`Error uploading image from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Upload an audio file to the slide-audio bucket
 * @param filePath - Local file path to upload
 * @param userId - User ID for folder organization
 * @param presentationId - Presentation ID for folder organization
 * @param slideId - Slide ID for filename
 * @returns Storage URL and path
 */
export async function uploadSlideAudio(
  filePath: string,
  userId: string,
  presentationId: string,
  slideId: string
): Promise<UploadResult> {
  try {
    // Read file from local filesystem
    const fileBuffer = await readFile(filePath);

    // Determine file extension and content type
    // Currently supports .wav, but can be extended for .mp3
    const ext = filePath.endsWith('.wav') ? 'wav' : 'mp3';
    const contentType = ext === 'wav' ? 'audio/wav' : 'audio/mpeg';

    // Construct storage path: {user_id}/{presentation_id}/{slide_id}.{ext}
    const storagePath = `${userId}/${presentationId}/${slideId}.${ext}`;

    // Upload to slide-audio bucket
    const { data, error } = await supabaseAdmin.storage
      .from('slide-audio')
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw new Error(`Failed to upload audio: ${error.message}`);
    }

    // Get signed URL (for private buckets with RLS)
    // Expires in 1 year (max allowed)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('slide-audio')
      .createSignedUrl(storagePath, 31536000); // 1 year in seconds

    if (urlError) {
      throw new Error(`Failed to create signed URL: ${urlError.message}`);
    }

    return {
      url: urlData.signedUrl,
      path: storagePath,
    };
  } catch (error) {
    console.error(`Error uploading audio from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Upload a video file to the presentation-videos bucket
 * @param filePath - Local file path to upload
 * @param userId - User ID for folder organization
 * @param presentationId - Presentation ID for folder organization
 * @returns Storage URL and path
 */
export async function uploadPresentationVideo(
  filePath: string,
  userId: string,
  presentationId: string
): Promise<UploadResult> {
  try {
    // Read file from local filesystem
    const fileBuffer = await readFile(filePath);

    // Construct storage path: {user_id}/{presentation_id}/video.mp4
    const storagePath = `${userId}/${presentationId}/video.mp4`;

    // Upload to presentation-videos bucket
    const { data, error } = await supabaseAdmin.storage
      .from('presentation-videos')
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    // Get signed URL (for private buckets with RLS)
    // Expires in 1 year (max allowed)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('presentation-videos')
      .createSignedUrl(storagePath, 31536000); // 1 year in seconds

    if (urlError) {
      throw new Error(`Failed to create signed URL: ${urlError.message}`);
    }

    return {
      url: urlData.signedUrl,
      path: storagePath,
    };
  } catch (error) {
    console.error(`Error uploading video from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete all files for a presentation
 * @param userId - User ID
 * @param presentationId - Presentation ID
 */
export async function deletePresentation(
  userId: string,
  presentationId: string
): Promise<void> {
  try {
    const folderPath = `${userId}/${presentationId}`;

    // List all files in the presentation folder for images
    const { data: imageFiles } = await supabaseAdmin.storage
      .from('slide-images')
      .list(folderPath);

    // List all files in the presentation folder for audio
    const { data: audioFiles } = await supabaseAdmin.storage
      .from('slide-audio')
      .list(folderPath);

    // Delete images
    if (imageFiles && imageFiles.length > 0) {
      const imagePaths = imageFiles.map((file) => `${folderPath}/${file.name}`);
      const { error: imageError } = await supabaseAdmin.storage
        .from('slide-images')
        .remove(imagePaths);

      if (imageError) {
        console.error('Error deleting images:', imageError);
      }
    }

    // Delete audio files
    if (audioFiles && audioFiles.length > 0) {
      const audioPaths = audioFiles.map((file) => `${folderPath}/${file.name}`);
      const { error: audioError } = await supabaseAdmin.storage
        .from('slide-audio')
        .remove(audioPaths);

      if (audioError) {
        console.error('Error deleting audio files:', audioError);
      }
    }

    // List all files in the presentation folder for videos
    const { data: videoFiles } = await supabaseAdmin.storage
      .from('presentation-videos')
      .list(folderPath);

    // Delete video files
    if (videoFiles && videoFiles.length > 0) {
      const videoPaths = videoFiles.map((file) => `${folderPath}/${file.name}`);
      const { error: videoError } = await supabaseAdmin.storage
        .from('presentation-videos')
        .remove(videoPaths);

      if (videoError) {
        console.error('Error deleting video files:', videoError);
      }
    }
  } catch (error) {
    console.error('Error deleting presentation files:', error);
    throw error;
  }
}

/**
 * Clean up temporary local files after upload
 * @param directoryPath - Path to temp directory to remove
 */
export async function cleanupTempFiles(directoryPath: string): Promise<void> {
  try {
    await rm(directoryPath, { recursive: true, force: true });
    console.log(`✓ Cleaned up temp directory: ${directoryPath}`);
  } catch (error) {
    console.error(`Error cleaning up temp files at ${directoryPath}:`, error);
    // Don't throw - cleanup failure shouldn't break the flow
  }
}
