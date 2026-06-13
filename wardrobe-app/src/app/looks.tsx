/**
 * Generated looks — ranked results for the chosen occasion. Reads the
 * in-memory generation (outfits are computed, never stored — locked).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutfitCollage } from '@/components/outfit-collage';
import { ScreenHeader } from '@/components/screen-header';
import { Button, EmptyState, PressScale, ThemedText } from '@/components/ui';
import { WeatherRangeChip } from '@/components/weather-range';
import { Fonts, Radius } from '@/constants/theme';
import { useReplayKey } from '@/hooks/use-replay-key';
import { useTheme } from '@/hooks/use-theme';
import { useWeather } from '@/hooks/use-weather';
import { useGenerationStore } from '@/lib/generationStore';
import { occasionLabel } from '@/lib/occasions';
import { useGarments } from '@/lib/queries';
import { RequireSession } from '@/lib/session';
import { styleName } from '@/lib/styleLibrary';

export default function LooksScreen() {
  return (
    <RequireSession>
      <Looks />
    </RequireSession>
  );
}

function Looks() {
  const theme = useTheme();
  const router = useRouter();
  const replay = useReplayKey();
  const { data: weather } = useWeather();
  const { occasion } = useLocalSearchParams<{ occasion?: string }>();
  const ordered = useGenerationStore((s) => s.ordered);
  const outfits = useGenerationStore((s) => s.outfits);
  const { data: garments } = useGarments();
  const closet = garments ?? [];
  const looks = ordered.map((id) => outfits[id]).filter(Boolean);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader title={occasion ? `${occasionLabel(occasion)} looks` : 'Your looks'} />
      {looks.length === 0 ? (
        <EmptyState
          title="No strong looks yet"
          body="Your current pieces don't score well for this occasion. The Gaps tab shows which piece would unlock more."
          action={<Button title="See gaps" kind="secondary" onPress={() => router.push('/gaps')} />}
        />
      ) : (
        <FlatList
          key={replay}
          data={looks}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}
          ListHeaderComponent={
            <ThemedText variant="caption" style={{ marginBottom: 4 }}>
              {looks.length} look{looks.length === 1 ? '' : 's'} ranked from your closet — computed
              on-device.
            </ThemedText>
          }
          renderItem={({ item, index }) => {
            const pieces = closet.filter((g) => item.garmentIds.includes(g.id));
            return (
              <Animated.View entering={FadeInDown.duration(360).delay(Math.min(index, 6) * 60)}>
                <PressScale
                  onPress={() => router.push(`/outfit/${encodeURIComponent(item.id)}`)}
                  style={[styles.card, { backgroundColor: '#efe9df' }]}>
                  <View>
                    <OutfitCollage pieces={pieces} height={170} />
                    <View style={styles.cardFooter}>
                      <View style={{ flex: 1 }}>
                        <ThemedText variant="heading" style={{ fontSize: 15 }}>
                          #{index + 1} · {styleName(item.styleId)}
                        </ThemedText>
                        <ThemedText variant="caption" numberOfLines={2} style={{ marginTop: 2 }}>
                          {item.why}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', marginTop: 8 }}>
                          <WeatherRangeChip pieces={pieces} temp={weather?.temperature ?? null} compact />
                        </View>
                      </View>
                      <View style={[styles.score, { backgroundColor: theme.terracottaSoft }]}>
                        <ThemedText
                          color={theme.terracotta}
                          style={{ fontSize: 11.5, fontFamily: Fonts.sansSemiBold }}>
                          {item.score}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </PressScale>
              </Animated.View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xxl, overflow: 'hidden' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  score: {
    borderRadius: Radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
});
