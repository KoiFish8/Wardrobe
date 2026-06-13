/**
 * Gap analysis — "what to buy next". PRO-gated. For each candidate piece,
 * simulates adding it to the closet and ranks by new strong outfits unlocked.
 * Pure local scoring (locked rule) — the heavy lift is just arithmetic.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, EmptyState, Loading, ThemedText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useReplayKey } from '@/hooks/use-replay-key';
import { useTheme } from '@/hooks/use-theme';
import { GAP_CANDIDATES } from '@/lib/gapCandidates';
import { useGarments, useProfile } from '@/lib/queries';
import { gapAnalysis } from '@/lib/scoring';
import { STYLE_IDS, styleName } from '@/lib/styleLibrary';
import type { StyleId } from '@/lib/types';

export default function GapsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const replay = useReplayKey();
  const { data: garments, isLoading } = useGarments();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [styleId, setStyleId] = useState<StyleId>('minimal');

  const closet = useMemo(() => garments ?? [], [garments]);
  const tier = profile?.subscriptionTier ?? 'free';
  const isPro = tier === 'pro';

  const recommendations = useMemo(() => {
    if (!isPro || closet.length === 0) return [];
    return gapAnalysis(closet, styleId, GAP_CANDIDATES);
  }, [isPro, closet, styleId]);

  const neutralShare = closet.length
    ? Math.round((closet.filter((g) => g.neutral).length / closet.length) * 100)
    : 0;

  // Don't flash the Pro gate while the profile (and its tier) is still loading.
  if (isLoading || profileLoading) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <View style={styles.headerRow}>
        <ThemedText variant="title">What to buy</ThemedText>
        <Ionicons name="bag-outline" size={21} color={theme.text} />
      </View>

      {!isPro ? (
        <EmptyState
          title="Find your missing piece"
          body="Gap analysis simulates every candidate purchase against your real closet and ranks them by new outfits unlocked — so you buy less, better. A Pro feature."
          action={<Button title="Upgrade to Pro" onPress={() => router.push('/profile')} />}
        />
      ) : closet.length === 0 ? (
        <EmptyState
          title="Scan your closet first"
          body="Gap analysis compares candidate purchases against your real wardrobe."
          action={<Button title="Scan a garment" kind="secondary" onPress={() => router.push('/scan')} />}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, gap: Spacing.three }}>
          <ThemedText variant="caption">Target style</ThemedText>
          <View style={styles.chips}>
            {STYLE_IDS.map((id) => (
              <Chip key={id} small label={styleName(id)} selected={styleId === id} onPress={() => setStyleId(id)} />
            ))}
          </View>

          {recommendations.length === 0 ? (
            <Card>
              <ThemedText variant="heading">No clear gap for {styleName(styleId)}</ThemedText>
              <ThemedText variant="caption" style={{ marginTop: Spacing.two, lineHeight: 18 }}>
                None of the candidate pieces would unlock new strong outfits — your closet may
                already cover this style, or it needs more base pieces (tops/bottoms) before an
                add-on helps.
              </ThemedText>
            </Card>
          ) : (
            recommendations.map((rec, i) => (
              <Animated.View key={`${rec.candidate.id}-${replay}`} entering={FadeInDown.duration(360).delay(i * 70)}>
                <Card>
                  <ThemedText variant="overline" color={theme.terracotta} style={{ fontSize: 11 }}>
                    Recommendation {i + 1}
                  </ThemedText>
                  <ThemedText variant="displaySmall" style={{ marginTop: Spacing.one, fontSize: 23 }}>
                    {rec.candidate.label}
                  </ThemedText>
                  <ThemedText variant="body" style={{ marginTop: Spacing.two, fontSize: 13.5, lineHeight: 20 }}>
                    {rec.reason}.
                  </ThemedText>
                  <View style={[styles.chips, { marginTop: Spacing.two }]}>
                    {rec.candidate.tags.map((t) => (
                      <Chip key={t} small label={t.replace(/-/g, ' ')} />
                    ))}
                  </View>
                </Card>
              </Animated.View>
            ))
          )}

          <Card tone="beige">
            <ThemedText variant="label">Wardrobe note</ThemedText>
            <ThemedText variant="body" style={{ marginTop: Spacing.one, fontSize: 13.5, lineHeight: 20 }}>
              {neutralShare >= 80
                ? `${neutralShare}% of your closet is neutrals — highly mixable, but one accent or texture piece would add range.`
                : `${neutralShare}% of your closet is neutrals. Neutrals multiply outfit options in a small wardrobe.`}
            </ThemedText>
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
