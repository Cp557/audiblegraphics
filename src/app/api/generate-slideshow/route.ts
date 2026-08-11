import { NextRequest, NextResponse } from 'next/server';
import { generateInfographicWithAudio } from '@/lib/ai/generate-slideshow';
import { GeminiOverloadedError, GeminiImageSafetyError } from '@/lib/ai/gemini';
import { createGenerationBundleStream } from '@/lib/generation-bundle';
import {
  GeminiCreditsDepletedError,
  isGeminiCreditsDepletedError,
} from '@/lib/ai/gemini-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

    const apiKey = request.headers.get('x-gemini-api-key')?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Add your Gemini API key in Settings before generating.' },
        { status: 401 }
      );
    }

    const trimmedTopic = topic.trim();
    const selectedVoice = voice || 'Puck';
    const result = await generateInfographicWithAudio({
      topic: trimmedTopic,
      presentationId: crypto.randomUUID(),
      voice: selectedVoice,
      aspectRatio,
      apiKey,
    });

    const stream = createGenerationBundleStream(
      {
        title: result.title,
        speakerNotes: result.speakerNotes,
        aspectRatio,
        voice: selectedVoice,
      },
      result.image,
      result.audio
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/vnd.audiblegraphics.presentation',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[API] Error generating infographic:', error);

    if (error instanceof GeminiCreditsDepletedError || isGeminiCreditsDepletedError(error)) {
      return NextResponse.json(
        { error: 'Your Gemini credits are depleted. Add credits in Google AI Studio, then try again.' },
        { status: 402 }
      );
    }

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

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (/api.?key|API_KEY_INVALID|UNAUTHENTICATED/i.test(errorMessage)) {
      return NextResponse.json(
        { error: 'Gemini rejected this API key. Check it in Settings and try again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate infographic' },
      { status: 500 }
    );
  }
}
