import { writeFile } from 'fs/promises';
import type { AudioOptions } from './types';

/**
 * Generate TTS audio using Inworld and save to file
 * @param narration - The text to convert to speech
 * @param outputPath - Where to save the audio file
 * @param options - Audio generation options
 * @returns The output path if successful
 * @throws Error if generation fails
 */
export async function generateInworldAudio(
  narration: string,
  outputPath: string,
  options: AudioOptions = {}
): Promise<string> {
  const apiKey = process.env.INWORLD_API_KEY;
  
  if (!apiKey) {
    throw new Error('INWORLD_API_KEY environment variable is not set');
  }

  if (!narration || narration.trim() === '') {
    throw new Error('No narration provided');
  }

  const url = 'https://api.inworld.ai/tts/v1/voice';
  
  console.log(`Generating TTS with Inworld for: ${outputPath}`);

  const requestBody = {
    text: narration,
    voice_id: options.voice || "Craig", // Default to Dennis as per user snippet
    audio_config: {
      audio_encoding: "MP3", // Inworld seems to default to MP3 based on snippet
      speaking_rate: 1,
      ...options
    },
    temperature: 1.1,
    model_id: options.model || "inworld-tts-1"
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errorText = await response.text();
      errorDetails = `: ${errorText}`;
    } catch (e) {
      // Ignore if body cannot be read
    }
    throw new Error(`Inworld TTS API error! status: ${response.status}${errorDetails}`);
  }

  const result = await response.json();
  
  if (!result.audioContent) {
    throw new Error('No audio content received from Inworld');
  }

  const audioBuffer = Buffer.from(result.audioContent, 'base64');
  
  // Since Inworld returns MP3 (based on snippet), and our system might expect WAV (Linear16),
  // we save what we get. The FFmpeg pipeline later should handle MP3 input fine.
  // Ideally we would transcode here if strict WAV requirement exists, 
  // but for now we save directly.
  await writeFile(outputPath, audioBuffer);
  
  console.log(`Successfully generated Inworld TTS: ${outputPath}`);
  return outputPath;
}
