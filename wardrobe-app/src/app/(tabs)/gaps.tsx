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

import { Button, Card, Chip, EmptyState, Loading, PressScale, ThemedText } from '@/components/ui';
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
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, gap: Spacing.three }}>
          {/* Compare items — buy-or-toss decisions */}
          <PressScale onPress={() => router.push('/compare' as any)} style={[styles.compareCard, { backgroundColor: theme.accent }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={[styles.compareIcon, { backgroundColor: 'rgba(251,250,247,0.14)' }]}>
                <Ionicons name="git-compare-outline" size={22} color={theme.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="heading" color={theme.accentText} style={{ fontSize: 15 }}>
                  Compare items
                </ThemedText>
                <ThemedText variant="caption" color="#b8b1a6" style={{ fontSize: 12, marginTop: 2 }}>
                  Buy or toss? Weigh 2+ pieces side by side.
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#b8b1a6" />
            </View>
          </PressScale>

          {closet.length === 0 ? (
            <Card>
              <ThemedText variant="heading">Scan your closet for gap analysis</ThemedText>
              <ThemedText variant="caption" style={{ marginTop: Spacing.two, lineHeight: 18 }}>
                Gap analysis compares candidate purchases against your real wardrobe. Compare items
                above works without a closet — handy for two things you're deciding between in a store.
              </ThemedText>
              <Button title="Scan a garment" kind="secondary" onPress={() => router.push('/scan')} style={{ marginTop: Spacing.three }} />
            </Card>
          ) : (
          <>
          <Card tone="beige">
            <ThemedText variant="label">Wardrobe note</ThemedText>
            <ThemedText variant="body" style={{ marginTop: Spacing.one, fontSize: 13.5, lineHeight: 20 }}>
              {neutralShare >= 80
                ? `${neutralShare}% of your closet is neutrals — highly mixable, but one accent or texture piece would add range.`
                : `${neutralShare}% of your closet is neutrals. Neutrals multiply outfit options in a small wardrobe.`}
            </ThemedText>
          </Card>

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
          </>
          )}
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
  compareCard: { borderRadius: 18, padding: 16 },
  compareIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
