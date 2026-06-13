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

export interface ScoringConfig {
  dominanceFraction: number;
  requireStrongAnchor: boolean;
  strongOutfitThreshold: number;
  lowScoreFraction: number;
}

export type LayerRole = 'base' | 'shirt' | 'mid' | 'outer';

export interface Layering {
  roleKeywords: Record<LayerRole, string[]>;
  roleRank: Record<LayerRole, number>;
  formalityRank: Record<string, number>;
  maxFormalityGap: number;
}

interface StyleLibrary {
  version: string;
  styles: Record<StyleId, StyleInfo>;
  tagStyleWeights: WeightMap;
  tagTagCompatibility: EdgeMap;
  incompatiblePairs: PairMap;
  tagStyleAntiAffinity: WeightMap;
  scoringConfig: ScoringConfig;
  layering: Layering;
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
  scoring_config: {
    dominance_fraction: number;
    require_strong_anchor: boolean;
    strong_outfit_threshold: number;
    low_score_fraction: number;
  };
  layering: {
    role_keywords: Record<LayerRole, string[]>;
    role_rank: Record<LayerRole, number>;
    formality_rank: Record<string, number>;
    max_formality_gap: number;
  };
};

export const styleLibrary: StyleLibrary = {
  version: raw.version,
  styles: raw.styles,
  tagStyleWeights: raw.tag_style_weights,
  tagTagCompatibility: stripComments(raw.tag_tag_compatibility),
  incompatiblePairs: stripComments(raw.incompatible_pairs),
  tagStyleAntiAffinity: raw.tag_style_anti_affinity,
  scoringConfig: {
    dominanceFraction: raw.scoring_config.dominance_fraction,
    requireStrongAnchor: raw.scoring_config.require_strong_anchor,
    strongOutfitThreshold: raw.scoring_config.strong_outfit_threshold,
    lowScoreFraction: raw.scoring_config.low_score_fraction,
  },
  layering: {
    roleKeywords: raw.layering.role_keywords,
    roleRank: raw.layering.role_rank,
    formalityRank: raw.layering.formality_rank,
    maxFormalityGap: raw.layering.max_formality_gap,
  },
};

export const STYLE_IDS = Object.keys(styleLibrary.styles) as StyleId[];

/** Full tag vocabulary — used by the tag editor and gap candidates. */
export const ALL_TAGS = Object.keys(styleLibrary.tagStyleWeights);

export function styleName(id: StyleId): string {
  return styleLibrary.styles[id]?.name ?? id;
}
