/**
 * Converts the tagged sample wardrobes into closet garments:
 *  - data/tagged-wardrobe-test.json (6 phone photos run through the tagging prompt)
 *  - data/sample-pieces-v1.json     (10 reference pieces, hand-tagged)
 * Used to seed demo mode and as scorer test fixtures. Pure TS — no RN imports.
 */
import taggedWardrobe from '../../data/tagged-wardrobe-test.json';
import samplePieces from '../../data/sample-pieces-v1.json';

import { deriveLibraryTags } from './tagMapping';
import type { Garment, GarmentSchema } from './types';

interface TaggedItem extends GarmentSchema {
  item_id: string;
}

const ALL_TAGGED: TaggedItem[] = [
  ...(taggedWardrobe.items as unknown as TaggedItem[]),
  ...(samplePieces.items as unknown as TaggedItem[]),
];

export function sampleGarments(): Garment[] {
  return ALL_TAGGED.map((item) => {
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
  const item = ALL_TAGGED.find((i) => i.item_id === id);
  if (!item) return null;
  const { item_id: _, ...schema } = item;
  return schema;
}

export const SAMPLE_IDS = ALL_TAGGED.map((i) => i.item_id);
