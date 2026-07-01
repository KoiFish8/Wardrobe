/**
 * Collections — user-made groups of pieces (e.g. "Lisbon trip", "Capsule 10").
 * A Plus feature: pack a subset of the closet and have the stylist build outfits
 * ONLY from those pieces — useful when travelling without your whole wardrobe.
 *
 * Device-local (AsyncStorage), same pattern as wornStore/streakStore — collections
 * are an organizational nicety, not part of the synced data model (yet).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'collections.v1';

export interface Collection {
  id: string;
  name: string;
  garmentIds: string[];
  createdAt: string;
}

interface CollectionsState {
  collections: Collection[];
  hydrated: boolean;
  hydrate(): Promise<void>;
  create(name: string): Collection;
  rename(id: string, name: string): void;
  remove(id: string): void;
  /** Add or remove a piece from a collection (idempotent). */
  togglePiece(id: string, garmentId: string): void;
  /** Add several pieces at once (used by the multi-select picker). */
  addPieces(id: string, garmentIds: string[]): void;
}

function persist(collections: Collection[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collections)).catch(() => {});
}

function newId(): string {
  return `col_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  hydrated: false,
  async hydrate() {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({ collections: raw ? (JSON.parse(raw) as Collection[]) : [], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  create(name) {
    const collection: Collection = {
      id: newId(),
      name: name.trim() || 'Untitled',
      garmentIds: [],
      createdAt: new Date().toISOString(),
    };
    const collections = [collection, ...get().collections];
    set({ collections });
    persist(collections);
    return collection;
  },
  rename(id, name) {
    const collections = get().collections.map((c) =>
      c.id === id ? { ...c, name: name.trim() || c.name } : c
    );
    set({ collections });
    persist(collections);
  },
  remove(id) {
    const collections = get().collections.filter((c) => c.id !== id);
    set({ collections });
    persist(collections);
  },
  togglePiece(id, garmentId) {
    const collections = get().collections.map((c) => {
      if (c.id !== id) return c;
      const has = c.garmentIds.includes(garmentId);
      return {
        ...c,
        garmentIds: has
          ? c.garmentIds.filter((g) => g !== garmentId)
          : [...c.garmentIds, garmentId],
      };
    });
    set({ collections });
    persist(collections);
  },
  addPieces(id, garmentIds) {
    const collections = get().collections.map((c) => {
      if (c.id !== id) return c;
      const merged = new Set([...c.garmentIds, ...garmentIds]);
      return { ...c, garmentIds: [...merged] };
    });
    set({ collections });
    persist(collections);
  },
}));

/** A piece belongs to a collection if its id is listed. */
export function collectionGarments<T extends { id: string }>(
  collection: Collection,
  closet: T[]
): T[] {
  const ids = new Set(collection.garmentIds);
  return closet.filter((g) => ids.has(g.id));
}
