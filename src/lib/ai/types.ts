/**
 * TypeScript type definitions for AI slideshow generation
 */

/**
 * Represents a single slide with content, speaker notes, and image prompt
 */
export interface SlideData {
  slide_title: string;
  slide_content: string;
  speaker_notes: string;
  image_prompt: string;
}

/**
 * Result of the complete slideshow generation process
 */
export interface GenerationResult {
  slides_md: string[];
  audio_files: string[];
  image_files: (string | null)[];
}

/**
 * Enhanced slide data with storage URLs
 */
export interface SlideWithUrls extends SlideData {
  image_url: string;
  audio_url: string;
}

/**
 * Options for slideshow generation
 */
export interface GenerationOptions {
  topic: string;
  outputDir?: string;
  userId?: string;
  presentationId?: string;
  voice?: string;
}

/**
 * Audio generation parameters for Deepgram
 */
export interface AudioOptions {
  model?: string;
  voice?: string;
  encoding?: 'linear16' | 'mulaw' | 'alaw' | 'mp3' | 'opus' | 'flac' | 'aac';
  sampleRate?: number;
}

/**
 * Image generation parameters for Gemini
 */
export interface ImageOptions {
  imageSize?: '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}
