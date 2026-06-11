/**
 * Candidate purchases the gap analyzer simulates. Archetypes are described
 * ONLY with tags from the library vocabulary — all weights stay in the JSON.
 */
import type { GapCandidate } from './types';

export const GAP_CANDIDATES: GapCandidate[] = [
  { id: 'white-tee', label: 'Plain white tee', category: 'top', tags: ['solid', 'neutral-tones', 'minimal-branding'] },
  { id: 'oxford-shirt', label: 'Oxford button-up shirt', category: 'top', tags: ['solid', 'neutral-tones', 'tailored', 'minimal-branding', 'heritage-detail'] },
  { id: 'chunky-knit-sweater', label: 'Chunky knit sweater', category: 'top', tags: ['chunky-knit', 'solid', 'neutral-tones', 'minimal-branding'] },
  { id: 'graphic-tee', label: 'Graphic tee', category: 'top', tags: ['graphic-print', 'washed-faded'] },
  { id: 'plaid-flannel', label: 'Plaid flannel overshirt', category: 'top', tags: ['plaid', 'washed-faded'] },
  { id: 'tailored-trousers', label: 'Tailored trousers', category: 'bottom', tags: ['tailored', 'slim-fit', 'solid', 'neutral-tones', 'minimal-branding'] },
  { id: 'raw-denim-jeans', label: 'Raw denim jeans', category: 'bottom', tags: ['raw-denim', 'solid', 'slim-fit', 'minimal-branding'] },
  { id: 'wide-leg-pants', label: 'Wide-leg pants', category: 'bottom', tags: ['wide-leg', 'solid', 'neutral-tones'] },
  { id: 'cargo-pants', label: 'Utility cargo pants', category: 'bottom', tags: ['utility-pockets', 'baggy', 'earth-tones'] },
  { id: 'leather-jacket', label: 'Leather jacket', category: 'outerwear', tags: ['leather', 'solid', 'all-black'] },
  { id: 'suede-chore-jacket', label: 'Suede chore jacket', category: 'outerwear', tags: ['suede', 'earth-tones', 'heritage-detail', 'minimal-branding'] },
  { id: 'technical-shell', label: 'Technical shell jacket', category: 'outerwear', tags: ['technical-synthetic', 'solid', 'minimal-branding'] },
  { id: 'tailored-overcoat', label: 'Tailored overcoat', category: 'outerwear', tags: ['tailored', 'solid', 'neutral-tones', 'minimal-branding'] },
  { id: 'loafers', label: 'Loafers', category: 'shoes', tags: ['loafers', 'minimal-branding', 'solid'] },
  { id: 'leather-boots', label: 'Leather boots', category: 'shoes', tags: ['boots', 'leather', 'solid'] },
  { id: 'chunky-sneakers', label: 'Chunky-sole sneakers', category: 'shoes', tags: ['chunky-sole-sneaker', 'solid', 'neutral-tones'] },
  { id: 'performance-sneakers', label: 'Performance running sneakers', category: 'shoes', tags: ['performance-sneaker', 'technical-synthetic'] },
  { id: 'skate-shoes', label: 'Skate shoes', category: 'shoes', tags: ['skate-shoe', 'washed-faded'] },
];
