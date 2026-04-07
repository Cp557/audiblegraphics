import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

function getUploadDir(presentationId: string): string {
  return path.join(process.cwd(), 'public', 'uploads', presentationId);
}

export async function ensureUploadDir(presentationId: string): Promise<string> {
  const dir = getUploadDir(presentationId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveImage(sourcePath: string, presentationId: string): Promise<void> {
  const dir = await ensureUploadDir(presentationId);
  await fs.copyFile(sourcePath, path.join(dir, 'image.jpg'));
}

export async function saveAudio(sourcePath: string, presentationId: string): Promise<void> {
  const dir = await ensureUploadDir(presentationId);
  await fs.copyFile(sourcePath, path.join(dir, 'audio.mp3'));
}

export async function saveVideo(sourcePath: string, presentationId: string): Promise<void> {
  const dir = await ensureUploadDir(presentationId);
  await fs.copyFile(sourcePath, path.join(dir, 'video.mp4'));
}

export async function deletePresentation(presentationId: string): Promise<void> {
  const dir = getUploadDir(presentationId);
  await fs.rm(dir, { recursive: true, force: true });
}

export function videoExists(presentationId: string): boolean {
  return existsSync(path.join(getUploadDir(presentationId), 'video.mp4'));
}

export function getLocalFilePaths(presentationId: string): {
  imagePath: string;
  audioPath: string;
  videoPath: string;
} {
  const dir = getUploadDir(presentationId);
  return {
    imagePath: path.join(dir, 'image.jpg'),
    audioPath: path.join(dir, 'audio.mp3'),
    videoPath: path.join(dir, 'video.mp4'),
  };
}
