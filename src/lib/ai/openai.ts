import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import path from 'path';
import type { ImageOptions } from './types';

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY is not set. Fallback will not work.');
    return null;
  }
  return new OpenAI({ apiKey });
}

export async function validateTopicOpenAI(topic: string): Promise<boolean> {
  const client = createOpenAIClient();
  if (!client) return false;

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
    const response = await client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        { role: 'user', content: `Input: ${topic}` },
      ],
      temperature: 0,
    });

    const result = response.choices[0]?.message?.content?.trim();
    return result === '1';
  } catch (error) {
    console.error('OpenAI validation error:', error);
    return false;
  }
}

export async function generateImageOpenAI(
  prompt: string,
  outputPath: string,
  options: ImageOptions = {}
): Promise<string> {
  const client = createOpenAIClient();
  if (!client) return '';

  const enhancedPrompt = `${prompt.trim()} Do not include any text in the image.`;

  try {
    const response = await client.images.generate({
      model: 'gpt-image-1-mini',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024', // Changed to supported 1024x1024 size
    });

    const b64Json = response.data?.[0]?.b64_json;
    const url = response.data?.[0]?.url;

    if (!b64Json && !url) {
      throw new Error('No image data (b64_json or url) from OpenAI');
    }

    let imageBuffer: Buffer;

    if (b64Json) {
      imageBuffer = Buffer.from(b64Json, 'base64');
    } else if (url) {
      const imageResponse = await fetch(url);
      const arrayBuffer = await imageResponse.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
       // This block is theoretically unreachable due to the check above, but satisfies TS
       throw new Error('No image data available');
    }
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await writeFile(outputPath, imageBuffer);
    
    console.log(`Image saved to (OpenAI): ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('OpenAI image generation error:', error);
    return '';
  }
}

