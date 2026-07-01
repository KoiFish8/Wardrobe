/**
 * Builds the compact wardrobe summary the Capsule Stylist is grounded in. Kept
 * short (the Edge Function caps it at ~2k chars) and sent with each chat turn so
 * answers reference the user's real pieces — and so the assistant has nothing to
 * talk about EXCEPT the user's closet.
 */
import type { Collection } from './collectionsStore';
import { canonicalStyleId } from './scoring';
import { styleName } from './styleLibrary';
import type { Garment, StyleId } from './types';

export function buildAssistantContext(opts: {
  closet: Garment[];
  collections: Collection[];
  tempLabel?: string | null;
  preferredStyles?: StyleId[];
}): string {
  const { closet, collections, tempLabel, preferredStyles = [] } = opts;
  if (closet.length === 0) {
    return 'The user has not scanned any pieces yet. Encourage them to add a few garments so you can style them.';
  }

  // Pieces grouped by category, with color + subtype.
  const byCat = new Map<string, string[]>();
  for (const g of closet) {
    const desc = `${g.primary_color} ${g.subtype}`.trim();
    const list = byCat.get(g.category) ?? [];
    list.push(desc);
    byCat.set(g.category, list);
  }
  const pieceLines = [...byCat.entries()].map(
    ([cat, items]) => `- ${cat} (${items.length}): ${items.slice(0, 12).join(', ')}${items.length > 12 ? '…' : ''}`
  );

  // Dominant styles across the closet.
  const styleCounts = new Map<StyleId, number>();
  for (const g of closet) {
    const s = canonicalStyleId(g.tags);
    styleCounts.set(s, (styleCounts.get(s) ?? 0) + 1);
  }
  const topStyles = [...styleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => styleName(s));

  const lines: string[] = [];
  lines.push(`The user owns ${closet.length} pieces.`);
  lines.push('Pieces by category:');
  lines.push(...pieceLines);
  if (topStyles.length) lines.push(`Leans toward: ${topStyles.join(', ')}.`);
  if (preferredStyles.length) lines.push(`Stated preferred styles: ${preferredStyles.map(styleName).join(', ')}.`);
  if (collections.length) {
    lines.push(
      `Collections (folders): ${collections.map((c) => `${c.name} (${c.garmentIds.length})`).join(', ')}.`
    );
  }
  if (tempLabel) lines.push(`Today's weather: ${tempLabel}.`);
  return lines.join('\n');
}
