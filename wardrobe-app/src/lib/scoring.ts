/**
 * The scoring engine: deterministic tag math over the bundled style library.
 *
 * ARCHITECTURE RULE (locked): outfit generation and gap analysis run HERE,
 * client-side, with zero LLM calls. Only the scan step talks to a model.
 *
 * Reference math (validated in docs/07-style-library-v1.md §4):
 *   style score = Σ tag_style_weights[tag][style] + Σ tag_style_anti_affinity[tag][style]
 * over the deduplicated union of an outfit's tags (anti-affinity values are negative).
 * Outfit ranking adds tag_tag_compatibility bonuses across pieces and suppresses
 * incompatible_pairs entirely.
 */
import { STYLE_IDS, styleLibrary, styleName } from './styleLibrary';
import type { LayerRole } from './styleLibrary';
import type { Garment, GapCandidate, GapRecommendation, Outfit, StyleId } from './types';

const cfg = styleLibrary.scoringConfig;

/** An outfit with at least this style score counts as "strong" for gap analysis. */
export const STRONG_OUTFIT_THRESHOLD = cfg.strongOutfitThreshold;

/** Ranked outfits below this fraction of the best score are buried. */
const LOW_SCORE_FRACTION = cfg.lowScoreFraction;

/** A style only "owns" an outfit if it scores within this fraction of the outfit's best style. */
const DOMINANCE_FRACTION = cfg.dominanceFraction;

/** A tag is a "strong anchor" for a style when its weight is at least this. */
const STRONG_WEIGHT = 2;

const MAX_RANKED_OUTFITS = 20;

/** True if any tag is a strong (S) anchor for this style — required for the outfit to count as that style. */
function hasStrongAnchor(tags: Iterable<string>, styleId: StyleId): boolean {
  for (const tag of tags) {
    if ((styleLibrary.tagStyleWeights[tag]?.[styleId] ?? 0) >= STRONG_WEIGHT) return true;
  }
  return false;
}

const ROLE_PRIORITY: LayerRole[] = ['outer', 'mid', 'shirt', 'base'];

/** Which top-half layer a garment occupies (from subtype, then category). Null = not a layerable top. */
function layerRole(g: Garment): LayerRole | null {
  if (g.category !== 'top' && g.category !== 'outerwear' && g.category !== 'dress') return null;
  const s = (g.subtype || '').toLowerCase();
  for (const role of ROLE_PRIORITY) {
    if (styleLibrary.layering.roleKeywords[role]?.some((k) => s.includes(k))) return role;
  }
  return g.category === 'outerwear' ? 'outer' : 'base';
}

function layerRank(g: Garment): number {
  const role = layerRole(g);
  return role ? styleLibrary.layering.roleRank[role] ?? 0 : 0;
}

function formalityRank(g: Garment): number {
  return styleLibrary.layering.formalityRank[g.formality] ?? 0;
}

const MID_RANK = styleLibrary.layering.roleRank.mid;

/**
 * Can `outer` sensibly be layered OVER `top`?
 * - Outer must sit strictly above the top's layer (blocks two mids like sweater+hoodie, or two outers).
 * - A much-more-formal outer can't go over a bulky MID layer (blocks a hoodie/sweatshirt under a blazer),
 *   but is fine over a thin base or shirt (a tee or button-up under a blazer is allowed).
 */
export function canLayer(top: Garment, outer: Garment): boolean {
  if (layerRank(outer) <= layerRank(top)) return false;
  const formalityGap = Math.abs(formalityRank(outer) - formalityRank(top));
  if (formalityGap > styleLibrary.layering.maxFormalityGap && layerRank(top) >= MID_RANK) {
    return false;
  }
  return true;
}

/** Validated matrix + anti-affinity score for a set of tags against one style. */
export function scoreTagsForStyle(tags: Iterable<string>, styleId: StyleId): number {
  let score = 0;
  for (const tag of new Set(tags)) {
    score += styleLibrary.tagStyleWeights[tag]?.[styleId] ?? 0;
    score += styleLibrary.tagStyleAntiAffinity[tag]?.[styleId] ?? 0;
  }
  return score;
}

/** All styles ranked by score for a tag set — used for "why it works" classification. */
export function classifyTags(tags: Iterable<string>): { styleId: StyleId; score: number }[] {
  const tagList = [...tags];
  return STYLE_IDS.map((styleId) => ({ styleId, score: scoreTagsForStyle(tagList, styleId) })).sort(
    (a, b) => b.score - a.score
  );
}

function compatEdge(a: string, b: string): number {
  return styleLibrary.tagTagCompatibility[a]?.[b] ?? styleLibrary.tagTagCompatibility[b]?.[a] ?? 0;
}

function isIncompatible(a: string, b: string): boolean {
  return (
    styleLibrary.incompatiblePairs[a]?.[b] === true || styleLibrary.incompatiblePairs[b]?.[a] === true
  );
}

interface PairwiseResult {
  bonus: number;
  /** A hard clash across two pieces — the outfit should be suppressed. */
  clash: [string, string] | null;
  bestPair: { a: string; b: string; value: number } | null;
}

/** Compatibility bonuses and hard clashes across distinct pieces of one outfit. */
function pairwiseTags(garments: Garment[]): PairwiseResult {
  let bonus = 0;
  let clash: [string, string] | null = null;
  let bestPair: PairwiseResult['bestPair'] = null;
  for (let i = 0; i < garments.length; i++) {
    for (let j = i + 1; j < garments.length; j++) {
      const seen = new Set<string>();
      for (const a of garments[i].tags) {
        for (const b of garments[j].tags) {
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (isIncompatible(a, b)) clash = [a, b];
          const edge = compatEdge(a, b);
          bonus += edge;
          if (edge > 0 && (!bestPair || edge > bestPair.value)) bestPair = { a, b, value: edge };
        }
      }
    }
  }
  return { bonus, clash, bestPair };
}

function unionTags(garments: Garment[]): Set<string> {
  const tags = new Set<string>();
  for (const g of garments) for (const t of g.tags) tags.add(t);
  return tags;
}

function describeGarment(g: Garment): string {
  return `${g.primary_color} ${g.subtype}`.trim();
}

/** Local, template-built explanation — no LLM. Names the top contributing tags. */
function buildWhy(garments: Garment[], styleId: StyleId, pairs: PairwiseResult): string {
  const tags = [...unionTags(garments)];
  const contributors = tags
    .map((tag) => ({ tag, w: styleLibrary.tagStyleWeights[tag]?.[styleId] ?? 0 }))
    .filter((c) => c.w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, 3)
    .map((c) => c.tag.replace(/-/g, ' '));
  const parts: string[] = [];
  if (contributors.length > 0) {
    parts.push(`${contributors.join(', ')} anchor the ${styleName(styleId)} look`);
  } else {
    parts.push(`a clean base for ${styleName(styleId)}`);
  }
  if (pairs.bestPair) {
    parts.push(
      `${pairs.bestPair.a.replace(/-/g, ' ')} pairs well with ${pairs.bestPair.b.replace(/-/g, ' ')}`
    );
  }
  return parts.join('; ') + '.';
}

export function outfitId(styleId: StyleId, garmentIds: string[]): string {
  return `${styleId}:${[...garmentIds].sort().join('+')}`;
}

/** Score one specific combination of garments against a target style. */
export function scoreOutfit(garments: Garment[], styleId: StyleId): Outfit | null {
  const pairs = pairwiseTags(garments);
  if (pairs.clash) return null; // hard clash — suppress entirely

  const union = unionTags(garments);

  // Realness gate 1: the outfit must have a strong (S) anchor tag for this style,
  // otherwise it isn't really that style — just a generic combo that scores a few weak points.
  if (cfg.requireStrongAnchor && !hasStrongAnchor(union, styleId)) return null;

  const styleScore = scoreTagsForStyle(union, styleId);
  if (styleScore <= 0) return null;

  // Realness gate 2: only surface the outfit under a style it genuinely leans toward.
  // If another style fits clearly better, don't show this outfit here — this is what
  // stops the same outfit appearing under many styles (while still allowing true hybrids).
  const bestScore = classifyTags(union)[0].score;
  if (bestScore <= 0 || styleScore < DOMINANCE_FRACTION * bestScore) return null;

  const score = styleScore + pairs.bonus;
  return {
    id: outfitId(styleId, garments.map((g) => g.id)),
    styleId,
    garmentIds: garments.map((g) => g.id),
    score,
    styleScore,
    compatBonus: pairs.bonus,
    why: buildWhy(garments, styleId, pairs),
  };
}

/**
 * Build every valid combination from the closet (1 top + 1 bottom, or 1 dress,
 * plus optional outerwear and shoes), score each, and return the ranked list.
 */
export function generateOutfits(
  closet: Garment[],
  styleId: StyleId,
  { limit = MAX_RANKED_OUTFITS, hideLow = true }: { limit?: number; hideLow?: boolean } = {}
): Outfit[] {
  const tops = closet.filter((g) => g.category === 'top');
  const bottoms = closet.filter((g) => g.category === 'bottom');
  const dresses = closet.filter((g) => g.category === 'dress');
  const outerwear = closet.filter((g) => g.category === 'outerwear');
  const shoes = closet.filter((g) => g.category === 'shoes');
  const accessories = closet.filter((g) => g.category === 'accessory');

  const bases: Garment[][] = [];
  for (const top of tops) for (const bottom of bottoms) bases.push([top, bottom]);
  for (const dress of dresses) bases.push([dress]);

  const withOptional = (combos: Garment[][], extras: Garment[]): Garment[][] => {
    const out: Garment[][] = [];
    for (const combo of combos) {
      out.push(combo);
      for (const extra of extras) out.push([...combo, extra]);
    }
    return out;
  };

  // Add outerwear only where it can sensibly be layered over the base top
  // (no two mids, no two outers, no hoodie-under-blazer). See canLayer().
  const basesWithOuter: Garment[][] = [];
  for (const base of bases) {
    basesWithOuter.push(base);
    const topPiece = base.find((g) => g.category === 'top' || g.category === 'dress');
    for (const outer of outerwear) {
      if (!topPiece || canLayer(topPiece, outer)) basesWithOuter.push([...base, outer]);
    }
  }

  // Outfits vary in size: a dress alone (1) up to top+bottom+outer+shoes+accessory (5).
  // Shoes and an accessory are each optional layers; weather ranking later demotes
  // heavier/layered combos when it's warm, so lighter 2–3 piece looks surface then.
  const combos = withOptional(withOptional(basesWithOuter, shoes), accessories);

  const outfits: Outfit[] = [];
  for (const combo of combos) {
    const outfit = scoreOutfit(combo, styleId);
    if (outfit) outfits.push(outfit);
  }
  outfits.sort((a, b) => b.score - a.score);

  let ranked = outfits;
  if (hideLow && outfits.length > 0) {
    const cutoff = outfits[0].score * LOW_SCORE_FRACTION;
    ranked = outfits.filter((o) => o.score >= cutoff && o.score > 0);
  }
  return ranked.slice(0, limit);
}

/** Top style for a single garment or whole outfit (ties broken by STYLE_IDS order). */
export function classifyGarment(garment: Garment): { styleId: StyleId; score: number } {
  return classifyTags(garment.tags)[0];
}

/**
 * When 'minimal' wins but a more distinctive style is within this margin, the
 * distinctive style takes the label — so neutral-heavy wardrobes don't collapse
 * every look into "Clean Minimal".
 */
const MINIMAL_FALLBACK_MARGIN = 2;

/**
 * The single canonical style label for a tag set — its globally best style
 * (across all 8 aesthetics, not a per-occasion subset), with 'minimal' treated
 * as a fallback so labels stay varied.
 */
export function canonicalStyleId(tags: Iterable<string>): StyleId {
  const ranked = classifyTags(tags);
  const top = ranked[0];
  if (!top || top.score <= 0) return top?.styleId ?? 'minimal';
  if (top.styleId === 'minimal') {
    const alt = ranked.find((r) => r.styleId !== 'minimal' && r.score > 0);
    if (alt && alt.score >= top.score - MINIMAL_FALLBACK_MARGIN) return alt.styleId;
  }
  return top.styleId;
}

/**
 * Re-describe an outfit under its canonical style, so the SAME garment
 * combination always carries one stable id, label, score and "why" everywhere
 * it appears — instead of being tagged differently per occasion/target style.
 */
export function canonicalizeOutfit(outfit: Outfit, garments: Garment[]): Outfit {
  const pieces = garments.filter((g) => outfit.garmentIds.includes(g.id));
  if (pieces.length === 0) return outfit;
  const tags = unionTags(pieces);
  const styleId = canonicalStyleId(tags);
  const pairs = pairwiseTags(pieces);
  const styleScore = scoreTagsForStyle(tags, styleId);
  return {
    ...outfit,
    id: outfitId(styleId, outfit.garmentIds),
    styleId,
    styleScore,
    compatBonus: pairs.bonus,
    score: styleScore + pairs.bonus,
    why: buildWhy(pieces, styleId, pairs),
  };
}

function countStrongOutfits(closet: Garment[], styleId: StyleId): number {
  return generateOutfits(closet, styleId, { limit: Number.MAX_SAFE_INTEGER, hideLow: false }).filter(
    (o) => o.score >= STRONG_OUTFIT_THRESHOLD
  ).length;
}

/**
 * Gap analysis — the differentiator. For each candidate purchase, simulate
 * adding it to the closet and rank candidates by how many NEW strong outfits
 * they unlock for the target style. Pure local math.
 */
export function gapAnalysis(
  closet: Garment[],
  styleId: StyleId,
  candidates: GapCandidate[],
  { top = 3 }: { top?: number } = {}
): GapRecommendation[] {
  const baseline = countStrongOutfits(closet, styleId);

  const results: GapRecommendation[] = [];
  for (const candidate of candidates) {
    const simulated: Garment = {
      id: `candidate:${candidate.id}`,
      imageUri: null,
      category: candidate.category,
      subtype: candidate.label,
      primary_color: '',
      secondary_colors: [],
      pattern: 'solid',
      material_guess: 'unknown',
      formality: 'casual',
      season: [],
      fit_silhouette: 'unknown',
      neutral: false,
      confidence: 'high',
      tags: candidate.tags,
      createdAt: new Date().toISOString(),
    };
    const withCandidate = [...closet, simulated];
    const after = countStrongOutfits(withCandidate, styleId);
    const delta = after - baseline;
    if (delta <= 0) continue;

    const best = generateOutfits(withCandidate, styleId, { limit: 50, hideLow: false }).find(
      (o) => o.garmentIds.includes(simulated.id) && o.score >= STRONG_OUTFIT_THRESHOLD
    );
    const exampleNames = best
      ? closet
          .filter((g) => best.garmentIds.includes(g.id))
          .map(describeGarment)
          .slice(0, 2)
          .join(' + ')
      : null;
    results.push({
      candidate,
      newStrongOutfits: delta,
      totalStrongAfter: after,
      reason:
        `Unlocks ${delta} new strong ${styleName(styleId)} outfit${delta === 1 ? '' : 's'}` +
        (exampleNames ? ` — e.g. with your ${exampleNames}` : ''),
      exampleOutfit: best ?? undefined,
    });
  }

  return results.sort((a, b) => b.newStrongOutfits - a.newStrongOutfits).slice(0, top);
}
