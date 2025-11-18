'use client';

import { useState, useEffect, useRef } from 'react';
import { PresentationWithSlides } from '@/lib/supabase/presentations';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

interface PresentationViewerProps {
  presentation: PresentationWithSlides;
}

export function PresentationViewer({ presentation }: PresentationViewerProps) {
  const { slides } = presentation;
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight,
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const { autoplayAudio, autoSwitchSlide } = useSettings();

  // Preload all images
  useEffect(() => {
    const imageUrls = slides
      .map((slide) => slide.image_url)
      .filter((url): url is string => Boolean(url));

    if (imageUrls.length === 0) {
      setImagesLoaded(true);
      return;
    }

    setLoadingProgress({ loaded: 0, total: imageUrls.length });

    let loadedCount = 0;

    imageUrls.forEach((url) => {
      const img = new window.Image();

      img.onload = () => {
        loadedCount++;
        setLoadingProgress({ loaded: loadedCount, total: imageUrls.length });
        if (loadedCount === imageUrls.length) {
          setImagesLoaded(true);
        }
      };

      img.onerror = () => {
        loadedCount++;
        setLoadingProgress({ loaded: loadedCount, total: imageUrls.length });
        if (loadedCount === imageUrls.length) {
          setImagesLoaded(true);
        }
      };

      img.src = url;
    });
  }, [slides]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keyboard navigation when user is typing in form elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Home':
          setCurrentSlideIndex(0);
          break;
        case 'End':
          setCurrentSlideIndex(slides.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length]);

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index);
  };

  const handleAudioCanPlay = () => {
    if (autoplayAudio && audioRef.current) {
      // Use play() with error handling for browser autoplay policies
      audioRef.current.play().catch((error) => {
        console.warn('Autoplay was prevented:', error);
      });
    }
  };

  const handleAudioEnded = () => {
    if (autoSwitchSlide && currentSlideIndex < slides.length - 1) {
      // Add a 1.5 second delay before advancing to the next slide
      setTimeout(() => {
        setCurrentSlideIndex((prev) => prev + 1);
      }, 1500);
    }
  };

  const normalizeSlideContent = (content: string) => {
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const isBulleted = lines.length > 0 && lines.every((line) => line.startsWith('- '));

    return isBulleted ? lines.map((line) => line.replace(/^-+\s*/, '')) : null;
  };

  if (slides.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">No slides found in this presentation.</p>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const bulletItems = normalizeSlideContent(currentSlide.slide_content);

  const cardMaxHeight = viewportHeight ? Math.max(viewportHeight - 160, 520) : undefined;
  const mediaHeight = viewportHeight ? Math.min(Math.max(viewportHeight * 0.4, 220), 420) : undefined;

  // Show loading state while images are being preloaded
  if (!imagesLoaded) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {/* Loading State */}
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border bg-card p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <span className="sr-only">Loading slides</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center px-4 py-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
      <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
        <div
          className="flex h-full flex-col rounded-lg border bg-card p-4 sm:p-6 shadow-sm"
          style={cardMaxHeight ? { maxHeight: `${cardMaxHeight}px` } : undefined}
        >
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            {/* Slide Title with Controls */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={currentSlideIndex === 0}
                aria-label="Previous slide"
                className="cursor-pointer transition-transform hover:scale-105 hover:bg-muted/70 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h2 className="flex-1 text-center text-2xl font-bold">
                {currentSlide.slide_title}
              </h2>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={currentSlideIndex === slides.length - 1}
                aria-label="Next slide"
                className="cursor-pointer transition-transform hover:scale-105 hover:bg-muted/70 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-auto pr-1">
              {/* Slide Content (Bullet Points) */}
              {bulletItems ? (
                <ul className="list-disc space-y-2 px-6 py-2 font-serif text-lg leading-relaxed tracking-wide text-foreground text-center list-inside">
                  {bulletItems.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div className="whitespace-pre-line text-base leading-relaxed font-serif tracking-wide text-center">
                  {currentSlide.slide_content}
                </div>
              )}

              {/* Image Display (Middle) */}
              {currentSlide.image_url && (
                <div
                  className="relative w-full overflow-hidden rounded-lg"
                  style={mediaHeight ? { height: `${mediaHeight}px` } : undefined}
                >
                  <Image
                    src={currentSlide.image_url}
                    alt={currentSlide.image_prompt || `Slide ${currentSlideIndex + 1}`}
                    fill
                    className="object-contain"
                    priority={currentSlideIndex === 0}
                    unoptimized
                  />
                </div>
              )}
            </div>

            {/* Audio Player (Bottom) */}
            {currentSlide.audio_url && (
              <div className="flex flex-col gap-2 pt-2">
                <audio
                  ref={audioRef}
                  controls
                  className="w-full"
                  key={currentSlide.id}
                  onCanPlay={handleAudioCanPlay}
                  onEnded={handleAudioEnded}
                >
                  <source src={currentSlide.audio_url} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
