'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SlideshowInput() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) {
      console.log('❌ Please enter a topic');
      return;
    }

    setLoading(true);
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
        return;
      }

      console.log('✅ Slideshow generated successfully!');
      console.log('📊 Result:', data);

      // Navigate to the newly created presentation
      if (data.presentation_id) {
        router.push(`/dashboard/${data.presentation_id}`);
      }
    } catch (error) {
      console.error('❌ Failed to generate slideshow:', error);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border bg-card p-10">
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
          disabled={loading || !topic.trim()}
          className="cursor-pointer transition-transform hover:scale-105"
        >
          {loading ? 'Generating...' : 'Generate'}
        </Button>
      </form>
    </div>
  );
}

