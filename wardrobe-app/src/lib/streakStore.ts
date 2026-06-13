/**
 * Daily engagement streak — a free retention feature for all tiers. Counts
 * consecutive days the app is opened. Device-local (AsyncStorage): a streak is
 * a habit nudge, not synced account data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'streak.v1';

function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}

interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  hydrated: boolean;
  hydrate(): Promise<void>;
  /** Record an app open for today; advances, holds, or resets the streak. */
  recordVisit(): void;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  current: 0,
  longest: 0,
  lastActiveDate: null,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as { current: number; longest: number; lastActiveDate: string | null })
        : null;
      set({
        current: parsed?.current ?? 0,
        longest: parsed?.longest ?? 0,
        lastActiveDate: parsed?.lastActiveDate ?? null,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
    get().recordVisit();
  },

  recordVisit() {
    const today = localDay();
    const { lastActiveDate, current, longest } = get();
    if (lastActiveDate === today) return; // already counted today

    let nextCurrent: number;
    if (lastActiveDate && daysBetween(lastActiveDate, today) === 1) {
      nextCurrent = current + 1; // consecutive day
    } else {
      nextCurrent = 1; // first visit or a gap broke the streak
    }
    const next = {
      current: nextCurrent,
      longest: Math.max(longest, nextCurrent),
      lastActiveDate: today,
    };
    set(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },
}));
