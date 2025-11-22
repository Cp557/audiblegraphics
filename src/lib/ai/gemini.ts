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
 * Initialize Gemini client with API key
 */
export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
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
    if (error?.status === 429 || error?.status === 500 || error?.code === 429 || error?.code === 500) {
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

    Example format:
    \`\`\`json
    {
      "script_sections": [
        "Today we are going to talk about the history of Rome...",
        "The Roman Republic was established in 509 BC...",
        "However, internal strife and civil wars...",
        "In conclusion..."
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

    // Combine sections for full notes
    const speaker_notes = sections.join('\n\n');

    // 2. Construct Image Prompt directly from the notes
    const image_prompt = `
      Create a detailed, visually rich, and comprehensive INFOGRAPHIC based on the following narration script.
      
      SCRIPT:
      "${speaker_notes}"
      
      INSTRUCTIONS:
      - Visualize the key points, facts, and data from the script.
      - Use a clean, modern, vector-art or flat-design style.
      - Organize the layout logically to flow with the narrative.
      - Use professional color palettes and clear iconography.
      - Only include lables. Do NOT inlcude headers, titles, or body text.
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

  try {
    const config = {
      responseModalities: ['IMAGE', 'TEXT'] as any, // Type assertion might be needed depending on SDK version
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: '1K',
      },
    };
    
    // Using the user-specified model
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
      console.error('No image generated for prompt:', prompt);
      return '';
    }

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await writeFile(outputPath, imageBuffer);

    console.log(`Image saved to: ${outputPath}`);
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

    // Fallback
    if (error?.status === 429 || error?.status === 500 || error?.code === 429 || error?.code === 500) {
      console.warn(`Gemini generateImage failed (${error.status || error.code}), switching to OpenAI...`);
      return generateImageOpenAI(enhancedPrompt, outputPath, options);
    }

    console.error('Error generating image (non-429/500):', error);
    return '';
  }
}
