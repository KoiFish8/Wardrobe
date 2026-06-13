/**
 * Fully offline backend (AsyncStorage). Powers demo mode and development
 * without a Supabase project. tagImage never calls a network here — sample
 * images return their real fixture tags; arbitrary photos return a low-
 * confidence stub the user corrects on the confirm screen.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SAMPLE_IDS, sampleGarments, sampleSchemaById } from '../demoData';
import type { Garment, GarmentSchema, Profile, SavedOutfit, StyleId, SubscriptionTier } from '../types';
import type { NewGarment, TagImageInput, WardrobeBackend } from './types';

const KEYS = {
  garments: 'demo.garments.v1',
  profile: 'demo.profile.v1',
  saved: 'demo.savedOutfits.v1',
  generations: 'demo.generations.v1',
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function newId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_PROFILE: Profile = { id: 'demo-user', subscriptionTier: 'free', preferredStyles: [] };

export class LocalBackend implements WardrobeBackend {
  readonly kind = 'local' as const;

  async listGarments(): Promise<Garment[]> {
    return readJson<Garment[]>(KEYS.garments, []);
  }

  async addGarment(garment: NewGarment): Promise<Garment> {
    const garments = await this.listGarments();
    const created: Garment = { ...garment, id: newId(), createdAt: new Date().toISOString() };
    await writeJson(KEYS.garments, [created, ...garments]);
    return created;
  }

  async updateGarment(id: string, patch: Partial<Garment>): Promise<Garment> {
    const garments = await this.listGarments();
    const idx = garments.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Garment not found: ${id}`);
    garments[idx] = { ...garments[idx], ...patch, id };
    await writeJson(KEYS.garments, garments);
    return garments[idx];
  }

  async deleteGarment(id: string): Promise<void> {
    const garments = await this.listGarments();
    await writeJson(
      KEYS.garments,
      garments.filter((g) => g.id !== id)
    );
  }

  async getProfile(): Promise<Profile> {
    return readJson<Profile>(KEYS.profile, DEFAULT_PROFILE);
  }

  async setPreferredStyles(styles: StyleId[]): Promise<Profile> {
    const profile = await this.getProfile();
    const next = { ...profile, preferredStyles: styles };
    await writeJson(KEYS.profile, next);
    return next;
  }

  async setSubscriptionTier(tier: SubscriptionTier): Promise<Profile> {
    const profile = await this.getProfile();
    const next = { ...profile, subscriptionTier: tier };
    await writeJson(KEYS.profile, next);
    return next;
  }

  private async allSavedOutfits(): Promise<SavedOutfit[]> {
    return readJson<SavedOutfit[]>(KEYS.saved, []);
  }

  async listSavedOutfits(): Promise<SavedOutfit[]> {
    return (await this.allSavedOutfits()).filter((o) => !o.deletedAt);
  }

  async listDeletedOutfits(): Promise<SavedOutfit[]> {
    return (await this.allSavedOutfits())
      .filter((o) => o.deletedAt)
      .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
  }

  async saveOutfit(outfit: Omit<SavedOutfit, 'id' | 'createdAt'>): Promise<SavedOutfit> {
    const saved = await this.allSavedOutfits();
    // Prevent duplicate outfits: a look with the same set of pieces is never
    // saved twice. If a matching one was trashed, restore it instead.
    const key = [...outfit.garmentIds].sort().join('+');
    const existing = saved.find((o) => [...o.garmentIds].sort().join('+') === key);
    if (existing) {
      return existing.deletedAt
        ? this.updateSavedOutfit(existing.id, { deletedAt: null })
        : existing;
    }
    const created: SavedOutfit = {
      favorite: false,
      wornCount: 0,
      deletedAt: null,
      ...outfit,
      id: newId(),
      createdAt: new Date().toISOString(),
    };
    await writeJson(KEYS.saved, [created, ...saved]);
    return created;
  }

  async updateSavedOutfit(id: string, patch: Partial<SavedOutfit>): Promise<SavedOutfit> {
    const saved = await this.allSavedOutfits();
    const idx = saved.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Saved outfit not found: ${id}`);
    saved[idx] = { ...saved[idx], ...patch, id };
    await writeJson(KEYS.saved, saved);
    return saved[idx];
  }

  /** Soft delete — flag with a timestamp so it can be recovered from the trash. */
  async deleteSavedOutfit(id: string): Promise<void> {
    await this.updateSavedOutfit(id, { deletedAt: new Date().toISOString() });
  }

  async purgeSavedOutfit(id: string): Promise<void> {
    const saved = await this.allSavedOutfits();
    await writeJson(
      KEYS.saved,
      saved.filter((o) => o.id !== id)
    );
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async generationsToday(): Promise<number> {
    const events = await readJson<Record<string, number>>(KEYS.generations, {});
    return events[this.todayKey()] ?? 0;
  }

  async recordGeneration(): Promise<number> {
    const events = await readJson<Record<string, number>>(KEYS.generations, {});
    const key = this.todayKey();
    events[key] = (events[key] ?? 0) + 1;
    await writeJson(KEYS.generations, events);
    return events[key];
  }

  async tagImage(input: TagImageInput): Promise<GarmentSchema> {
    // Simulated latency so the scan UX matches the real flow
    await new Promise((r) => setTimeout(r, 600));
    if (input.sampleId) {
      const schema = sampleSchemaById(input.sampleId);
      if (schema) return schema;
    }
    // Unknown photo in demo mode: honest low-confidence stub for the user to correct
    return {
      category: 'top',
      subtype: 'unknown',
      primary_color: 'unknown',
      secondary_colors: [],
      pattern: 'solid',
      material_guess: 'unknown',
      formality: 'casual',
      season: [],
      fit_silhouette: 'unknown',
      neutral: false,
      confidence: 'low',
      note: 'Demo mode: connect Supabase + Anthropic to tag real photos. Edit the tags below.',
    };
  }

  async importSampleWardrobe(): Promise<Garment[]> {
    const existing = await this.listGarments();
    const existingIds = new Set(existing.map((g) => g.id));
    const fresh = sampleGarments().filter((g) => !existingIds.has(g.id));
    const merged = [...fresh, ...existing];
    await writeJson(KEYS.garments, merged);
    return merged;
  }

  /** Demo-only helper so sign-out leaves a clean slate. */
  async resetAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  }
}

export const DEMO_SAMPLE_IDS = SAMPLE_IDS;
