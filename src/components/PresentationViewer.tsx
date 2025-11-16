'use client';

import { PresentationWithSlides } from '@/lib/supabase/presentations';
import Image from 'next/image';

interface PresentationViewerProps {
  presentation: PresentationWithSlides;
}

export function PresentationViewer({ presentation }: PresentationViewerProps) {
  const { slides } = presentation;

  // Get first slide for testing
  const firstSlide = slides[0];

  if (!firstSlide) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">No slides found in this presentation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Presentation Info */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-2xl font-bold">{presentation.title}</h2>
        <p className="text-sm text-muted-foreground">
          {slides.length} slide{slides.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* First Slide Preview (for testing) */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Slide Preview</h3>
        <div className="space-y-4">
          {/* Slide Image */}
          {firstSlide.image_url && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              <Image
                src={firstSlide.image_url}
                alt={`Slide ${firstSlide.order_index + 1}`}
                fill
                className="object-contain"
                priority
              />
            </div>
          )}

          {/* Slide Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div
              dangerouslySetInnerHTML={{
                __html: firstSlide.markdown_content
                  .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
                  .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
                  .replace(/\n/g, '<br />'),
              }}
            />
          </div>

          {/* Audio Player */}
          {firstSlide.audio_url && (
            <div className="mt-4">
              <audio controls className="w-full">
                <source src={firstSlide.audio_url} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      </div>

      {/* Slide List */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 text-lg font-semibold">All Slides</h3>
        <div className="space-y-2">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="rounded-md border p-3 hover:bg-accent"
            >
              <p className="text-sm font-medium">
                Slide {slide.order_index + 1}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {slide.speaker_notes}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
