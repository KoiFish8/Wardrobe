/**
 * Build a look — manually assemble an outfit from the closet. Pick one piece
 * per slot (top + bottom, or a dress, plus optional outerwear/shoes); the
 * stylist scores it live (pure local tag math) and shows its optimal weather
 * range, then you save it to My Outfits.
 *
 * Two layouts (toggle): "Sections" collapses each category into an expandable
 * grid; "All" shows one continuous grid divided by thin section lines.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutfitCollage } from '@/components/outfit-collage';
import { ScreenHeader } from '@/components/screen-header';
import { Button, EmptyState, PressScale, ThemedText } from '@/components/ui';
import { WeatherRangeChip } from '@/components/weather-range';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeather } from '@/hooks/use-weather';
import { scoreManualOutfit } from '@/lib/outfitHelpers';
import { useGarments, useSaveOutfit } from '@/lib/queries';
import { sampleImageSource } from '@/lib/sampleImages';
import { RequireSession } from '@/lib/session';
import { styleLibrary, styleName } from '@/lib/styleLibrary';
import type { Category, Garment } from '@/lib/types';

const SLOTS: { category: Category; label: string }[] = [
  { category: 'top', label: 'Tops' },
  { category: 'bottom', label: 'Bottoms' },
  { category: 'dress', label: 'Dresses' },
  { category: 'outerwear', label: 'Outerwear' },
  { category: 'shoes', label: 'Shoes' },
];

type Layout = 'sections' | 'all';

export default function OutfitBuilderScreen() {
  return (
    <RequireSession>
      <Builder />
    </RequireSession>
  );
}

function Builder() {
  const theme = useTheme();
  const router = useRouter();
  const { data: garments } = useGarments();
  const { data: weather } = useWeather();
  const saveOutfit = useSaveOutfit();
  const closet = useMemo(() => garments ?? [], [garments]);

  const [layout, setLayout] = useState<Layout>('sections');
  const [selected, setSelected] = useState<Partial<Record<Category, string>>>({});
  // Categories expanded in "Sections" layout (the essentials start open).
  const [expanded, setExpanded] = useState<Set<Category>>(new Set(['top', 'bottom']));

  function toggleExpand(category: Category) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggle(category: Category, id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[category] === id) delete next[category];
      else next[category] = id;
      // Dresses are exclusive with top/bottom — picking one clears the other.
      if (category === 'dress' && next.dress) {
        delete next.top;
        delete next.bottom;
      } else if ((category === 'top' || category === 'bottom') && next[category]) {
        delete next.dress;
      }
      return next;
    });
  }

  const pieces = useMemo(
    () =>
      Object.values(selected)
        .map((id) => closet.find((g) => g.id === id))
        .filter((g): g is Garment => Boolean(g)),
    [selected, closet]
  );

  const hasBase = Boolean(selected.dress || (selected.top && selected.bottom));
  const outfit = useMemo(() => (hasBase ? scoreManualOutfit(pieces) : null), [hasBase, pieces]);

  const byCategory = useMemo(() => {
    const map: Partial<Record<Category, Garment[]>> = {};
    for (const slot of SLOTS) map[slot.category] = closet.filter((g) => g.category === slot.category);
    return map;
  }, [closet]);

  async function save() {
    if (!outfit) return;
    await saveOutfit.mutateAsync({
      targetStyle: outfit.styleId,
      garmentIds: outfit.garmentIds,
      score: outfit.score,
      why: outfit.why,
    });
    router.replace('/wardrobe?tab=outfits');
  }

  if (closet.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <ScreenHeader title="Build a look" />
        <EmptyState
          title="Nothing to build with yet"
          body="Scan a few pieces first, then come back to assemble your own looks."
          action={<Button title="Scan a garment" onPress={() => router.push('/scan')} />}
        />
      </SafeAreaView>
    );
  }

  const renderTile = (item: Garment, category: Category) => {
    const active = selected[category] === item.id;
    const source = sampleImageSource(item.id, item.imageUri);
    return (
      <View key={item.id} style={styles.tile}>
        <PressScale
          onPress={() => toggle(category, item.id)}
          accessibilityLabel={`${item.primary_color} ${item.subtype}`}
          style={[
            styles.tileInner,
            { borderColor: active ? theme.borderSelected : 'transparent', borderWidth: active ? 2 : 0 },
          ]}>
          <View style={[styles.tileImage, { backgroundColor: theme.backgroundImage }]}>
            {source ? (
              <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : null}
            {active ? (
              <View style={[styles.check, { backgroundColor: theme.accent }]}>
                <Ionicons name="checkmark" size={13} color={theme.accentText} />
              </View>
            ) : null}
          </View>
        </PressScale>
      </View>
    );
  };

  const emptyHint = (category: Category) => (
    <Pressable onPress={() => router.push('/scan')} style={styles.emptyHint}>
      <Ionicons name="add-circle-outline" size={16} color={theme.textSecondary} />
      <ThemedText variant="caption">
        No {category === 'shoes' ? 'shoes' : `${category}s`} yet — tap to scan
      </ThemedText>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader title="Build a look" />
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {/* Live preview */}
        <View style={[styles.preview, { backgroundColor: '#efe9df' }]}>
          {pieces.length > 0 ? (
            <OutfitCollage pieces={pieces} height={200} />
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="shirt-outline" size={26} color={theme.textTertiary} />
              <ThemedText variant="caption" style={{ marginTop: 8 }}>
                Pick pieces below to start your look
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.summary}>
          {outfit ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText variant="displaySmall" style={{ fontSize: 22 }}>
                  {styleName(outfit.styleId)}
                </ThemedText>
                <View style={[styles.scorePill, { backgroundColor: theme.terracottaSoft }]}>
                  <ThemedText color={theme.terracotta} style={{ fontSize: 12, fontFamily: Fonts.sansSemiBold }}>
                    Score {outfit.score}
                  </ThemedText>
                </View>
              </View>
              <ThemedText variant="caption" style={{ marginTop: 6, lineHeight: 18 }}>
                {styleLibrary.styles[outfit.styleId]?.formality} · {outfit.why}
              </ThemedText>
              <View style={{ marginTop: 10 }}>
                <WeatherRangeChip pieces={pieces} temp={weather?.temperature ?? null} />
              </View>
            </>
          ) : (
            <ThemedText variant="caption">
              Pick at least a top and a bottom (or a dress) to score your look.
            </ThemedText>
          )}
        </View>

        {/* Layout toggle */}
        <View style={styles.layoutRow}>
          <View style={[styles.segment, { backgroundColor: '#efeae1' }]}>
            {(['sections', 'all'] as Layout[]).map((l) => {
              const active = layout === l;
              return (
                <Pressable
                  key={l}
                  onPress={() => setLayout(l)}
                  style={[styles.segmentBtn, active && { backgroundColor: theme.background }]}>
                  <ThemedText
                    style={{
                      fontSize: 12.5,
                      fontFamily: active ? Fonts.sansSemiBold : Fonts.sans,
                      color: active ? theme.text : theme.textSecondary,
                    }}>
                    {l === 'sections' ? 'Sections' : 'All pieces'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {layout === 'sections'
          ? // ── Expandable per-category sections ──
            SLOTS.map((slot) => {
              const items = byCategory[slot.category] ?? [];
              const isOpen = expanded.has(slot.category);
              const sel = selected[slot.category];
              const selName = sel ? closet.find((g) => g.id === sel)?.subtype : null;
              return (
                <View key={slot.category} style={styles.section}>
                  <Pressable onPress={() => toggleExpand(slot.category)} style={styles.sectionHeader}>
                    <ThemedText variant="heading" style={{ fontSize: 14 }}>
                      {slot.label}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ThemedText variant="caption" color={selName ? theme.terracotta : theme.textSecondary}>
                        {selName ? selName : `${items.length}`}
                      </ThemedText>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={theme.textSecondary}
                      />
                    </View>
                  </Pressable>
                  {isOpen ? (
                    items.length === 0 ? (
                      emptyHint(slot.category)
                    ) : (
                      <View style={styles.grid}>{items.map((item) => renderTile(item, slot.category))}</View>
                    )
                  ) : null}
                  {/* sections already pad 20px; grid adds none here */}
                </View>
              );
            })
          : // ── One continuous grid, divided by thin section lines ──
            SLOTS.map((slot, i) => {
              const items = byCategory[slot.category] ?? [];
              if (items.length === 0 && slot.category !== 'shoes') return null;
              return (
                <View key={slot.category}>
                  <View style={[styles.divider, i === 0 && { marginTop: 4 }]}>
                    <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                    <ThemedText variant="label" color={theme.textSecondary}>
                      {slot.label}
                    </ThemedText>
                    <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                  </View>
                  {items.length === 0 ? (
                    emptyHint(slot.category)
                  ) : (
                    <View style={[styles.grid, styles.gridPad]}>
                      {items.map((item) => renderTile(item, slot.category))}
                    </View>
                  )}
                </View>
              );
            })}
      </ScrollView>

      <View style={[styles.footer, { pointerEvents: 'box-none' }]}>
        <LinearGradient
          colors={['rgba(251,250,247,0)', '#fbfaf7']}
          locations={[0, 0.26]}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
        <Button
          title="Save to My Outfits"
          disabled={!outfit}
          loading={saveOutfit.isPending}
          onPress={save}
          icon={<Ionicons name="bookmark-outline" size={18} color={theme.accentText} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  preview: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'center',
  },
  previewEmpty: { height: 200, alignItems: 'center', justifyContent: 'center' },
  summary: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  scorePill: { borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 5 },
  layoutRow: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  segment: { flexDirection: 'row', padding: 3, borderRadius: Radius.md },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.sm },
  section: { paddingTop: 6, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 4 },
  gridPad: { paddingHorizontal: 20 },
  tile: { width: '31%' },
  tileInner: { width: '100%', borderRadius: Radius.md, padding: 2 },
  tileImage: { width: '100%', aspectRatio: 0.83, borderRadius: Radius.md - 2, overflow: 'hidden' },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 24,
  },
});
