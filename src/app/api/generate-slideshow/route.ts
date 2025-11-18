/**
 * API route for generating AI-powered slideshows
 * POST /api/generate-slideshow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSlideshowWithAudio, validateSlideshowTopic } from '@/lib/ai/generate-slideshow';
import { createPresentation, createSlide, deletePresentation as dbDeletePresentation } from '@/lib/supabase/presentations';
import { deletePresentation as storageDeletePresentation } from '@/lib/supabase/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Increase timeout for AI generation (10 minutes)
export const maxDuration = 600;

interface GenerateSlideshowRequest {
  topic: string;
}

/**
 * Generate a complete slideshow with audio and images
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = (await request.json()) as GenerateSlideshowRequest;
    const { topic } = body;

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Topic is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate API keys are configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: AI service not available' },
        { status: 500 }
      );
    }

    if (!process.env.DEEPGRAM_API_KEY) {
      console.error('DEEPGRAM_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Audio service not available' },
        { status: 500 }
      );
    }

    console.log(`[API] Generating slideshow for user ${user.id} on topic: "${topic}"`);

    // Validate topic first (quick check before expensive generation)
    const isValid = await validateSlideshowTopic(topic);
    if (!isValid) {
      return NextResponse.json(
        {
          error: `The topic "${topic}" is not suitable for a slideshow. Please provide a valid educational topic.`,
        },
        { status: 400 }
      );
    }

    // Step 1: Create presentation record
    console.log('[API] Creating presentation record...');
    const presentation = await createPresentation(user.id, topic);
    console.log(`[API] Presentation created with ID: ${presentation.id}`);

    let slidesWithUrls;
    try {
      // Step 2: Generate slideshow with Supabase upload
      console.log('[API] Generating slideshow content and uploading to Supabase...');
      slidesWithUrls = await generateSlideshowWithAudio({
        topic,
        userId: user.id,
        presentationId: presentation.id,
      });

      // Step 3: Save slides to database
      console.log('[API] Saving slides to database...');
      const slidePromises = slidesWithUrls.map((slideData, index) =>
        createSlide({
          presentation_id: presentation.id,
          order_index: index,
          slide_title: slideData.slide_title,
          slide_content: slideData.slide_content,
          speaker_notes: slideData.speaker_notes,
          image_prompt: slideData.image_prompt,
          image_url: slideData.image_url,
          audio_url: slideData.audio_url,
        })
      );

      await Promise.all(slidePromises);
      console.log(`[API] Successfully saved ${slidesWithUrls.length} slides to database`);
    } catch (error) {
      // Cleanup: If generation or database save fails, delete the presentation
      console.error('[API] Error during generation, cleaning up...');
      try {
        await storageDeletePresentation(user.id, presentation.id);
        await dbDeletePresentation(presentation.id, user.id);
      } catch (cleanupError) {
        console.error('[API] Error during cleanup:', cleanupError);
      }
      throw error; // Re-throw to be caught by outer catch
    }

    console.log(`[API] Successfully generated slideshow for topic: "${topic}"`);

    return NextResponse.json(
      {
        success: true,
        presentation_id: presentation.id,
        title: presentation.title,
        created_at: presentation.created_at,
        slides: slidesWithUrls.map((slide, index) => ({
          order_index: index,
          slide_title: slide.slide_title,
          slide_content: slide.slide_content,
          speaker_notes: slide.speaker_notes,
          image_prompt: slide.image_prompt,
          image_url: slide.image_url,
          audio_url: slide.audio_url,
        })),
        slideCount: slidesWithUrls.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error generating slideshow:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to generate slideshow',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
