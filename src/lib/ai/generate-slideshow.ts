/**
 * Main infographic generation orchestrator
 * Coordinates Gemini APIs to create complete presentations
 */

import path from 'path';
import os from 'os';
import { mkdir, readFile, rm } from 'fs/promises';
import { validateTopic, generateInfographicContent, generateImage, sanitizeSpeakerNotes, GeminiImageSafetyError } from './gemini';
import { generateAudioFromSections } from './audio-generator';

export interface GenerationResult {
  title: string;
  speakerNotes: string;
  image: Buffer;
  audio: Buffer;
}

/**
 * Generate a complete infographic with audio for a given topic.
 * @param topic - The topic to generate an infographic about
 * @param presentationId - A unique ID used for temporary paths
 * @param voice - Optional TTS voice name
 * @param aspectRatio - Image aspect ratio ('16:9' or '9:16')
 */
export async function generateInfographicWithAudio(options: {
  topic: string;
  presentationId: string;
  voice?: string;
  aspectRatio?: '16:9' | '9:16';
  apiKey?: string;
}): Promise<GenerationResult> {
  const { topic, presentationId, voice, aspectRatio = '16:9', apiKey } = options;

  // Step 1: Validate the topic
  const isValid = await validateTopic(topic, apiKey);
  if (!isValid) {
    throw new Error(`Invalid topic: "${topic}" is not suitable for an infographic`);
  }

  // Step 2: Generate content (script + image prompt)
  const content = await generateInfographicContent(topic, apiKey);

  // Step 3: Create temp directory for intermediate files
  const tempDir = await mkdir(
    path.join(os.tmpdir(), `audible-slides-${presentationId}`),
    { recursive: true }
  ).then(() => path.join(os.tmpdir(), `audible-slides-${presentationId}`));

  const imagePath = path.join(tempDir, 'infographic.jpg');
  const audioPath = path.join(tempDir, 'narration.mp3');

  let finalScriptSections = content.script_sections;
  let finalSpeakerNotes = content.speaker_notes;

  try {
    // Step 4: Generate image (fail fast on 503 before wasting time on audio)
    try {
      await generateImage(content.image_prompt, imagePath, { imageSize: '1K', aspectRatio }, apiKey);
    } catch (error) {
      if (error instanceof GeminiImageSafetyError) {
        console.log(`[SAFETY_RETRY] Image blocked for "${topic}". Attempting sanitization and retry...`);

        const sanitizedSections = await sanitizeSpeakerNotes(topic, content.script_sections, apiKey);
        finalScriptSections = sanitizedSections;
        finalSpeakerNotes = sanitizedSections.join('\n\n');

        const sanitizedImagePrompt = `
          CONTEXT: This is for an EDUCATIONAL infographic. Images that might contain sensitive topics are acceptable since they are for educational purposes.

          Create an engaging infographic based on the following narration script.

          SCRIPT:
          "${finalSpeakerNotes}"

          INSTRUCTIONS:
          - Visualize the key points, facts, and data from the script.
          - Use a clean, modern, vector-art or flat-design style.
          - Organize the layout logically to flow with the narrative.
          - Use professional color palettes and clear iconography.

          TEXT RULES (CRITICAL):
          - STRONGLY PREFER icons, illustrations, and visual metaphors over text.
          - NEVER overlap text with images, illustrations, icons, shapes, or decorative elements. Keep every text area clear and unobstructed.
          - If you MUST include any text, follow these rules strictly:
            1. Use ONLY short headlines and labels
            2. Make ALL text large and readable
            3. NO paragraphs, NO sentences, NO body text
          - When in doubt, use an ICON instead of text.
        `.trim();

        try {
          await generateImage(sanitizedImagePrompt, imagePath, { imageSize: '1K', aspectRatio }, apiKey);
          console.log(`[SAFETY_RETRY] Retry succeeded for "${topic}"`);
        } catch (retryError) {
          if (retryError instanceof GeminiImageSafetyError) {
            console.log(`[SAFETY_RETRY] Retry also blocked for "${topic}". Content may be too sensitive for Gemini.`);
          }
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    // Step 5: Generate audio
    await generateAudioFromSections(
      finalScriptSections,
      audioPath,
      voice ? { voice, apiKey } : { apiKey }
    );

    const [image, audio] = await Promise.all([
      readFile(imagePath),
      readFile(audioPath),
    ]);

    return { title: topic, speakerNotes: finalSpeakerNotes, image, audio };

  } finally {
    // Cleanup temp directory
    await rm(tempDir, { recursive: true, force: true }).catch((e) =>
      console.warn('Failed to cleanup temp dir:', e)
    );
  }
}
