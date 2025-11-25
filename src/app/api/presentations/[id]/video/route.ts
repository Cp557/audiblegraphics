import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPresentation } from '@/lib/supabase/presentations';
import { createVideoJob } from '@/lib/video/job-store';
import { startVideoGeneration } from '@/lib/video/job-manager';
import { Slide } from '@/lib/supabase/presentations';

export const maxDuration = 300; // 5 minutes max for video generation

/**
 * GET - Check if video exists for a presentation (poll endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get presentation ID from params
    const { id: presentationId } = await params;

    // Fetch presentation to check video_url
    const presentation = await getPresentation(presentationId, user.id);

    if (!presentation) {
      return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
    }

    // Return current video status
    if (presentation.video_url) {
      return NextResponse.json({
        status: 'completed',
        progress: 100,
        videoUrl: presentation.video_url,
      });
    } else {
      // Video is still being generated
      return NextResponse.json({
        status: 'processing',
        progress: 50, // We don't have exact progress, show indeterminate
      });
    }
  } catch (error) {
    console.error('Error checking video status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check video status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Start video generation for a presentation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get presentation ID from params
    const { id: presentationId } = await params;

    // Fetch presentation
    const presentation = await getPresentation(presentationId, user.id);

    if (!presentation) {
      return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
    }

    // Check if video already exists - return it immediately
    if (presentation.video_url) {
      return NextResponse.json(
        {
          status: 'completed',
          videoUrl: presentation.video_url,
          message: 'Video already exists',
          cached: true,
        },
        { status: 200 }
      );
    }

    // Determine if we have content to generate video from.
    const hasInfographicContent = !!(presentation.image_url && presentation.audio_url);
    
    // For now, we'll cast to any to check for slides property safely
    const slides = (presentation as any).slides || [];
    const hasSlides = slides.length > 0;

    if (!hasInfographicContent && !hasSlides) {
      return NextResponse.json(
        { error: 'Presentation has no content (image/audio or slides)' },
        { status: 400 }
      );
    }

    // Construct a normalized "slides" array for the video generator
    let presentationWithSlides = { ...presentation } as any;
    
    if (hasSlides) {
      presentationWithSlides.slides = slides;
    } else {
      // Create a synthetic slide from the presentation data
      const syntheticSlide: Slide = {
        id: 'synthetic-1',
        presentation_id: presentation.id,
        slide_number: 1,
        slide_title: presentation.title,
        slide_content: presentation.speaker_notes || '',
        image_url: presentation.image_url,
        audio_url: presentation.audio_url,
        created_at: presentation.created_at
      };
      presentationWithSlides.slides = [syntheticSlide];
    }

    // Create video job (in-memory for local progress tracking only)
    const job = createVideoJob(presentationId, user.id);

    // Start video generation in background (fire and forget)
    // Now also uploads to Supabase and saves URL to database
    startVideoGeneration(job.id, presentationWithSlides, user.id);

    // Return presentation ID for polling (not job ID)
    return NextResponse.json(
      {
        presentationId: presentationId,
        status: 'pending',
        message: 'Video generation started',
      },
      { status: 202 } // 202 Accepted
    );
  } catch (error) {
    console.error('Error starting video generation:', error);
    return NextResponse.json(
      {
        error: 'Failed to start video generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
