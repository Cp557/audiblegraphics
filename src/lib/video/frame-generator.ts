import sharp from 'sharp';
import { Slide } from '@/lib/supabase/presentations';

// Default dimensions for 16:9
const FRAME_WIDTH_16_9 = 1280;
const FRAME_HEIGHT_16_9 = 720;

// Dimensions for 9:16 (vertical/portrait)
const FRAME_WIDTH_9_16 = 720;
const FRAME_HEIGHT_9_16 = 1280;

interface SlideFrameOptions {
  slide: Slide;
  imageBuffer?: Buffer;
  aspectRatio?: '16:9' | '9:16';
}

/**
 * Get frame dimensions based on aspect ratio
 */
export function getFrameDimensions(aspectRatio: string = '16:9'): { width: number; height: number } {
  if (aspectRatio === '9:16') {
    return { width: FRAME_WIDTH_9_16, height: FRAME_HEIGHT_9_16 };
  }
  return { width: FRAME_WIDTH_16_9, height: FRAME_HEIGHT_16_9 };
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
 * Creates a single video frame for the infographic
 * Layout: Image only (centered/contain)
 */
export async function createSlideFrame(options: SlideFrameOptions): Promise<Buffer> {
  const { slide, aspectRatio = '16:9' } = options;
  const { width: FRAME_WIDTH, height: FRAME_HEIGHT } = getFrameDimensions(aspectRatio);

  // Set colors for light mode
  const backgroundColor = { r: 255, g: 255, b: 255, alpha: 1 }; // White

  // Create base frame with background
  let frameImage = sharp({
    create: {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      channels: 4,
      background: backgroundColor,
    },
  });

  const compositeItems: sharp.OverlayOptions[] = [];

  // Add image if available
  if (slide.image_url) {
    try {
      let imageBuffer: Buffer;

      if (options.imageBuffer) {
        imageBuffer = options.imageBuffer;
      } else {
        imageBuffer = await downloadImage(slide.image_url);
      }

      // Resize image to fit the available space (Whole screen now)
      const resizedImage = await sharp(imageBuffer)
        .resize(FRAME_WIDTH, FRAME_HEIGHT, {
          fit: 'contain',
          background: backgroundColor,
        })
        .toBuffer();

      // Center the image (though 'contain' usually handles this, we explicitly position it)
      // With 'contain' and the full dimensions, it will be centered by default in the output buffer if we just use it,
      // but since we are compositing onto a base frame, we need to make sure.
      // Actually, we can just use the resized image directly if it's the exact size,
      // but 'contain' might result in transparency/background padding.
      
      // Let's composite it.
      compositeItems.push({
        input: resizedImage,
        top: 0,
        left: 0,
      });
    } catch (error) {
      console.error('Failed to add image to frame:', error);
      // Continue without image (will just be white background)
    }
  }

  // Composite all elements
  const frameBuffer = await frameImage.composite(compositeItems).jpeg({ quality: 90 }).toBuffer();

  return frameBuffer;
}

/**
 * Creates a placeholder frame for slides without audio
 */
export async function createPlaceholderFrame(slide: Slide, aspectRatio?: '16:9' | '9:16'): Promise<Buffer> {
  return createSlideFrame({ slide, aspectRatio });
}
