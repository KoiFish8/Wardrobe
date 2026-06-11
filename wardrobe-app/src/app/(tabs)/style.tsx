/**
 * Style — pick a target aesthetic, get ranked outfits from YOUR closet.
 * Generation is client-side tag math (locked rule: no LLM call here).
 * Free tier: 1 generation per day, enforced via generation events.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { OutfitCard } from '@/components/outfit-card';
import { Button, Chip, EmptyState, Loading, ThemedText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGenerationStore } from '@/lib/generationStore';
import { useGarments, useGenerationsToday, useProfile } from '@/lib/queries';
import { generateOutfits } from '@/lib/scoring';
import { useBackend } from '@/lib/session';
import { STYLE_IDS, styleLibrary, styleName } from '@/lib/styleLibrary';
import type { Outfit, StyleId } from '@/lib/types';

const FREE_DAILY_GENERATIONS = 1;

export default function StyleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const backend = useBackend();
  const { data: garments, isLoading } = useGarments();
  const { data: profile } = useProfile();
  const { data: generationsToday, refetch: refetchGenerations } = useGenerationsToday();
  const setGeneration = useGenerationStore((s) => s.setGeneration);

  const [selected, setSelected] = useState<StyleId | null>(null);
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <Loading />;
  const closet = garments ?? [];
  const tier = profile?.subscriptionTier ?? 'free';

  async function generate(styleId: StyleId) {
    setSelected(styleId);
    setLimitHit(false);
    setBusy(true);
    try {
      if (tier === 'free') {
        const used = generationsToday ?? (await backend.generationsToday());
        if (used >= FREE_DAILY_GENERATIONS) {
          setLimitHit(true);
          setOutfits(null);
          return;
        }
        await backend.recordGeneration();
        refetchGenerations();
      }
      // Locked: pure local scoring over the bundled library — instant, free.
      const ranked = generateOutfits(closet, styleId);
      setOutfits(ranked);
      setGeneration(styleId, ranked);
    } finally {
      setBusy(false);
    }
  }

  const enoughGarments =
    closet.some((g) => g.category === 'top' || g.category === 'dress') &&
    (closet.some((g) => g.category === 'bottom') || closet.some((g) => g.category === 'dress'));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.two, padding: Spacing.three }}>
          {STYLE_IDS.map((id) => (
            <Chip key={id} label={styleName(id)} selected={selected === id} onPress={() => generate(id)} />
          ))}
        </ScrollView>
      </View>

      {!enoughGarments ? (
        <EmptyState
          title="Not enough pieces yet"
          body="Outfits need at least one top and one bottom (or a dress). Scan a few garments first."
          action={<Button title="Go to closet" kind="secondary" onPress={() => router.push('/')} />}
        />
      ) : limitHit ? (
        <EmptyState
          title="Daily limit reached"
          body={`Free plan includes ${FREE_DAILY_GENERATIONS} style generation per day. Upgrade to Plus for unlimited outfits.`}
          action={<Button title="See plans" onPress={() => router.push('/profile')} />}
        />
      ) : outfits === null ? (
        <EmptyState
          title="Pick a style"
          body={`Choose one of the ${STYLE_IDS.length} aesthetics above — outfits are scored from your own clothes, instantly and offline.`}
        />
      ) : outfits.length === 0 ? (
        <EmptyState
          title={`No strong ${selected ? styleName(selected) : ''} outfits yet`}
          body="Your current pieces don’t score well for this style. Check the Gaps tab to see what would unlock it."
          action={<Button title="See gaps" kind="secondary" onPress={() => router.push('/gaps')} />}
        />
      ) : (
        <FlatList
          data={outfits}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: Spacing.three }}
          ListHeaderComponent={
            <ThemedText variant="caption" style={{ marginBottom: Spacing.three }}>
              {outfits.length} outfit{outfits.length === 1 ? '' : 's'} ranked for{' '}
              {selected ? styleName(selected) : ''} ({styleLibrary.styles[selected!]?.formality}) — computed
              on-device.
            </ThemedText>
          }
          renderItem={({ item, index }) => (
            <OutfitCard
              outfit={item}
              garments={closet}
              rank={index + 1}
              onPress={() => router.push(`/outfit/${encodeURIComponent(item.id)}`)}
            />
          )}
        />
      )}
      {busy ? <Loading /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
