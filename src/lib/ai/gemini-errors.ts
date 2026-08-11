export class GeminiCreditsDepletedError extends Error {
  constructor(message = 'Your Gemini credits are depleted. Add credits in Google AI Studio, then try again.') {
    super(message);
    this.name = 'GeminiCreditsDepletedError';
  }
}

export function isGeminiCreditsDepletedError(error: unknown): boolean {
  if (error instanceof GeminiCreditsDepletedError) return true;

  const text = getErrorText(error);
  return [
    /prepay(?:ment|paid)? credits? (?:are |have been )?depleted/i,
    /credits? (?:are |have been )?depleted/i,
    /insufficient (?:prepay(?:ment|paid)? )?credits?/i,
    /credit balance .*(?:depleted|insufficient|zero)/i,
  ].some((pattern) => pattern.test(text));
}

function getErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  try {
    const serialized = JSON.stringify(error);
    return serialized ? `${message} ${serialized}` : message;
  } catch {
    return message;
  }
}
