import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Card, ThemedText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sampleImageSource } from '@/lib/sampleImages';
import type { Garment, Outfit } from '@/lib/types';

export function OutfitCard({
  outfit,
  garments,
  onPress,
  rank,
}: {
  outfit: Outfit;
  garments: Garment[];
  onPress?: () => void;
  rank?: number;
}) {
  const theme = useTheme();
  const pieces = garments.filter((g) => outfit.garmentIds.includes(g.id));
  return (
    <Card onPress={onPress} style={{ marginBottom: Spacing.three }}>
      <View style={styles.header}>
        <ThemedText variant="heading">
          {rank ? `#${rank} · ` : ''}
          {pieces.map((p) => p.subtype).join(' + ')}
        </ThemedText>
        <View style={[styles.score, { backgroundColor: theme.accent }]}>
          <ThemedText variant="caption" color={theme.accentText} style={{ fontWeight: '700' }}>
            {outfit.score}
          </ThemedText>
        </View>
      </View>
      <View style={styles.row}>
        {pieces.map((p) => {
          const source = sampleImageSource(p.id, p.imageUri);
          return (
            <View key={p.id} style={[styles.thumb, { backgroundColor: theme.background }]}>
              {source ? (
                <Image source={source} style={styles.thumbImage} contentFit="cover" />
              ) : (
                <ThemedText variant="caption">{p.subtype}</ThemedText>
              )}
            </View>
          );
        })}
      </View>
      <ThemedText variant="caption" numberOfLines={2} style={{ marginTop: Spacing.two }}>
        {outfit.why}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  score: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  thumb: {
    width: 72,
    height: 84,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
});
