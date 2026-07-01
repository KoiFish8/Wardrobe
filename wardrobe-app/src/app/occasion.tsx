/**
 * Generate — "What's the occasion?" (design screen 04). The occasion fans out
 * to mapped styles from data/occasions-v1.json; scoring is pure local tag math
 * (locked: no LLM). Occasions that can't be pulled off from the current closet
 * are hidden, and the current weather seasonally re-ranks the results. Free
 * tier: 1 generation per day via generation events.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Button, EmptyState, PressScale, ThemedText } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { useReplayKey } from '@/hooks/use-replay-key';
import { useTheme } from '@/hooks/use-theme';
import { useWeather } from '@/hooks/use-weather';
import { useCollectionsStore } from '@/lib/collectionsStore';
import { useGenerationStore } from '@/lib/generationStore';
import {
  achievableOccasions,
  generateOutfitsForOccasion,
  OCCASIONS,
  seasonFromDate,
  seasonFromTemperature,
} from '@/lib/occasions';
import { useGarments, useGenerationsToday, useProfile } from '@/lib/queries';
import { RequireSession, useBackend } from '@/lib/session';
import { useTempUnit } from '@/lib/settingsStore';
import { formatTemp } from '@/lib/temperature';

const FREE_DAILY_GENERATIONS = 1;

export default function OccasionScreen() {
  return (
    <RequireSession>
      <OccasionPicker />
    </RequireSession>
  );
}

function OccasionPicker() {
  const theme = useTheme();
  const router = useRouter();
  const backend = useBackend();
  const replay = useReplayKey();
  const { data: garments } = useGarments();
  const { data: profile } = useProfile();
  const { data: weather } = useWeather();
  const unit = useTempUnit();
  const { data: generationsToday, refetch: refetchGenerations } = useGenerationsToday();
  const setGeneration = useGenerationStore((s) => s.setGeneration);
  const { collection: collectionId } = useLocalSearchParams<{ collection?: string }>();
  const collections = useCollectionsStore((s) => s.collections);

  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // When launched from a collection, only build outfits from that subset.
  const activeCollection = collectionId
    ? collections.find((c) => c.id === collectionId)
    : undefined;
  const closet = useMemo(() => {
    const all = garments ?? [];
    if (!activeCollection) return all;
    const ids = new Set(activeCollection.garmentIds);
    return all.filter((g) => ids.has(g.id));
  }, [garments, activeCollection]);
  const tier = profile?.subscriptionTier ?? 'free';

  // Dress for the weather: live temp → season, else fall back to the calendar.
  const season = useMemo(
    () => (weather ? seasonFromTemperature(weather.temperature) : seasonFromDate()),
    [weather]
  );

  // Recommendation inputs: live temperature drives the weather-primary ranking;
  // season filters out clearly out-of-season looks.
  const weatherOpts = useMemo(
    () => ({ season, temp: weather?.temperature }),
    [season, weather]
  );

  // Only show occasions that can actually be built from the current closet.
  const available = useMemo(
    () => achievableOccasions(closet, weatherOpts),
    [closet, weatherOpts]
  );
  const activeId = selected && available.includes(selected) ? selected : available[0];

  async function generate() {
    if (!activeId) return;
    setNotice(null);
    setBusy(true);
    try {
      if (tier === 'free') {
        const used = generationsToday ?? (await backend.generationsToday());
        if (used >= FREE_DAILY_GENERATIONS) {
          setNotice(
            `Free plan includes ${FREE_DAILY_GENERATIONS} generation per day. Upgrade to Plus for unlimited looks.`
          );
          return;
        }
        await backend.recordGeneration();
        refetchGenerations();
      }
      // Locked: pure local scoring over the bundled library — instant, free.
      const ranked = generateOutfitsForOccasion(closet, activeId, weatherOpts);
      setGeneration(ranked, { occasionId: activeId });
      router.push(`/looks?occasion=${activeId}`);
    } finally {
      setBusy(false);
    }
  }

  const weatherLine = weather
    ? `Dressed for ${formatTemp(weather.temperature, unit)} · ${weather.label.toLowerCase()}`
    : `Dressed for ${season}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader
        right={
          <Pressable
            accessibilityLabel="Close"
            hitSlop={10}
            onPress={() => router.replace('/(tabs)/wardrobe?tab=outfits' as any)}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 14 }}>
          <ThemedText variant="display">What's the occasion?</ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={{ marginTop: 12, fontSize: 14 }}>
            {activeCollection
              ? `Building looks only from "${activeCollection.name}" (${closet.length} pieces).`
              : 'Tell the stylist and it builds a look from your closet.'}
          </ThemedText>
          {available.length > 0 ? (
            <View style={[styles.weatherChip, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="partly-sunny-outline" size={14} color={theme.terracotta} />
              <ThemedText variant="caption" style={{ fontSize: 12 }}>
                {weatherLine}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {available.length === 0 ? (
          <EmptyState
            title="Not enough to style yet"
            body="Scan a few more pieces — at least a top and a bottom (or a dress) — and occasions you can pull off will show up here."
            action={<Button title="Scan a garment" onPress={() => router.push('/scan')} />}
          />
        ) : (
          <View style={styles.list}>
            {available.map((id, index) => {
              const info = OCCASIONS[id];
              const active = activeId === id;
              return (
                <Animated.View key={`${id}-${replay}`} entering={FadeInDown.duration(360).delay(index * 50)}>
                  <PressScale
                    onPress={() => setSelected(id)}
                    accessibilityLabel={info.label}
                    style={[
                      styles.option,
                      active
                        ? {
                            borderWidth: 1.5,
                            borderColor: theme.borderSelected,
                            backgroundColor: theme.backgroundSelected,
                          }
                        : { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
                    ]}>
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: active ? '#f0e2d2' : theme.backgroundElementAlt },
                      ]}>
                      <Ionicons
                        name={info.icon as any}
                        size={20}
                        color={active ? theme.terracotta : '#5a544b'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="heading" style={{ fontSize: 14.5 }}>
                        {info.label}
                      </ThemedText>
                      <ThemedText variant="caption" style={{ fontSize: 12, marginTop: 1 }}>
                        {info.subtitle}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name={active ? 'caret-forward' : 'chevron-forward'}
                      size={active ? 20 : 18}
                      color={active ? theme.terracotta : '#c4bcae'}
                    />
                  </PressScale>
                </Animated.View>
              );
            })}
          </View>
        )}

        {notice ? (
          <ThemedText variant="caption" color={theme.terracotta} style={{ paddingHorizontal: 24, marginTop: 14, lineHeight: 18 }}>
            {notice}
          </ThemedText>
        ) : null}
      </ScrollView>

      {available.length > 0 ? (
        <View style={[styles.footer, { pointerEvents: 'box-none' }]}>
          <LinearGradient
            colors={['rgba(251,250,247,0)', '#fbfaf7']}
            locations={[0, 0.3]}
            style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          />
          <Button
            title="Generate Outfits"
            loading={busy}
            onPress={generate}
            icon={<Ionicons name="sparkles-outline" size={19} color={theme.accentText} />}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    marginTop: 16,
  },
  list: { paddingHorizontal: 20, paddingTop: 22, gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 15,
    borderRadius: Radius.xl,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
  },
});
