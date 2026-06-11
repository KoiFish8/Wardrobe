/**
 * Outfits are computed, never stored (locked decision) — this zustand store
 * holds the last generation in memory so outfit/[id] can render details.
 */
import { create } from 'zustand';

import type { Outfit, StyleId } from './types';

interface GenerationState {
  styleId: StyleId | null;
  outfits: Record<string, Outfit>;
  ordered: string[];
  setGeneration(styleId: StyleId, outfits: Outfit[]): void;
  getOutfit(id: string): Outfit | undefined;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  styleId: null,
  outfits: {},
  ordered: [],
  setGeneration(styleId, outfits) {
    set({
      styleId,
      outfits: Object.fromEntries(outfits.map((o) => [o.id, o])),
      ordered: outfits.map((o) => o.id),
    });
  },
  getOutfit(id) {
    return get().outfits[id];
  },
}));
