/**
 * Gemini AI client and utility functions
 * Uses @google/genai SDK
 */

import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs/promises';
import path from 'path';
import type { InfographicData, ImageOptions } from './types';
import {
  validateTopicOpenAI,
  generateImageOpenAI
} from './openai';

/**
 * Custom error thrown when both Gemini API keys fail with 503 (overloaded)
 * This allows the caller to prompt the user for OpenAI fallback confirmation
 */
export class GeminiOverloadedError extends Error {
  constructor(message = 'Google\'s image model is currently overloaded. Please try again later or use OpenAI.') {
    super(message);
    this.name = 'GeminiOverloadedError';
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
 * Validate if a topic is suitable for a slideshow presentation
 * Uses gemini-2.5-flash model
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
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
      ],
      config: {
        temperature: 0,
      },
    });

    const result = response.text?.trim() || '0';
    return result === '1';
  } catch (error: any) {
    // Check for Rate Limit (429) or Server Error (500)
    if (error?.status === 429 || error?.status === 500 || error?.status === 503 || error?.code === 429 || error?.code === 500 || error?.code === 503) {
      console.warn(`Gemini validateTopic failed (${error.status || error.code}), switching to OpenAI...`);
      return validateTopicOpenAI(topic);
    }
    console.error('Error validating topic:', error);
    return false;
  }
}

/**
 * Generate infographic content (Script + Image Prompt)
 * Step 1: Generate Script (JSON with sections)
 * Step 2: Generate Image Prompt based on Script
 */
export async function generateInfographicContent(topic: string): Promise<InfographicData> {
  const client = createGeminiClient();

  // 1. Generate Speaker Notes in Sections
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
        "Today we are going to talk about the *fascinating* history of Rome!",
        "The Roman Republic was established in 509 BC — a pivotal moment in history.",
        "However, internal strife and civil wars eventually weakened the republic.",
        "In conclusion, Rome's legacy continues to influence us today."
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
      // Parse JSON response (handling potential markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      scriptData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse JSON script response:', responseText);
      throw new Error('Failed to generate structured script');
    }

    const sections = scriptData.script_sections || [];
    if (sections.length === 0) throw new Error('Generated script contains no sections');

    // Return sections as-is without adding artificial pauses
    // (Pauses are now handled by inserting silence audio files between chunks)
    const speaker_notes = sections.join('\n\n');

    // 2. Construct Image Prompt directly from the notes
    const image_prompt = `
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
        1. Use ONLY short headlines and captions
        2. Make ALL text large 
        4. NO paragraphs, NO sentences, NO body text, NO small captions
      - When in doubt, use an ICON instead of text.
    `.trim();

    return {
      speaker_notes,
      script_sections: sections,
      image_prompt
    };
  } catch (error) {
    console.error('Error generating infographic content:', error);
    throw error;
  }
}

/**
 * Generate an image using gemini-3-pro-image-preview model
 */
export async function generateImage(
  prompt: string,
  outputPath: string,
  options: ImageOptions = {}
): Promise<string> {
  const client = createGeminiClient();

  const enhancedPrompt = prompt.trim();
  const aspectRatio = options.aspectRatio || '16:9';

  try {
    const config = {
      responseModalities: ['IMAGE', 'TEXT'] as any, 
      imageConfig: {
        aspectRatio,
        imageSize: '1K',
      },
    };
    
    // Using the user-specified model
    // gemini-3-pro-image-preview
    // gemini-2.5-flash-image
    const model = 'gemini-3-pro-image-preview';

    const contents = [
      {
        role: 'user' as const,
        parts: [
          {
            text: enhancedPrompt,
          },
        ],
      },
    ];

    const response = await client.models.generateContentStream({
      model,
      config,
      contents,
    });

    let imageBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';

    for await (const chunk of response) {
      if (!chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        continue;
      }

      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      if (inlineData?.data) {
        imageBuffer = Buffer.from(inlineData.data, 'base64');
        mimeType = inlineData.mimeType || 'image/jpeg';
      }
    }

    if (!imageBuffer) {
      console.error('No image generated for prompt');
      return '';
    }

    await writeFile(outputPath, imageBuffer);
    return outputPath;
  } catch (error: any) {
    // Log full error details once so we can debug 500s from Gemini
    console.error('Gemini generateImage raw error:', {
      status: error?.status,
      code: error?.code,
      message: error?.message,
      details: (error as any)?.details,
      stack: error?.stack,
    });

    const isRateLimit = error?.status === 429 || error?.status === 500 || error?.status === 503 || error?.code === 429 || error?.code === 500 || error?.code === 503;
    const is503 = error?.status === 503 || error?.code === 503;
    let backupAlso503 = false;

    // Try backup key if available and it is a rate limit/resource exhausted error
    if (isRateLimit && process.env.GEMINI_API_KEY2) {
      console.warn('Primary Gemini key exhausted. Retrying with GEMINI_API_KEY2...');
      try {
        const backupClient = createGeminiClient(process.env.GEMINI_API_KEY2);
        
        // Re-run generation logic with backup client
        const config = {
          responseModalities: ['IMAGE', 'TEXT'] as any, 
          imageConfig: {
            aspectRatio,
            imageSize: '1K',
          },
        };
        const model = 'gemini-3-pro-image-preview';
        const contents = [{ role: 'user' as const, parts: [{ text: enhancedPrompt }] }];

        const response = await backupClient.models.generateContentStream({
          model,
          config,
          contents,
        });

        let imageBuffer: Buffer | null = null;
        for await (const chunk of response) {
          if (!chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) continue;
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          if (inlineData?.data) {
            imageBuffer = Buffer.from(inlineData.data, 'base64');
          }
        }

        if (imageBuffer) {
          await writeFile(outputPath, imageBuffer);
          return outputPath;
        }
      } catch (backupError: any) {
        console.error('Backup key also failed or exhausted:', backupError);
        backupAlso503 = backupError?.status === 503 || backupError?.code === 503;
      }
    }

    // If both keys failed with 503, throw GeminiOverloadedError to prompt user
    if (is503 && (backupAlso503 || !process.env.GEMINI_API_KEY2)) {
      console.warn('Both Gemini keys returned 503. Throwing GeminiOverloadedError for user confirmation.');
      throw new GeminiOverloadedError();
    }

    // Fallback to OpenAI for other rate limit errors (429, 500)
    if (isRateLimit) {
      console.warn(`Gemini generateImage failed (${error.status || error.code}), switching to OpenAI...`);
      return generateImageOpenAI(enhancedPrompt, outputPath, options);
    }

    console.error('Error generating image (non-429/500/503):', error);
    return '';
  }
}

