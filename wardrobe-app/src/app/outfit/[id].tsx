/**
 * Your Look (design screen 05) — hero collage, "Why this works", the pieces,
 * and Wear This / Save actions. Outfits are computed, not stored (locked):
 * this reads the in-memory generation cache; Save writes to saved_outfits.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutfitWhiteboard } from '@/components/outfit-whiteboard';
import { ScreenHeader } from '@/components/screen-header';
import { showToast } from '@/components/toast';
import { Button, EmptyState, Loading, PressScale, ThemedText } from '@/components/ui';
import { WeatherRangeChip } from '@/components/weather-range';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeather } from '@/hooks/use-weather';
import { useGenerationStore } from '@/lib/generationStore';
import {
  useDeleteSavedOutfit,
  useGarments,
  useSavedOutfits,
  useSaveOutfit,
  useUpdateSavedOutfit,
} from '@/lib/queries';
import { sampleImageSource } from '@/lib/sampleImages';
import { RequireSession } from '@/lib/session';
import { styleLibrary, styleName } from '@/lib/styleLibrary';
import { useWornStore } from '@/lib/wornStore';

export default function OutfitDetailScreen() {
  return (
    <RequireSession>
      <OutfitDetail />
    </RequireSession>
  );
}

function OutfitDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id, saved: savedParam, fav: favParam } = useLocalSearchParams<{
    id: string;
    saved?: string;
    fav?: string;
  }>();
  const outfit = useGenerationStore((s) => s.outfits[decodeURIComponent(id ?? '')]);
  const { data: garments, isLoading } = useGarments();
  const { data: weather } = useWeather();
  const { data: savedList } = useSavedOutfits();
  const saveOutfit = useSaveOutfit();
  const updateSaved = useUpdateSavedOutfit();
  const deleteSaved = useDeleteSavedOutfit();
  const wear = useWornStore((s) => s.wear);

  // Opened from My Outfits → this id is the stored row's id; favorite passed in.
  const fromSaved = savedParam === '1';
  const [savedId, setSavedId] = useState<string | null>(fromSaved ? (id ?? null) : null);
  const [favorite, setFavorite] = useState(favParam === '1');
  const [worn, setWorn] = useState(false);

  if (isLoading) return <Loading />;
  if (!outfit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <ScreenHeader title="Your Look" />
        <EmptyState
          title="Look expired"
          body="Looks are generated on the fly from your closet — head back and regenerate."
          action={<Button title="Generate a look" onPress={() => router.replace('/occasion')} />}
        />
      </SafeAreaView>
    );
  }

  const pieces = (garments ?? []).filter((g) => outfit.garmentIds.includes(g.id));
  const title = styleName(outfit.styleId);
  const formality = styleLibrary.styles[outfit.styleId]?.formality ?? '';

  const outfitPayload = {
    targetStyle: outfit.styleId,
    garmentIds: outfit.garmentIds,
    score: outfit.score,
    why: outfit.why,
  };

  /** Footer Save — adds to My Outfits WITHOUT favoriting (heart stays empty). */
  function save() {
    if (savedId) return;
    saveOutfit.mutate(outfitPayload, {
      onSuccess: (created) => {
        setSavedId(created.id);
        showToast('Saved to My Outfits', 'bookmark');
      },
    });
  }

  /** Heart — a favorite toggle. Saving the look if needed; shows a toast. */
  function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    showToast(
      next ? 'Added to favorites' : 'Removed from favorites',
      next ? 'heart' : 'heart-outline'
    );
    if (savedId) {
      updateSaved.mutate({ id: savedId, patch: { favorite: next } });
    } else if (next) {
      // Favoriting an unsaved look saves it as a favorite.
      saveOutfit.mutate(
        { ...outfitPayload, favorite: true },
        { onSuccess: (created) => setSavedId(created.id) }
      );
    }
  }

  function wearThis() {
    wear(outfit, title);
    setWorn(true);
    if (savedId) {
      const current = savedList?.find((o) => o.id === savedId)?.wornCount ?? 0;
      updateSaved.mutate({ id: savedId, patch: { wornCount: current + 1 } });
    }
  }

  function removeSaved() {
    if (!savedId) return;
    deleteSaved.mutate(savedId, {
      onSuccess: () => {
        showToast('Moved to Recently deleted', 'trash');
        router.canGoBack() ? router.back() : router.replace('/wardrobe?tab=outfits');
      },
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader
        title="Your Look"
        right={
          <Pressable
            accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
            onPress={toggleFavorite}
            hitSlop={8}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={23}
              color={favorite ? theme.heart : theme.text}
            />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(380)} style={styles.hero}>
          <OutfitWhiteboard pieces={pieces} height={360} />
        </Animated.View>

        <View style={styles.titleRow}>
          <ThemedText variant="displaySmall">{title}</ThemedText>
          <View style={[styles.styleChip, { backgroundColor: theme.terracottaSoft }]}>
            <ThemedText color={theme.terracotta} style={{ fontSize: 11.5, fontFamily: Fonts.sansSemiBold }}>
              {formality}
            </ThemedText>
          </View>
        </View>

        <Animated.View
          entering={FadeInDown.duration(380).delay(70)}
          style={[styles.whyCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.whyHeader}>
            <Ionicons name="sparkles-outline" size={14} color={theme.terracotta} />
            <ThemedText variant="overline" color={theme.terracotta} style={{ letterSpacing: 0.3, fontSize: 12 }}>
              Why this works
            </ThemedText>
          </View>
          <ThemedText variant="body" style={{ marginTop: 8, fontSize: 13.5, lineHeight: 20, color: '#3a352e' }}>
            {outfit.why} Scored {outfit.score} on-device — {outfit.styleScore} style affinity
            {outfit.compatBonus >= 0 ? ' +' : ' '}
            {outfit.compatBonus} pairing.
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(380).delay(110)} style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <WeatherRangeChip pieces={pieces} temp={weather?.temperature ?? null} />
        </Animated.View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <ThemedText variant="heading" style={{ fontSize: 13.5, marginBottom: 12 }}>
            In this look · {pieces.length} piece{pieces.length === 1 ? '' : 's'}
          </ThemedText>
          <View style={{ gap: 12 }}>
            {pieces.map((piece, index) => {
              const source = sampleImageSource(piece.id, piece.imageUri);
              return (
                <Animated.View key={piece.id} entering={FadeInDown.duration(320).delay(120 + index * 50)}>
                  <PressScale
                    onPress={() => router.push(`/garment/${piece.id}`)}
                    accessibilityLabel={`${piece.primary_color} ${piece.subtype}`}
                    style={styles.pieceRow}>
                    <View style={[styles.pieceThumb, { backgroundColor: theme.backgroundImage }]}>
                      {source ? (
                        <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 13.5, fontFamily: Fonts.sansSemiBold }}>
                        {piece.primary_color} {piece.subtype}
                      </ThemedText>
                      <ThemedText variant="caption" color="#9a9285" style={{ fontSize: 11.5, marginTop: 1 }}>
                        {[piece.fit_silhouette, piece.material_guess].filter((v) => v && v !== 'unknown').join(' · ') ||
                          piece.category}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#c4bcae" />
                  </PressScale>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { pointerEvents: 'box-none' }]}>
        <LinearGradient
          colors={['rgba(251,250,247,0)', '#fbfaf7']}
          locations={[0, 0.24]}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title={worn ? 'Logged for today' : 'Wear This'}
            disabled={worn}
            onPress={wearThis}
            icon={worn ? undefined : <Ionicons name="checkmark" size={18} color={theme.accentText} />}
            style={{ flex: 1 }}
          />
          {fromSaved ? (
            <Button
              title="Remove"
              kind="secondary"
              loading={deleteSaved.isPending}
              onPress={removeSaved}
              icon={<Ionicons name="trash-outline" size={17} color={theme.text} />}
              style={{ paddingHorizontal: 22 }}
            />
          ) : (
            <Button
              title={savedId ? 'Saved' : 'Save'}
              kind="secondary"
              loading={saveOutfit.isPending}
              onPress={save}
              icon={
                <Ionicons
                  name={savedId ? 'bookmark' : 'bookmark-outline'}
                  size={17}
                  color={theme.text}
                />
              }
              style={{ paddingHorizontal: 22 }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  styleChip: { borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 5 },
  whyCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: Radius.lg,
    padding: 14,
  },
  whyHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pieceThumb: {
    width: 46,
    height: 46,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 30,
    paddingTop: 18,
  },
});
