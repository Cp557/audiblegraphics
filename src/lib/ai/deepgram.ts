/**
 * Deepgram TTS client and utility functions
 * Uses @deepgram/sdk
 */

import { createClient } from '@deepgram/sdk';
import { writeFile } from 'fs/promises';
import type { AudioOptions } from './types';

/**
 * Initialize Deepgram client with API key
 */
export function createDeepgramClient() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY environment variable is not set');
  }
  return createClient(apiKey);
}

/**
 * Generate TTS audio using Deepgram and save to file
 * @param narration - The text to convert to speech
 * @param outputPath - Where to save the audio file
 * @param options - Audio generation options
 * @returns The output path if successful
 * @throws Error if generation fails
 */
export async function generateDeepgramAudio(
  narration: string,
  outputPath: string,
  options: AudioOptions = {}
): Promise<string> {
  if (!narration || narration.trim() === '') {
    throw new Error('No narration provided');
  }

  const deepgram = createDeepgramClient();

  // Configure speech options
  const speakOptions = {
    model: options.model || 'aura-2-odysseus-en',
    encoding: (options.encoding || 'linear16') as 'linear16',
    container: 'wav' as const,
    sample_rate: options.sampleRate || 24000,
  };

  console.log(`Generating TTS with Deepgram for: ${outputPath}`);

  // Use the Deepgram SDK to convert text to speech
  const response = await deepgram.speak.request(
    { text: narration },
    speakOptions
  );

  // Get the audio stream
  const stream = await response.getStream();
  if (!stream) {
    throw new Error('No audio stream received from Deepgram');
  }

  // Collect the audio data from the stream
  const audioBuffer = await collectStream(stream);

  // Write to file
  await writeFile(outputPath, audioBuffer);

  console.log(`Successfully generated TTS: ${outputPath}`);
  return outputPath;
}

/**
 * Collect data from a readable stream into a buffer
 */
async function collectStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Calculate total length
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

  // Combine all chunks into a single buffer
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(result);
}

/**
 * Create an empty WAV file (for slides with no narration)
 */
export async function createEmptyWav(outputPath: string): Promise<void> {
  // Minimal valid WAV file header (44 bytes + 0 bytes of audio data)
  const emptyWav = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x00, 0x00, 0x00, // Chunk size (36 bytes)
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6d, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // Subchunk1 size (16 bytes)
    0x01, 0x00, // Audio format (1 = PCM)
    0x01, 0x00, // Number of channels (1 = mono)
    0x00, 0x04, 0x00, 0x00, // Sample rate (1024 Hz)
    0x00, 0x04, 0x00, 0x00, // Byte rate
    0x01, 0x00, // Block align
    0x08, 0x00, // Bits per sample (8)
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x00, 0x00, 0x00, // Subchunk2 size (0 bytes)
  ]);

  await writeFile(outputPath, emptyWav);
}
