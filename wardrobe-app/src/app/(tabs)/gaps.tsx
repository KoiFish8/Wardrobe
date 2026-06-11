/**
 * Gap analysis — "what to buy next". PRO-gated. For each candidate piece,
 * simulates adding it to the closet and ranks by new strong outfits unlocked.
 * Pure local scoring (locked rule) — the heavy lift is just arithmetic.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Loading, ThemedText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GAP_CANDIDATES } from '@/lib/gapCandidates';
import { useGarments, useProfile } from '@/lib/queries';
import { gapAnalysis } from '@/lib/scoring';
import { STYLE_IDS, styleName } from '@/lib/styleLibrary';
import type { StyleId } from '@/lib/types';

export default function GapsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: garments, isLoading } = useGarments();
  const { data: profile } = useProfile();
  const [styleId, setStyleId] = useState<StyleId>('minimal');

  const closet = garments ?? [];
  const tier = profile?.subscriptionTier ?? 'free';
  const isPro = tier === 'pro';

  const recommendations = useMemo(() => {
    if (!isPro || closet.length === 0) return [];
    return gapAnalysis(closet, styleId, GAP_CANDIDATES);
  }, [isPro, closet, styleId]);

  const neutralShare = closet.length
    ? Math.round((closet.filter((g) => g.neutral).length / closet.length) * 100)
    : 0;

  if (isLoading) return <Loading />;

  if (!isPro) {
    return (
      <EmptyState
        title="Gap analysis is a Pro feature"
        body="Find the one piece that unlocks the most new outfits from clothes you already own — so you buy less, better."
        action={<Button title="Upgrade to Pro" onPress={() => router.push('/profile')} />}
      />
    );
  }

  if (closet.length === 0) {
    return (
      <EmptyState
        title="Scan your closet first"
        body="Gap analysis compares candidate purchases against your real wardrobe."
        action={<Button title="Go to closet" kind="secondary" onPress={() => router.push('/')} />}
      />
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}>
      <ThemedText variant="caption">Target style</ThemedText>
      <View style={styles.chips}>
        {STYLE_IDS.map((id) => (
          <Chip key={id} small label={styleName(id)} selected={styleId === id} onPress={() => setStyleId(id)} />
        ))}
      </View>

      {recommendations.length === 0 ? (
        <Card>
          <ThemedText variant="heading">No clear gap for {styleName(styleId)}</ThemedText>
          <ThemedText variant="caption" style={{ marginTop: Spacing.two }}>
            None of the candidate pieces would unlock new strong outfits — your closet may already cover
            this style, or it needs more base pieces (tops/bottoms) before an add-on helps.
          </ThemedText>
        </Card>
      ) : (
        recommendations.map((rec, i) => (
          <Card key={rec.candidate.id}>
            <ThemedText variant="label">Recommendation {i + 1}</ThemedText>
            <ThemedText variant="heading" style={{ marginTop: Spacing.one }}>
              {rec.candidate.label}
            </ThemedText>
            <ThemedText variant="body" style={{ marginTop: Spacing.two }}>
              {rec.reason}.
            </ThemedText>
            <View style={[styles.chips, { marginTop: Spacing.two }]}>
              {rec.candidate.tags.map((t) => (
                <Chip key={t} small label={t.replace(/-/g, ' ')} />
              ))}
            </View>
          </Card>
        ))
      )}

      <Card>
        <ThemedText variant="label">Wardrobe note</ThemedText>
        <ThemedText variant="body" style={{ marginTop: Spacing.one }}>
          {neutralShare >= 80
            ? `${neutralShare}% of your closet is neutrals — highly mixable, but one accent or texture piece would add range.`
            : `${neutralShare}% of your closet is neutrals. Neutrals multiply outfit options in a small wardrobe.`}
        </ThemedText>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
