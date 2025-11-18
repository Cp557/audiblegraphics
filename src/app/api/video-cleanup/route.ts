import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldVideos } from '@/lib/video/job-manager';

/**
 * Cleanup endpoint for removing old temporary video files
 * This can be called manually or via a cron job
 *
 * Security: Protected by API key in environment variable
 * Usage: POST /api/video-cleanup with header X-Cleanup-Key
 */
export async function POST(request: NextRequest) {
  try {
    // Check for cleanup API key (optional security)
    const apiKey = request.headers.get('X-Cleanup-Key');
    const expectedKey = process.env.VIDEO_CLEANUP_API_KEY;

    // If an API key is configured, validate it
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get max age from query params (default 30 minutes)
    const url = new URL(request.url);
    const maxAgeMinutes = parseInt(url.searchParams.get('maxAge') || '30');

    // Run cleanup
    await cleanupOldVideos(maxAgeMinutes);

    return NextResponse.json({
      success: true,
      message: `Cleaned up videos older than ${maxAgeMinutes} minutes`,
    });
  } catch (error) {
    console.error('Error in video cleanup:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup videos',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing/manual trigger
 */
export async function GET(request: NextRequest) {
  // Same logic as POST for convenience
  return POST(request);
}
