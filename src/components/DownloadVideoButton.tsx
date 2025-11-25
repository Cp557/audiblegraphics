'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface DownloadVideoButtonProps {
  presentationId: string;
}

type JobStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  videoUrl?: string;
  error?: string;
}

interface VideoStartResponse {
  jobId?: string;
  status: string;
  videoUrl?: string;
  message?: string;
  cached?: boolean;
  error?: string;
}

export function DownloadVideoButton({ presentationId }: DownloadVideoButtonProps) {
  const [status, setStatus] = useState<JobStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
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
        setJobId(null);
      }, 2000);
    } catch (downloadError) {
      console.error('Error downloading video file:', downloadError);
      setStatus('failed');
      setError('Failed to download video file');
      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 5000);
    }
  };

  // Start polling for job status
  const startPolling = (jobId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/video-jobs/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data: JobStatusResponse = await response.json();
        setStatus(data.status);
        setProgress(data.progress);

        if (data.status === 'completed' && data.videoUrl) {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Download the video
          await downloadVideo(data.videoUrl);
        } else if (data.status === 'failed') {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          setError(data.error || 'Video generation failed');

          // Reset to idle after showing error
          setTimeout(() => {
            setStatus('idle');
            setProgress(0);
            setJobId(null);
            setError(null);
          }, 5000);
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setStatus('failed');
        setError('Failed to check video status');
      }
    }, 2000);
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

      // Video is being generated, start polling
      if (data.jobId) {
        setJobId(data.jobId);
        startPolling(data.jobId);
      } else {
        throw new Error('No job ID returned');
      }
    } catch (err) {
      console.error('Error starting video generation:', err);
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to generate video');

      // Reset after showing error
      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 5000);
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

      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  );
}
