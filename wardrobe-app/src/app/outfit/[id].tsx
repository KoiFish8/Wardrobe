/**
 * Outfit detail — pieces, score breakdown, the "why", and Save. Outfits are
 * computed, not stored (locked): this reads the in-memory generation cache,
 * and Save writes to saved_outfits.
 */
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, EmptyState, Loading, ThemedText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGenerationStore } from '@/lib/generationStore';
import { useGarments, useSaveOutfit } from '@/lib/queries';
import { sampleImageSource } from '@/lib/sampleImages';
import { styleName } from '@/lib/styleLibrary';

export default function OutfitDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const outfit = useGenerationStore((s) => s.outfits[decodeURIComponent(id ?? '')]);
  const { data: garments, isLoading } = useGarments();
  const saveOutfit = useSaveOutfit();
  const [saved, setSaved] = useState(false);

  if (isLoading) return <Loading />;
  if (!outfit) {
    return (
      <EmptyState
        title="Outfit expired"
        body="Outfits are generated on the fly from your closet — head back to Style and regenerate."
        action={<Button title="Back" kind="secondary" onPress={() => router.back()} />}
      />
    );
  }

  const pieces = (garments ?? []).filter((g) => outfit.garmentIds.includes(g.id));

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}>
      <ThemedText variant="title">{styleName(outfit.styleId)}</ThemedText>

      <View style={styles.pieces}>
        {pieces.map((p) => {
          const source = sampleImageSource(p.id, p.imageUri);
          return (
            <View key={p.id} style={styles.piece}>
              <View style={[styles.pieceImage, { backgroundColor: theme.backgroundElement }]}>
                {source ? (
                  <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <ThemedText variant="caption">{p.subtype}</ThemedText>
                )}
              </View>
              <ThemedText variant="caption" numberOfLines={1} style={{ marginTop: Spacing.one }}>
                {p.primary_color} {p.subtype}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <Card>
        <ThemedText variant="label">Score</ThemedText>
        <ThemedText variant="title" style={{ marginTop: Spacing.one }}>
          {outfit.score}
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: Spacing.one }}>
          {outfit.styleScore} style affinity {outfit.compatBonus >= 0 ? '+' : ''}
          {outfit.compatBonus} pairing bonus — computed on-device from your tags.
        </ThemedText>
      </Card>

      <Card>
        <ThemedText variant="label">Why it works</ThemedText>
        <ThemedText variant="body" style={{ marginTop: Spacing.one }}>
          {outfit.why}
        </ThemedText>
      </Card>

      <Button
        title={saved ? 'Saved ✓' : 'Save outfit'}
        disabled={saved}
        loading={saveOutfit.isPending}
        onPress={() =>
          saveOutfit.mutate(
            {
              targetStyle: outfit.styleId,
              garmentIds: outfit.garmentIds,
              score: outfit.score,
              why: outfit.why,
            },
            { onSuccess: () => setSaved(true) }
          )
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pieces: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  piece: { width: '30%', minWidth: 96 },
  pieceImage: {
    aspectRatio: 0.8,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
