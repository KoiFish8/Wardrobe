/**
 * Bundled JPEG previews of data/sample-wardrobe (originals are HEIC, which
 * the web can't render). UI-only — never imported by the scoring engine.
 */
export const SAMPLE_IMAGES: Record<string, number> = {
  IMG_5446: require('../../assets/samples/IMG_5446.jpg'),
  IMG_5447: require('../../assets/samples/IMG_5447.jpg'),
  IMG_5449: require('../../assets/samples/IMG_5449.jpg'),
  IMG_5450: require('../../assets/samples/IMG_5450.jpg'),
  IMG_5451: require('../../assets/samples/IMG_5451.jpg'),
  IMG_5452: require('../../assets/samples/IMG_5452.jpg'),
};

export function sampleImageSource(garmentId: string, imageUri: string | null) {
  if (imageUri?.startsWith('sample://')) return SAMPLE_IMAGES[imageUri.slice('sample://'.length)] ?? null;
  if (imageUri) return { uri: imageUri };
  if (SAMPLE_IMAGES[garmentId]) return SAMPLE_IMAGES[garmentId];
  return null;
}
