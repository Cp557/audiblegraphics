import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPresentation } from '@/lib/supabase/presentations';
import { createVideoJob } from '@/lib/video/job-store';
import { startVideoGeneration } from '@/lib/video/job-manager';

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

    // Get options from request body
    let darkMode = false;
    try {
      const body = await request.json();
      darkMode = !!body.darkMode;
    } catch (e) {
      // Ignore JSON parse errors, default to false
    }

    // Fetch presentation with slides (RLS check included)
    const presentation = await getPresentation(presentationId, user.id);

    if (!presentation) {
      return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
    }

    // Check if presentation has slides
    if (!presentation.slides || presentation.slides.length === 0) {
      return NextResponse.json(
        { error: 'Presentation has no slides' },
        { status: 400 }
      );
    }

    // Create video job (in-memory, no database)
    const job = createVideoJob(presentationId, user.id);

    // Start video generation in background (fire and forget)
    startVideoGeneration(job.id, presentation, { darkMode });

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
