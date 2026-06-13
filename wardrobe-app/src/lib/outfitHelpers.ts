/**
 * Bridges between stored outfits and the in-memory Outfit shape the detail
 * screen renders, and scores a manually-assembled set of pieces.
 */
import { classifyTags, scoreOutfit } from './scoring';
import type { Garment, Outfit, SavedOutfit } from './types';

/** Reconstruct an Outfit from a stored SavedOutfit so /outfit/[id] can show it. */
export function savedToOutfit(saved: SavedOutfit): Outfit {
  return {
    id: saved.id,
    styleId: saved.targetStyle,
    garmentIds: saved.garmentIds,
    score: saved.score,
    styleScore: saved.score,
    compatBonus: 0,
    why: saved.why,
  };
}

/**
 * Score a user-assembled set of pieces. Picks the style the pieces lean toward,
 * then scores against it. Falls back to a free-form result when the combo
 * doesn't strongly anchor any one style (so manual builds are never blocked).
 */
export function scoreManualOutfit(pieces: Garment[]): Outfit | null {
  if (pieces.length === 0) return null;
  const tags = pieces.flatMap((p) => p.tags);
  const best = classifyTags(tags)[0];
  const styleId = best?.styleId ?? 'minimal';
  const scored = scoreOutfit(pieces, styleId);
  if (scored) return { ...scored, id: `manual:${pieces.map((p) => p.id).sort().join('+')}` };
  return {
    id: `manual:${pieces.map((p) => p.id).sort().join('+')}`,
    styleId,
    garmentIds: pieces.map((p) => p.id),
    score: Math.max(best?.score ?? 0, 0),
    styleScore: Math.max(best?.score ?? 0, 0),
    compatBonus: 0,
    why: 'A free-form look you put together yourself.',
  };
}
