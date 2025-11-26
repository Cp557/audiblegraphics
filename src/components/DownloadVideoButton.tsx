'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/utils/error-messages';

interface DownloadVideoButtonProps {
  presentationId: string;
}

type JobStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

interface VideoStatusResponse {
  status: string;
  progress?: number;
  videoUrl?: string;
  error?: string;
}

interface VideoStartResponse {
  presentationId?: string;
  status: string;
  videoUrl?: string;
  message?: string;
  cached?: boolean;
  error?: string;
}

export function DownloadVideoButton({ presentationId }: DownloadVideoButtonProps) {
  const [status, setStatus] = useState<JobStatus>('idle');
  const [progress, setProgress] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Download video from URL
  const downloadVideo = async (videoUrl: string) => {
    try {
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error('Failed to download video file');
      }

      // Get the blob
      const blob = await videoResponse.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `presentation-${presentationId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup the blob URL
      window.URL.revokeObjectURL(url);

      // Show success state briefly
      setStatus('completed');
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 2000);
    } catch (downloadError) {
      console.error('Error downloading video file:', downloadError);
      const friendlyError = getUserFriendlyError(downloadError);
      toast.error(friendlyError.title, {
        description: friendlyError.description,
      });
      setStatus('idle');
    }
  };

  // Start polling for video status (polls the database via API)
  const startPolling = () => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 3 seconds (database-backed, so slightly longer interval is fine)
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // Poll the presentation's video status endpoint
        const response = await fetch(`/api/presentations/${presentationId}/video`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch video status');
        }

        const data: VideoStatusResponse = await response.json();
        
        if (data.status === 'completed' && data.videoUrl) {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          setStatus('completed');
          setProgress(100);

          // Download the video
          await downloadVideo(data.videoUrl);
        } else if (data.status === 'processing') {
          setStatus('processing');
          setProgress(data.progress || 50);
        }
      } catch (err) {
        console.error('Error polling video status:', err);
        // Don't stop polling on transient errors, just log them
        // Only stop after many failures (handled by timeout below)
      }
    }, 3000);

    // Timeout after 5 minutes (video generation shouldn't take longer)
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        
        if (status === 'processing' || status === 'pending') {
          setStatus('failed');
          toast.error('Video Download Failed', {
            description: 'Video generation timed out. Please try again later.',
          });
          setTimeout(() => {
            setStatus('idle');
          }, 3000);
        }
      }
    }, 5 * 60 * 1000);
  };

  const handleDownload = async () => {
    try {
      setStatus('pending');
      setError(null);
      setProgress(0);

      // Start video generation (or get cached video)
      const response = await fetch(`/api/presentations/${presentationId}/video`, {
        method: 'POST',
      });

      const data: VideoStartResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      // Check if video was already cached
      if (data.cached && data.videoUrl) {
        // Video already exists, download it directly
        setStatus('processing');
        setProgress(100);
        await downloadVideo(data.videoUrl);
        return;
      }

      // Video is being generated, start polling the database
      setStatus('processing');
      startPolling();
      
    } catch (err) {
      console.error('Error starting video generation:', err);
      const friendlyError = getUserFriendlyError(err);
      toast.error(friendlyError.title, {
        description: friendlyError.description,
      });
      setStatus('idle');
    }
  };

  const isGenerating = status === 'pending' || status === 'processing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  const statusLabel =
    status === 'processing' || status === 'pending'
      ? `Generating video${progress ? ` ${progress}%` : ''}`
      : status === 'completed'
        ? 'Video downloaded'
        : status === 'failed'
          ? 'Video generation failed'
          : 'Download video';

  const iconClass =
    'h-4 w-4 cursor-pointer text-muted-foreground transition-colors group-hover:text-primary group-focus-visible:text-primary';

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleDownload}
        disabled={isGenerating || isCompleted}
        variant="outline"
        size="sm"
        aria-label={statusLabel}
        className="group inline-flex items-center justify-center gap-2 rounded-full px-3 cursor-pointer disabled:cursor-not-allowed"
      >
        {isGenerating && (
          <>
            <Loader2 className={`${iconClass} animate-spin`} />
          </>
        )}
        {isCompleted && (
          <>
            <CheckCircle className={iconClass} />
          </>
        )}
        {isFailed && (
          <>
            <XCircle className={iconClass} />
          </>
        )}
        {status === 'idle' && (
          <>
            <Download className={iconClass} />
          </>
        )}
      </Button>
    </div>
  );
}
