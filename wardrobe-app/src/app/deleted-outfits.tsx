/**
 * Recently deleted — trashed outfits (soft-deleted). Each can be recovered
 * back into My Outfits or permanently removed.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutfitCollage } from '@/components/outfit-collage';
import { ScreenHeader } from '@/components/screen-header';
import { showToast } from '@/components/toast';
import { EmptyState, Loading, ThemedText } from '@/components/ui';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDeletedOutfits, useGarments, usePurgeSavedOutfit, useRestoreSavedOutfit } from '@/lib/queries';
import { RequireSession } from '@/lib/session';
import { styleName } from '@/lib/styleLibrary';

export default function DeletedOutfitsScreen() {
  return (
    <RequireSession>
      <DeletedOutfits />
    </RequireSession>
  );
}

function DeletedOutfits() {
  const theme = useTheme();
  const router = useRouter();
  const { data: deleted, isLoading } = useDeletedOutfits();
  const { data: garments } = useGarments();
  const restore = useRestoreSavedOutfit();
  const purge = usePurgeSavedOutfit();
  const closet = garments ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader title="Recently deleted" />
      {isLoading ? (
        <Loading />
      ) : (deleted ?? []).length === 0 ? (
        <EmptyState
          title="Nothing here"
          body="Outfits you delete land here so you can recover them. Permanently deleting clears them for good."
        />
      ) : (
        <FlatList
          data={deleted}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 20, paddingTop: 6, gap: 14, paddingBottom: 32 }}
          ListHeaderComponent={
            <ThemedText variant="caption" style={{ marginBottom: 4 }}>
              {(deleted ?? []).length} deleted look{(deleted ?? []).length === 1 ? '' : 's'} · recover or remove
            </ThemedText>
          }
          renderItem={({ item, index }) => {
            const pieces = closet.filter((g) => item.garmentIds.includes(g.id));
            return (
              <Animated.View
                entering={FadeInDown.duration(340).delay(Math.min(index, 6) * 60)}
                style={[styles.card, { backgroundColor: '#efe9df' }]}>
                <OutfitCollage pieces={pieces} height={130} />
                <View style={styles.footer}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="heading" style={{ fontSize: 14.5 }}>
                      {styleName(item.targetStyle)}
                    </ThemedText>
                    <ThemedText variant="caption" style={{ marginTop: 2 }}>
                      {pieces.length} piece{pieces.length === 1 ? '' : 's'}
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityLabel="Recover outfit"
                    onPress={() =>
                      restore.mutate(item.id, { onSuccess: () => showToast('Recovered to My Outfits', 'refresh') })
                    }
                    style={[styles.action, { backgroundColor: theme.accent }]}>
                    <Ionicons name="arrow-undo" size={15} color={theme.accentText} />
                    <ThemedText color={theme.accentText} style={{ fontSize: 12.5, fontFamily: Fonts.sansSemiBold }}>
                      Recover
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Delete permanently"
                    onPress={() => purge.mutate(item.id, { onSuccess: () => showToast('Deleted permanently', 'trash') })}
                    hitSlop={6}
                    style={[styles.iconAction, { backgroundColor: theme.backgroundElementAlt }]}>
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  </Pressable>
                </View>
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
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
