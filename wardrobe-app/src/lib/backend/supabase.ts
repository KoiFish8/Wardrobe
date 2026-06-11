/**
 * Production backend: Supabase Postgres (RLS-scoped rows), Storage for images,
 * and the tag-garment Edge Function — the app's single LLM touchpoint.
 * Schema: supabase/migrations/0001_init.sql.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { sampleGarments } from '../demoData';
import type { Garment, GarmentSchema, Profile, SavedOutfit, StyleId, SubscriptionTier } from '../types';
import type { NewGarment, TagImageInput, WardrobeBackend } from './types';

interface GarmentRow {
  id: string;
  image_url: string | null;
  category: Garment['category'];
  subtype: string;
  primary_color: string;
  secondary_colors: string[] | null;
  pattern: string;
  material_guess: string;
  formality: Garment['formality'];
  season: string[] | null;
  fit_silhouette: string;
  neutral: boolean;
  confidence: Garment['confidence'];
  tags: string[] | null;
  user_corrected: boolean | null;
  created_at: string;
}

function rowToGarment(row: GarmentRow): Garment {
  return {
    id: row.id,
    imageUri: row.image_url,
    category: row.category,
    subtype: row.subtype,
    primary_color: row.primary_color,
    secondary_colors: row.secondary_colors ?? [],
    pattern: row.pattern,
    material_guess: row.material_guess,
    formality: row.formality,
    season: row.season ?? [],
    fit_silhouette: row.fit_silhouette,
    neutral: row.neutral,
    confidence: row.confidence,
    tags: row.tags ?? [],
    userCorrected: row.user_corrected ?? false,
    createdAt: row.created_at,
  };
}

function garmentToRow(g: Partial<Garment> & { userId?: string }): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (g.imageUri !== undefined) row.image_url = g.imageUri;
  if (g.category !== undefined) row.category = g.category;
  if (g.subtype !== undefined) row.subtype = g.subtype;
  if (g.primary_color !== undefined) row.primary_color = g.primary_color;
  if (g.secondary_colors !== undefined) row.secondary_colors = g.secondary_colors;
  if (g.pattern !== undefined) row.pattern = g.pattern;
  if (g.material_guess !== undefined) row.material_guess = g.material_guess;
  if (g.formality !== undefined) row.formality = g.formality;
  if (g.season !== undefined) row.season = g.season;
  if (g.fit_silhouette !== undefined) row.fit_silhouette = g.fit_silhouette;
  if (g.neutral !== undefined) row.neutral = g.neutral;
  if (g.confidence !== undefined) row.confidence = g.confidence;
  if (g.tags !== undefined) row.tags = g.tags;
  if (g.userCorrected !== undefined) row.user_corrected = g.userCorrected;
  return row;
}

export class SupabaseBackend implements WardrobeBackend {
  readonly kind = 'supabase' as const;

  constructor(
    private client: SupabaseClient,
    private userId: string
  ) {}

  async listGarments(): Promise<Garment[]> {
    const { data, error } = await this.client
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as GarmentRow[]).map(rowToGarment);
  }

  async addGarment(garment: NewGarment): Promise<Garment> {
    const { data, error } = await this.client
      .from('garments')
      .insert({ ...garmentToRow(garment), user_id: this.userId })
      .select()
      .single();
    if (error) throw error;
    return rowToGarment(data as GarmentRow);
  }

  async updateGarment(id: string, patch: Partial<Garment>): Promise<Garment> {
    const { data, error } = await this.client
      .from('garments')
      .update(garmentToRow(patch))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToGarment(data as GarmentRow);
  }

  async deleteGarment(id: string): Promise<void> {
    const { error } = await this.client.from('garments').delete().eq('id', id);
    if (error) throw error;
  }

  async getProfile(): Promise<Profile> {
    const { data, error } = await this.client.from('profiles').select('*').eq('id', this.userId).single();
    if (error) throw error;
    return {
      id: data.id,
      subscriptionTier: (data.subscription_tier ?? 'free') as SubscriptionTier,
      preferredStyles: (data.preferred_styles ?? []) as StyleId[],
    };
  }

  async setPreferredStyles(styles: StyleId[]): Promise<Profile> {
    const { error } = await this.client
      .from('profiles')
      .update({ preferred_styles: styles })
      .eq('id', this.userId);
    if (error) throw error;
    return this.getProfile();
  }

  async setSubscriptionTier(_tier: SubscriptionTier): Promise<Profile> {
    // Real tier changes come from the Stripe webhook, never the client.
    throw new Error('Subscription tier is managed by the payment provider.');
  }

  async listSavedOutfits(): Promise<SavedOutfit[]> {
    const { data, error } = await this.client
      .from('saved_outfits')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((row) => ({
      id: row.id,
      targetStyle: row.target_style as StyleId,
      garmentIds: (row.garment_ids ?? []) as string[],
      score: Number(row.score),
      why: row.why ?? '',
      createdAt: row.created_at,
    }));
  }

  async saveOutfit(outfit: Omit<SavedOutfit, 'id' | 'createdAt'>): Promise<SavedOutfit> {
    const { data, error } = await this.client
      .from('saved_outfits')
      .insert({
        user_id: this.userId,
        target_style: outfit.targetStyle,
        garment_ids: outfit.garmentIds,
        score: outfit.score,
        why: outfit.why,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      targetStyle: data.target_style,
      garmentIds: data.garment_ids ?? [],
      score: Number(data.score),
      why: data.why ?? '',
      createdAt: data.created_at,
    };
  }

  async deleteSavedOutfit(id: string): Promise<void> {
    const { error } = await this.client.from('saved_outfits').delete().eq('id', id);
    if (error) throw error;
  }

  async generationsToday(): Promise<number> {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count, error } = await this.client
      .from('generation_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since.toISOString());
    if (error) throw error;
    return count ?? 0;
  }

  async recordGeneration(): Promise<number> {
    const { error } = await this.client.from('generation_events').insert({ user_id: this.userId });
    if (error) throw error;
    return this.generationsToday();
  }

  async tagImage(input: TagImageInput): Promise<GarmentSchema> {
    if (!input.base64) throw new Error('tagImage requires base64 image data');
    const { data, error } = await this.client.functions.invoke('tag-garment', {
      body: { image_base64: input.base64, mime_type: input.mimeType ?? 'image/jpeg' },
    });
    if (error) throw error;
    return data as GarmentSchema;
  }

  async importSampleWardrobe(): Promise<Garment[]> {
    const rows = sampleGarments().map((g) => ({
      ...garmentToRow(g),
      user_id: this.userId,
    }));
    const { error } = await this.client.from('garments').insert(rows);
    if (error) throw error;
    return this.listGarments();
  }
}
