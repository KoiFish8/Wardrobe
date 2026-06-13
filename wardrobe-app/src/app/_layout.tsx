import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ToastHost } from '@/components/toast';
import { Theme } from '@/constants/theme';
import { SessionProvider } from '@/lib/session';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Capsule is light-only: warm cream surfaces everywhere, including nav containers.
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Theme.accent,
    background: Theme.background,
    card: Theme.background,
    text: Theme.text,
    border: Theme.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style="dark" />
          {/* Screens draw their own Capsule headers (back chevron + centered title). */}
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Theme.background } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
            <Stack.Screen name="occasion" />
            <Stack.Screen name="looks" />
            <Stack.Screen name="outfit-builder" />
            <Stack.Screen name="deleted-outfits" />
            <Stack.Screen name="garment/[id]" />
            <Stack.Screen name="outfit/[id]" />
          </Stack>
          <ToastHost />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
