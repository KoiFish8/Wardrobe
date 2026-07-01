/**
 * My Wardrobe (design screen 02) — two views via a segmented control:
 *  · Pieces  — searchable, filterable 3-column closet grid.
 *  · Outfits — saved + manually-built looks, with Generate / Build entry points.
 * (Outfits live here so looks are easy to get back to, not buried in the flow.)
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutfitWhiteboard } from '@/components/outfit-whiteboard';
import { showToast } from '@/components/toast';
import { Button, Chip, EmptyState, Loading, PressScale, ThemedText } from '@/components/ui';
import { GridSkeleton, OutfitListSkeleton } from '@/components/skeleton';
import { WeatherRangeChip } from '@/components/weather-range';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useReplayKey } from '@/hooks/use-replay-key';
import { useTheme } from '@/hooks/use-theme';
import { useWeather } from '@/hooks/use-weather';
import { useGenerationStore } from '@/lib/generationStore';
import {
  outfitWeatherRange,
  rankSavedByRecommendation,
  seasonFromDate,
  seasonFromTemperature,
} from '@/lib/occasions';
import { savedToOutfit } from '@/lib/outfitHelpers';
import {
  useDeletedOutfits,
  useGarments,
  useImportSampleWardrobe,
  useSavedOutfits,
  useUpdateGarment,
  useUpdateSavedOutfit,
} from '@/lib/queries';
import { garmentSwatches } from '@/lib/colors';
import { sampleImageSource } from '@/lib/sampleImages';
import { styleName } from '@/lib/styleLibrary';
import type { Category, Garment, SavedOutfit } from '@/lib/types';
import { useWornStore, wornToday } from '@/lib/wornStore';
import { useCollectionsStore } from '@/lib/collectionsStore';

const CATEGORY_FILTERS: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Bottoms' },
  { id: 'dress', label: 'Dresses' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'accessory', label: 'Accessories' },
];

type Tab = 'pieces' | 'outfits';

function matchesSearch(garment: Garment, query: string): boolean {
  const haystack = [
    garment.subtype,
    garment.primary_color,
    garment.category,
    garment.material_guess,
    ...garment.tags,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export default function WardrobeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { data: garments, isLoading, error } = useGarments();
  const importSample = useImportSampleWardrobe();

  const [tab, setTab] = useState<Tab>(params.tab === 'outfits' ? 'outfits' : 'pieces');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);

  const collections = useCollectionsStore((s) => s.collections);
  const hydrateCollections = useCollectionsStore((s) => s.hydrate);
  useEffect(() => {
    hydrateCollections();
  }, [hydrateCollections]);

  // The Wardrobe tab can already be mounted when navigated to (e.g. "Wear
  // another" from Today), so sync the active sub-tab from the URL param each
  // time it changes — otherwise it stays on whatever was last shown.
  useEffect(() => {
    if (params.tab === 'outfits' || params.tab === 'pieces') {
      setTab(params.tab);
      setCollectionId(null); // arrive on the full list, not a collection-filtered view
    }
  }, [params.tab]);
  const activeCollection = collectionId ? collections.find((c) => c.id === collectionId) : undefined;
  const collectionIds = useMemo(
    () => (activeCollection ? new Set(activeCollection.garmentIds) : null),
    [activeCollection]
  );

  const closet = useMemo(() => garments ?? [], [garments]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return closet.filter(
      (g) =>
        (category === 'all' || g.category === category) &&
        (!reviewOnly || g.confidence === 'low') &&
        (!favoritesOnly || g.favorite) &&
        (!collectionIds || collectionIds.has(g.id)) &&
        (query.length === 0 || matchesSearch(g, query))
    );
  }, [closet, category, search, reviewOnly, favoritesOnly, collectionIds]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <View style={styles.headerRow}>
          <ThemedText variant="title">My Wardrobe</ThemedText>
        </View>
        <GridSkeleton />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Couldn't load your closet"
        body={error instanceof Error ? error.message : 'Unknown error'}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <View style={styles.headerRow}>
        <ThemedText variant="title">My Wardrobe</ThemedText>
        {tab === 'pieces' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Pressable
              accessibilityLabel="Show favorite pieces only"
              onPress={() => setFavoritesOnly((v) => !v)}
              hitSlop={8}>
              <Ionicons
                name={favoritesOnly ? 'heart' : 'heart-outline'}
                size={21}
                color={favoritesOnly ? theme.heart : theme.text}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Show pieces that need tag review"
              onPress={() => setReviewOnly((v) => !v)}
              hitSlop={8}>
              <Ionicons
                name="filter-outline"
                size={21}
                color={reviewOnly ? theme.terracotta : theme.text}
              />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Pieces / Outfits segmented control */}
      <View style={styles.segment}>
        {(['pieces', 'outfits'] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.segmentBtn, active && { backgroundColor: theme.background }]}>
              <ThemedText
                style={{
                  fontSize: 13,
                  fontFamily: active ? Fonts.sansSemiBold : Fonts.sans,
                  color: active ? theme.text : theme.textSecondary,
                }}>
                {t === 'pieces' ? `Pieces${closet.length ? ` · ${closet.length}` : ''}` : 'Outfits'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Collection filter — sort pieces & outfits by a packed collection */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionBar}>
          {collections.length > 0 ? (
            <Chip small label="All" selected={!collectionId} onPress={() => setCollectionId(null)} />
          ) : null}
          {collections.map((c) => (
            <Chip
              key={c.id}
              small
              label={c.name}
              selected={collectionId === c.id}
              onPress={() => setCollectionId((prev) => (prev === c.id ? null : c.id))}
            />
          ))}
          <Pressable
            onPress={() => router.push('/collections' as any)}
            style={[styles.manageChip, { borderColor: theme.border }]}
            hitSlop={6}>
            <Ionicons name="albums-outline" size={13} color={theme.terracotta} />
            <ThemedText color={theme.terracotta} style={{ fontSize: 12.5, fontFamily: Fonts.sansSemiBold }}>
              {collections.length > 0 ? 'Manage' : 'Collections'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </View>

      {tab === 'pieces' ? (
        <PiecesView
          closet={closet}
          filtered={filtered}
          category={category}
          setCategory={setCategory}
          search={search}
          setSearch={setSearch}
          reviewOnly={reviewOnly}
          favoritesOnly={favoritesOnly}
          importSample={importSample}
          onScan={() => router.push('/scan')}
          onOpen={(id) => router.push(`/garment/${id}`)}
        />
      ) : (
        <OutfitsView collectionIds={collectionIds} collectionId={collectionId} collectionName={activeCollection?.name ?? null} />
      )}
    </SafeAreaView>
  );
}

function PiecesView({
  closet,
  filtered,
  category,
  setCategory,
  search,
  setSearch,
  reviewOnly,
  favoritesOnly,
  importSample,
  onScan,
  onOpen,
}: {
  closet: Garment[];
  filtered: Garment[];
  category: Category | 'all';
  setCategory: (c: Category | 'all') => void;
  search: string;
  setSearch: (s: string) => void;
  reviewOnly: boolean;
  favoritesOnly: boolean;
  importSample: ReturnType<typeof useImportSampleWardrobe>;
  onScan: () => void;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <>
      <View style={styles.searchWrap}>
        <View style={[styles.search, { backgroundColor: theme.backgroundInput }]}>
          <Ionicons name="search-outline" size={17} color={theme.textSecondary} />
          <TextInput
            placeholder="Search your closet"
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORY_FILTERS.map((f) => (
            <Chip key={f.id} label={f.label} selected={category === f.id} onPress={() => setCategory(f.id)} />
          ))}
        </ScrollView>
      </View>

      {closet.length === 0 ? (
        <EmptyState
          title="Your closet is empty"
          body="Scan one garment at a time — each photo becomes a tagged piece the stylist can work with."
          action={
            <View style={{ gap: Spacing.two }}>
              <Button title="Scan your first garment" onPress={onScan} />
              <Button
                title="Import sample wardrobe"
                kind="secondary"
                loading={importSample.isPending}
                onPress={() => importSample.mutate()}
              />
            </View>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          body={
            favoritesOnly
              ? 'No favorited pieces yet — tap the heart on any piece to favorite it.'
              : reviewOnly
                ? 'Nothing needs review — every piece has confident tags.'
                : 'Try a different search or category.'
          }
        />
      ) : (
        <FlatList
          data={filtered}
          numColumns={3}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeIn.duration(260).delay(Math.min(index, 9) * 30)} style={styles.tileWrap}>
              <GarmentTile garment={item} onPress={() => onOpen(item.id)} />
            </Animated.View>
          )}
        />
      )}
    </>
  );
}

type OutfitSort = 'recent' | 'favorites' | 'worn' | 'weather';

const SORTS: { id: OutfitSort; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'worn', label: 'Most worn' },
  { id: 'weather', label: 'For today' },
];

function OutfitsView({
  collectionIds,
  collectionId,
  collectionName,
}: {
  collectionIds: Set<string> | null;
  collectionId: string | null;
  collectionName: string | null;
}) {
  const theme = useTheme();
  const router = useRouter();
  const replay = useReplayKey();
  const { data: saved, isLoading } = useSavedOutfits();
  const { data: deleted } = useDeletedOutfits();
  const { data: garments } = useGarments();
  const { data: weather } = useWeather();
  const updateSaved = useUpdateSavedOutfit();
  const addOutfit = useGenerationStore((s) => s.addOutfit);
  const wornEntries = useWornStore((s) => s.entries);
  const hydrateWorn = useWornStore((s) => s.hydrate);
  const wear = useWornStore((s) => s.wear);
  const closet = useMemo(() => garments ?? [], [garments]);
  const [sort, setSort] = useState<OutfitSort>('recent');

  useEffect(() => {
    hydrateWorn();
  }, [hydrateWorn]);

  // "Recommended for today" — only when nothing's been picked for today yet.
  // Comes from the user's saved collection (never generated), weather→fav→score.
  const hasTodaySelection = wornToday(wornEntries).length > 0;
  const recommendedToday = useMemo(() => {
    if (hasTodaySelection) return null;
    const list = saved ?? [];
    if (list.length === 0) return null;
    const season = weather ? seasonFromTemperature(weather.temperature) : seasonFromDate();
    const ranked = rankSavedByRecommendation(list, closet, { season, temp: weather?.temperature });
    return ranked[0] ?? null;
  }, [saved, closet, weather, hasTodaySelection]);

  function open(item: SavedOutfit) {
    addOutfit(savedToOutfit(item));
    router.push(`/outfit/${encodeURIComponent(item.id)}?saved=1&fav=${item.favorite ? 1 : 0}`);
  }

  function wearToday(item: SavedOutfit) {
    wear(savedToOutfit(item), styleName(item.targetStyle));
    showToast("Set as today's look", 'checkmark-circle');
  }

  function toggleFavorite(item: SavedOutfit) {
    const next = !item.favorite;
    updateSaved.mutate({ id: item.id, patch: { favorite: next } });
    showToast(next ? 'Added to favorites' : 'Removed from favorites', next ? 'heart' : 'heart-outline');
  }

  const outfits = useMemo(() => {
    // When a collection is active, only outfits fully wearable from it.
    const base = collectionIds
      ? (saved ?? []).filter((o) => o.garmentIds.every((id) => collectionIds.has(id)))
      : (saved ?? []);
    // De-dupe on display: the SAME set of pieces should never appear twice, even
    // if duplicate rows exist from before the save-guard. Keep the best copy
    // (favorited > most-worn > newest).
    const bestByPieces = new Map<string, SavedOutfit>();
    for (const o of base) {
      const key = [...o.garmentIds].sort().join('+');
      const cur = bestByPieces.get(key);
      if (!cur) {
        bestByPieces.set(key, o);
        continue;
      }
      const better =
        (o.favorite ? 1 : 0) - (cur.favorite ? 1 : 0) ||
        (o.wornCount ?? 0) - (cur.wornCount ?? 0) ||
        o.createdAt.localeCompare(cur.createdAt);
      if (better > 0) bestByPieces.set(key, o);
    }
    const list = [...bestByPieces.values()];
    const pieceMap = new Map(closet.map((g) => [g.id, g]));
    const midpoint = (o: SavedOutfit) => {
      const r = outfitWeatherRange(o.garmentIds.map((id) => pieceMap.get(id)!).filter(Boolean));
      return (r.min + r.max) / 2;
    };
    switch (sort) {
      case 'favorites':
        // (b.favorite ? 1 : 0) — Number(undefined) is NaN, which broke the sort.
        return list.sort(
          (a, b) =>
            (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || b.createdAt.localeCompare(a.createdAt)
        );
      case 'worn':
        return list.sort((a, b) => (b.wornCount ?? 0) - (a.wornCount ?? 0));
      case 'weather':
        // Closest to today's temperature first (else by warmth).
        if (weather) {
          return list.sort(
            (a, b) => Math.abs(midpoint(a) - weather.temperature) - Math.abs(midpoint(b) - weather.temperature)
          );
        }
        return list.sort((a, b) => midpoint(b) - midpoint(a));
      default:
        return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [saved, sort, closet, weather, collectionIds]);

  return (
    <View style={{ flex: 1 }}>
      {/* When a collection is selected, scope generate + build to its pieces. */}
      {collectionName ? (
        <View style={[styles.scopeNote, { backgroundColor: theme.terracottaSoft }]}>
          <Ionicons name="albums-outline" size={13} color={theme.terracotta} />
          <ThemedText variant="caption" color={theme.terracotta} style={{ fontSize: 12 }}>
            Building only from “{collectionName}”
          </ThemedText>
        </View>
      ) : null}
      {/* Entry points (flex cells so each PressScale fills half the row) */}
      <View style={styles.outfitCtas}>
        <View style={{ flex: 1 }}>
          <PressScale
            onPress={() => router.push((collectionId ? `/occasion?collection=${collectionId}` : '/occasion') as any)}
            style={[styles.cta, { backgroundColor: theme.accent }]}>
            <View>
              <Ionicons name="sparkles-outline" size={20} color={theme.accentText} />
              <ThemedText variant="heading" color={theme.accentText} style={{ fontSize: 13.5, marginTop: 10 }}>
                Generate a look
              </ThemedText>
              <ThemedText variant="caption" color="#b8b1a6" style={{ fontSize: 11, marginTop: 1 }}>
                {collectionName ? `From ${collectionName}` : 'From an occasion'}
              </ThemedText>
            </View>
          </PressScale>
        </View>
        <View style={{ flex: 1 }}>
          <PressScale
            onPress={() => router.push((collectionId ? `/outfit-builder?collection=${collectionId}` : '/outfit-builder') as any)}
            style={[styles.cta, { backgroundColor: theme.backgroundElementAlt }]}>
            <View>
              <Ionicons name="construct-outline" size={20} color={theme.terracotta} />
              <ThemedText variant="heading" style={{ fontSize: 13.5, marginTop: 10 }}>
                Build your own
              </ThemedText>
              <ThemedText variant="caption" style={{ fontSize: 11, marginTop: 1 }}>
                {collectionName ? 'From this folder' : 'Pick the pieces'}
              </ThemedText>
            </View>
          </PressScale>
        </View>
      </View>

      {isLoading ? (
        <OutfitListSkeleton />
      ) : (saved ?? []).length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            title="No saved outfits yet"
            body="Generate a look or build your own, then tap Save — they'll collect here for quick access."
          />
          <DeletedEntry count={deleted?.length ?? 0} onPress={() => router.push('/deleted-outfits')} />
        </View>
      ) : (
        <FlatList
          key={replay}
          data={outfits}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 14 }}
          ListHeaderComponent={
            <View>
              {recommendedToday ? (
                <RecommendedToday
                  item={recommendedToday}
                  pieces={closet.filter((g) => recommendedToday.garmentIds.includes(g.id))}
                  temp={weather?.temperature ?? null}
                  onOpen={() => open(recommendedToday)}
                  onWear={() => wearToday(recommendedToday)}
                />
              ) : null}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                {SORTS.map((s) => (
                  <Chip key={s.id} small label={s.label} selected={sort === s.id} onPress={() => setSort(s.id)} />
                ))}
              </ScrollView>
            </View>
          }
          ListFooterComponent={
            <DeletedEntry count={deleted?.length ?? 0} onPress={() => router.push('/deleted-outfits')} />
          }
          renderItem={({ item, index }) => {
            const pieces = closet.filter((g) => item.garmentIds.includes(g.id));
            return (
              <Animated.View entering={FadeInDown.duration(340).delay(Math.min(index, 6) * 60)}>
                <PressScale onPress={() => open(item)} style={[styles.outfitCard, { backgroundColor: '#efe9df' }]}>
                  <View>
                    <OutfitWhiteboard pieces={pieces} height={150} />
                    <Pressable
                      accessibilityLabel={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
                      onPress={() => toggleFavorite(item)}
                      hitSlop={8}
                      style={[styles.cardHeart, { backgroundColor: 'rgba(251,250,247,0.92)' }]}>
                      <Ionicons
                        name={item.favorite ? 'heart' : 'heart-outline'}
                        size={18}
                        color={item.favorite ? theme.heart : theme.text}
                      />
                    </Pressable>
                    <View style={styles.outfitFooter}>
                      <View style={{ flex: 1 }}>
                        <ThemedText variant="heading" style={{ fontSize: 14.5 }}>
                          {styleName(item.targetStyle)}
                        </ThemedText>
                        <ThemedText variant="caption" numberOfLines={1} style={{ marginTop: 2 }}>
                          {pieces.length} piece{pieces.length === 1 ? '' : 's'}
                          {item.wornCount ? ` · worn ${item.wornCount}×` : ''}
                        </ThemedText>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <WeatherRangeChip pieces={pieces} temp={weather?.temperature ?? null} compact />
                        <View style={[styles.scorePill, { backgroundColor: theme.terracottaSoft }]}>
                          <ThemedText color={theme.terracotta} style={{ fontSize: 11.5, fontFamily: Fonts.sansSemiBold }}>
                            {item.score}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>
                </PressScale>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

function RecommendedToday({
  item,
  pieces,
  temp,
  onOpen,
  onWear,
}: {
  item: SavedOutfit;
  pieces: Garment[];
  temp: number | null;
  onOpen: () => void;
  onWear: () => void;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(360)} style={{ marginBottom: 14 }}>
      <View style={styles.recHeaderRow}>
        <Ionicons name="sparkles" size={14} color={theme.terracotta} />
        <ThemedText variant="overline" color={theme.terracotta} style={{ fontSize: 11.5, letterSpacing: 0.4 }}>
          Recommended for today
        </ThemedText>
      </View>
      <PressScale onPress={onOpen} style={[styles.recCard, { backgroundColor: '#efe9df' }]}>
        <View>
          <OutfitWhiteboard pieces={pieces} height={150} />
          <View style={styles.recFooter}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="heading" style={{ fontSize: 14.5 }}>
                {styleName(item.targetStyle)}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <WeatherRangeChip pieces={pieces} temp={temp} compact />
                <ThemedText variant="caption">
                  {pieces.length} piece{pieces.length === 1 ? '' : 's'}
                </ThemedText>
              </View>
            </View>
            <Button
              title="Wear today"
              onPress={onWear}
              icon={<Ionicons name="checkmark" size={16} color={theme.accentText} />}
              style={{ paddingHorizontal: 16, paddingVertical: 10 }}
            />
          </View>
        </View>
      </PressScale>
    </Animated.View>
  );
}

function DeletedEntry({ count, onPress }: { count: number; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.deletedRow, { borderColor: theme.border }]}>
      <Ionicons name="trash-outline" size={17} color={theme.textSecondary} />
      <ThemedText variant="body" style={{ flex: 1, fontSize: 13.5 }}>
        Recently deleted
      </ThemedText>
      {count > 0 ? (
        <ThemedText variant="caption" color={theme.terracotta}>
          {count}
        </ThemedText>
      ) : null}
      <Ionicons name="chevron-forward" size={17} color={theme.textTertiary} />
    </Pressable>
  );
}

function GarmentTile({ garment, onPress }: { garment: Garment; onPress: () => void }) {
  const theme = useTheme();
  const updateGarment = useUpdateGarment();
  const source = sampleImageSource(garment.id, garment.imageUri);
  const swatches = garmentSwatches(garment.primary_color, garment.secondary_colors);

  function toggleFavorite() {
    const next = !garment.favorite;
    updateGarment.mutate({ id: garment.id, patch: { favorite: next } });
    showToast(next ? 'Piece favorited' : 'Removed from favorites', next ? 'heart' : 'heart-outline');
  }

  return (
    <PressScale onPress={onPress} accessibilityLabel={`${garment.primary_color} ${garment.subtype}`}>
      <View style={[styles.tile, { backgroundColor: theme.backgroundImage }]}>
        {source ? (
          <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={180} />
        ) : (
          <View style={styles.tileEmpty}>
            <ThemedText variant="caption" numberOfLines={2} style={{ textAlign: 'center' }}>
              {garment.subtype}
            </ThemedText>
          </View>
        )}
        {garment.confidence === 'low' ? (
          <View style={[styles.badge, { backgroundColor: theme.terracotta }]}>
            <ThemedText color="#fff" style={{ fontSize: 9, fontFamily: Fonts.sansBold }}>
              REVIEW
            </ThemedText>
          </View>
        ) : null}
        {/* Color swatches for the piece */}
        {swatches.length > 0 ? (
          <View style={styles.swatchRow}>
            {swatches.map((s, i) => (
              <View
                key={`${s.hex}-${i}`}
                style={[styles.swatch, { backgroundColor: s.hex, borderColor: 'rgba(251,250,247,0.85)' }]}
              />
            ))}
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={garment.favorite ? 'Unfavorite piece' : 'Favorite piece'}
          onPress={toggleFavorite}
          hitSlop={6}
          style={[styles.tileHeart, { backgroundColor: 'rgba(251,250,247,0.9)' }]}>
          <Ionicons
            name={garment.favorite ? 'heart' : 'heart-outline'}
            size={14}
            color={garment.favorite ? theme.heart : theme.text}
          />
        </Pressable>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 3,
    borderRadius: Radius.md,
    backgroundColor: '#efeae1',
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: Radius.sm,
  },
  collectionBar: { gap: 8, paddingHorizontal: 16, paddingBottom: 12, alignItems: 'center' },
  manageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: Radius.md,
    paddingHorizontal: 13,
    paddingVertical: 2,
  },
  searchInput: { flex: 1, fontSize: 13.5, fontFamily: Fonts.sans, paddingVertical: 11 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  tileWrap: { flex: 1 / 3, marginBottom: 10 },
  tile: { height: 104, borderRadius: Radius.lg, overflow: 'hidden' },
  swatchRow: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', gap: 3 },
  swatch: { width: 11, height: 11, borderRadius: 6, borderWidth: 1 },
  tileHeart: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 6 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  scopeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  outfitCtas: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 6 },
  cta: { flex: 1, borderRadius: Radius.xl, padding: 15 },
  outfitCard: { borderRadius: Radius.xxl, overflow: 'hidden' },
  recHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recCard: { borderRadius: Radius.xxl, overflow: 'hidden' },
  recFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  outfitFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  scorePill: { borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 5 },
  cardHeart: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
});
