/**
 * API route for generating AI-powered infographics
 * POST /api/generate-slideshow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInfographicWithAudio, validateSlideshowTopic } from '@/lib/ai/generate-slideshow';
import { GeminiOverloadedError } from '@/lib/ai/gemini';
import { 
  createPresentation, 
  updatePresentationAssets, 
  deletePresentation as dbDeletePresentation 
} from '@/lib/supabase/presentations';
import { deletePresentation as storageDeletePresentation } from '@/lib/supabase/storage';
import { getSlideshowLimit } from '@/lib/utils/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Increase timeout for AI generation (max allowed on Vercel Hobby: 300s)
export const maxDuration = 300;

interface GenerateSlideshowRequest {
  topic: string;
  voice?: string;
  aspectRatio?: '16:9' | '9:16';
  /** Skip Gemini and use OpenAI directly for image generation */
  forceOpenAI?: boolean;
}

/**
 * Generate a complete infographic with audio and images
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

    // --- RATE LIMIT CHECK START ---
    
    // 1. Get user subscription and usage data
    const { data: userData, error: userError } = await supabase
      .from('main_table')
      .select('subscription_tier, pro_start_date, monthly_generated_slideshows, last_reset_date')
      .eq('user_id', user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found" which might be fine for new users
      console.error('Error fetching user data:', userError);
    }

    // 2. Determine if usage needs to be reset
    let currentUsage = userData?.monthly_generated_slideshows || 0;
    let shouldReset = false;
    const now = new Date();
    const lastReset = userData?.last_reset_date ? new Date(userData.last_reset_date) : new Date(0);
    
    if (userData?.subscription_tier && userData?.pro_start_date) {
      // For subscribers: Reset if the billing period start date is newer than our last reset
      // This resets usage on monthly renewals, but NOT on mid-cycle upgrades
      // (since Stripe keeps the same current_period_start during upgrades)
      const billingStart = new Date(userData.pro_start_date);
      if (billingStart > lastReset) {
        shouldReset = true;
      }
    } else {
      // For free users: Reset if we are in a new month compared to last reset
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        shouldReset = true;
      }
    }

    if (shouldReset) {
      currentUsage = 0;
      // We will update this in the database later or now
      await supabase
        .from('main_table')
        .update({ 
          monthly_generated_slideshows: 0,
          last_reset_date: now.toISOString() 
        })
        .eq('user_id', user.id);
    }

    // 3. Check limits
    const limit = getSlideshowLimit(userData?.subscription_tier);
    
    if (currentUsage >= limit) {
      return NextResponse.json(
        { 
          error: `You have reached your monthly limit of ${limit} infographics. Please upgrade your plan for more.`,
          limitReached: true 
        },
        { status: 403 }
      );
    }
    
    // --- RATE LIMIT CHECK END ---

    // Parse request body
    const body = (await request.json()) as GenerateSlideshowRequest;
    const { topic, voice, aspectRatio = '16:9', forceOpenAI = false } = body;

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

    if (!process.env.DEEPGRAM_API_KEY && !process.env.INWORLD_API_KEY) {
      console.error('Neither DEEPGRAM_API_KEY nor INWORLD_API_KEY is configured');
      return NextResponse.json(
        { error: 'Server configuration error: Audio service not available' },
        { status: 500 }
      );
    }

    // Validate topic first (quick check before expensive generation)
    const isValid = await validateSlideshowTopic(topic);
    if (!isValid) {
      return NextResponse.json(
        {
          error: `The topic "${topic}" is not suitable for an infographic. Please provide a valid educational topic.`,
        },
        { status: 400 }
      );
    }

    // Step 1: Create presentation record
    const presentation = await createPresentation(user.id, topic, aspectRatio);

    let result;
    try {
      // Step 2: Generate content and upload
      result = await generateInfographicWithAudio({
        topic,
        userId: user.id,
        presentationId: presentation.id,
        voice,
        aspectRatio,
        forceOpenAI,
      });

      // Step 3: Save assets to database
      await updatePresentationAssets(presentation.id, user.id, {
        image_url: result.image_url,
        audio_url: result.audio_url,
        speaker_notes: result.speaker_notes
      });
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

    // Increment usage count
    const { error: incrementError } = await supabase
      .from('main_table')
      .update({ monthly_generated_slideshows: currentUsage + 1 })
      .eq('user_id', user.id);
      
    if (incrementError) {
      console.error('[API] Error incrementing usage count:', incrementError);
      // We don't fail the request here because the user already got their infographic
    }

    return NextResponse.json(
      {
        success: true,
        presentation_id: presentation.id,
        title: presentation.title,
        created_at: presentation.created_at,
        image_url: result.image_url,
        audio_url: result.audio_url,
        speaker_notes: result.speaker_notes
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error generating infographic:', error);

    // Handle Gemini overloaded error - prompt user for OpenAI fallback
    if (error instanceof GeminiOverloadedError) {
      return NextResponse.json(
        {
          error: 'Google\'s image model is currently busy',
          geminiOverloaded: true,
        },
        { status: 503 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to generate infographic',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
