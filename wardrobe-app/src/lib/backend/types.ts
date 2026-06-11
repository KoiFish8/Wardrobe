import type { Garment, GarmentSchema, Profile, SavedOutfit, StyleId, SubscriptionTier } from '../types';

export interface TagImageInput {
  /** Base64 image data for the tagging Edge Function (real backend). */
  base64?: string;
  mimeType?: string;
  /** Bundled sample id (IMG_xxxx) — demo mode returns its fixture tags. */
  sampleId?: string;
}

export type NewGarment = Omit<Garment, 'id' | 'createdAt'>;

/**
 * Storage abstraction. SupabaseBackend is the production path (Postgres +
 * Storage + Edge Functions); LocalBackend runs the identical app fully
 * offline for demo/dev. Scoring never lives here — it's client-side math.
 */
export interface WardrobeBackend {
  readonly kind: 'supabase' | 'local';

  listGarments(): Promise<Garment[]>;
  addGarment(garment: NewGarment): Promise<Garment>;
  updateGarment(id: string, patch: Partial<Garment>): Promise<Garment>;
  deleteGarment(id: string): Promise<void>;

  getProfile(): Promise<Profile>;
  setPreferredStyles(styles: StyleId[]): Promise<Profile>;
  /** Direct tier set — used by the demo payment provider only. */
  setSubscriptionTier(tier: SubscriptionTier): Promise<Profile>;

  listSavedOutfits(): Promise<SavedOutfit[]>;
  saveOutfit(outfit: Omit<SavedOutfit, 'id' | 'createdAt'>): Promise<SavedOutfit>;
  deleteSavedOutfit(id: string): Promise<void>;

  /** Free-tier limit: 1 AI-style generation/day, enforced via event counting. */
  generationsToday(): Promise<number>;
  recordGeneration(): Promise<number>;

  /** The ONLY operation that may reach an LLM (scan → Haiku tags). */
  tagImage(input: TagImageInput): Promise<GarmentSchema>;

  /** Seed the closet with the 6 real tagged sample garments. */
  importSampleWardrobe(): Promise<Garment[]>;
}
