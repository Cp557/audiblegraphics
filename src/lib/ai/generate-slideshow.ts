/**
 * Main infographic generation orchestrator
 * Coordinates Gemini and Deepgram APIs to create complete presentations
 */

import path from 'path';
import os from 'os';
import { mkdir } from 'fs/promises';
import { validateTopic, generateInfographicContent, generateImage } from './gemini';
import { generateAudioFromSections } from './audio-generator';
import { uploadSlideImage, uploadSlideAudio, cleanupTempFiles } from '../supabase/storage';
import type { GenerationOptions, InfographicResult } from './types';

/**
 * Sanitize a topic string to create a safe directory name
 */
function sanitizeTopic(topic: string): string {
  // Remove special characters and limit length
  const safe = topic.replace(/[^\w\s-]/g, '').substring(0, 30);
  // Replace spaces and multiple dashes with single dash
  return safe.replace(/[-\s]+/g, '-').toLowerCase();
}

/**
 * Generate a complete infographic with audio and images
 * @param options - Generation options including topic and output directory
 * @returns Object containing infographic data with Supabase URLs
 */
export async function generateInfographicWithAudio(
  options: GenerationOptions
): Promise<InfographicResult> {
  const {
    topic,
    outputDir = path.join(os.tmpdir(), 'audible-slides-gen'),
    userId,
    presentationId,
    voice
  } = options;

  console.log('\n====== STARTING INFOGRAPHIC GENERATION ======');
  console.log(`Topic: ${topic}`);

  // Step 1: Validate the topic
  console.log('\n--- Validating Topic ---');
  const isValid = await validateTopic(topic);
  if (!isValid) {
    throw new Error(`Invalid topic: "${topic}" is not suitable for an infographic`);
  }
  console.log('✓ Topic is valid');

  // Step 2: Generate Content (Notes + Prompt)
  console.log('\n--- Generating Content ---');
  const content = await generateInfographicContent(topic);
  console.log(`✓ Generated script with ${content.script_sections.length} sections`);

  // Step 3: Create output directory
  const safeTopic = sanitizeTopic(topic);
  const topicDir = path.isAbsolute(outputDir)
    ? path.join(outputDir, safeTopic)
    : path.join(process.cwd(), outputDir, safeTopic);
  await mkdir(topicDir, { recursive: true });
  console.log(`✓ Created output directory: ${topicDir}`);

  // Step 4: Generate Assets Parallel
  const audioPath = path.join(topicDir, 'narration.mp3');
  const imagePath = path.join(topicDir, 'infographic.jpg');

  console.log('\n--- Generating Assets ---');
  console.log(`Speaker Notes: ${content.speaker_notes.substring(0, 50)}...`);
  console.log(`Image Prompt: ${content.image_prompt.substring(0, 50)}...`);

  const [, imageResult] = await Promise.all([
    generateAudioFromSections(content.script_sections, audioPath, voice ? { voice } : {}),
    generateImage(content.image_prompt, imagePath, { imageSize: '1K', aspectRatio: '16:9' })
  ]);

  console.log('✓ Audio generated (stitched)');
  if (imageResult) {
    console.log('✓ Image generated');
  }

  // Step 5: Upload
  let imageUrl = '';
  let audioUrl = '';

  if (userId && presentationId) {
    console.log('\n--- Uploading to Supabase Storage ---');

    // We reuse the existing upload functions but treat them as single assets
    // Using 'infographic' as the ID part of the path
    const [audioUpload, imageUpload] = await Promise.all([
      uploadSlideAudio(audioPath, userId, presentationId, 'infographic'),
      uploadSlideImage(imagePath, userId, presentationId, 'infographic')
    ]);

    audioUrl = audioUpload.url;
    imageUrl = imageUpload?.url || '';
    
    console.log('✓ Uploaded assets to Supabase');

    // Step 6: Clean up temp files
    console.log('\n--- Cleaning Up Temp Files ---');
    await cleanupTempFiles(topicDir);

    console.log('\n====== INFOGRAPHIC GENERATION COMPLETE ======');
    console.log(`Uploaded to Supabase: ${userId}/${presentationId}`);
    console.log('=======================================\n');
  } else {
    // Fallback: Return local paths (for testing/CLI)
    console.log('\n====== INFOGRAPHIC GENERATION COMPLETE (LOCAL ONLY) ======');
    console.log(`Output directory: ${topicDir}`);
    console.log('=======================================\n');
    
    audioUrl = audioPath;
    imageUrl = imagePath;
  }

  return {
    ...content,
    image_url: imageUrl,
    audio_url: audioUrl
  };
}

/**
 * Validate a topic without generating a full slideshow
 * Useful for pre-validation before expensive generation
 */
export async function validateSlideshowTopic(topic: string): Promise<boolean> {
  return validateTopic(topic);
}
