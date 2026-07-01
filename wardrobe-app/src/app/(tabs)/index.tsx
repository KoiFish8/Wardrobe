/**
 * Today — HOME (design screen 01). Greeting + weather, the daily suggested
 * look (computed on-device from the user's own closet — locked: no LLM),
 * scan / generate action cards, and the recently-worn row.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { OutfitWhiteboard } from '@/components/outfit-whiteboard';
import { showToast } from '@/components/toast';
import { Button, PressScale, ThemedText } from '@/components/ui';
import { TodaySkeleton } from '@/components/skeleton';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeather } from '@/hooks/use-weather';
import { useReplayKey } from '@/hooks/use-replay-key';
import { useGenerationStore } from '@/lib/generationStore';
import {
  generateOutfitsForOccasion,
  rankByWeather,
  rankSavedByRecommendation,
  seasonFromDate,
  seasonFromTemperature,
} from '@/lib/occasions';
import { savedToOutfit } from '@/lib/outfitHelpers';
import { useGarments, useProfile, useSavedOutfits, useSaveOutfit } from '@/lib/queries';
import { canonicalizeOutfit, generateOutfits } from '@/lib/scoring';
import { useSession } from '@/lib/session';
import { useTempUnit } from '@/lib/settingsStore';
import { useStreakStore } from '@/lib/streakStore';
import { formatTemp } from '@/lib/temperature';
import { styleName } from '@/lib/styleLibrary';
import { sampleImageSource } from '@/lib/sampleImages';
import { Image } from 'expo-image';
import type { Outfit } from '@/lib/types';
import { useWornStore, wornToday, type WornEntry } from '@/lib/wornStore';

/** Build a minimal Outfit from a worn-log entry so it can be shown/opened. */
function entryToOutfit(entry: WornEntry): Outfit {
  return {
    id: entry.outfitId,
    styleId: entry.styleId ?? 'minimal',
    garmentIds: entry.garmentIds,
    score: entry.score ?? 0,
    styleScore: 0,
    compatBonus: 0,
    why: '',
  };
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useSession();
  const { data: garments, isLoading } = useGarments();
  const { data: profile } = useProfile();
  const { data: saved } = useSavedOutfits();
  const { data: weather } = useWeather();
  const unit = useTempUnit();
  const saveOutfit = useSaveOutfit();
  const setGeneration = useGenerationStore((s) => s.setGeneration);
  const worn = useWornStore((s) => s.entries);
  const wear = useWornStore((s) => s.wear);
  const unwear = useWornStore((s) => s.unwear);
  const hydrateWorn = useWornStore((s) => s.hydrate);
  const streak = useStreakStore((s) => s.current);
  const hydrateStreak = useStreakStore((s) => s.hydrate);
  const [heroFav, setHeroFav] = useState(false);
  const replay = useReplayKey();

  useEffect(() => {
    hydrateWorn();
    hydrateStreak();
  }, [hydrateWorn, hydrateStreak]);

  const closet = useMemo(() => garments ?? [], [garments]);

  // Dress for today's weather (live temp → season, else the calendar).
  const season = useMemo(
    () => (weather ? seasonFromTemperature(weather.temperature) : seasonFromDate()),
    [weather]
  );

  // Daily suggestion: best weather-appropriate outfit for the user's preferred
  // styles, falling back to the Casual occasion. Pure local scoring — instant.
  const todayLook = useMemo(() => {
    if (closet.length === 0) return null;
    const weatherOpts = { season, temp: weather?.temperature };
    const preferred = profile?.preferredStyles ?? [];
    if (preferred.length > 0) {
      const ranked = rankByWeather(
        preferred
          .flatMap((styleId) => generateOutfits(closet, styleId).slice(0, 2))
          .map((o) => canonicalizeOutfit(o, closet)),
        closet,
        weatherOpts
      );
      if (ranked.length > 0) return ranked[0];
    }
    return generateOutfitsForOccasion(closet, 'casual', weatherOpts)[0] ?? null;
  }, [closet, profile?.preferredStyles, season, weather]);

  // The outfit(s) the user has actually picked to wear today (most recent first).
  const todayEntries = useMemo(() => wornToday(worn), [worn]);
  const selectedEntry = todayEntries[0] ?? null;
  const hasSelection = !!selectedEntry;

  // "Recommended for today" must come from the user's OWN collection (saved
  // outfits), ranked weather → favorites → score. Falls back to a generated
  // look only when nothing is saved yet.
  const recommended = useMemo(() => {
    const weatherOpts = { season, temp: weather?.temperature };
    const collection = saved ?? [];
    if (collection.length > 0) {
      const ranked = rankSavedByRecommendation(collection, closet, weatherOpts);
      if (ranked.length > 0) return savedToOutfit(ranked[0]);
    }
    return todayLook;
  }, [saved, closet, season, weather, todayLook]);

  // What the hero shows: the picked fit if there is one, else the recommendation.
  const heroOutfit = hasSelection ? entryToOutfit(selectedEntry) : recommended;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <TodaySkeleton />
      </SafeAreaView>
    );
  }

  const name = user?.username ?? (user?.isDemo ? 'Alex' : (user?.email?.split('@')[0] ?? 'there'));
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  const now = new Date();
  const day = now.toLocaleDateString(undefined, { weekday: 'short' });
  const overline = weather
    ? `${day} · ${formatTemp(weather.temperature, unit)} · ${weather.label}`
    : `${day} · ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  const heroPieces = heroOutfit ? closet.filter((g) => heroOutfit.garmentIds.includes(g.id)) : [];

  function openTodayLook() {
    if (!heroOutfit) return;
    setGeneration([heroOutfit], { occasionId: 'casual' });
    router.push(`/outfit/${encodeURIComponent(heroOutfit.id)}`);
  }

  /** Pick the recommended look as today's fit (updates the homepage instantly). */
  function wearToday() {
    if (!heroOutfit) return;
    wear(heroOutfit, styleName(heroOutfit.styleId));
    showToast("Set as today's look", 'checkmark-circle');
  }

  /** Clear today's selection — back to the recommendation. */
  function unselectToday() {
    if (!selectedEntry) return;
    unwear(selectedEntry.outfitId);
    showToast("Cleared today's look", 'close-circle');
  }

  // Recently worn: one thumb per recent outfit, but never repeat the same piece —
  // pick each entry's first garment we haven't shown yet, skip if all are dupes.
  const wornThumbs: { key: string; source: ReturnType<typeof sampleImageSource> | null; label: string }[] = [];
  const shownPieceIds = new Set<string>();
  for (const entry of worn) {
    const piece = closet.find((g) => entry.garmentIds.includes(g.id) && !shownPieceIds.has(g.id));
    if (!piece) continue;
    shownPieceIds.add(piece.id);
    wornThumbs.push({ key: entry.outfitId, source: sampleImageSource(piece.id, piece.imageUri), label: entry.title });
    if (wornThumbs.length >= 3) break;
  }
  const recentPieces = [...closet]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="overline">{overline}</ThemedText>
            <ThemedText variant="title" style={{ fontSize: 27, lineHeight: 31, marginTop: 4 }}>
              {greetingFor(now.getHours())},{'\n'}
              {displayName}.
            </ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {streak > 0 ? (
              <View style={[styles.streakPill, { backgroundColor: theme.terracottaSoft }]}>
                <Ionicons name="flame" size={14} color={theme.terracotta} />
                <ThemedText color={theme.terracotta} style={{ fontSize: 12.5, fontFamily: Fonts.sansBold }}>
                  {streak}
                </ThemedText>
              </View>
            ) : null}
            <Pressable onPress={() => router.push('/profile')}>
              <Avatar size={42} initial={displayName.charAt(0)} />
            </Pressable>
          </View>
        </View>

        {/* Today's look hero — the picked fit, else the recommendation */}
        <Animated.View key={`hero-${replay}`} entering={FadeInDown.duration(420)}>
          <PressScale onPress={heroOutfit ? openTodayLook : () => router.push('/scan')} style={[styles.hero, { backgroundColor: '#efe9df' }]}>
            <View>
              <OutfitWhiteboard pieces={heroPieces} height={286} />
              <View style={styles.heroBadge}>
                <ThemedText variant="overline" color={theme.accentText} style={{ fontSize: 11, letterSpacing: 0.5 }}>
                  {hasSelection ? "Today's look" : heroOutfit ? 'Recommended for today' : 'Today'}
                </ThemedText>
              </View>
              <View style={styles.heroFooter}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="heading">
                    {heroOutfit ? styleName(heroOutfit.styleId) : 'Your closet is empty'}
                  </ThemedText>
                  <ThemedText variant="caption" style={{ marginTop: 2 }}>
                    {heroOutfit
                      ? hasSelection
                        ? `You're wearing this · ${heroOutfit.garmentIds.length} pieces`
                        : `Built from ${heroOutfit.garmentIds.length} pieces you own`
                      : 'Scan a piece to get a daily look'}
                  </ThemedText>
                </View>
                {heroOutfit ? (
                  <Pressable
                    accessibilityLabel={heroFav ? 'Remove from favorites' : 'Add to favorites'}
                    onPress={() => {
                      const next = !heroFav;
                      setHeroFav(next);
                      showToast(
                        next ? 'Added to favorites' : 'Removed from favorites',
                        next ? 'heart' : 'heart-outline'
                      );
                      if (next) {
                        saveOutfit.mutate({
                          targetStyle: heroOutfit.styleId,
                          garmentIds: heroOutfit.garmentIds,
                          score: heroOutfit.score,
                          why: heroOutfit.why,
                          favorite: true,
                        });
                      }
                    }}
                    style={[styles.heartButton, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons
                      name={heroFav ? 'heart' : 'heart-outline'}
                      size={20}
                      color={heroFav ? theme.heart : theme.text}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </PressScale>
        </Animated.View>

        {/* Today's-look controls: wear / unselect / wear another */}
        {heroOutfit ? (
          <Animated.View key={`todayctl-${replay}`} entering={FadeInDown.duration(420).delay(40)} style={styles.todayControls}>
            {hasSelection ? (
              <>
                <Button
                  title="Unselect"
                  kind="secondary"
                  onPress={unselectToday}
                  icon={<Ionicons name="close" size={17} color={theme.text} />}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Wear another"
                  onPress={() => router.push('/wardrobe?tab=outfits')}
                  icon={<Ionicons name="add" size={18} color={theme.accentText} />}
                  style={{ flex: 1 }}
                />
              </>
            ) : (
              <Button
                title="Wear this today"
                onPress={wearToday}
                icon={<Ionicons name="checkmark" size={18} color={theme.accentText} />}
                style={{ flex: 1 }}
              />
            )}
          </Animated.View>
        ) : null}

        {/* Extra outfits worn today */}
        {todayEntries.length > 1 ? (
          <ThemedText variant="caption" color={theme.textSecondary} style={{ paddingHorizontal: 22, marginTop: 10 }}>
            {todayEntries.length} outfits worn today
          </ThemedText>
        ) : null}

        {/* Action cards */}
        <Animated.View key={`actions-${replay}`} entering={FadeInDown.duration(420).delay(80)} style={styles.actions}>
          {/* flex:1 cells so each Pressable fills half the row (PressScale's flex
              lands on its inner view, so the cell carries the layout grow). */}
          <View style={styles.actionCell}>
            <PressScale onPress={() => router.push('/scan')} style={[styles.actionCard, { backgroundColor: theme.accentSoft }]}>
              <View>
                <Ionicons name="camera-outline" size={22} color={theme.accentText} />
                <ThemedText variant="heading" color={theme.accentText} style={{ fontSize: 14, marginTop: 12 }}>
                  Scan an item
                </ThemedText>
                <ThemedText variant="caption" color="#b8b1a6" style={{ fontSize: 11.5, marginTop: 2 }}>
                  Add to your closet
                </ThemedText>
              </View>
            </PressScale>
          </View>
          <View style={styles.actionCell}>
            <PressScale onPress={() => router.push('/occasion')} style={[styles.actionCard, { backgroundColor: theme.backgroundElementAlt }]}>
              <View>
                <Ionicons name="sparkles-outline" size={22} color={theme.terracotta} />
                <ThemedText variant="heading" style={{ fontSize: 14, marginTop: 12 }}>
                  Generate a look
                </ThemedText>
                <ThemedText variant="caption" style={{ fontSize: 11.5, marginTop: 2 }}>
                  For any occasion
                </ThemedText>
              </View>
            </PressScale>
          </View>
        </Animated.View>

        {/* Ask your stylist (Pro chat) */}
        <Animated.View key={`assistant-${replay}`} entering={FadeInDown.duration(420).delay(120)} style={styles.assistantWrap}>
          <PressScale onPress={() => router.push('/assistant' as any)} style={[styles.assistantCard, { backgroundColor: theme.terracottaSoft }]}>
            <View style={[styles.assistantOrb, { backgroundColor: theme.background }]}>
              <Ionicons name="sparkles" size={20} color={theme.terracotta} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="heading" style={{ fontSize: 14.5 }}>
                Ask your stylist
              </ThemedText>
              <ThemedText variant="caption" style={{ fontSize: 12, marginTop: 1 }}>
                What to wear, how to pack, what to buy
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.terracotta} />
          </PressScale>
        </Animated.View>

        {/* Recently worn / recent pieces */}
        <Animated.View key={`recent-${replay}`} entering={FadeInDown.duration(420).delay(160)} style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <ThemedText variant="heading" style={{ fontSize: 14.5 }}>
              {wornThumbs.length > 0 ? 'Recently worn' : 'Recent pieces'}
            </ThemedText>
            <Pressable onPress={() => router.push('/wardrobe')} hitSlop={8}>
              <ThemedText variant="caption" color={theme.terracotta} style={{ fontFamily: Fonts.sansSemiBold }}>
                See all
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.recentRow}>
            {(wornThumbs.length > 0
              ? wornThumbs
              : recentPieces.map((g) => ({
                  key: g.id,
                  source: sampleImageSource(g.id, g.imageUri),
                  label: g.subtype,
                }))
            ).map((thumb) => (
              <View key={thumb.key} style={[styles.recentThumb, { backgroundColor: '#e7ddcc' }]}>
                {thumb.source ? (
                  <Image source={thumb.source} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={180} />
                ) : (
                  <View style={styles.recentEmpty}>
                    <ThemedText variant="caption" numberOfLines={1}>
                      {thumb.label}
                    </ThemedText>
                  </View>
                )}
              </View>
            ))}
            {wornThumbs.length === 0 && recentPieces.length === 0
              ? [0, 1, 2].map((i) => (
                  <View key={i} style={[styles.recentThumb, { backgroundColor: '#e7ddcc' }]} />
                ))
              : null}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 4,
  },
  hero: {
    marginHorizontal: 22,
    marginTop: 16,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
  },
  heroBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(60,53,45,0.78)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16,
  },
  heartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  todayControls: { flexDirection: 'row', gap: 10, paddingHorizontal: 22, paddingTop: 14 },
  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: 12, paddingHorizontal: 22, paddingTop: 16 },
  actionCell: { flex: 1 },
  actionCard: { flex: 1, borderRadius: Radius.xl, padding: 16 },
  assistantWrap: { paddingHorizontal: 22, paddingTop: 16 },
  assistantCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: Radius.xl },
  assistantOrb: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  recentSection: { paddingHorizontal: 22, paddingTop: 22 },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentRow: { flexDirection: 'row', gap: 11 },
  recentThumb: {
    flex: 1,
    height: 120,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  recentEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.two },
});
