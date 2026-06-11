import { describe, expect, it } from 'vitest';

import { sampleGarments } from '../demoData';
import { GAP_CANDIDATES } from '../gapCandidates';
import {
  STRONG_OUTFIT_THRESHOLD,
  classifyGarment,
  classifyTags,
  gapAnalysis,
  generateOutfits,
  scoreOutfit,
  scoreTagsForStyle,
} from '../scoring';
import { ALL_TAGS, STYLE_IDS, styleLibrary } from '../styleLibrary';
import type { Garment } from '../types';

function garment(id: string, category: Garment['category'], tags: string[]): Garment {
  return {
    id,
    imageUri: null,
    category,
    subtype: id,
    primary_color: 'grey',
    secondary_colors: [],
    pattern: 'solid',
    material_guess: 'cotton',
    formality: 'casual',
    season: [],
    fit_silhouette: 'regular',
    neutral: true,
    confidence: 'high',
    tags,
    createdAt: new Date().toISOString(),
  };
}

describe('style library integrity', () => {
  it('has 8 styles and 30 tags', () => {
    expect(STYLE_IDS).toHaveLength(8);
    expect(ALL_TAGS).toHaveLength(30);
  });

  it('strips _comment keys from edge maps', () => {
    expect(Object.keys(styleLibrary.tagTagCompatibility)).not.toContain('_comment');
    expect(Object.keys(styleLibrary.incompatiblePairs)).not.toContain('_comment');
  });
});

describe('scoreTagsForStyle (validated matrix + anti-affinity math)', () => {
  it('sums S=2 / W=1 weights', () => {
    // tailored: oldmoney S(2); loafers: oldmoney S(2) → 4
    expect(scoreTagsForStyle(['tailored', 'loafers'], 'oldmoney')).toBe(4);
    // both are W(1) for minimal → 2
    expect(scoreTagsForStyle(['tailored', 'loafers'], 'minimal')).toBe(2);
  });

  it('deduplicates repeated tags', () => {
    expect(scoreTagsForStyle(['solid', 'solid'], 'minimal')).toBe(2);
  });

  it('subtracts anti-affinity — the §4 false-positive fix', () => {
    // grey-knit-look: knit(2)+neutral(2) = 4 for oldmoney, but wide-leg(−1)
    // and skate-shoe(−2) push it away → 1, while minimal stays at 2+2+1+0 = 5
    const tags = ['chunky-knit', 'neutral-tones', 'wide-leg', 'skate-shoe'];
    expect(scoreTagsForStyle(tags, 'minimal')).toBe(5);
    expect(scoreTagsForStyle(tags, 'oldmoney')).toBe(1);
    expect(classifyTags(tags)[0].styleId).not.toBe('oldmoney');
  });
});

describe('scoreOutfit', () => {
  it('adds cross-piece compatibility bonuses', () => {
    const top = garment('top1', 'top', ['oversized']);
    const bottom = garment('bot1', 'bottom', ['slim-fit']);
    const outfit = scoreOutfit([top, bottom], 'street');
    // street: oversized S(2) + slim-fit W(1) = 3; oversized↔slim-fit compat = 2
    expect(outfit).not.toBeNull();
    expect(outfit!.styleScore).toBe(3);
    expect(outfit!.compatBonus).toBe(2);
    expect(outfit!.score).toBe(5);
  });

  it('suppresses hard clashes across pieces (two graphic prints)', () => {
    const top = garment('top1', 'top', ['graphic-print']);
    const bottom = garment('bot1', 'bottom', ['graphic-print']);
    expect(scoreOutfit([top, bottom], 'street')).toBeNull();
  });

  it('suppresses tailored + performance-sneaker', () => {
    const top = garment('top1', 'top', ['tailored', 'solid']);
    const bottom = garment('bot1', 'bottom', ['solid']);
    const shoes = garment('shoe1', 'shoes', ['performance-sneaker']);
    expect(scoreOutfit([top, bottom, shoes], 'smartcasual')).toBeNull();
    // without the clashing shoes the same base is fine
    expect(scoreOutfit([top, bottom], 'smartcasual')).not.toBeNull();
  });

  it('produces a non-empty local "why" with no LLM', () => {
    const outfit = scoreOutfit(
      [garment('t', 'top', ['chunky-knit', 'neutral-tones']), garment('b', 'bottom', ['solid'])],
      'minimal'
    );
    expect(outfit!.why.length).toBeGreaterThan(10);
  });
});

describe('generateOutfits over the real tagged wardrobe', () => {
  const closet = sampleGarments();

  it('builds top+bottom (+optional outerwear) combos, ranked descending', () => {
    const outfits = generateOutfits(closet, 'minimal');
    expect(outfits.length).toBeGreaterThan(0);
    for (let i = 1; i < outfits.length; i++) {
      expect(outfits[i - 1].score).toBeGreaterThanOrEqual(outfits[i].score);
    }
    // every outfit has exactly one top or dress base
    for (const o of outfits) {
      const pieces = closet.filter((g) => o.garmentIds.includes(g.id));
      expect(pieces.filter((p) => p.category === 'top' || p.category === 'dress').length).toBe(1);
    }
  });

  it('matches hand-computed score for the best minimal look', () => {
    // charcoal oversized hoodie [oversized, neutral-tones, solid]
    // + grey sweatpants [neutral-tones, solid, minimal-branding]
    // + cream zip hoodie [neutral-tones, solid, minimal-branding]
    // union → minimal: 1+2+2+2 = 7, no compat edges
    const hoodie = closet.find((g) => g.id === 'IMG_5447')!;
    const sweats = closet.find((g) => g.id === 'IMG_5449')!;
    const zip = closet.find((g) => g.id === 'IMG_5446')!;
    const outfit = scoreOutfit([hoodie, sweats, zip], 'minimal')!;
    expect(outfit.styleScore).toBe(7);
  });

  it('respects the limit option', () => {
    expect(generateOutfits(closet, 'street', { limit: 3 }).length).toBeLessThanOrEqual(3);
  });
});

describe('gapAnalysis over the real tagged wardrobe', () => {
  const closet = sampleGarments();

  it('recommends purchases that unlock new strong outfits (closet has no shoes)', () => {
    const recs = gapAnalysis(closet, 'minimal', GAP_CANDIDATES);
    expect(recs.length).toBeGreaterThan(0);
    for (const rec of recs) {
      expect(rec.newStrongOutfits).toBeGreaterThan(0);
      expect(rec.reason).toContain('Unlocks');
    }
    // sorted by unlock count
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].newStrongOutfits).toBeGreaterThanOrEqual(recs[i].newStrongOutfits);
    }
  });

  it('baseline strong count is the comparison point', () => {
    const baselineStrong = generateOutfits(closet, 'minimal', {
      limit: Number.MAX_SAFE_INTEGER,
      hideLow: false,
    }).filter((o) => o.score >= STRONG_OUTFIT_THRESHOLD).length;
    const recs = gapAnalysis(closet, 'minimal', GAP_CANDIDATES);
    if (recs.length > 0) {
      expect(recs[0].totalStrongAfter).toBe(baselineStrong + recs[0].newStrongOutfits);
    }
  });
});

describe('classifyGarment', () => {
  it('classifies a dressy piece toward oldmoney/smartcasual', () => {
    const g = garment('g', 'top', ['tailored', 'loafers', 'neutral-tones', 'solid', 'minimal-branding']);
    const top = classifyGarment(g);
    expect(top.score).toBe(10);
    expect(['oldmoney', 'smartcasual']).toContain(top.styleId);
  });
});
