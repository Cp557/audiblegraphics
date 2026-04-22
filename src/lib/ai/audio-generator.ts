import { generateGeminiTtsAudio } from './gemini-tts';
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
    throw new Error('No audio sections provided');
  }

  // Create a temporary directory for chunks
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-chunks-'));
  const chunkPaths: string[] = [];

  try {
    // Generate audio for each chunk in parallel
    const chunkPromises = sections.map(async (chunkText, i) => {
      const chunkPath = path.join(tempDir, `chunk_${i.toString().padStart(3, '0')}.mp3`);
      return await generateAudio(chunkText, chunkPath, options);
    });

    const results = await Promise.all(chunkPromises);
    chunkPaths.push(...results);

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
 * Generate audio using Gemini TTS.
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
    throw new Error('No narration text provided');
  }

  return await generateGeminiTtsAudio(narration, outputPath, options);
}

/**
 * Stitch audio files together using FFmpeg
 */
async function stitchAudioFiles(inputPaths: string[], outputPath: string): Promise<void> {
  if (inputPaths.length === 0) return;

  // Path to silence file in public directory
  const silencePath = path.join(process.cwd(), 'public', 'silence.mp3');

  let hasSilence = false;
  try {
    await fs.access(silencePath);
    hasSilence = true;
  } catch {
    console.warn('Silence file not found at:', silencePath);
  }

  // Build the list of files to concatenate
  // Format: [silence, chunk1, silence, chunk2, silence, ...]
  const filesToConcat: string[] = [];

  if (hasSilence) filesToConcat.push(silencePath);

  for (const inputPath of inputPaths) {
    filesToConcat.push(inputPath);
    if (hasSilence) filesToConcat.push(silencePath);
  }

  const concatListPath = path.join(path.dirname(inputPaths[0]), 'concat_list.txt');
  const listContent = filesToConcat
    .map((filePath) => `file '${toFfmpegConcatPath(filePath)}'`)
    .join('\n');
  await fs.writeFile(concatListPath, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c:a libmp3lame', '-b:a 128k', '-ar 44100', '-ac 2'])
      .on('error', (err) => {
        fs.unlink(concatListPath).catch(() => {});
        console.error('FFmpeg concat error:', err);
        reject(err);
      })
      .on('end', () => {
        fs.unlink(concatListPath).catch(() => {});
        resolve();
      })
      .save(outputPath);
  });
}

function toFfmpegConcatPath(filePath: string): string {
  return path.resolve(filePath).replace(/\\/g, '/').replace(/'/g, "'\\''");
}
