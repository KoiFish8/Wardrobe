/**
 * Compresses a captured/picked photo before it's stored or sent to the tagging
 * model: downscale the long edge and re-encode as JPEG. A full-res phone photo
 * is ~3–8 MB; this lands it around 100–300 KB, which uploads faster, costs
 * fewer vision tokens, and is plenty of detail for garment tagging.
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/** Max long-edge in px after downscaling. Garment tags don't need more. */
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.6;

export interface CompressedImage {
  uri: string;
  base64?: string;
}

/**
 * Returns a compressed copy of `uri`. `withBase64` controls whether the
 * base64 string (for the Edge Function payload) is also produced. Falls back
 * to the original uri if manipulation fails for any reason.
 */
export async function compressImage(
  uri: string,
  { withBase64 = true }: { withBase64?: boolean } = {}
): Promise<CompressedImage> {
  try {
    const result = await manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
      compress: JPEG_QUALITY,
      format: SaveFormat.JPEG,
      base64: withBase64,
    });
    return { uri: result.uri, base64: result.base64 ?? undefined };
  } catch {
    return { uri };
  }
}
