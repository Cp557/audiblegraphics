import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVideoJob } from '@/lib/video/job-store';
import { getVideoFilePath } from '@/lib/video/job-manager';
import { promises as fs } from 'fs';
import { cleanupFile } from '@/lib/video/video-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
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

    // Get job ID from params
    const { jobId } = await params;

    // Fetch job from in-memory storage
    const job = getVideoJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify user owns this job
    if (job.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Video not ready yet', status: job.status },
        { status: 400 }
      );
    }

    // Get video file path
    const videoPath = getVideoFilePath(jobId);

    // Check if file exists
    try {
      await fs.access(videoPath);
    } catch {
      return NextResponse.json(
        { error: 'Video file not found or has been deleted' },
        { status: 410 } // Gone
      );
    }

    // Read the video file
    const videoBuffer = await fs.readFile(videoPath);

    // Create response with video file
    const response = new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="presentation-${job.presentationId}.mp4"`,
        'Content-Length': videoBuffer.length.toString(),
      },
    });

    // Schedule file cleanup after response is sent (fire and forget)
    // Wait a bit to ensure the download starts successfully
    setTimeout(() => {
      cleanupFile(videoPath).catch((err) => {
        console.error('Failed to cleanup video file:', err);
      });
    }, 1000);

    return response;
  } catch (error) {
    console.error('Error downloading video:', error);
    return NextResponse.json(
      {
        error: 'Failed to download video',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
