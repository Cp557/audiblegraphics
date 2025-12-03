import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import path from 'path';
import type { ImageOptions, InfographicData } from './types';

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

/**
 * Generate infographic content using OpenAI GPT-5.1
 * Fallback for when Gemini is unavailable
 */
export async function generateInfographicContentOpenAI(topic: string): Promise<InfographicData> {
  const client = createOpenAIClient();
  if (!client) {
    throw new Error('OpenAI API key not configured for fallback');
  }

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
    console.warn('[OpenAI Fallback] Generating infographic content with GPT-5.1...');
    
    const response = await client.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'user', content: scriptPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0]?.message?.content?.trim() || '';
    let scriptData: { script_sections: string[] };

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      scriptData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse JSON script response from OpenAI:', responseText);
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

    return {
      speaker_notes,
      script_sections: sections,
      image_prompt
    };
  } catch (error) {
    console.error('OpenAI infographic content generation error:', error);
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

  // Map aspectRatio to OpenAI supported sizes
  // Supported: '1024x1024', '1024x1536', '1536x1024', 'auto'
  let size: '1024x1024' | '1536x1024' | '1024x1536' = '1024x1024';
  if (options.aspectRatio === '16:9') {
    size = '1536x1024'; // Landscape (3:2, closest to 16:9)
  } else if (options.aspectRatio === '9:16') {
    size = '1024x1536'; // Portrait (2:3, closest to 9:16)
  }

  try {
    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt: enhancedPrompt,
      n: 1,
      size,
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

