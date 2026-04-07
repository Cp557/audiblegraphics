/**
 * Maps API error responses to user-friendly messages
 */

export interface UserFriendlyError {
  title: string;
  description: string;
  action?: string;
}

const ERROR_MAP: Record<string, UserFriendlyError> = {
  // Validation errors
  'not suitable for an infographic': {
    title: 'Invalid Topic',
    description: "This topic isn't suitable for an infographic. Try a different educational subject.",
  },

  // API key configuration errors
  'GEMINI_API_KEY is not configured': {
    title: 'API Key Missing',
    description: 'GEMINI_API_KEY is not set in your .env.local file.',
  },
  'INWORLD_API_KEY is not configured': {
    title: 'API Key Missing',
    description: 'INWORLD_API_KEY is not set in your .env.local file.',
  },

  // Service overload / down
  'Gemini is down right now': {
    title: 'Gemini Unavailable',
    description: 'Gemini is down right now, try again later.',
  },
  'model is overloaded': {
    title: 'Service Busy',
    description: 'The AI service is currently busy. Please try again in a few minutes.',
  },
  '503': {
    title: 'Service Busy',
    description: 'The AI service is currently busy. Please try again in a few minutes.',
  },

  // Content safety
  'Google blocked this image': {
    title: 'Content Blocked',
    description: "Google's image safety filters blocked this topic. Try rephrasing or choose a different topic.",
  },

  // Generation errors
  'Failed to generate infographic': {
    title: 'Generation Failed',
    description: "Couldn't create your infographic. Please try again.",
  },

  // Video errors
  'video': {
    title: 'Video Failed',
    description: 'Unable to generate video. Please try again.',
  },

  // Network errors
  'Failed to fetch': {
    title: 'Connection Error',
    description: 'Unable to connect. Please check your internet connection.',
  },
  'NetworkError': {
    title: 'Network Issue',
    description: 'A network error occurred. Please check your connection and try again.',
  },
};

const DEFAULT_ERROR: UserFriendlyError = {
  title: 'Something Went Wrong',
  description: 'An unexpected error occurred. Please try again.',
};

export function getUserFriendlyError(error: string | Error | unknown): UserFriendlyError {
  const errorString =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error';

  for (const [pattern, friendlyError] of Object.entries(ERROR_MAP)) {
    if (errorString.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyError;
    }
  }

  return DEFAULT_ERROR;
}

export function getErrorMessage(error: string | Error | unknown): string {
  return getUserFriendlyError(error).description;
}
