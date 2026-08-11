'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/utils/error-messages';
import {
  savePresentationVideo,
  type StoredPresentation,
} from '@/lib/browser/presentations';

type JobStatus = 'idle' | 'loading' | 'processing' | 'completed' | 'failed';

interface DownloadVideoButtonProps {
  presentation: StoredPresentation;
}

let ffmpegInstancePromise: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null;

async function getFfmpeg(): Promise<import('@ffmpeg/ffmpeg').FFmpeg> {
  if (!ffmpegInstancePromise) {
    ffmpegInstancePromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ]);
      const ffmpeg = new FFmpeg();
      const coreBaseUrl = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

      await ffmpeg.load({
        coreURL: await toBlobURL(`${coreBaseUrl}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${coreBaseUrl}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ffmpeg;
    })().catch((error) => {
      ffmpegInstancePromise = null;
      throw error;
    });
  }

  return ffmpegInstancePromise;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DownloadVideoButton({ presentation }: DownloadVideoButtonProps) {
  const [status, setStatus] = useState<JobStatus>('idle');
  const [progress, setProgress] = useState(0);
  const slug = presentation.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || presentation.id;

  const handleDownload = async () => {
    if (presentation.video) {
      downloadBlob(presentation.video, `${slug}.mp4`);
      setStatus('completed');
      setTimeout(() => setStatus('idle'), 2000);
      return;
    }

    const inputImage = `image-${presentation.id}.jpg`;
    const inputAudio = `audio-${presentation.id}.mp3`;
    const outputVideo = `video-${presentation.id}.mp4`;

    try {
      setStatus('loading');
      setProgress(0);
      toast.info('Preparing video exporter', {
        description: 'The first export downloads the browser video engine.',
      });

      const ffmpeg = await getFfmpeg();
      const onProgress = ({ progress: nextProgress }: { progress: number }) => {
        if (Number.isFinite(nextProgress)) {
          setProgress(Math.max(0, Math.min(100, Math.round(nextProgress * 100))));
        }
      };

      ffmpeg.on('progress', onProgress);
      setStatus('processing');

      try {
        await ffmpeg.writeFile(inputImage, new Uint8Array(await presentation.image.arrayBuffer()));
        await ffmpeg.writeFile(inputAudio, new Uint8Array(await presentation.audio.arrayBuffer()));

        const dimensions = presentation.aspect_ratio === '9:16'
          ? { width: 720, height: 1280 }
          : { width: 1280, height: 720 };
        const videoFilter = [
          `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease`,
          `pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2:white`,
        ].join(',');

        await ffmpeg.exec([
          '-loop', '1',
          '-i', inputImage,
          '-i', inputAudio,
          '-vf', videoFilter,
          '-c:v', 'libx264',
          '-tune', 'stillimage',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-pix_fmt', 'yuv420p',
          '-shortest',
          '-movflags', '+faststart',
          outputVideo,
        ]);

        const output = await ffmpeg.readFile(outputVideo);
        if (typeof output === 'string') throw new Error('Video export returned invalid data');
        const videoBytes = Uint8Array.from(output);
        const video = new Blob([videoBytes.buffer], { type: 'video/mp4' });

        await savePresentationVideo(presentation.id, video);
        downloadBlob(video, `${slug}.mp4`);
        setProgress(100);
        setStatus('completed');
        setTimeout(() => setStatus('idle'), 2000);
      } finally {
        ffmpeg.off('progress', onProgress);
        await Promise.all([
          ffmpeg.deleteFile(inputImage).catch(() => undefined),
          ffmpeg.deleteFile(inputAudio).catch(() => undefined),
          ffmpeg.deleteFile(outputVideo).catch(() => undefined),
        ]);
      }
    } catch (error) {
      console.error('Browser video export failed:', error);
      const friendlyError = getUserFriendlyError(error);
      toast.error(friendlyError.title, { description: friendlyError.description });
      setStatus('failed');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const isGenerating = status === 'loading' || status === 'processing';
  const statusLabel = isGenerating
    ? `Generating video${progress ? ` ${progress}%` : ''}`
    : status === 'completed'
      ? 'Video downloaded'
      : status === 'failed'
        ? 'Video generation failed'
        : 'Download video';
  const iconClass = 'h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary';

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating || status === 'completed'}
      variant="outline"
      size="sm"
      aria-label={statusLabel}
      title={statusLabel}
      className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-3 disabled:cursor-not-allowed"
    >
      {isGenerating ? (
        <Loader2 className={`${iconClass} animate-spin`} />
      ) : status === 'completed' ? (
        <CheckCircle className={iconClass} />
      ) : status === 'failed' ? (
        <XCircle className={iconClass} />
      ) : (
        <Download className={iconClass} />
      )}
    </Button>
  );
}
