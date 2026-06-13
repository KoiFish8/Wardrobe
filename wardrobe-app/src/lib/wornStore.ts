/**
 * Local "worn" log — powers the Today screen's "Recently worn" row and the
 * outfit detail "Wear This" action. Device-local on purpose (AsyncStorage):
 * wear history is a UI nicety, not part of the synced data model.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Outfit, StyleId } from './types';

const STORAGE_KEY = 'worn.log.v1';
const MAX_ENTRIES = 60;

export interface WornEntry {
  outfitId: string;
  garmentIds: string[];
  title: string;
  styleId?: StyleId;
  score?: number;
  wornAt: string;
}

interface WornState {
  entries: WornEntry[];
  hydrated: boolean;
  hydrate(): Promise<void>;
  /** Log an outfit as worn today (the "fit for today" selection). Idempotent per outfit. */
  wear(outfit: Outfit, title: string): void;
  /** Unselect / un-log an outfit (e.g. "I'm not wearing this today after all"). */
  unwear(outfitId: string): void;
}

/** True when an ISO timestamp falls on the local calendar's today. */
export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** The outfits the user has marked as worn today (most recent first). */
export function wornToday(entries: WornEntry[]): WornEntry[] {
  return entries.filter((e) => isToday(e.wornAt));
}

export const useWornStore = create<WornState>((set, get) => ({
  entries: [],
  hydrated: false,
  async hydrate() {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({ entries: raw ? (JSON.parse(raw) as WornEntry[]) : [], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  wear(outfit, title) {
    const entry: WornEntry = {
      outfitId: outfit.id,
      garmentIds: outfit.garmentIds,
      title,
      styleId: outfit.styleId,
      score: outfit.score,
      wornAt: new Date().toISOString(),
    };
    const entries = [entry, ...get().entries.filter((e) => e.outfitId !== outfit.id)].slice(
      0,
      MAX_ENTRIES
    );
    set({ entries });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  },
  unwear(outfitId) {
    const entries = get().entries.filter((e) => e.outfitId !== outfitId);
    set({ entries });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  },
}));
