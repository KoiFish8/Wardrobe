/**
 * Occasion → style mapping (data/occasions-v1.json). The design's generate flow
 * picks an occasion; the scorer still works on the library's 8 aesthetics, so an
 * occasion fans out to its mapped styles and the ranked results are merged.
 *
 * Generation stays pure local tag math (locked rule, no LLM). Weather only
 * re-ranks/filters the already-scored outfits by seasonal fit — it never calls
 * a model and never changes the validated style-affinity math.
 */
import occasionsJson from '../../data/occasions-v1.json';

import { canonicalizeOutfit, generateOutfits } from './scoring';
import type { Garment, Outfit, StyleId } from './types';

export interface OccasionInfo {
  label: string;
  subtitle: string;
  icon: string;
  styles: StyleId[];
}

const raw = occasionsJson as unknown as {
  version: string;
  occasions: Record<string, OccasionInfo>;
};

export const OCCASIONS: Record<string, OccasionInfo> = raw.occasions;
export const OCCASION_IDS = Object.keys(raw.occasions);

export function occasionLabel(id: string): string {
  return OCCASIONS[id]?.label ?? id;
}

// ── Weather / seasonality ────────────────────────────────────────────────

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

/** Map a current temperature (°C) to the season a wardrobe should dress for. */
export function seasonFromTemperature(temp: number): Season {
  if (temp <= 7) return 'winter';
  if (temp <= 16) return 'fall';
  if (temp <= 23) return 'spring';
  return 'summer';
}

/** Calendar fallback when there's no live weather (northern-hemisphere months). */
export function seasonFromDate(date = new Date()): Season {
  const m = date.getMonth();
  if (m <= 1 || m === 11) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'fall';
}

const OPPOSITE: Record<Season, Season> = {
  winter: 'summer',
  summer: 'winter',
  spring: 'fall',
  fall: 'spring',
};

// Rough °C band each season dresses for (overlapping on purpose).
const SEASON_TEMP: Record<Season, [number, number]> = {
  winter: [-5, 9],
  fall: [8, 17],
  spring: [12, 21],
  summer: [20, 33],
};

export interface WeatherRange {
  /** Inclusive °C bounds the outfit is comfortable in. */
  min: number;
  max: number;
  /** Short human label, e.g. "Cool-weather". */
  label: string;
}

/**
 * The temperature band an outfit is comfortable in, derived from its pieces'
 * seasons: each piece contributes the union of its seasons' bands, and the
 * outfit is the intersection (the heaviest piece caps the top end — you can't
 * wear a parka when it's hot). Pieces with no season data don't constrain it.
 */
export function outfitWeatherRange(pieces: Garment[]): WeatherRange {
  let lo = -10;
  let hi = 40;
  let constrained = false;
  for (const p of pieces) {
    const seasons = (p.season ?? []) as Season[];
    if (seasons.length === 0) continue; // all-season piece — flexible
    constrained = true;
    let pl = 99;
    let ph = -99;
    for (const s of seasons) {
      const band = SEASON_TEMP[s];
      if (!band) continue;
      pl = Math.min(pl, band[0]);
      ph = Math.max(ph, band[1]);
    }
    lo = Math.max(lo, pl);
    hi = Math.min(hi, ph);
  }
  if (!constrained) {
    lo = 5;
    hi = 28;
  } else if (lo > hi) {
    // Conflicting pieces (e.g. summer tee + winter coat) — center a sensible band.
    const mid = Math.round((lo + hi) / 2);
    lo = mid - 4;
    hi = mid + 4;
  }
  lo = Math.round(lo);
  hi = Math.round(hi);
  const label =
    hi <= 9 ? 'Cold-weather' : hi <= 16 ? 'Cool-weather' : lo >= 20 ? 'Warm-weather' : 'Mild-weather';
  return { min: lo, max: hi, label };
}

/**
 * How an outfit suits today's temperature. 'warm' = the outfit is heavier than
 * today needs; 'cold' = it's too light for today; 'good' = in range.
 */
export function weatherFitForToday(
  range: WeatherRange,
  temp: number
): 'good' | 'cold' | 'warm' {
  if (temp > range.max + 1) return 'warm'; // today hotter than the outfit's top → too warm to wear
  if (temp < range.min - 1) return 'cold'; // today colder than the outfit's floor → too light
  return 'good';
}

/**
 * How well an outfit suits the target season: +1 per in-season (or all-season)
 * piece, −1 per piece that's only good in the opposite season. Pieces with no
 * season data are treated as all-season (neutral-positive).
 */
function seasonalFit(garments: Garment[], season: Season): number {
  let fit = 0;
  for (const g of garments) {
    const seasons = g.season ?? [];
    if (seasons.length === 0 || seasons.includes(season)) fit += 1;
    else if (seasons.length === 1 && seasons[0] === OPPOSITE[season]) fit -= 1;
  }
  return fit;
}

/**
 * How far (in °C) today's temperature sits outside an outfit's comfortable band.
 * 0 = today is squarely in range (ideal); larger = more over/under-dressed. This
 * is piece-count-independent, so a light 2-piece look on a hot day beats a heavy
 * layered one regardless of how many pieces each has — which is what makes outfit
 * sizes vary with the weather.
 */
function weatherDistance(pieces: Garment[], temp: number): number {
  const range = outfitWeatherRange(pieces);
  if (temp < range.min) return range.min - temp;
  if (temp > range.max) return temp - range.max;
  return 0;
}

/** Count of favorited (hearted) pieces in an outfit — the favorites signal. */
function favoriteCount(pieces: Garment[]): number {
  let n = 0;
  for (const g of pieces) if (g.favorite) n += 1;
  return n;
}

export interface WeatherRankOpts {
  season?: Season;
  /** Live temperature in °C. When present, ranking keys primarily on °C fit. */
  temp?: number;
}

/**
 * Re-rank already-scored outfits with the locked recommendation priority:
 *   1. weather  (closest to today's temperature — the main signal)
 *   2. favorites (more of the user's hearted pieces)
 *   3. score    (validated style-affinity math, the final tiebreaker)
 * Exported so the Today screen can weather-rank its preferred-style look.
 */
export function rankByWeather(
  outfits: Outfit[],
  closet: Garment[],
  opts?: WeatherRankOpts | Season
): Outfit[] {
  return applyWeather(outfits, closet, normalizeOpts(opts));
}

function normalizeOpts(opts?: WeatherRankOpts | Season): WeatherRankOpts {
  if (!opts) return {};
  return typeof opts === 'string' ? { season: opts } : opts;
}

function applyWeather(outfits: Outfit[], closet: Garment[], opts: WeatherRankOpts): Outfit[] {
  const { season, temp } = opts;
  if (!season && temp == null) return outfits;
  const byId = new Map(closet.map((g) => [g.id, g]));
  const rows = outfits.map((o) => {
    const pieces = o.garmentIds.map((id) => byId.get(id)!).filter(Boolean);
    return {
      o,
      fit: season ? seasonalFit(pieces, season) : 0,
      // Bucket the °C gap so small differences (≤2°) tie and fall through to
      // favorites/score, but a genuinely wrong-for-today outfit is pushed down.
      tempBucket: temp == null ? 0 : Math.round(weatherDistance(pieces, temp) / 3),
      favs: favoriteCount(pieces),
    };
  });
  // Drop outfits that are net out-of-season (e.g. a parka on a hot day).
  const kept = season ? rows.filter((x) => x.fit >= 0) : rows;
  const pool = kept.length > 0 ? kept : rows; // never strand the user with nothing
  return pool
    .sort(
      (a, b) =>
        a.tempBucket - b.tempBucket || // 1. weather: closest to today's temp first
        b.favs - a.favs || // 2. favorites: more hearted pieces
        b.o.score - a.o.score // 3. score: validated style math
    )
    .map((x) => x.o);
}

/**
 * Rank ANY pre-built looks (e.g. the user's saved outfits) by the same locked
 * priority — weather → favorites → score — without regenerating anything. Used
 * for the "recommended outfit for today" pick, which must come from the user's
 * own collection, not a freshly generated combo.
 */
export function rankSavedByRecommendation<T extends { garmentIds: string[]; score: number }>(
  items: T[],
  closet: Garment[],
  opts?: WeatherRankOpts | Season
): T[] {
  const { season, temp } = normalizeOpts(opts);
  const byId = new Map(closet.map((g) => [g.id, g]));
  const rows = items.map((it) => {
    const pieces = it.garmentIds.map((id) => byId.get(id)!).filter(Boolean);
    return {
      it,
      fit: season ? seasonalFit(pieces, season) : 0,
      tempBucket: temp == null ? 0 : Math.round(weatherDistance(pieces, temp) / 3),
      favs: favoriteCount(pieces),
    };
  });
  const kept = season ? rows.filter((x) => x.fit >= 0) : rows;
  const pool = kept.length > 0 ? kept : rows;
  return pool
    .sort((a, b) => a.tempBucket - b.tempBucket || b.favs - a.favs || b.it.score - a.it.score)
    .map((x) => x.it);
}

// ── Generation ───────────────────────────────────────────────────────────

/**
 * Generate ranked outfits for an occasion: score against each mapped style
 * (pure local tag math — locked rule, no LLM), merge, dedupe identical piece
 * sets keeping the best-scoring style, then weather-rank.
 */
export function generateOutfitsForOccasion(
  closet: Garment[],
  occasionId: string,
  opts?: WeatherRankOpts | Season
): Outfit[] {
  const info = OCCASIONS[occasionId];
  if (!info) return [];
  // Dedupe by piece set (a combo can pass under several mapped styles), then
  // give each combo its single canonical label/score so the same outfit is
  // never tagged two different ways.
  const byPieces = new Map<string, Outfit>();
  for (const styleId of info.styles) {
    for (const outfit of generateOutfits(closet, styleId)) {
      const key = [...outfit.garmentIds].sort().join('+');
      if (!byPieces.has(key)) byPieces.set(key, canonicalizeOutfit(outfit, closet));
    }
  }
  const merged = [...byPieces.values()].sort((a, b) => b.score - a.score);
  return applyWeather(merged, closet, normalizeOpts(opts));
}

/**
 * Which occasions can actually be pulled off with the current closet — used to
 * hide occasions that would only yield weak/empty results. An occasion counts
 * as achievable if it produces at least one outfit for the season.
 */
export function achievableOccasions(closet: Garment[], opts?: WeatherRankOpts | Season): string[] {
  return OCCASION_IDS.filter((id) => generateOutfitsForOccasion(closet, id, opts).length > 0);
}
