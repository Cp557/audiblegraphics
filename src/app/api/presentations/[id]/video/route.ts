import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getPresentation, updatePresentationVideoFlag } from '@/lib/local/presentations';
import { videoExists, getLocalFilePaths } from '@/lib/local/storage';
import { generatePresentationVideo } from '@/lib/video/video-generator';

export const maxDuration = 300;

/**
 * GET — Poll whether the video is ready.
 * Returns { status: 'completed', videoUrl } or { status: 'processing' }.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (videoExists(id)) {
      return NextResponse.json({
        status: 'completed',
        progress: 100,
        videoUrl: `/uploads/${id}/video.mp4`,
      });
    }

    return NextResponse.json({ status: 'processing', progress: 50 });
  } catch (error) {
    console.error('Error checking video status:', error);
    return NextResponse.json(
      { error: 'Failed to check video status' },
      { status: 500 }
    );
  }
}

/**
 * POST — Start video generation (async via after()).
 * Returns 200 immediately if video already exists, otherwise 202.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Return cached video immediately
    if (videoExists(id)) {
      return NextResponse.json({
        status: 'completed',
        videoUrl: `/uploads/${id}/video.mp4`,
        cached: true,
      });
    }

    const presentation = await getPresentation(id);
    if (!presentation) {
      return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
    }

    const { imagePath, audioPath, videoPath } = getLocalFilePaths(id);
    const aspectRatio = (presentation.aspect_ratio as '16:9' | '9:16') || '16:9';

    after(async () => {
      console.log(`[VideoRoute] Starting video generation for ${id}`);
      try {
        await generatePresentationVideo(imagePath, audioPath, videoPath, aspectRatio);
        await updatePresentationVideoFlag(id, true);
        console.log(`[VideoRoute] Video generation completed for ${id}`);
      } catch (error) {
        console.error(`[VideoRoute] Video generation failed for ${id}:`, error);
      }
    });

    return NextResponse.json(
      { status: 'pending', presentationId: id },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error starting video generation:', error);
    return NextResponse.json(
      { error: 'Failed to start video generation' },
      { status: 500 }
    );
  }
}
