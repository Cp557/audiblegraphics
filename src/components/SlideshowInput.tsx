'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SlideshowInput() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const preloadSlideImages = async (
    slides: Array<{ image_url?: string | null }> | undefined,
  ) => {
    if (typeof window === 'undefined' || !slides || slides.length === 0) {
      return;
    }

    const urls = slides
      .map((slide) => slide.image_url)
      .filter((url): url is string => Boolean(url));

    if (urls.length === 0) {
      return;
    }

    await Promise.all(
      urls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = img.onerror = () => resolve();
            img.src = url;
          }),
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) {
      console.log('❌ Please enter a topic');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('🚀 Generating slideshow for topic:', topic);
    console.log('⏳ This may take 30-60 seconds...');

    try {
      const response = await fetch('/api/generate-slideshow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Error:', data);
        setError(
          typeof data?.error === 'string'
            ? data.error
            : 'Something went wrong while generating the slideshow. Please try again.'
        );
        setLoading(false);
        return;
      }

      console.log('✅ Slideshow generated successfully!');
      console.log('📊 Result:', data);

      // Navigate to the newly created presentation
      if (data.presentation_id) {
        await preloadSlideImages(data.slides);
        router.prefetch(`/dashboard/${data.presentation_id}`);
        router.push(`/dashboard/${data.presentation_id}`);
      }
    } catch (error) {
      console.error('❌ Failed to generate slideshow:', error);
      setError('Unable to reach the server. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border bg-card p-10">
      {loading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-6 text-center text-lg font-semibold">
            Generating slideshow
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            We will redirect you once it&apos;s finished.
          </p>
        </div>
      ) : (
        <>
          <h2 className="mb-7 text-center text-xl font-semibold">
            Enter Topic or Question
          </h2>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g. Milky Way Galaxy. History of Rome. Do fish ever get thirsty? How does lightning form?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!topic.trim()}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              Generate
            </Button>
          </form>
          {error && (
            <p className="mt-4 text-center text-sm text-red-500">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

