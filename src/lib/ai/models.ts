export const GEMINI_MODELS = {
  text: process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash',
  image: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
  imageFallback: process.env.GEMINI_IMAGE_FALLBACK_MODEL || 'gemini-3-pro-image',
  tts: process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview',
} as const;
