/**
 * Profile (design screen 06) — hello card, wardrobe stats, style insights with
 * closet health, plans/paywall (via PaymentProvider), preferred styles, sign out.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button, Card, Chip, ThemedText } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { OFFERINGS } from '@/lib/payments/types';
import { useGarments, useProfile, useSavedOutfits, useSetPreferredStyles } from '@/lib/queries';
import { usePayments, useSession } from '@/lib/session';
import { useSettingsStore, useTempUnit } from '@/lib/settingsStore';
import { useStreakStore } from '@/lib/streakStore';
import { useWornStore } from '@/lib/wornStore';
import { STYLE_IDS, styleName } from '@/lib/styleLibrary';
import type { TempUnit } from '@/lib/temperature';
import type { Category, StyleId } from '@/lib/types';

const HEALTH_CATEGORIES: Category[] = ['top', 'bottom', 'outerwear', 'shoes'];

const COLOR_SWATCHES: Record<string, string> = {
  black: '#1b1815',
  white: '#f4f1ea',
  grey: '#9a9489',
  gray: '#9a9489',
  navy: '#3a4a6b',
  blue: '#4a6b9a',
  beige: '#d9cdb8',
  cream: '#efe7d6',
  brown: '#7a5c42',
  green: '#5d7a5f',
  olive: '#6b6b4a',
  red: '#a44343',
  pink: '#d08a98',
};

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut } = useSession();
  const payments = usePayments();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: garments } = useGarments();
  const { data: savedOutfits } = useSavedOutfits();
  const unit = useTempUnit();
  const setUnit = useSettingsStore((s) => s.setUnit);
  const streak = useStreakStore((s) => s.current);
  const longestStreak = useStreakStore((s) => s.longest);
  const hydrateStreak = useStreakStore((s) => s.hydrate);
  const wornEntries = useWornStore((s) => s.entries);
  const hydrateWorn = useWornStore((s) => s.hydrate);

  useEffect(() => {
    hydrateStreak();
    hydrateWorn();
  }, [hydrateStreak, hydrateWorn]);
  const setPreferred = useSetPreferredStyles();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tier = profile?.subscriptionTier ?? 'free';
  const preferred = profile?.preferredStyles ?? [];
  const closet = useMemo(() => garments ?? [], [garments]);

  const name = user?.isDemo ? 'Alex' : (user?.email?.split('@')[0] ?? 'there');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  const categoryCount = new Set(closet.map((g) => g.category)).size;
  const colorCounts = closet.reduce<Record<string, number>>((acc, g) => {
    const c = g.primary_color.toLowerCase();
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  const topColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  // Closet health: how much of a working capsule is covered — base categories
  // present, enough pieces to combine, and a healthy neutral share.
  const health = useMemo(() => {
    if (closet.length === 0) return 0;
    const coverage = HEALTH_CATEGORIES.filter((c) => closet.some((g) => g.category === c)).length / HEALTH_CATEGORIES.length;
    const depth = Math.min(closet.length / 12, 1);
    const neutrals = closet.filter((g) => g.neutral).length / closet.length;
    const neutralBalance = 1 - Math.abs(neutrals - 0.7);
    return Math.round((coverage * 0.5 + depth * 0.3 + neutralBalance * 0.2) * 100);
  }, [closet]);
  const missingCategories = HEALTH_CATEGORIES.filter((c) => !closet.some((g) => g.category === c));

  async function purchase(tierId: 'plus' | 'pro') {
    setError(null);
    setPurchasing(tierId);
    try {
      await payments.purchase(tierId);
      qc.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  }

  function togglePreferred(id: StyleId) {
    const next = preferred.includes(id) ? preferred.filter((s) => s !== id) : [...preferred, id];
    setPreferred.mutate(next);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <ThemedText variant="title">Profile</ThemedText>
        </View>

        <View style={styles.helloRow}>
          <Avatar size={64} initial={displayName.charAt(0)} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="title" style={{ fontSize: 23, lineHeight: 26 }}>
              Hello, {displayName}
            </ThemedText>
            <ThemedText variant="caption" style={{ marginTop: 3, lineHeight: 18 }}>
              Building a wardrobe{'\n'}that works for you.
            </ThemedText>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {[
            { value: closet.length, label: 'Items' },
            { value: savedOutfits?.length ?? 0, label: 'Outfits' },
            { value: categoryCount, label: 'Categories' },
          ].map((stat) => (
            <View key={stat.label} style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={{ fontSize: 21, fontFamily: Fonts.sansExtraBold }}>{stat.value}</ThemedText>
              <ThemedText variant="caption" style={{ fontSize: 11.5, marginTop: 2 }}>
                {stat.label}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Daily streak (free for everyone) */}
        <View style={[styles.section, { paddingTop: 14 }]}>
          <View style={[styles.streakCard, { backgroundColor: theme.terracottaSoft }]}>
            <View style={[styles.streakFlame, { backgroundColor: theme.background }]}>
              <Ionicons name="flame" size={22} color={theme.terracotta} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 15, fontFamily: Fonts.sansBold }}>
                {streak > 0 ? `${streak}-day streak` : 'Start your streak'}
              </ThemedText>
              <ThemedText variant="caption" style={{ marginTop: 2 }}>
                {streak > 0
                  ? `Open Capsule daily to keep it going · best ${longestStreak} day${longestStreak === 1 ? '' : 's'}`
                  : 'Come back tomorrow to begin a streak.'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Wear history */}
        <View style={[styles.section, { paddingTop: 14 }]}>
          <Pressable onPress={() => router.push('/wear-history')}>
            <Card style={{ paddingVertical: 14, paddingHorizontal: 15 }}>
              <View style={styles.insightRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.streakFlame, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="time-outline" size={20} color={theme.terracotta} />
                  </View>
                  <View>
                    <ThemedText style={{ fontSize: 14, fontFamily: Fonts.sansSemiBold }}>Wear history</ThemedText>
                    <ThemedText variant="caption" style={{ fontSize: 11.5, marginTop: 2 }}>
                      {wornEntries.length > 0
                        ? `${wornEntries.length} outfit${wornEntries.length === 1 ? '' : 's'} logged`
                        : 'Track what you wear each day'}
                    </ThemedText>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
              </View>
            </Card>
          </Pressable>
        </View>

        {/* Style insights */}
        <View style={styles.section}>
          <ThemedText variant="heading" style={{ fontSize: 14.5, marginBottom: 10 }}>
            Style insights
          </ThemedText>

          <Card style={{ marginBottom: 9, paddingVertical: 13, paddingHorizontal: 15 }}>
            <View style={styles.insightRow}>
              <View>
                <ThemedText style={{ fontSize: 13, fontFamily: Fonts.sansSemiBold }}>Most-worn colors</ThemedText>
                <ThemedText variant="caption" style={{ fontSize: 11.5, marginTop: 2, textTransform: 'capitalize' }}>
                  {topColors.length > 0 ? topColors.join(' · ') : 'Scan pieces to see your palette'}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {(topColors.length > 0 ? topColors : ['black', 'beige', 'navy']).map((c) => (
                  <View
                    key={c}
                    style={[
                      styles.swatch,
                      { backgroundColor: COLOR_SWATCHES[c] ?? '#c9beab', borderColor: theme.border },
                    ]}
                  />
                ))}
              </View>
            </View>
          </Card>

          <Card style={{ paddingVertical: 13, paddingHorizontal: 15 }}>
            <View style={styles.insightRow}>
              <ThemedText style={{ fontSize: 13, fontFamily: Fonts.sansSemiBold }}>Closet health</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: Fonts.sansExtraBold, color: theme.positive }}>
                {health}%
              </ThemedText>
            </View>
            <View style={[styles.healthTrack, { backgroundColor: theme.border }]}>
              <LinearGradient
                colors={[theme.positiveSoft, theme.positive]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.healthFill, { width: `${health}%` }]}
              />
            </View>
            <ThemedText variant="caption" style={{ fontSize: 11.5, marginTop: 8 }}>
              {closet.length === 0
                ? 'Scan your first pieces to see closet coverage.'
                : missingCategories.length > 0
                  ? `Good base — a few gaps in ${missingCategories.join(', ')}.`
                  : 'Great variety — all the base categories are covered.'}
            </ThemedText>
          </Card>
        </View>

        {/* Plans */}
        <View style={styles.section}>
          <ThemedText variant="heading" style={{ fontSize: 14.5, marginBottom: 4 }}>
            Plan
          </ThemedText>
          <ThemedText variant="caption" style={{ marginBottom: 10 }}>
            {user?.isDemo ? 'Demo session — purchases are simulated. ' : ''}
            Current: {tier.toUpperCase()}
          </ThemedText>
          <View style={{ gap: 10 }}>
            {OFFERINGS.map((offering) => {
              const active = tier === offering.tier;
              return (
                <Card key={offering.tier} tone={active ? 'selected' : 'plain'}>
                  <View style={styles.planHeader}>
                    <ThemedText variant="heading">{offering.title}</ThemedText>
                    <ThemedText variant="heading">
                      {offering.price}
                      <ThemedText variant="caption">/{offering.period}</ThemedText>
                    </ThemedText>
                  </View>
                  {offering.features.map((f) => (
                    <ThemedText key={f} variant="caption" style={{ marginTop: Spacing.one }}>
                      · {f}
                    </ThemedText>
                  ))}
                  <Button
                    title={active ? 'Current plan' : `Get ${offering.title}`}
                    kind={active ? 'secondary' : 'primary'}
                    disabled={active}
                    loading={purchasing === offering.tier}
                    onPress={() => purchase(offering.tier)}
                    style={{ marginTop: Spacing.three }}
                  />
                </Card>
              );
            })}
          </View>
          {error ? (
            <ThemedText variant="caption" color={theme.danger} style={{ marginTop: 8 }}>
              {error}
            </ThemedText>
          ) : null}
        </View>

        {/* Preferred styles */}
        <View style={styles.section}>
          <ThemedText variant="heading" style={{ fontSize: 14.5 }}>
            Preferred styles
          </ThemedText>
          <ThemedText variant="caption" style={{ marginTop: 3, marginBottom: 10 }}>
            Personalizes your daily look and gap analysis.
          </ThemedText>
          <View style={styles.chips}>
            {STYLE_IDS.map((id) => (
              <Chip
                key={id}
                small
                label={styleName(id)}
                selected={preferred.includes(id)}
                onPress={() => togglePreferred(id)}
              />
            ))}
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <ThemedText variant="heading" style={{ fontSize: 14.5, marginBottom: 10 }}>
            Settings
          </ThemedText>
          <Card style={{ paddingVertical: 13, paddingHorizontal: 15 }}>
            <View style={styles.insightRow}>
              <View>
                <ThemedText style={{ fontSize: 13, fontFamily: Fonts.sansSemiBold }}>Temperature</ThemedText>
                <ThemedText variant="caption" style={{ fontSize: 11.5, marginTop: 2 }}>
                  Units for weather &amp; outfit ranges
                </ThemedText>
              </View>
              <View style={[styles.unitToggle, { backgroundColor: theme.backgroundInput }]}>
                {(['F', 'C'] as TempUnit[]).map((u) => {
                  const active = unit === u;
                  return (
                    <Pressable
                      key={u}
                      accessibilityLabel={u === 'F' ? 'Fahrenheit' : 'Celsius'}
                      onPress={() => setUnit(u)}
                      style={[styles.unitBtn, active && { backgroundColor: theme.accent }]}>
                      <ThemedText
                        color={active ? theme.accentText : theme.textSecondary}
                        style={{ fontSize: 13, fontFamily: Fonts.sansSemiBold }}>
                        °{u}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Button title="Sign out" kind="secondary" onPress={signOut} />
        </View>
      </ScrollView>
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
    paddingBottom: 4,
  },
  helloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
  },
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  stat: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  insightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1 },
  healthTrack: {
    height: 7,
    borderRadius: Radius.pill,
    marginTop: 10,
    overflow: 'hidden',
  },
  healthFill: { height: '100%', borderRadius: Radius.pill },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  unitToggle: { flexDirection: 'row', borderRadius: Radius.md, padding: 3, gap: 2 },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.sm },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: Radius.lg,
  },
  streakFlame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
