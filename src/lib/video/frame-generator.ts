import sharp from 'sharp';

// Default dimensions
const FRAME_WIDTH_16_9 = 1280;
const FRAME_HEIGHT_16_9 = 720;
const FRAME_WIDTH_9_16 = 720;
const FRAME_HEIGHT_9_16 = 1280;

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
 * Creates a single video frame from a local image file.
 * Resizes and centers the image on a white background at the target resolution.
 *
 * @param imagePath - Absolute path to the local image file
 * @param aspectRatio - Output aspect ratio ('16:9' or '9:16')
 * @returns JPEG buffer of the composed frame
 */
export async function createSlideFrame(
  imagePath: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<Buffer> {
  const { width: FRAME_WIDTH, height: FRAME_HEIGHT } = getFrameDimensions(aspectRatio);
  const backgroundColor = { r: 255, g: 255, b: 255, alpha: 1 };

  const frameImage = sharp({
    create: {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      channels: 4,
      background: backgroundColor,
    },
  });

  const compositeItems: sharp.OverlayOptions[] = [];

  try {
    const resizedImage = await sharp(imagePath)
      .resize(FRAME_WIDTH, FRAME_HEIGHT, {
        fit: 'contain',
        background: backgroundColor,
      })
      .toBuffer();

    compositeItems.push({ input: resizedImage, top: 0, left: 0 });
  } catch (error) {
    console.error('Failed to process image for frame:', error);
    // Continue with white background only
  }

  return frameImage.composite(compositeItems).jpeg({ quality: 90 }).toBuffer();
}
