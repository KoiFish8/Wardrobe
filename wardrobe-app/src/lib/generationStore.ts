/**
 * Outfits are computed, never stored (locked decision) — this zustand store
 * holds the last generation in memory so outfit/[id] can render details.
 */
import { create } from 'zustand';

import type { Outfit } from './types';

interface GenerationState {
  /** Occasion the last generation was for (design's generate flow), if any. */
  occasionId: string | null;
  outfits: Record<string, Outfit>;
  ordered: string[];
  setGeneration(outfits: Outfit[], meta?: { occasionId?: string }): void;
  /** Add a single outfit (e.g. a saved or daily look) without clobbering a generation. */
  addOutfit(outfit: Outfit): void;
  getOutfit(id: string): Outfit | undefined;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  occasionId: null,
  outfits: {},
  ordered: [],
  setGeneration(outfits, meta) {
    set({
      occasionId: meta?.occasionId ?? null,
      outfits: Object.fromEntries(outfits.map((o) => [o.id, o])),
      ordered: outfits.map((o) => o.id),
    });
  },
  addOutfit(outfit) {
    set((s) => ({ outfits: { ...s.outfits, [outfit.id]: outfit } }));
  },
  getOutfit(id) {
    return get().outfits[id];
  },
}));
