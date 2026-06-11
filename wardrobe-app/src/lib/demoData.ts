/**
 * Converts the real tagged test wardrobe (data/tagged-wardrobe-test.json —
 * 6 phone photos run through the tagging prompt) into closet garments.
 * Used to seed demo mode and as scorer test fixtures. Pure TS — no RN imports.
 */
import taggedWardrobe from '../../data/tagged-wardrobe-test.json';

import { deriveLibraryTags } from './tagMapping';
import type { Garment, GarmentSchema } from './types';

interface TaggedItem extends GarmentSchema {
  item_id: string;
}

export function sampleGarments(): Garment[] {
  return (taggedWardrobe.items as unknown as TaggedItem[]).map((item) => {
    const { item_id, ...schema } = item;
    return {
      ...schema,
      id: item_id,
      imageUri: `sample://${item_id}`,
      tags: deriveLibraryTags(schema),
      createdAt: new Date().toISOString(),
    };
  });
}

/** Fixture tag results keyed by sample image id — demo mode's "Haiku response". */
export function sampleSchemaById(id: string): GarmentSchema | null {
  const item = (taggedWardrobe.items as unknown as TaggedItem[]).find((i) => i.item_id === id);
  if (!item) return null;
  const { item_id: _, ...schema } = item;
  return schema;
}

export const SAMPLE_IDS = (taggedWardrobe.items as unknown as TaggedItem[]).map((i) => i.item_id);
