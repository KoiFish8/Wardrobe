/**
 * Skeleton loaders — content-shaped placeholders that pulse while data loads,
 * so screens feel instant instead of flashing a centered spinner. Pure
 * Reanimated opacity loop on the design's warm image tone.
 */
import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A single pulsing placeholder block. */
export function Skeleton({
  width,
  height,
  radius = Radius.md,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: radius, backgroundColor: theme.backgroundImage },
        animated,
        style,
      ]}
    />
  );
}

/** Skeleton for the Today screen: greeting, hero, action cards, recent row. */
export function TodaySkeleton() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingHorizontal: 22, paddingTop: 16 }}>
      <Skeleton width="55%" height={16} radius={Radius.sm} />
      <Skeleton width="70%" height={30} radius={Radius.sm} style={{ marginTop: 10 }} />
      <Skeleton height={286} radius={Radius.xxl} style={{ marginTop: 18 }} />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <Skeleton width="48%" height={96} radius={Radius.xl} />
        <Skeleton width="48%" height={96} radius={Radius.xl} />
      </View>
      <View style={{ flexDirection: 'row', gap: 11, marginTop: 24 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="31%" height={120} radius={Radius.md} />
        ))}
      </View>
    </View>
  );
}

/** Skeleton grid for the Wardrobe pieces view (3 columns). */
export function GridSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: rows * 3 }).map((_, i) => (
        <View key={i} style={styles.cell}>
          <Skeleton height={104} radius={Radius.lg} />
        </View>
      ))}
    </View>
  );
}

/** Skeleton list for the Outfits view / saved looks. */
export function OutfitListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 20, gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={210} radius={Radius.xxl} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  cell: { width: '31.5%' },
});
