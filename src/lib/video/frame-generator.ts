import sharp from 'sharp';
import { Slide } from '@/lib/supabase/presentations';

const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;
const PADDING = 40;
const TITLE_FONT_SIZE = 48;
const CONTENT_FONT_SIZE = 28;
const LINE_HEIGHT = 1.4;
const MAX_CONTENT_WIDTH = FRAME_WIDTH - PADDING * 2;

interface SlideFrameOptions {
  slide: Slide;
  imageBuffer?: Buffer;
}

/**
 * Normalizes slide content into bullet points or plain text lines
 */
function normalizeSlideContent(content: string): { isBulleted: boolean; lines: string[] } {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const isBulleted = lines.length > 0 && lines.every((line) => line.startsWith('- '));
  const cleanedLines = isBulleted
    ? lines.map((line) => line.replace(/^-+\s*/, ''))
    : lines;

  return { isBulleted, lines: cleanedLines };
}

/**
 * Creates an SVG with text content (title and bullet points)
 */
function createTextSVG(title: string, content: string): string {
  const { isBulleted, lines } = normalizeSlideContent(content);

  let yPosition = PADDING + TITLE_FONT_SIZE;

  // Build SVG content
  let svgContent = `<svg width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}">
    <style>
      .title { font-family: 'Arial', sans-serif; font-size: ${TITLE_FONT_SIZE}px; font-weight: bold; fill: #ffffff; }
      .content { font-family: 'Georgia', serif; font-size: ${CONTENT_FONT_SIZE}px; fill: #ffffff; }
      .bullet { font-family: 'Georgia', serif; font-size: ${CONTENT_FONT_SIZE}px; fill: #ffffff; }
    </style>`;

  // Add title (centered)
  svgContent += `
    <text x="${FRAME_WIDTH / 2}" y="${yPosition}" text-anchor="middle" class="title">${escapeXml(title)}</text>`;

  yPosition += TITLE_FONT_SIZE * LINE_HEIGHT + 30; // Space after title

  // Add bullet points or content lines (centered)
  lines.slice(0, 5).forEach((line, index) => {
    const lineY = yPosition + index * (CONTENT_FONT_SIZE * LINE_HEIGHT);
    const bulletPrefix = isBulleted ? '• ' : '';
    const text = bulletPrefix + truncateText(line, 80);

    svgContent += `
    <text x="${FRAME_WIDTH / 2}" y="${lineY}" text-anchor="middle" class="content">${escapeXml(text)}</text>`;
  });

  svgContent += '</svg>';

  return svgContent;
}

/**
 * Escapes XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Truncates text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Downloads an image from a URL and returns a Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Creates a single video frame matching the presentation viewer layout
 * Layout: Title (top) → Bullet Points (middle) → Image (bottom)
 */
export async function createSlideFrame(options: SlideFrameOptions): Promise<Buffer> {
  const { slide } = options;

  // Create base frame with dark background
  let frameImage = sharp({
    create: {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // Dark blue background
    },
  });

  const compositeItems: sharp.OverlayOptions[] = [];

  // Calculate layout
  const textHeight = 300; // Approximate height for title + bullets
  const imageHeight = FRAME_HEIGHT - textHeight - PADDING * 2;
  const imageY = textHeight + PADDING;

  // 1. Add text overlay (title + content)
  const textSVG = createTextSVG(slide.slide_title, slide.slide_content);
  compositeItems.push({
    input: Buffer.from(textSVG),
    top: 0,
    left: 0,
  });

  // 2. Add image at bottom if available
  if (slide.image_url) {
    try {
      let imageBuffer: Buffer;

      if (options.imageBuffer) {
        imageBuffer = options.imageBuffer;
      } else {
        imageBuffer = await downloadImage(slide.image_url);
      }

      // Resize image to fit the available space
      const resizedImage = await sharp(imageBuffer)
        .resize(MAX_CONTENT_WIDTH, imageHeight, {
          fit: 'contain',
          background: { r: 15, g: 23, b: 42, alpha: 1 },
        })
        .toBuffer();

      // Center the image horizontally
      const imageMetadata = await sharp(resizedImage).metadata();
      const imageX = Math.floor((FRAME_WIDTH - (imageMetadata.width || 0)) / 2);

      compositeItems.push({
        input: resizedImage,
        top: imageY,
        left: imageX,
      });
    } catch (error) {
      console.error('Failed to add image to frame:', error);
      // Continue without image
    }
  }

  // Composite all elements
  const frameBuffer = await frameImage.composite(compositeItems).jpeg({ quality: 90 }).toBuffer();

  return frameBuffer;
}

/**
 * Creates a placeholder frame for slides without audio
 */
export async function createPlaceholderFrame(slide: Slide): Promise<Buffer> {
  return createSlideFrame({ slide });
}
