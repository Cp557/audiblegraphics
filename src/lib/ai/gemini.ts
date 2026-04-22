/**
 * Gemini AI client and utility functions
 * Uses @google/genai SDK
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { writeFile } from 'fs/promises';
import type { InfographicData, ImageOptions } from './types';

type GeminiErrorDetails = {
  status?: number;
  code?: number;
  message?: string;
};

/**
 * Thrown when Gemini is overloaded or rate-limited and cannot generate an image
 */
export class GeminiOverloadedError extends Error {
  constructor(message = 'Gemini is down right now, try again later.') {
    super(message);
    this.name = 'GeminiOverloadedError';
  }
}

/**
 * Thrown when Gemini blocks image generation due to safety filters
 */
export class GeminiImageSafetyError extends Error {
  constructor(message = 'Gemini blocked this image due to content safety filters. The topic may contain sensitive content. Please try a different topic.') {
    super(message);
    this.name = 'GeminiImageSafetyError';
  }
}

/**
 * Initialize Gemini client with API key
 */
export function createGeminiClient(specificKey?: string) {
  const apiKey = specificKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Validate if a topic is suitable for an infographic
 */
export async function validateTopic(topic: string): Promise<boolean> {
  const client = createGeminiClient();

  const systemPrompt = `<role>
You are an AI assistant that determines if a user input is a suitable topic for an infographic.
</role>
<instructions>
Evaluate if "${topic}" is a real-world topic, question, or concept suitable for an educational infographic. It is fine to include topics that are silly, offensive, and not real-world topics.
If it is a valid topic, respond with exactly: 1
If it is nonsense, gibberish, meaningless, empty, or not a valid topic, respond with exactly: 0
Only respond with a single digit: 1 or 0. No spaces, newlines or explanations. JUST THE NUMBER 1 OR 0.
</instructions>
<examples>
Input:How does lightning form?
Output:1
Input:The history of horses
Output:1
Input:basketball
Output:1
Input:boobs
Output:1
Input:King Kong
Output:1
Input:cambodian killing fields
Output:1
Input:Batman
Output:1
Input:Hitler
Output:1
Input:Pablo Escobar
Output:1
Input:How do nuclear bombs work?
Output:1
Input:bing bong
Output:0
Input:asdf
Output:0
Input:qwerty
Output:0
Input::)
Output:0
Input:
Output:0
</examples>`.trim();

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: { temperature: 0 },
    });

    const result = response.text?.trim() || '0';
    return result === '1';
  } catch (error) {
    console.error('Error validating topic:', error);
    return false;
  }
}

/**
 * Generate infographic content (Script + Image Prompt)
 */
export async function generateInfographicContent(topic: string): Promise<InfographicData> {
  const client = createGeminiClient();

  const scriptPrompt = `
    You are an expert educational content creator.
    Create a compelling, fun, and engaging narration script about: "${topic}".
    The script should be suitable for a 2-3 minute narrated infographic video.
    It should be clear, concise, and packed with interesting facts.
    Do not include headers, scene directions, or formatting—just the spoken words.

    IMPORTANT:
    - Break the script into logical narrative sections (e.g., Introduction, Key Point 1, Key Point 2, Conclusion).
    - Each section MUST be under 1500 characters to allow for audio generation.
    - Return the result as a JSON object with a single key "script_sections" containing an array of strings.

    VOICE ENHANCEMENT:
    You can use special punctuation to improve the narration quality when necessary (but don't overuse):
    - Use ! for emphatic or excited statements (makes the voice more enthusiastic)
    - Use *word* to emphasize specific words (e.g., "This is *really* important")
    - Use — (em-dash) for natural pauses or breaks in thought
    - Always use proper punctuation at the end of sentences
    Apply these sparingly and only when they genuinely enhance the narration or clarity.

    Example format:
    \`\`\`json
    {
      "script_sections": [
        "Today we are going to talk about the *fascinating* history of Rome...",
        "The Roman Republic was established in 509 BC — a pivotal moment in history...",
        "In conclusion, Rome's legacy continues to influence us today..."
      ]
    }
    \`\`\`
  `.trim();

  try {
    const scriptResponse = await client.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ role: 'user', parts: [{ text: scriptPrompt }] }],
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      }
    });

    const responseText = scriptResponse.text?.trim() || '';
    let scriptData: { script_sections: string[] };

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      scriptData = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse JSON script response:', responseText);
      throw new Error('Failed to generate structured script');
    }

    const sections = scriptData.script_sections || [];
    if (sections.length === 0) throw new Error('Generated script contains no sections');

    const speaker_notes = sections.join('\n\n');

    const image_prompt = `
      CONTEXT: This is for an EDUCATIONAL infographic. Images that might contain sensitive topics are acceptable since they are for educational purposes.

      Create an engaging infographic based on the following narration script.

      SCRIPT:
      "${speaker_notes}"

      INSTRUCTIONS:
      - Visualize the key points, facts, and data from the script.
      - Use a clean, modern, vector-art or flat-design style.
      - Organize the layout logically to flow with the narrative.
      - Use professional color palettes and clear iconography.

      TEXT RULES (CRITICAL):
      - STRONGLY PREFER icons, illustrations, and visual metaphors over text.
      - If you MUST include any text, follow these rules strictly:
        1. Use ONLY short headlines and labels
        2. Make ALL text large and readable
        3. NO paragraphs, NO sentences, NO body text
      - When in doubt, use an ICON instead of text.
    `.trim();

    return { speaker_notes, script_sections: sections, image_prompt };
  } catch (error) {
    console.error('Error generating infographic content:', error);

    if (isRetryableGeminiError(error)) {
      throw new GeminiOverloadedError();
    }

    throw error;
  }
}

/**
 * Sanitize speaker notes that were blocked by content safety filters
 */
export async function sanitizeSpeakerNotes(topic: string, blockedScriptSections: string[]): Promise<string[]> {
  const client = createGeminiClient();

  const originalPrompt = `You are an expert educational content creator.
Create a compelling, fun, and engaging narration script about: "${topic}".
The script should be suitable for a 2-3 minute narrated infographic video.
It should be clear, concise, and packed with interesting facts.
Do not include headers, scene directions, or formatting—just the spoken words.

IMPORTANT:
- Break the script into logical narrative sections (e.g., Introduction, Key Point 1, Key Point 2, Conclusion).
- Each section MUST be under 1500 characters to allow for audio generation.
- Return the result as a JSON object with a single key "script_sections" containing an array of strings.`;

  const blockedOutput = JSON.stringify({ script_sections: blockedScriptSections }, null, 2);

  const sanitizePrompt = `
<user_input>
${originalPrompt}
</user_input>

<output>
${blockedOutput}
</output>

The image generation model was blocked by Gemini's content safety filters when trying to create an infographic from the script above.

Your job is to rewrite the script so that it will no longer be blocked by content safety filters while maintaining all the educational value and key facts.

Guidelines:
- Keep all important facts and educational information
- Use more neutral, clinical, or academic language where needed
- Avoid graphic descriptions or overly sensitive phrasing
- Focus on the educational and historical aspects
- Maintain the same structure, length, and formatting

Output the rewritten script in the EXACT SAME JSON FORMAT as the original output above.
  `.trim();

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ role: 'user', parts: [{ text: sanitizePrompt }] }],
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text?.trim() || '';

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const scriptData: { script_sections: string[] } = JSON.parse(jsonStr);
      return scriptData.script_sections || blockedScriptSections;
    } catch {
      console.error('[SANITIZATION] Failed to parse response');
      return blockedScriptSections;
    }
  } catch (error) {
    console.error('[SANITIZATION] Error:', getErrorMessage(error));
    return blockedScriptSections;
  }
}

/**
 * Generate an image — tries Flash first, falls back to Pro on non-safety failures.
 * Uses GEMINI_API_KEY2 as a backup key if the primary is rate-limited.
 */
export async function generateImage(
  prompt: string,
  outputPath: string,
  options: ImageOptions = {}
): Promise<string> {
  const client = createGeminiClient();
  const enhancedPrompt = prompt.trim();
  const aspectRatio = options.aspectRatio || '16:9';

  const FLASH_MODEL = 'gemini-3.1-flash-image-preview';
  const PRO_MODEL = 'gemini-3-pro-image-preview';

  const streamImage = async (genClient: ReturnType<typeof createGeminiClient>, model: string): Promise<Buffer> => {
    const config = {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
      imageConfig: { aspectRatio, imageSize: '1K' },
    };
    const contents = [{ role: 'user' as const, parts: [{ text: enhancedPrompt }] }];
    const response = await genClient.models.generateContentStream({ model, config, contents });

    let imageBuffer: Buffer | null = null;
    for await (const chunk of response) {
      if (chunk.candidates?.[0]?.finishReason === 'IMAGE_SAFETY') throw new GeminiImageSafetyError();
      const inlineData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) imageBuffer = Buffer.from(inlineData.data, 'base64');
    }

    if (!imageBuffer) throw new GeminiImageSafetyError('No image was generated. This may be due to content safety filters.');
    return imageBuffer;
  };

  try {
    let imageBuffer: Buffer;

    // Try Flash first, fall back to Pro on non-safety failures
    try {
      imageBuffer = await streamImage(client, FLASH_MODEL);
    } catch (flashError) {
      if (flashError instanceof GeminiImageSafetyError) throw flashError;
      console.warn('Flash image model failed, falling back to Pro:', getErrorMessage(flashError));
      imageBuffer = await streamImage(client, PRO_MODEL);
    }

    await writeFile(outputPath, imageBuffer);
    return outputPath;
  } catch (error) {
    if (error instanceof GeminiImageSafetyError || error instanceof GeminiOverloadedError) {
      throw error;
    }

    const errorDetails = getErrorDetails(error);
    console.error('Gemini generateImage raw error:', {
      status: errorDetails.status,
      code: errorDetails.code,
      message: errorDetails.message,
    });

    const isRateLimit = isRetryableGeminiError(error);

    // Try backup key on rate limit/overload
    if (isRateLimit && process.env.GEMINI_API_KEY2) {
      console.warn('Primary Gemini key exhausted. Retrying with GEMINI_API_KEY2...');
      try {
        const backupClient = createGeminiClient(process.env.GEMINI_API_KEY2);
        const imageBuffer = await streamImage(backupClient, PRO_MODEL);
        await writeFile(outputPath, imageBuffer);
        return outputPath;
      } catch (backupError) {
        console.error('Backup key also failed:', backupError);
      }
    }

    if (isRateLimit) {
      throw new GeminiOverloadedError();
    }

    console.error('Error generating image:', error);
    return '';
  }
}

function getErrorDetails(error: unknown): GeminiErrorDetails {
  if (typeof error === 'object' && error !== null) {
    return error as GeminiErrorDetails;
  }

  return { message: String(error) };
}

function getErrorMessage(error: unknown): string {
  return getErrorDetails(error).message || String(error);
}

function isRetryableGeminiError(error: unknown): boolean {
  const { status, code } = getErrorDetails(error);
  return status === 429 || status === 500 || status === 503 ||
    code === 429 || code === 500 || code === 503;
}
