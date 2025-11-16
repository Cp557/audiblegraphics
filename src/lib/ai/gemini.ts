/**
 * Gemini AI client and utility functions
 * Uses @google/genai SDK
 */

import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs/promises';
import path from 'path';
import type { SlideData, ImageOptions } from './types';

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
You are SlideGenInputGuard, an AI assistant that determines if a user input is a suitable topic for a narrated slideshow presentation.
</role>
<instructions>
Evaluate if "${topic}" is a real-world topic, question, or concept suitable for an educational slideshow. It is fine to include topics that are silly and not real-world topics.
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
Input:Batman
Output:1
Input:Hitler
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
  } catch (error) {
    console.error('Error validating topic:', error);
    return false;
  }
}

/**
 * Generate slideshow markdown using gemini-2.5-pro
 * Returns JSON array of slide data
 */
export async function generateSlideshowMarkdown(topic: string): Promise<SlideData[]> {
  const client = createGeminiClient();

  const systemPrompt = `<role>
You are SlideGen, an AI that creates fun and engaging narrated slide decks with visual elements about various topics.
</role>
<instructions>
Create a presentation about '${topic}'.
Include:
- An introduction slide with bullet points about the overview of the presentation topic and the key areas that will be covered
- 3 content slides with bullet points
- A conclusion slide with bullet points summarizing the key points and insights.
For each slide provide:
1. Each title should be a single concise and coherent phrase accompanied by exactly one relevant emoji. (Do NOT use the colon ":" format for titles)
2. 3-4 concise bullet points, you will go into more detail in the speaker notes.
3. Clear prose speaker notes suitable for narration that is accessible to general audiences
4. A detailed and specific image prompt for an AI image generator that is relevent to the slide's content. Do not include any text in the image.
Respond with a JSON array where each element represents a slide in the following format:
\`\`\`json
[
  {
    "slide_content": "## Introduction Slide Title\\n\\n",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  },
  {
    "slide_content": "## Content Slide Title\\n\\n",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  },
  {
    "slide_content": "## Content Slide Title\\n\\n",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  },
  {
    "slide_content": "## Content Slide Title\\n\\n",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  },
  {
    "slide_content": "## Conclusion Slide Title\\n\\n",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  },
]
</instructions>`.trim();

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
      ],
      config: {
        temperature: 0.7,
      },
    });

    const responseText = response.text || '';
    return parseSlideJSON(responseText);
  } catch (error) {
    console.error('Error generating slideshow markdown:', error);
    throw error;
  }
}

/**
 * Parse JSON response from Gemini with fallback strategies
 */
function parseSlideJSON(responseText: string): SlideData[] {
  try {
    // Try to find JSON within code blocks
    const jsonMatch = responseText.match(/```json\s*(.+?)\s*```/s);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

    // Clean up the JSON text
    const cleanedJson = jsonText.replace(/\t/g, ' ');

    // Parse the JSON
    const slides = JSON.parse(cleanedJson);

    if (!Array.isArray(slides)) {
      throw new Error('Response is not an array');
    }

    return slides as SlideData[];
  } catch (error) {
    console.error('Error parsing JSON:', error);
    console.log('Attempting fallback parsing...');
    return fallbackParse(responseText);
  }
}

/**
 * Fallback parser if JSON parsing fails
 */
function fallbackParse(text: string): SlideData[] {
  const slides: SlideData[] = [];

  // Try to extract slide content and speaker notes using regex
  const contentMatches = Array.from(text.matchAll(/"slide_content"\s*:\s*"([^"]+)"/g));
  const notesMatches = Array.from(text.matchAll(/"speaker_notes"\s*:\s*"([^"]+)"/g));
  const imageMatches = Array.from(text.matchAll(/"image_prompt"\s*:\s*"([^"]+)"/g));

  const minLength = Math.min(
    contentMatches.length,
    notesMatches.length,
    imageMatches.length
  );

  for (let i = 0; i < minLength; i++) {
    slides.push({
      slide_content: contentMatches[i][1].replace(/\\n/g, '\n'),
      speaker_notes: notesMatches[i][1],
      image_prompt: imageMatches[i][1],
    });
  }

  if (slides.length === 0) {
    throw new Error('Failed to parse slideshow data');
  }

  return slides;
}

/**
 * Generate an image using gemini-2.5-flash-image model
 * Based on the streaming pattern from gemini_example.js
 */
export async function generateImage(
  prompt: string,
  outputPath: string,
  options: ImageOptions = {}
): Promise<string> {
  const client = createGeminiClient();

  // Append instruction to avoid text in images
  const enhancedPrompt = `${prompt.trim()} Do not include any text in the image.`;

  try {
    const config = {
      responseModalities: ['IMAGE'],
      imageConfig: {
        imageSize: options.imageSize || '1K',
      },
    };

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
      model: 'gemini-2.5-flash-image',
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
  } catch (error) {
    console.error('Error generating image:', error);
    return '';
  }
}
