import { NextRequest, NextResponse } from 'next/server';
import { generateInfographicWithAudio } from '@/lib/ai/generate-slideshow';
import { GeminiOverloadedError, GeminiImageSafetyError } from '@/lib/ai/gemini';
import { createPresentation, updatePresentationAssets, deletePresentation, generateUniqueSlug } from '@/lib/local/presentations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, voice, aspectRatio = '16:9' } = body as {
      topic: string;
      voice?: string;
      aspectRatio?: '16:9' | '9:16';
    };

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Topic is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (topic.length > 250) {
      return NextResponse.json(
        { error: 'Topic must be 250 characters or less' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const trimmedTopic = topic.trim();
    const id = await generateUniqueSlug(trimmedTopic);
    await createPresentation(id, trimmedTopic, aspectRatio);

    let title: string;
    let speakerNotes: string;
    try {
      const result = await generateInfographicWithAudio({
        topic: trimmedTopic,
        presentationId: id,
        voice,
        aspectRatio,
      });
      title = result.title;
      speakerNotes = result.speakerNotes;
      await updatePresentationAssets(id, { speaker_notes: speakerNotes });
    } catch (error) {
      console.error('[API] Generation failed, cleaning up...');
      await deletePresentation(id).catch(() => {});
      throw error;
    }

    return NextResponse.json({
      success: true,
      presentation_id: id,
      title,
    });
  } catch (error) {
    console.error('[API] Error generating infographic:', error);

    if (error instanceof GeminiOverloadedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    if (error instanceof GeminiImageSafetyError) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate infographic' },
      { status: 500 }
    );
  }
}
