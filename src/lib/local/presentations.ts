import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

interface Meta {
  title: string;
  speaker_notes: string | null;
  aspect_ratio: string;
  created_at: string;
}

export interface Presentation {
  id: string;
  title: string;
  speaker_notes: string | null;
  aspect_ratio: string;
  created_at: string;
  has_video: boolean;
  image_url: string;
  audio_url: string;
  video_url: string | null;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = toSlug(title) || 'infographic';
  let slug = base;
  let counter = 2;
  while (existsSync(path.join(UPLOADS_DIR, slug))) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

function metaPath(slug: string): string {
  return path.join(UPLOADS_DIR, slug, 'meta.json');
}

function fromMeta(slug: string, meta: Meta): Presentation {
  const hasVideo = existsSync(path.join(UPLOADS_DIR, slug, 'video.mp4'));
  return {
    id: slug,
    ...meta,
    has_video: hasVideo,
    image_url: `/uploads/${slug}/image.jpg`,
    audio_url: `/uploads/${slug}/audio.mp3`,
    video_url: hasVideo ? `/uploads/${slug}/video.mp4` : null,
  };
}

export async function getPresentations(): Promise<Presentation[]> {
  try {
    const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
    const results = await Promise.all(
      entries
        .filter(e => e.isDirectory())
        .map(async (e) => {
          try {
            const raw = await fs.readFile(metaPath(e.name), 'utf-8');
            return fromMeta(e.name, JSON.parse(raw) as Meta);
          } catch {
            return null;
          }
        })
    );
    return results
      .filter((p): p is Presentation => p !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function getPresentation(slug: string): Promise<Presentation | null> {
  try {
    const raw = await fs.readFile(metaPath(slug), 'utf-8');
    return fromMeta(slug, JSON.parse(raw) as Meta);
  } catch {
    return null;
  }
}

export async function createPresentation(
  slug: string,
  title: string,
  aspectRatio: string
): Promise<void> {
  await fs.mkdir(path.join(UPLOADS_DIR, slug), { recursive: true });
  const meta: Meta = {
    title,
    speaker_notes: null,
    aspect_ratio: aspectRatio,
    created_at: new Date().toISOString(),
  };
  await fs.writeFile(metaPath(slug), JSON.stringify(meta, null, 2), 'utf-8');
}

export async function updatePresentationAssets(
  slug: string,
  updates: { speaker_notes: string }
): Promise<void> {
  const raw = await fs.readFile(metaPath(slug), 'utf-8');
  const meta = JSON.parse(raw) as Meta;
  await fs.writeFile(metaPath(slug), JSON.stringify({ ...meta, ...updates }, null, 2), 'utf-8');
}

// Returns the new slug (renames the folder if the slug changes)
export async function updatePresentationTitle(slug: string, newTitle: string): Promise<string> {
  const raw = await fs.readFile(metaPath(slug), 'utf-8');
  const meta = JSON.parse(raw) as Meta;
  const updated: Meta = { ...meta, title: newTitle };

  const newBase = toSlug(newTitle) || 'infographic';

  if (newBase === slug) {
    await fs.writeFile(metaPath(slug), JSON.stringify(updated, null, 2), 'utf-8');
    return slug;
  }

  // Find a unique slug, excluding the current folder from collision check
  let targetSlug = newBase;
  let counter = 2;
  while (existsSync(path.join(UPLOADS_DIR, targetSlug)) && targetSlug !== slug) {
    targetSlug = `${newBase}-${counter}`;
    counter++;
  }

  if (targetSlug === slug) {
    await fs.writeFile(metaPath(slug), JSON.stringify(updated, null, 2), 'utf-8');
    return slug;
  }

  await fs.writeFile(metaPath(slug), JSON.stringify(updated, null, 2), 'utf-8');
  await fs.rename(path.join(UPLOADS_DIR, slug), path.join(UPLOADS_DIR, targetSlug));
  return targetSlug;
}

// No-op: has_video is derived from the filesystem
export async function updatePresentationVideoFlag(_slug: string, _hasVideo: boolean): Promise<void> {}

export async function deletePresentation(slug: string): Promise<void> {
  await fs.rm(path.join(UPLOADS_DIR, slug), { recursive: true, force: true });
}
