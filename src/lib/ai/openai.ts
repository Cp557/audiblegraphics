import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import path from 'path';
import type { SlideData, ImageOptions } from './types';

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

export async function generateSlideshowMarkdownOpenAI(topic: string): Promise<SlideData[]> {
  const client = createOpenAIClient();
  if (!client) throw new Error('OpenAI fallback failed: API key missing');

  const systemPrompt = `<role>
You are SlideGen, an AI that creates fun and engaging narrated slide decks with visual elements about various topics & questions.
</role>
<instructions>
Create a presentation about '${topic}'.
Include:
- An introduction slide with bullet points about the overview of the presentation topic and the key areas that will be covered
- 3 content slides with bullet points
- A conclusion slide with bullet points summarizing the key points and insights.
For each slide provide:
1. Each title should be a single concise and coherent phrase (Do NOT use the colon ":" format for titles)
2. 3 bullet points that are brief and concise, they should not be complete sentences (You will go into more detail in the speaker notes.) each starting with "- " and separated by newlines (\\n).
3. Clear prose speaker notes suitable for narration that is accessible to general audiences and aligns with the bullet points.
4. A detailed and specific image prompt for an AI image generator that is relevent to the slide's content. Do not include any text in the image.
Respond with a JSON array where each element represents a slide in the following format:
\`\`\`json
[
  {
    "slide_title": "Introduction Slide Title",
    "slide_content": "- First bullet point\\n- Second bullet point\\n- Third bullet point",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  },
  {
    "slide_title": "Content Slide Title",
    "slide_content": "- First bullet point\\n- Second bullet point\\n- Third bullet point",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  },
  {
    "slide_title": "Content Slide Title",
    "slide_content": "- First bullet point\\n- Second bullet point\\n- Third bullet point",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  },
  {
    "slide_title": "Content Slide Title",
    "slide_content": "- First bullet point\\n- Second bullet point\\n- Third bullet point",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  },
  {
    "slide_title": "Conclusion Slide Title",
    "slide_content": "- First bullet point\\n- Second bullet point\\n- Third bullet point",
    "speaker_notes": "Speaker notes",
    "image_prompt": "Image prompt"
  }
]
</instructions>`.trim();

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a slideshow about: ${topic}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No content from OpenAI');

    // Handle case where OpenAI wraps array in an object like { "slides": [...] }
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch (e) {
        // Sometimes json_object format might still return markdown code blocks
        const match = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
            parsed = JSON.parse(match[1]);
        } else {
            parsed = JSON.parse(content);
        }
    }

    if (Array.isArray(parsed)) return parsed;
    if (parsed.slides && Array.isArray(parsed.slides)) return parsed.slides;
    
    // If it's a single object, wrap it - or if it's weird structure, try to extract array
    return Array.isArray(parsed) ? parsed : [parsed];

  } catch (error) {
    console.error('OpenAI slideshow generation error:', error);
    throw error;
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

