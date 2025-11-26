'use client';

import { useState, useEffect, useRef } from 'react';
import { Presentation } from '@/lib/supabase/presentations';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Pause, RotateCcw } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { Slider } from '@/components/ui/slider';

interface PresentationViewerProps {
  presentation: Presentation;
}

export function PresentationViewer({ presentation }: PresentationViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { autoplayAudio } = useSettings();

  const { image_url, audio_url, speaker_notes, title } = presentation;

  useEffect(() => {
    if (image_url) {
      const img = new window.Image();
      img.src = image_url;
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageLoaded(true); // Show placeholder or error state
    } else {
        setImageLoaded(true);
    }
  }, [image_url]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (autoplayAudio) {
        audioRef.current.play().catch(console.warn);
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!imageLoaded) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading infographic...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center px-4 py-4">
      <div className="w-full h-[calc(100vh-140px)] max-h-[900px] flex flex-col gap-4">
        
        {/* Infographic Image Column */}
        <div className="relative w-full flex-1 min-h-0 flex justify-center items-center">
            <div className={`relative h-full w-auto max-w-full ${presentation.aspect_ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'} rounded-xl overflow-hidden border shadow-lg border-gray-200 bg-background`}>
            {image_url ? (
              <Image
                src={image_url}
                alt={title}
                fill
                className="object-contain"
                priority
                unoptimized
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted">
                <p className="text-muted-foreground">Image not available</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls & Notes Column */}
        <div className="w-full max-w-[800px] mx-auto shrink-0">
          
          {/* Audio Player Card */}
          <div className="p-6 rounded-xl border shadow-sm bg-white">
            {audio_url ? (
              <div className="flex flex-col gap-2">
                <audio
                  ref={audioRef}
                  src={audio_url}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleEnded}
                />
                
                <div className="w-full">
                  <Slider
                    value={[currentTime]}
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full shadow-sm hover:scale-105 transition-transform cursor-pointer"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Audio not available</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
