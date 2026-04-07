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
    voice_id: options.voice || "Craig", // Default to Craig
    audio_config: {
      audio_encoding: "MP3",
      speaking_rate: 1,
    },
    temperature: 1.1,
    model_id: options.model || "inworld-tts-1-max"
  };

  // Retry logic for 429 Rate Limits
  let retries = 0;
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1 second

  while (true) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const result = await response.json();
      
      if (!result.audioContent) {
        throw new Error('No audio content received from Inworld');
      }

      const audioBuffer = Buffer.from(result.audioContent, 'base64');
      
      // Save as MP3 directly (browsers support this better than WAV)
      // Change output extension if needed
      const outputPathMp3 = outputPath.replace('.wav', '.mp3');
      await writeFile(outputPathMp3, audioBuffer);
      
      console.log(`Successfully generated Inworld TTS: ${outputPathMp3}`);
      return outputPathMp3;
    }

    // Handle 429 Too Many Requests
    if (response.status === 429 && retries < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, retries); // Exponential backoff: 1s, 2s, 4s
      console.warn(`Inworld Rate Limit hit (429). Retrying in ${delay}ms... (Attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
      continue;
    }

    // Handle other errors or max retries exceeded
    let errorDetails = '';
    try {
      const errorText = await response.text();
      errorDetails = `: ${errorText}`;
    } catch (e) {
      // Ignore if body cannot be read
    }
    throw new Error(`Inworld TTS API error! status: ${response.status}${errorDetails}`);
  }
}
