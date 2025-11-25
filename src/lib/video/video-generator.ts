import ffmpeg from 'fluent-ffmpeg';
import { ffmpegPath, ffprobePath } from './ffmpeg-config';
import { Slide } from '@/lib/supabase/presentations';
import { createSlideFrame } from './frame-generator';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Set FFmpeg paths
console.log(`[VideoGenerator] Setting ffmpeg path: ${ffmpegPath}`);
console.log(`[VideoGenerator] Setting ffprobe path: ${ffprobePath}`);
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export interface VideoGenerationProgress {
  progress: number;
  stage: string;
}

export type ProgressCallback = (progress: VideoGenerationProgress) => void;

/**
 * Generates a video from a list of slides
 * Each slide has an image and audio
 */
export async function generatePresentationVideo(
  slides: Slide[],
  outputPath: string,
  onProgress?: ProgressCallback
): Promise<string> {
  console.log(`[generatePresentationVideo] Starting with ${slides?.length || 0} slides`);
  console.log(`[generatePresentationVideo] Output path: ${outputPath}`);
  
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-gen-'));
  console.log(`[generatePresentationVideo] Temp dir: ${tempDir}`);
  
  const segmentPaths: string[] = [];

  try {
    // 1. Validate inputs
    if (!slides || slides.length === 0) {
      throw new Error('No slides provided for video generation');
    }

    console.log(`[generatePresentationVideo] Starting video generation for ${slides.length} slides`);
    if (onProgress) onProgress({ progress: 0, stage: 'initializing' });

    // 2. Generate video segment for each slide
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const progress = Math.round((i / slides.length) * 80); // First 80% is segment generation
      
      if (onProgress) {
        onProgress({ 
          progress, 
          stage: `Processing slide ${i + 1}/${slides.length}` 
        });
      }

      // Skip slides without audio or image content if necessary, 
      // but usually we want to generate something even if empty.
      // For now assuming valid slides.

      const segmentPath = path.join(tempDir, `segment_${i}.mp4`);
      await generateSlideSegment(slide, segmentPath, tempDir);
      segmentPaths.push(segmentPath);
    }

    // 3. Concatenate segments
    if (onProgress) onProgress({ progress: 80, stage: 'Concatenating segments' });
    
    if (segmentPaths.length === 1) {
      // If only one segment, just copy it to output
      await fs.copyFile(segmentPaths[0], outputPath);
    } else {
      await concatenateVideos(segmentPaths, outputPath);
    }

    if (onProgress) onProgress({ progress: 100, stage: 'Completed' });
    console.log(`Video generation completed: ${outputPath}`);
    
    return outputPath;

  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to cleanup temp dir:', e);
    }
  }
}

/**
 * Generates a single video segment for a slide
 * Combines the generated frame image with the slide's audio
 */
async function generateSlideSegment(
  slide: Slide,
  outputPath: string,
  tempDir: string
): Promise<void> {
  console.log(`[generateSlideSegment] Processing slide: ${slide.id}`);
  console.log(`[generateSlideSegment] Slide image_url: ${slide.image_url}`);
  console.log(`[generateSlideSegment] Slide audio_url: ${slide.audio_url}`);
  
  // 1. Generate the slide image frame
  console.log(`[generateSlideSegment] Creating slide frame...`);
  const frameBuffer = await createSlideFrame({ slide });
  const imagePath = path.join(tempDir, `frame_${uuidv4()}.png`);
  await fs.writeFile(imagePath, frameBuffer);
  console.log(`[generateSlideSegment] Frame saved to: ${imagePath}`);

  // 2. Get audio path
  // Assuming slide.audio_url is a public URL. FFmpeg can usually handle URLs.
  // However, for better reliability/performance, we might want to download it.
  // Given the previous "Inworld" fix, the audio might be local or remote.
  // If it's a URL, we pass it directly. If it's null, we generate silence.
  
  console.log(`[generateSlideSegment] Starting FFmpeg command...`);
  
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // Add Image Input (Loop it)
    command.input(imagePath).loop();

    // Add Audio Input
    if (slide.audio_url) {
      console.log(`[generateSlideSegment] Adding audio input: ${slide.audio_url}`);
      command.input(slide.audio_url);
      
      // Output options:
      // -c:v libx264: Use H.264 codec for video
      // -tune stillimage: Optimize for static images
      // -c:a aac: Use AAC codec for audio
      // -b:a 192k: Audio bitrate
      // -pix_fmt yuv420p: Ensure compatibility with most players
      // -shortest: Finish encoding when the shortest input (audio) ends
      command
        .outputOptions([
          '-c:v libx264',
          '-tune stillimage',
          '-c:a aac',
          '-b:a 192k',
          '-pix_fmt yuv420p',
          '-shortest',
          '-movflags +faststart'
        ])
        // Force 16:9 aspect ratio if not already
        .size('1280x720');
    } else {
      // Silent slide case (default 5 seconds)
      const duration = 5;
      command
        .input('anullsrc=channel_layout=stereo:sample_rate=44100')
        .inputFormat('lavfi')
        .duration(duration)
        .outputOptions([
          '-c:v libx264',
          '-tune stillimage',
          '-c:a aac',
          '-pix_fmt yuv420p',
          '-movflags +faststart'
        ])
        .size('1280x720');
    }

    command
      .on('start', (commandLine) => {
        console.log(`[generateSlideSegment] FFmpeg command: ${commandLine}`);
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`[generateSlideSegment] FFmpeg error:`, err);
        console.error(`[generateSlideSegment] FFmpeg stderr:`, stderr);
        reject(err);
      })
      .on('end', () => {
        console.log(`[generateSlideSegment] Segment completed: ${outputPath}`);
        resolve();
      })
      .save(outputPath);
  });
}

/**
 * Concatenates multiple video files into one
 */
async function concatenateVideos(inputPaths: string[], outputPath: string): Promise<void> {
  // Create a list file for ffmpeg concat demuxer
  const listContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  const listPath = path.join(path.dirname(inputPaths[0]), 'concat_list.txt');
  
  await fs.writeFile(listPath, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy', '-movflags +faststart'])
      .on('error', (err) => {
        console.error('FFmpeg concat error:', err);
        reject(err);
      })
      .on('end', () => {
        resolve();
      })
      .save(outputPath);
  });
}

/**
 * Helper to delete a file
 */
export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
    console.warn(`Failed to delete file ${filePath}:`, error);
  }
}
