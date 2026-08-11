'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  CirclePlay,
  ChevronDown,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/utils/error-messages';
import { useSettings } from '@/contexts/SettingsContext';
import { decodeGenerationBundle } from '@/lib/generation-bundle';
import {
  createPresentationId,
  savePresentation,
} from '@/lib/browser/presentations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const VOICES = [
  { id: 'Puck', name: 'Puck' },
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
  const [voice, setVoice] = useState('Puck');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const { geminiApiKey, requireGeminiApiKey } = useSettings();

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
      toast.error('Voice preview unavailable', {
        description: `${voiceId} will still be used when you generate.`,
      });
    });

    audio.onended = () => setPlayingVoice(null);
  };

  const generateSlideshow = async () => {
    if (!geminiApiKey) {
      requireGeminiApiKey();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/generate-slideshow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': geminiApiKey,
        },
        body: JSON.stringify({ topic, voice, aspectRatio }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const errorMsg = typeof data?.error === 'string' ? data.error : 'Unknown error';
        if (response.status === 401) requireGeminiApiKey();
        const friendlyError = getUserFriendlyError(errorMsg);
        toast.error(friendlyError.title, { description: friendlyError.description });
        setLoading(false);
        return;
      }

      const bundle = decodeGenerationBundle(await response.arrayBuffer());
      const presentationId = createPresentationId(bundle.title);

      await savePresentation({
        id: presentationId,
        title: bundle.title,
        speaker_notes: bundle.speakerNotes,
        aspect_ratio: bundle.aspectRatio,
        voice: bundle.voice,
        created_at: new Date().toISOString(),
        image: bundle.image,
        audio: bundle.audio,
      });

      router.prefetch(`/presentations/${presentationId}`);
      router.push(`/presentations/${presentationId}`);
    } catch (error) {
      const friendlyError = getUserFriendlyError(error);
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
          {!geminiApiKey && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Bring your own Gemini API key</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  AudibleGraphics is an open-source project and does not provide a shared Gemini
                  account. Your key pays Google directly for the generation you use and is never
                  stored on our servers.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={requireGeminiApiKey}
              >
                Add Gemini key
              </Button>
            </div>
          )}
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
                className="h-10 cursor-pointer transition-transform hover:scale-105"
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
                      {VOICES.find((v) => v.id === voice)?.name || 'Puck'}
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
