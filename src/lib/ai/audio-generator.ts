import { generateInworldAudio } from './inworld';
import { generateDeepgramAudio, createEmptyWav } from './deepgram';
import type { AudioOptions } from './types';

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
    console.log('Attempting TTS with Inworld...');
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

