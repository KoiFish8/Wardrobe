import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sampleImageSource } from '@/lib/sampleImages';
import type { Garment } from '@/lib/types';

const CATEGORY_ICONS: Record<string, string> = {
  top: '👕',
  bottom: '👖',
  dress: '👗',
  outerwear: '🧥',
  shoes: '👟',
  accessory: '🧢',
};

export function GarmentCard({ garment, onPress }: { garment: Garment; onPress?: () => void }) {
  const theme = useTheme();
  const source = sampleImageSource(garment.id, garment.imageUri);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.imageBox, { backgroundColor: theme.backgroundElement }]}>
        {source ? (
          <Image source={source} style={styles.image} contentFit="cover" transition={150} />
        ) : (
          <ThemedText variant="title">{CATEGORY_ICONS[garment.category] ?? '👕'}</ThemedText>
        )}
        {garment.confidence === 'low' ? (
          <View style={[styles.badge, { backgroundColor: theme.warning }]}>
            <ThemedText variant="caption" color="#fff" style={{ fontSize: 10, fontWeight: '700' }}>
              REVIEW
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText variant="body" numberOfLines={1} style={{ marginTop: Spacing.two, fontWeight: '500' }}>
        {garment.primary_color} {garment.subtype}
      </ThemedText>
      <ThemedText variant="caption" numberOfLines={1}>
        {garment.category}
        {garment.tags.length > 0 ? ` · ${garment.tags.length} tags` : ''}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: Spacing.two },
  imageBox: {
    aspectRatio: 0.85,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
