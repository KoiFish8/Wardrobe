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
  // Extra reference pieces (data/sample-pieces-v1.json) — wider style spread.
  smp_graphic_tee: require('../../assets/samples/smp_graphic_tee.jpg'),
  smp_wide_trousers: require('../../assets/samples/smp_wide_trousers.jpg'),
  smp_leather_jacket: require('../../assets/samples/smp_leather_jacket.jpg'),
  smp_navy_cardigan: require('../../assets/samples/smp_navy_cardigan.jpg'),
  smp_cable_knit: require('../../assets/samples/smp_cable_knit.jpg'),
  smp_barrel_jeans: require('../../assets/samples/smp_barrel_jeans.jpg'),
  smp_sherpa_hoodie: require('../../assets/samples/smp_sherpa_hoodie.jpg'),
  smp_batman_tee: require('../../assets/samples/smp_batman_tee.jpg'),
  smp_nike_tee: require('../../assets/samples/smp_nike_tee.jpg'),
  smp_baggy_jeans: require('../../assets/samples/smp_baggy_jeans.jpg'),
  smp_ls_tee: require('../../assets/samples/smp_ls_tee.jpg'),
  // Shoes (data/sample-pieces-v1.json).
  smp_asics_japan: require('../../assets/samples/smp_asics_japan.jpg'),
  smp_spezial_black: require('../../assets/samples/smp_spezial_black.jpg'),
  smp_spezial_navy: require('../../assets/samples/smp_spezial_navy.jpg'),
  smp_nike_gato: require('../../assets/samples/smp_nike_gato.jpg'),
  smp_loafers: require('../../assets/samples/smp_loafers.jpg'),
  smp_derby: require('../../assets/samples/smp_derby.jpg'),
  smp_clogs: require('../../assets/samples/smp_clogs.jpg'),
};

export function sampleImageSource(garmentId: string, imageUri: string | null) {
  if (imageUri?.startsWith('sample://')) return SAMPLE_IMAGES[imageUri.slice('sample://'.length)] ?? null;
  if (imageUri) return { uri: imageUri };
  if (SAMPLE_IMAGES[garmentId]) return SAMPLE_IMAGES[garmentId];
  return null;
}
