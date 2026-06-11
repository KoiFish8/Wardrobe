/** Closet — HOME. Grid of scanned garments; the + button opens the scan flow. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { GarmentCard } from '@/components/garment-card';
import { Button, EmptyState, Loading, ThemedText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGarments, useImportSampleWardrobe } from '@/lib/queries';

export default function ClosetScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: garments, isLoading, error } = useGarments();
  const importSample = useImportSampleWardrobe();

  if (isLoading) return <Loading />;
  if (error) {
    return (
      <EmptyState
        title="Couldn’t load your closet"
        body={error instanceof Error ? error.message : 'Unknown error'}
      />
    );
  }

  const closet = garments ?? [];
  const lowConfidence = closet.filter((g) => g.confidence === 'low').length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {closet.length === 0 ? (
        <EmptyState
          title="Your closet is empty"
          body="Scan one garment at a time — each photo becomes a tagged piece the stylist can work with."
          action={
            <View style={{ gap: Spacing.two, minWidth: 240 }}>
              <Button title="Scan your first garment" onPress={() => router.push('/scan')} />
              <Button
                title="Import sample wardrobe (6 items)"
                kind="secondary"
                loading={importSample.isPending}
                onPress={() => importSample.mutate()}
              />
            </View>
          }
        />
      ) : (
        <FlatList
          data={closet}
          numColumns={2}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ padding: Spacing.two, paddingBottom: 96 }}
          ListHeaderComponent={
            lowConfidence > 0 ? (
              <ThemedText variant="caption" style={{ margin: Spacing.two }}>
                {lowConfidence} item{lowConfidence === 1 ? '' : 's'} need tag review (marked REVIEW).
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <GarmentCard garment={item} onPress={() => router.push(`/garment/${item.id}`)} />
          )}
        />
      )}

      <Pressable
        accessibilityLabel="Scan a garment"
        onPress={() => router.push('/scan')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
        ]}>
        <Ionicons name="add" size={30} color={theme.accentText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
