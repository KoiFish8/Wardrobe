/**
 * Map the vision model's free-text color names to display swatches. Tags use
 * plain words ("navy", "off-white", "olive") so we normalize loosely and fall
 * back to a neutral grey for anything unrecognized.
 */
const COLOR_HEX: Record<string, string> = {
  black: '#1c1a17',
  white: '#f6f3ec',
  'off-white': '#ece5d6',
  cream: '#efe7d4',
  ivory: '#f1ead9',
  grey: '#9a948b',
  gray: '#9a948b',
  charcoal: '#3c3a36',
  silver: '#c7c4bd',
  navy: '#2b3550',
  blue: '#3f6296',
  'light-blue': '#9cc0e0',
  denim: '#54749b',
  teal: '#2f7c7a',
  green: '#4f7a4a',
  olive: '#6f6a3c',
  khaki: '#b6a87e',
  beige: '#d8c8aa',
  tan: '#c4a279',
  brown: '#7a5638',
  camel: '#bd9168',
  burgundy: '#6e2433',
  red: '#b23b34',
  pink: '#dca0ac',
  purple: '#6f4d82',
  yellow: '#d8b84e',
  orange: '#cf7c3e',
  gold: '#bd9750',
  mustard: '#c19a3c',
};

/** Best-effort hex for a color name; null when we can't place it. */
export function colorToHex(name?: string | null): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase().replace(/\s+/g, '-');
  if (COLOR_HEX[key]) return COLOR_HEX[key];
  // Try the last word ("dark olive" → "olive", "faded blue" → "blue").
  const last = key.split('-').pop() ?? key;
  return COLOR_HEX[last] ?? null;
}

/** Ordered, de-duped swatch hexes for a garment's primary + secondary colors. */
export function garmentSwatches(
  primary: string,
  secondary: string[] = [],
  max = 3
): { name: string; hex: string }[] {
  const out: { name: string; hex: string }[] = [];
  const seen = new Set<string>();
  for (const name of [primary, ...secondary]) {
    const hex = colorToHex(name);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    out.push({ name, hex });
    if (out.length >= max) break;
  }
  return out;
}
