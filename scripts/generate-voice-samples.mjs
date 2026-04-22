import { GoogleGenAI } from '@google/genai';
import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'public', 'voice-samples');
const model = 'gemini-3.1-flash-tts-preview';
const sampleText = 'Jupiter is the largest planet in the Solar System';
const voices = ['Achird', 'Aoede', 'Charon', 'Laomedeia'];

const shellGeminiApiKey = process.env.GEMINI_API_KEY;
await loadEnvFile(path.join(repoRoot, '.env'));
await loadEnvFile(path.join(repoRoot, '.env.local'));
if (shellGeminiApiKey) {
  process.env.GEMINI_API_KEY = shellGeminiApiKey;
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

await mkdir(outputDir, { recursive: true });

for (const voiceName of voices) {
  const outputPath = path.join(outputDir, `${voiceName}.mp3`);
  const tempWavPath = path.join(os.tmpdir(), `voice-sample-${voiceName}-${Date.now()}.wav`);

  console.log(`Generating ${voiceName} sample...`);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Synthesize the following transcript as spoken narration.\n\n### TRANSCRIPT\n${sampleText}`,
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
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
    if (!inlineData?.data) {
      throw new Error(`No audio content received for ${voiceName}`);
    }

    await writeFile(tempWavPath, convertToWav(inlineData.data, inlineData.mimeType || ''));
    await convertAudioToMp3(tempWavPath, outputPath);

    console.log(`Saved ${outputPath}`);
  } finally {
    await unlink(tempWavPath).catch(() => {});
  }
}

function convertToWav(rawData, mimeType) {
  const audioBuffer = Buffer.from(rawData, 'base64');
  const options = parseMimeType(mimeType);
  const wavHeader = createWavHeader(audioBuffer.length, options);
  return Buffer.concat([wavHeader, audioBuffer]);
}

function parseMimeType(mimeType) {
  const [fileType, ...params] = mimeType.split(';').map((s) => s.trim());
  const [, format] = fileType.split('/');

  const options = {
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

  return options;
}

function createWavHeader(dataLength, options) {
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

function convertAudioToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-c:a libmp3lame', '-b:a 128k', '-ar 44100', '-ac 2'])
      .on('error', reject)
      .on('end', resolve)
      .save(outputPath);
  });
}

async function loadEnvFile(filePath) {
  let content = '';
  try {
    content = await readFile(filePath, 'utf8');
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!key) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}
