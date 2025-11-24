import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPresentation } from '@/lib/supabase/presentations';
import { createVideoJob } from '@/lib/video/job-store';
import { startVideoGeneration } from '@/lib/video/job-manager';
import { Slide } from '@/lib/supabase/presentations'; // Ensure this type exists or is compatible

export const maxDuration = 300; // 5 minutes max for video generation

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
    // Note: getPresentation currently returns just the presentation row, not joined slides.
    // If we are in "infographic mode", the presentation itself IS the content.
    const presentation = await getPresentation(presentationId, user.id);

    if (!presentation) {
      return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
    }

    // Determine if we have content to generate video from.
    // Case A: Infographic mode (content on presentation object)
    const hasInfographicContent = !!(presentation.image_url && presentation.audio_url);
    
    // Case B: Slideshow mode (content in slides array - not currently fetched by getPresentation but we'll handle the logic)
    // If getPresentation is updated to return slides later, this check handles it.
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
        slide_content: presentation.speaker_notes || '', // Use notes as content for the frame text
        image_url: presentation.image_url,
        audio_url: presentation.audio_url,
        created_at: presentation.created_at
      };
      presentationWithSlides.slides = [syntheticSlide];
    }

    // Create video job (in-memory, no database)
    const job = createVideoJob(presentationId, user.id);

    // Start video generation in background (fire and forget)
    startVideoGeneration(job.id, presentationWithSlides);

    // Return job ID immediately
    return NextResponse.json(
      {
        jobId: job.id,
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
