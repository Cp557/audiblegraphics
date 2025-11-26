/**
 * TypeScript type definitions for AI infographic generation
 */

/**
 * Represents the generated content for an infographic
 */
export interface InfographicData {
  speaker_notes: string;
  script_sections: string[];
  image_prompt: string;
}

/**
 * Result of the generation process with URLs
 */
export interface InfographicResult extends InfographicData {
  image_url: string;
  audio_url: string;
}

/**
 * Options for generation
 */
export interface GenerationOptions {
  topic: string;
  outputDir?: string;
  userId?: string;
  presentationId?: string;
  voice?: string;
  aspectRatio?: '16:9' | '9:16';
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
