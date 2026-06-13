/** Core domain types shared by the scoring engine, backends, and UI. */

export type StyleId =
  | 'minimal'
  | 'street'
  | 'oldmoney'
  | 'smartcasual'
  | 'athleisure'
  | 'grunge'
  | 'y2kskate'
  | 'workwear';

export type Category = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory';

export type Confidence = 'high' | 'medium' | 'low';

/** Raw tag schema returned by the vision model (docs/02-tagging-schema.md). */
export interface GarmentSchema {
  category: Category;
  subtype: string;
  primary_color: string;
  secondary_colors: string[];
  pattern: string;
  material_guess: string;
  formality: 'casual' | 'smart-casual' | 'formal';
  season: string[];
  fit_silhouette: string;
  neutral: boolean;
  confidence: Confidence;
  brand_text_detected?: string;
  note?: string;
}

/** A garment in the user's closet: raw schema fields + normalized library tags. */
export interface Garment extends GarmentSchema {
  id: string;
  imageUri: string | null;
  /** Normalized tags drawn from the style library vocabulary — what scoring uses. */
  tags: string[];
  createdAt: string;
  /** True when the user edited the model's tags (corrections are training data). */
  userCorrected?: boolean;
  /** Heart/favorite flag on the individual piece — biases outfit recommendations. */
  favorite?: boolean;
}

export interface Outfit {
  id: string;
  styleId: StyleId;
  garmentIds: string[];
  score: number;
  /** Style-affinity portion only (matrix + anti-affinity) — the validated math. */
  styleScore: number;
  compatBonus: number;
  why: string;
}

export interface GapCandidate {
  id: string;
  label: string;
  category: Category;
  tags: string[];
}

export interface GapRecommendation {
  candidate: GapCandidate;
  newStrongOutfits: number;
  totalStrongAfter: number;
  reason: string;
  exampleOutfit?: Outfit;
}

export type SubscriptionTier = 'free' | 'plus' | 'pro';

export interface Profile {
  id: string;
  subscriptionTier: SubscriptionTier;
  preferredStyles: StyleId[];
}

export interface SavedOutfit {
  id: string;
  targetStyle: StyleId;
  garmentIds: string[];
  score: number;
  why: string;
  createdAt: string;
  /** Heart/favorite flag — off by default, toggled independently of saving. */
  favorite?: boolean;
  /** How many times "Wear This" was tapped — powers most-worn sorting. */
  wornCount?: number;
  /** Soft-delete timestamp; non-null means it's in the trash, recoverable. */
  deletedAt?: string | null;
}
