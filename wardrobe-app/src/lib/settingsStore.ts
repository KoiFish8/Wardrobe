/**
 * Device-local app settings (AsyncStorage). Currently just the temperature
 * unit — defaults to Fahrenheit since the app launches in the USA, with a
 * Celsius option in Profile.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { create } from 'zustand';

import type { TempUnit } from './temperature';

const STORAGE_KEY = 'settings.v1';

interface SettingsState {
  unit: TempUnit;
  hydrated: boolean;
  hydrate(): Promise<void>;
  setUnit(unit: TempUnit): void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  unit: 'F', // default: Fahrenheit (US launch)
  hydrated: false,
  async hydrate() {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { unit?: TempUnit }) : null;
      set({ unit: parsed?.unit === 'C' ? 'C' : 'F', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setUnit(unit) {
    set({ unit });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ unit })).catch(() => {});
  },
}));

/** Convenience hook: ensures settings are hydrated, returns the current unit. */
export function useTempUnit(): TempUnit {
  const unit = useSettingsStore((s) => s.unit);
  const hydrate = useSettingsStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return unit;
}
