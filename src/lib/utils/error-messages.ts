/**
 * Maps API error responses to user-friendly messages
 */

export interface UserFriendlyError {
  title: string;
  description: string;
  action?: string;
}

// Known error patterns and their friendly messages
const ERROR_MAP: Record<string, UserFriendlyError> = {
  // Authentication errors
  'Unauthorized': {
    title: 'Session Expired',
    description: 'Please sign in again to continue.',
    action: 'Sign In',
  },
  
  // Rate limiting
  'monthly limit': {
    title: 'Limit Reached',
    description: 'You\'ve used all your infographics for this month.',
    action: 'Upgrade Plan',
  },
  
  // Validation errors
  'not suitable for an infographic': {
    title: 'Invalid Topic',
    description: 'This topic isn\'t suitable for an infographic. Try a different educational subject.',
  },
  
  // Server configuration errors
  'Server configuration error': {
    title: 'Service Unavailable',
    description: 'Our AI service is temporarily unavailable. Please try again in a few minutes.',
  },
  
  // Server overload errors
  'model is overloaded': {
    title: 'Service Busy',
    description: 'Our AI service is currently busy. Please try again in a few minutes.',
  },
  '503': {
    title: 'Service Busy',
    description: 'Our AI service is currently busy. Please try again in a few minutes.',
  },
  
  // Generation errors
  'Failed to generate infographic': {
    title: 'Generation Failed',
    description: 'We couldn\'t create your infographic. Please try again later.',
  },
  
  // Video errors (combined into one)
  'video': {
    title: 'Video Download Failed',
    description: 'Unable to download video. Please try again later.',
  },
  
  // Stripe/Payment errors
  'No subscription found': {
    title: 'No Subscription',
    description: 'You don\'t have an active subscription to manage.',
  },
  'checkout session': {
    title: 'Payment Error',
    description: 'Unable to start the checkout process. Please try again.',
  },
  
  // Network errors
  'Failed to fetch': {
    title: 'Connection Error',
    description: 'Unable to connect to our servers. Please check your internet connection.',
  },
  'NetworkError': {
    title: 'Network Issue',
    description: 'A network error occurred. Please check your connection and try again.',
  },
  
  // Content safety filter
  'Google blocked this image': {
    title: 'Content Blocked',
    description: 'Google\'s image safety filters blocked this topic. Try rephrasing or choose a different topic.',
  },
};

// Default fallback error
const DEFAULT_ERROR: UserFriendlyError = {
  title: 'Something Went Wrong',
  description: 'An unexpected error occurred. Please try again later.',
};

/**
 * Converts an API error string to a user-friendly error object
 */
export function getUserFriendlyError(error: string | Error | unknown): UserFriendlyError {
  const errorString = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : 'Unknown error';
  
  // Check each pattern against the error string
  for (const [pattern, friendlyError] of Object.entries(ERROR_MAP)) {
    if (errorString.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyError;
    }
  }
  
  return DEFAULT_ERROR;
}

/**
 * Shorthand to get just the description for simple use cases
 */
export function getErrorMessage(error: string | Error | unknown): string {
  return getUserFriendlyError(error).description;
}

