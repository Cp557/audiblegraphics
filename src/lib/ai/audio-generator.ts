import { generateInworldAudio } from './inworld';
import { generateDeepgramAudio, createEmptyWav } from './deepgram';
import type { AudioOptions } from './types';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

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
    console.log('No sections provided, creating empty WAV file');
    await createEmptyWav(outputPath);
    return outputPath;
  }

  // Create a temporary directory for chunks
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-chunks-'));
  const chunkPaths: string[] = [];

  try {
    console.log(`Generating audio for ${sections.length} sections...`);

    // Generate audio for each chunk sequentially
    for (let i = 0; i < sections.length; i++) {
      const chunkText = sections[i];
      const chunkPath = path.join(tempDir, `chunk_${i.toString().padStart(3, '0')}.wav`);
      
      console.log(`[Chunk ${i+1}/${sections.length}] Generating (${chunkText.length} chars)...`);
      
      try {
        await generateAudio(chunkText, chunkPath, options);
        chunkPaths.push(chunkPath);
      } catch (error) {
        console.error(`Failed to generate chunk ${i}, skipping:`, error);
        // If a chunk fails, we continue to the next one to salvage what we can
      }
    }

    if (chunkPaths.length === 0) {
      throw new Error('All audio chunks failed to generate');
    }

    // Stitch chunks together
    console.log(`Stitching ${chunkPaths.length} audio chunks...`);
    await stitchWavFiles(chunkPaths, outputPath);
    
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
    console.log('No narration provided, creating empty WAV file');
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
    console.log('Attempting TTS with Deepgram...');
    return await generateDeepgramAudio(narration, outputPath, options);
  } catch (deepgramError) {
    console.error('Deepgram TTS also failed:', deepgramError);
  }

  // Final fallback: empty WAV
  console.log('All TTS providers failed, creating empty WAV file');
  await createEmptyWav(outputPath);
  return outputPath;
}

/**
 * Simple WAV file stitcher
 * Reads headers to find data chunks and concatenates them.
 * Assumes all files have same format (sample rate, channels, etc).
 */
async function stitchWavFiles(inputPaths: string[], outputPath: string) {
  const buffers: Buffer[] = [];
  
  for (const inputPath of inputPaths) {
    const buffer = await fs.readFile(inputPath);
    buffers.push(buffer);
  }

  if (buffers.length === 0) return;

  // Use first file as header template (first 44 bytes usually)
  // This is a simplified approach. For production robustness with mixed formats,
  // use a library like 'wavefile' or ffmpeg.
  const header = buffers[0].subarray(0, 44);
  const dataChunks = buffers.map(b => b.subarray(44));
  
  const totalDataLength = dataChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combinedData = Buffer.concat(dataChunks);

  // Update header size fields
  // RIFF chunk size (file size - 8) at offset 4
  const fileSize = 36 + totalDataLength;
  header.writeUInt32LE(fileSize, 4);
  
  // Data subchunk size at offset 40
  header.writeUInt32LE(totalDataLength, 40);

  const finalBuffer = Buffer.concat([header, combinedData]);
  await fs.writeFile(outputPath, finalBuffer);
}
