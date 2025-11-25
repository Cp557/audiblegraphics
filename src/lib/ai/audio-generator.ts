import { generateInworldAudio } from './inworld';
import { generateDeepgramAudio, createEmptyWav } from './deepgram';
import type { AudioOptions } from './types';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { ffmpegPath } from '../video/ffmpeg-config';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Generate audio from a list of text sections and stitch them together.
 * Useful for bypassing TTS character limits (e.g., 2000 chars).
 * 
 * @param sections - Array of text sections to speak
 * @param outputPath - Path to save the final stitched audio file
 * @param options - Audio generation options
 * @returns Path to the generated audio file
 */
export async function generateAudioFromSections(
  sections: string[],
  outputPath: string,
  options: AudioOptions = {}
): Promise<string> {
  if (!sections || sections.length === 0) {
    await createEmptyWav(outputPath);
    return outputPath;
  }

  // Create a temporary directory for chunks
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-chunks-'));
  const chunkPaths: string[] = [];

  try {
    // Generate audio for each chunk in parallel
    const chunkPromises = sections.map(async (chunkText, i) => {
      const chunkPath = path.join(tempDir, `chunk_${i.toString().padStart(3, '0')}.mp3`);
      
      try {
        return await generateAudio(chunkText, chunkPath, options);
      } catch (error) {
        console.error(`Failed to generate chunk ${i}, skipping:`, error);
        return null;
      }
    });

    const results = await Promise.all(chunkPromises);
    // Filter out nulls (failed chunks)
    chunkPaths.push(...results.filter((p): p is string => p !== null));

    if (chunkPaths.length === 0) {
      throw new Error('All audio chunks failed to generate');
    }

    // Stitch chunks together
    await stitchAudioFiles(chunkPaths, outputPath);
    
    return outputPath;

  } finally {
    // Cleanup temp files
    try {
      await Promise.all(chunkPaths.map(p => fs.unlink(p).catch(() => {})));
      await fs.rmdir(tempDir).catch(() => {});
    } catch (e) {
      console.warn('Failed to cleanup temp audio files:', e);
    }
  }
}

/**
 * Generate audio using Inworld as primary provider and Deepgram as fallback.
 * If both fail, creates an empty WAV file.
 * 
 * @param narration - Text to speak
 * @param outputPath - Path to save the audio file
 * @param options - Audio generation options
 * @returns Path to the generated audio file
 */
export async function generateAudio(
  narration: string,
  outputPath: string,
  options: AudioOptions = {}
): Promise<string> {
  if (!narration || narration.trim() === '') {
    await createEmptyWav(outputPath);
    return outputPath;
  }

  // Try Inworld first
  try {
    // console.log('Attempting TTS with Inworld...');
    return await generateInworldAudio(narration, outputPath, options);
  } catch (inworldError) {
    console.warn('Inworld TTS failed, falling back to Deepgram:', inworldError);
  }

  // Fallback to Deepgram
  try {
    return await generateDeepgramAudio(narration, outputPath, options);
  } catch (deepgramError) {
    console.error('Deepgram TTS also failed:', deepgramError);
  }

  // Final fallback: empty WAV
  await createEmptyWav(outputPath);
  return outputPath;
}

/**
 * Stitch audio files together using FFmpeg
 * Works with both MP3 and WAV files
 */
async function stitchAudioFiles(inputPaths: string[], outputPath: string): Promise<void> {
  if (inputPaths.length === 0) return;

  // Path to silence file in public directory
  // We use process.cwd() to find it relative to project root
  const silencePath = path.join(process.cwd(), 'public', 'silence.mp3');
  
  // Check if silence file exists, if not, we'll skip adding silence
  let hasSilence = false;
  try {
    await fs.access(silencePath);
    hasSilence = true;
  } catch (e) {
    console.warn('Silence file not found at:', silencePath);
  }

  // Build the list of files to concatenate
  // Format: [silence, chunk1, silence, chunk2, silence, ...]
  const filesToConcat: string[] = [];
  
  if (hasSilence) {
    filesToConcat.push(silencePath);
  }
  
  for (let i = 0; i < inputPaths.length; i++) {
    filesToConcat.push(inputPaths[i]);
    // Add silence after every chunk (including the last one)
    if (hasSilence) {
      filesToConcat.push(silencePath);
    }
  }

  // Create a concat list file for ffmpeg
  // If we only have one chunk and no silence, this logic still holds fine (just one entry)
  const concatListPath = path.join(path.dirname(inputPaths[0]), 'concat_list.txt');
  const listContent = filesToConcat.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(concatListPath, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c:a libmp3lame', '-b:a 128k', '-ar 44100', '-ac 2'])
      .on('error', (err) => {
        console.error('FFmpeg concat error:', err);
        reject(err);
      })
      .on('end', () => {
        // Cleanup concat list file
        fs.unlink(concatListPath).catch(() => {});
        resolve();
      })
      .save(outputPath);
  });
}
