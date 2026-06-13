/**
 * Lightweight global toast — a small confirmation pill (e.g. "Added to
 * favorites") that animates in near the bottom and auto-dismisses. Driven by a
 * zustand store so any screen can call `showToast(...)`; the host is mounted
 * once in the root layout.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { ThemedText } from '@/components/ui';
import { Fonts, Radius } from '@/constants/theme';
import { Theme } from '@/constants/theme';

interface ToastState {
  message: string | null;
  icon: string | null;
  token: number;
  show(message: string, icon?: string): void;
  clear(): void;
}

const useToastStore = create<ToastState>((set) => ({
  message: null,
  icon: null,
  token: 0,
  show: (message, icon = 'checkmark-circle') =>
    set((s) => ({ message, icon, token: s.token + 1 })),
  clear: () => set({ message: null }),
}));

/** Call from anywhere to flash a confirmation toast. */
export function showToast(message: string, icon?: string) {
  useToastStore.getState().show(message, icon);
}

export function ToastHost() {
  const { message, icon, token, clear } = useToastStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clear, 1900);
    return () => clearTimeout(t);
  }, [message, token, clear]);

  if (!message) return null;
  return (
    <Animated.View
      key={token}
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="none"
      style={[styles.toast, { bottom: insets.bottom + 96 }]}>
      {icon ? <Ionicons name={icon as any} size={16} color={Theme.accentText} /> : null}
      <ThemedText color={Theme.accentText} style={{ fontSize: 13.5, fontFamily: Fonts.sansSemiBold }}>
        {message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.accent,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: Radius.pill,
    shadowColor: '#1b1815',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
