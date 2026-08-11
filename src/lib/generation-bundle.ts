const MAGIC = [0x41, 0x47, 0x30, 0x31] as const; // AG01
const HEADER_LENGTH = 16;

export interface GenerationBundleMetadata {
  title: string;
  speakerNotes: string;
  aspectRatio: '16:9' | '9:16';
  voice: string;
}

export interface GenerationBundle extends GenerationBundleMetadata {
  image: Blob;
  audio: Blob;
}

export function createGenerationBundleStream(
  metadata: GenerationBundleMetadata,
  image: Uint8Array,
  audio: Uint8Array
): ReadableStream<Uint8Array> {
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  const header = new Uint8Array(HEADER_LENGTH);
  const view = new DataView(header.buffer);

  header.set(MAGIC, 0);
  view.setUint32(4, metadataBytes.byteLength);
  view.setUint32(8, image.byteLength);
  view.setUint32(12, audio.byteLength);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(header);
      controller.enqueue(metadataBytes);
      controller.enqueue(image);
      controller.enqueue(audio);
      controller.close();
    },
  });
}

export function decodeGenerationBundle(buffer: ArrayBuffer): GenerationBundle {
  if (buffer.byteLength < HEADER_LENGTH) {
    throw new Error('The generated infographic response was incomplete');
  }

  const bytes = new Uint8Array(buffer);
  if (!MAGIC.every((value, index) => bytes[index] === value)) {
    throw new Error('The generated infographic response was invalid');
  }

  const view = new DataView(buffer);
  const metadataLength = view.getUint32(4);
  const imageLength = view.getUint32(8);
  const audioLength = view.getUint32(12);
  const expectedLength = HEADER_LENGTH + metadataLength + imageLength + audioLength;

  if (buffer.byteLength !== expectedLength) {
    throw new Error('The generated infographic response was incomplete');
  }

  let offset = HEADER_LENGTH;
  const metadata = JSON.parse(
    new TextDecoder().decode(bytes.slice(offset, offset + metadataLength))
  ) as GenerationBundleMetadata;
  offset += metadataLength;

  const imageBytes = bytes.slice(offset, offset + imageLength);
  const image = new Blob([imageBytes], { type: detectImageMimeType(imageBytes) });
  offset += imageLength;

  const audio = new Blob(
    [bytes.slice(offset, offset + audioLength)],
    { type: 'audio/mpeg' }
  );

  return { ...metadata, image, audio };
}

function detectImageMimeType(bytes: Uint8Array): string {
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return 'image/jpeg';
}
