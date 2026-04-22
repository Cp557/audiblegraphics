import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { createGeminiClient } from './gemini';
import type { AudioOptions } from './types';
import { ffmpegPath } from '../video/ffmpeg-config';

ffmpeg.setFfmpegPath(ffmpegPath);

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

const DEFAULT_VOICE = 'Achird';
const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE_ALIASES: Record<string, string> = {
  achird: 'Achird',
  archid: 'Achird',
  aoede: 'Aoede',
  charon: 'Charon',
  laomedeia: 'Laomedeia',
};

/**
 * Generate TTS audio using Gemini and save it as an MP3.
 */
export async function generateGeminiTtsAudio(
  narration: string,
  outputPath: string,
  options: AudioOptions = {}
): Promise<string> {
  if (!narration || narration.trim() === '') {
    throw new Error('No narration provided');
  }

  const client = createGeminiClient();
  const voiceName = normalizeVoiceName(options.voice);
  const model = options.model || GEMINI_TTS_MODEL;
  const outputPathMp3 = outputPath.replace(/\.[^.]+$/, '.mp3');

  console.log(`Generating TTS with Gemini voice ${voiceName} for: ${outputPathMp3}`);

  const response = await generateContentWithRetry(() =>
    client.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Synthesize the following transcript as spoken narration.\n\n### TRANSCRIPT\n${narration}`,
            },
          ],
        },
      ],
      config: {
        temperature: 1,
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    })
  );

  const inlineData = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
  if (!inlineData?.data) {
    throw new Error('No audio content received from Gemini');
  }

  const wavBuffer = convertToWav(inlineData.data, inlineData.mimeType || '');
  const tempWavPath = path.join(
    os.tmpdir(),
    `gemini-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`
  );

  try {
    await writeFile(tempWavPath, wavBuffer);
    await convertAudioToMp3(tempWavPath, outputPathMp3);
  } finally {
    await unlink(tempWavPath).catch(() => {});
  }

  console.log(`Successfully generated Gemini TTS: ${outputPathMp3}`);
  return outputPathMp3;
}

function normalizeVoiceName(voice?: string): string {
  if (!voice) return DEFAULT_VOICE;
  return VOICE_ALIASES[voice.toLowerCase()] || voice;
}

function convertToWav(rawData: string, mimeType: string): Buffer {
  const audioBuffer = Buffer.from(rawData, 'base64');
  const options = parseMimeType(mimeType);
  const wavHeader = createWavHeader(audioBuffer.length, options);
  return Buffer.concat([wavHeader, audioBuffer]);
}

function parseMimeType(mimeType: string): WavConversionOptions {
  const [fileType, ...params] = mimeType.split(';').map((s) => s.trim());
  const [, format] = fileType.split('/');

  const options: Partial<WavConversionOptions> = {
    numChannels: 1,
    sampleRate: 24000,
    bitsPerSample: 16,
  };

  if (format && format.startsWith('L')) {
    const bits = Number.parseInt(format.slice(1), 10);
    if (!Number.isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map((s) => s.trim());
    if (key === 'rate') {
      const sampleRate = Number.parseInt(value, 10);
      if (!Number.isNaN(sampleRate)) {
        options.sampleRate = sampleRate;
      }
    }
  }

  return options as WavConversionOptions;
}

function createWavHeader(dataLength: number, options: WavConversionOptions): Buffer {
  const { numChannels, sampleRate, bitsPerSample } = options;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function convertAudioToMp3(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-c:a libmp3lame', '-b:a 128k', '-ar 44100', '-ac 2'])
      .on('error', reject)
      .on('end', () => resolve())
      .save(outputPath);
  });
}

async function generateContentWithRetry<T>(generate: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await generate();
    } catch (error) {
      lastError = error;
      if (attempt === 2 || !isRetryableGeminiTtsError(error)) {
        break;
      }

      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`Gemini TTS request failed. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

function isRetryableGeminiTtsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|500|502|503|504|fetch failed|overloaded|rate/i.test(message);
}
