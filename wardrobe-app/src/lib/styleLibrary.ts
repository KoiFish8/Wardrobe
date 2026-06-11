/**
 * Typed access to the bundled style library (data/style-library-v1.json).
 * The library is the app's key asset — weights live in the JSON, never in code.
 */
import libraryJson from '../../data/style-library-v1.json';

import type { StyleId } from './types';

export interface StyleInfo {
  name: string;
  formality: string;
}

type WeightMap = Record<string, Partial<Record<StyleId, number>>>;
type EdgeMap = Record<string, Record<string, number>>;
type PairMap = Record<string, Record<string, boolean>>;

interface StyleLibrary {
  version: string;
  styles: Record<StyleId, StyleInfo>;
  tagStyleWeights: WeightMap;
  tagTagCompatibility: EdgeMap;
  incompatiblePairs: PairMap;
  tagStyleAntiAffinity: WeightMap;
}

/** The JSON carries `_comment` keys inside edge maps; strip anything non-tag. */
function stripComments<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith('_')));
}

const raw = libraryJson as unknown as {
  version: string;
  styles: Record<StyleId, StyleInfo>;
  tag_style_weights: WeightMap;
  tag_tag_compatibility: EdgeMap;
  incompatible_pairs: PairMap;
  tag_style_anti_affinity: WeightMap;
};

export const styleLibrary: StyleLibrary = {
  version: raw.version,
  styles: raw.styles,
  tagStyleWeights: raw.tag_style_weights,
  tagTagCompatibility: stripComments(raw.tag_tag_compatibility),
  incompatiblePairs: stripComments(raw.incompatible_pairs),
  tagStyleAntiAffinity: raw.tag_style_anti_affinity,
};

export const STYLE_IDS = Object.keys(styleLibrary.styles) as StyleId[];

/** Full tag vocabulary — used by the tag editor and gap candidates. */
export const ALL_TAGS = Object.keys(styleLibrary.tagStyleWeights);

export function styleName(id: StyleId): string {
  return styleLibrary.styles[id]?.name ?? id;
}
