/**
 * Main slideshow generation orchestrator
 * Coordinates Gemini and Deepgram APIs to create complete presentations
 */

import path from 'path';
import { mkdir } from 'fs/promises';
import { validateTopic, generateSlideshowMarkdown, generateImage } from './gemini';
import { generateAudio } from './deepgram';
import { uploadSlideImage, uploadSlideAudio, cleanupTempFiles } from '../supabase/storage';
import type { GenerationOptions, SlideWithUrls } from './types';

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
 * Generate a complete slideshow with audio and images
 * @param options - Generation options including topic and output directory
 * @returns Object containing arrays of slide data with Supabase URLs
 */
export async function generateSlideshowWithAudio(
  options: GenerationOptions
): Promise<SlideWithUrls[]> {
  const {
    topic,
    outputDir = 'public/generated-slideshows',
    userId,
    presentationId
  } = options;

  console.log('\n====== STARTING SLIDESHOW GENERATION ======');
  console.log(`Topic: ${topic}`);

  // Step 1: Validate the topic
  console.log('\n--- Validating Topic ---');
  const isValid = await validateTopic(topic);
  if (!isValid) {
    throw new Error(`Invalid topic: "${topic}" is not suitable for a slideshow`);
  }
  console.log('✓ Topic is valid');

  // Step 2: Generate slideshow markdown
  console.log('\n--- Generating Slideshow Content ---');
  const slidesData = await generateSlideshowMarkdown(topic);
  console.log(`✓ Generated ${slidesData.length} slides`);

  // Step 3: Create output directory
  const safeTopic = sanitizeTopic(topic);
  const topicDir = path.join(process.cwd(), outputDir, safeTopic);
  await mkdir(topicDir, { recursive: true });
  console.log(`✓ Created output directory: ${topicDir}`);

  // Step 4: Prepare parallel tasks for audio and images
  console.log('\n--- Generating Audio and Images in Parallel ---');

  const generationTasks = slidesData.map(async (slide, index) => {
    const slideNum = (index + 1).toString().padStart(2, '0');
    const audioPath = path.join(topicDir, `slide_${slideNum}.wav`);
    const imagePath = path.join(topicDir, `slide_${slideNum}.jpg`);
    const narration = slide.speaker_notes;
    const imagePrompt = slide.image_prompt;

    console.log(`\n[Slide ${index + 1}] ${slide.slide_title}`);
    console.log(`Speaker Notes: ${narration ? narration.substring(0, 50) + '...' : 'None'}`);
    console.log(`Image Prompt: ${imagePrompt ? imagePrompt.substring(0, 50) + '...' : 'None'}`);

    // Generate audio and image in parallel
    const [, imageResult] = await Promise.all([
      generateAudio(narration, audioPath),
      imagePrompt ? generateImage(imagePrompt, imagePath, { imageSize: '1K' }) : null,
    ]);

    console.log(`✓ Audio generated: slide_${slideNum}.wav`);
    if (imageResult) {
      console.log(`✓ Image generated: slide_${slideNum}.jpg`);
    }

    return {
      ...slide,
      audioPath,
      imagePath: imageResult ? imagePath : null,
    };
  });

  const generatedSlides = await Promise.all(generationTasks);

  // Step 5: Upload to Supabase if userId and presentationId provided
  if (userId && presentationId) {
    console.log('\n--- Uploading to Supabase Storage ---');

    const uploadTasks = generatedSlides.map(async (slideData, index) => {
      const slideId = `slide_${(index + 1).toString().padStart(2, '0')}`;

      // Upload audio and image in parallel
      const [audioUpload, imageUpload] = await Promise.all([
        uploadSlideAudio(slideData.audioPath, userId, presentationId, slideId),
        slideData.imagePath
          ? uploadSlideImage(slideData.imagePath, userId, presentationId, slideId)
          : null,
      ]);

      console.log(`✓ Uploaded slide ${index + 1} to Supabase`);

      return {
        slide_title: slideData.slide_title,
        slide_content: slideData.slide_content,
        speaker_notes: slideData.speaker_notes,
        image_prompt: slideData.image_prompt,
        image_url: imageUpload?.url || '',
        audio_url: audioUpload.url,
      };
    });

    const slidesWithUrls = await Promise.all(uploadTasks);

    // Step 6: Clean up temp files
    console.log('\n--- Cleaning Up Temp Files ---');
    await cleanupTempFiles(topicDir);

    console.log('\n====== SLIDESHOW GENERATION COMPLETE ======');
    console.log(`Total slides: ${slidesWithUrls.length}`);
    console.log(`Uploaded to Supabase: ${userId}/${presentationId}`);
    console.log('=======================================\n');

    return slidesWithUrls;
  } else {
    // Fallback: Return local paths (for backward compatibility)
    console.log('\n====== SLIDESHOW GENERATION COMPLETE (LOCAL ONLY) ======');
    console.log(`Output directory: ${topicDir}`);
    console.log(`Total slides: ${generatedSlides.length}`);
    console.log('=======================================\n');

    return generatedSlides.map((slide) => ({
      slide_title: slide.slide_title,
      slide_content: slide.slide_content,
      speaker_notes: slide.speaker_notes,
      image_prompt: slide.image_prompt,
      image_url: slide.imagePath || '',
      audio_url: slide.audioPath,
    }));
  }
}

/**
 * Validate a topic without generating a full slideshow
 * Useful for pre-validation before expensive generation
 */
export async function validateSlideshowTopic(topic: string): Promise<boolean> {
  return validateTopic(topic);
}
