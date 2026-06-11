/** Garment detail — view a scanned piece, correct its tags, or remove it. */
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Loading, ThemedText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDeleteGarment, useGarments, useUpdateGarment } from '@/lib/queries';
import { sampleImageSource } from '@/lib/sampleImages';
import { classifyGarment } from '@/lib/scoring';
import { RequireSession } from '@/lib/session';
import { ALL_TAGS, styleName } from '@/lib/styleLibrary';

export default function GarmentDetailScreen() {
  return (
    <RequireSession>
      <GarmentDetail />
    </RequireSession>
  );
}

function GarmentDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: garments, isLoading } = useGarments();
  const updateGarment = useUpdateGarment();
  const deleteGarment = useDeleteGarment();

  const garment = garments?.find((g) => g.id === id);
  const [tags, setTags] = useState<string[] | null>(null);

  useEffect(() => {
    if (garment && tags === null) setTags(garment.tags);
  }, [garment, tags]);

  if (isLoading) return <Loading />;
  if (!garment) return <EmptyState title="Garment not found" body="It may have been deleted." />;

  const currentTags = tags ?? garment.tags;
  const dirty = JSON.stringify(currentTags) !== JSON.stringify(garment.tags);
  const topStyle = classifyGarment({ ...garment, tags: currentTags });
  const source = sampleImageSource(garment.id, garment.imageUri);

  function toggleTag(tag: string) {
    setTags((prev) => {
      const base = prev ?? garment!.tags;
      return base.includes(tag) ? base.filter((t) => t !== tag) : [...base, tag];
    });
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}>
      {source ? (
        <Image source={source} style={[styles.image, { backgroundColor: theme.backgroundElement }]} contentFit="cover" />
      ) : null}

      <Card>
        <ThemedText variant="heading">
          {garment.primary_color} {garment.subtype}
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: Spacing.one }}>
          {garment.category} · {garment.material_guess} · {garment.formality} · fit:{' '}
          {garment.fit_silhouette}
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: Spacing.one }}>
          Leans {styleName(topStyle.styleId)} (score {topStyle.score}) · confidence: {garment.confidence}
        </ThemedText>
        {garment.note ? (
          <ThemedText variant="caption" style={{ marginTop: Spacing.one }}>
            Note: {garment.note}
          </ThemedText>
        ) : null}
      </Card>

      <ThemedText variant="heading">Style tags</ThemedText>
      <ThemedText variant="caption">Corrections improve your outfits — and the product.</ThemedText>
      <View style={styles.chips}>
        {ALL_TAGS.map((tag) => (
          <Chip
            key={tag}
            small
            label={tag.replace(/-/g, ' ')}
            selected={currentTags.includes(tag)}
            onPress={() => toggleTag(tag)}
          />
        ))}
      </View>

      {dirty ? (
        <Button
          title="Save corrections"
          loading={updateGarment.isPending}
          onPress={() =>
            updateGarment.mutate(
              { id: garment.id, patch: { tags: currentTags, userCorrected: true } },
              { onSuccess: () => setTags(null) }
            )
          }
        />
      ) : null}
      <Button
        title="Delete garment"
        kind="danger"
        loading={deleteGarment.isPending}
        onPress={() => deleteGarment.mutate(garment.id, { onSuccess: () => router.back() })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 300, borderRadius: Radius.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
