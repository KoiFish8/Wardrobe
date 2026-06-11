/**
 * Maps the vision model's descriptive schema (docs/02-tagging-schema.md) onto
 * the style library's 30-tag vocabulary. Deliberately conservative: a wrong
 * tag poisons scoring more than a missing one, and the confirm screen lets
 * the user add what we miss (corrections are stored — future training data).
 */
import { ALL_TAGS } from './styleLibrary';
import type { GarmentSchema } from './types';

const EARTH_COLORS = /\b(brown|tan|olive|khaki|camel|rust|terracotta|chocolate|sand)\b/i;

export function deriveLibraryTags(schema: GarmentSchema): string[] {
  const tags = new Set<string>();
  const subtype = schema.subtype.toLowerCase();
  const color = schema.primary_color.toLowerCase();
  const material = schema.material_guess.toLowerCase();
  const pattern = schema.pattern.toLowerCase();
  const fit = schema.fit_silhouette.toLowerCase();

  // Fit / silhouette
  if (fit === 'slim') tags.add('slim-fit');
  if (fit === 'oversized') tags.add('oversized');
  if (/\b(baggy|wide)\b/.test(fit) || /wide-leg|wide leg/.test(subtype)) tags.add('wide-leg');
  if (/\bbaggy\b/.test(subtype)) tags.add('baggy');

  // Color
  if (schema.neutral) tags.add('neutral-tones');
  if (/\bblack\b/.test(color)) tags.add('all-black');
  if (EARTH_COLORS.test(color)) tags.add('earth-tones');
  if (/washed|faded|distress/.test(color) || /washed|faded/.test(subtype)) tags.add('washed-faded');
  if (/distressed|ripped/.test(subtype)) tags.add('distressed');
  if (!schema.neutral && /\b(red|orange|yellow|green|blue|purple|pink)\b/.test(color)) {
    tags.add('bright-bold');
  }

  // Pattern
  if (pattern === 'solid') tags.add('solid');
  if (pattern === 'graphic') tags.add('graphic-print');
  if (pattern === 'checked' || /plaid|flannel/.test(subtype)) tags.add('plaid');

  // Material
  if (material === 'leather') tags.add('leather');
  if (material.includes('suede') || /suede/.test(subtype)) tags.add('suede');
  if (material === 'synthetic' || /nylon|shell|windbreaker|track/.test(subtype)) {
    tags.add('technical-synthetic');
  }
  if (/sweater|knit|cardigan/.test(subtype)) tags.add('chunky-knit');
  if (material === 'denim' && /\braw\b|selvedge|dark indigo/.test(`${subtype} ${color}`)) {
    tags.add('raw-denim');
  }

  // Construction
  if (/blazer|suit|trousers|slacks|overcoat|topcoat/.test(subtype)) tags.add('tailored');
  if (/cargo|utility/.test(subtype)) tags.add('utility-pockets');

  // Footwear
  if (schema.category === 'shoes') {
    if (/boot/.test(subtype)) tags.add('boots');
    else if (/loafer/.test(subtype)) tags.add('loafers');
    else if (/running|performance|trainer/.test(subtype)) tags.add('performance-sneaker');
    else if (/skate/.test(subtype)) tags.add('skate-shoe');
    else if (/chunky|dad shoe/.test(subtype)) tags.add('chunky-sole-sneaker');
  }

  // Branding: plain pieces with no visible brand text read as minimal
  if (!schema.brand_text_detected && pattern === 'solid') tags.add('minimal-branding');

  // Never emit a tag outside the library vocabulary
  return [...tags].filter((t) => ALL_TAGS.includes(t));
}
