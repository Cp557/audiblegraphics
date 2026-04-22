'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CirclePlay, ChevronDown, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/utils/error-messages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const VOICES = [
  { id: 'Achird', name: 'Achird' },
  { id: 'Aoede', name: 'Aoede' },
  { id: 'Charon', name: 'Charon' },
  { id: 'Laomedeia', name: 'Laomedeia' },
] as const;

const ASPECT_RATIOS = [
  { id: '16:9', name: '16:9', icon: Monitor },
  { id: '9:16', name: '9:16', icon: Smartphone },
] as const;

export function SlideshowInput() {
  const [topic, setTopic] = useState('');
  const [voice, setVoice] = useState('Achird');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const handlePlayVoice = (voiceId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }

    const audio = new Audio(`/voice-samples/${voiceId}.mp3`);
    audioRef.current = audio;
    setPlayingVoice(voiceId);

    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      setPlayingVoice(null);
    });

    audio.onended = () => setPlayingVoice(null);
  };

  const generateSlideshow = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/generate-slideshow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, voice, aspectRatio }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = typeof data?.error === 'string' ? data.error : 'Unknown error';
        const friendlyError = getUserFriendlyError(errorMsg);
        toast.error(friendlyError.title, { description: friendlyError.description });
        setLoading(false);
        return;
      }

      if (data.presentation_id) {
        router.prefetch(`/presentations/${data.presentation_id}`);
        router.push(`/presentations/${data.presentation_id}`);
      }
    } catch {
      const friendlyError = getUserFriendlyError('Failed to fetch');
      toast.error(friendlyError.title, { description: friendlyError.description });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    await generateSlideshow();
  };

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border bg-card p-10">
      {loading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-6 text-center text-lg font-semibold">Generating infographic</p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Creating script, visuals, and narration...
          </p>
        </div>
      ) : (
        <>
          <h2 className="mb-7 text-center text-xl font-semibold">Enter Topic or Question</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="e.g. Milky Way Galaxy. History of Rome. How does lightning form?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading}
                className="flex-1"
                maxLength={250}
              />
              <Button
                type="submit"
                disabled={!topic.trim()}
                className="cursor-pointer transition-transform hover:scale-105"
              >
                Generate
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Voice:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="min-w-[140px] justify-between">
                      {VOICES.find((v) => v.id === voice)?.name || 'Achird'}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[180px]">
                    {VOICES.map((voiceOption) => (
                      <DropdownMenuItem
                        key={voiceOption.id}
                        className="flex items-center justify-between gap-2 cursor-pointer"
                        onSelect={() => setVoice(voiceOption.id)}
                      >
                        <span>{voiceOption.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayVoice(voiceOption.id);
                          }}
                        >
                          <CirclePlay
                            className={`h-4 w-4 cursor-pointer transition-colors hover:text-primary ${
                              playingVoice === voiceOption.id ? 'text-primary' : ''
                            }`}
                          />
                        </Button>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Aspect:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="min-w-[110px] justify-between">
                      <span className="flex items-center gap-2">
                        {aspectRatio === '16:9' ? (
                          <Monitor className="h-4 w-4" />
                        ) : (
                          <Smartphone className="h-4 w-4" />
                        )}
                        {aspectRatio}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[130px]">
                    {ASPECT_RATIOS.map((ratio) => (
                      <DropdownMenuItem
                        key={ratio.id}
                        className="flex items-center gap-2 cursor-pointer"
                        onSelect={() => setAspectRatio(ratio.id)}
                      >
                        <ratio.icon className="h-4 w-4" />
                        <span>{ratio.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
