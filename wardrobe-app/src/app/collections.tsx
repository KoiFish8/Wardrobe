/**
 * Collections (Plus) — group a subset of your closet (e.g. a trip) so the
 * stylist builds outfits only from those pieces. List + create + delete here;
 * piece management + generate live in collection/[id].
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Button, EmptyState, PressScale, ThemedText } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { collectionGarments, useCollectionsStore } from '@/lib/collectionsStore';
import { useGarments, useProfile } from '@/lib/queries';
import { sampleImageSource } from '@/lib/sampleImages';
import { RequireSession } from '@/lib/session';

export default function CollectionsScreen() {
  return (
    <RequireSession>
      <Collections />
    </RequireSession>
  );
}

function Collections() {
  const theme = useTheme();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: garments } = useGarments();
  const collections = useCollectionsStore((s) => s.collections);
  const hydrate = useCollectionsStore((s) => s.hydrate);
  const create = useCollectionsStore((s) => s.create);

  const [name, setName] = useState('');
  const closet = useMemo(() => garments ?? [], [garments]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const tier = profile?.subscriptionTier ?? 'free';
  const isPlus = tier === 'plus' || tier === 'pro';

  function add() {
    if (name.trim().length === 0) return;
    const c = create(name);
    setName('');
    router.push(`/collection/${c.id}` as any);
  }

  if (!isPlus) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <ScreenHeader title="Collections" />
        <EmptyState
          title="Pack a capsule"
          body="Group a subset of your closet — like a trip or a 10-piece capsule — and have the stylist build outfits only from those pieces. A Plus feature."
          action={<Button title="Upgrade to Plus" onPress={() => router.push('/profile')} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader title="Collections" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Create */}
        <View style={[styles.createRow, { backgroundColor: theme.backgroundInput }]}>
          <Ionicons name="add-circle-outline" size={20} color={theme.textSecondary} />
          <TextInput
            placeholder="New collection (e.g. Lisbon trip)"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            onSubmitEditing={add}
            returnKeyType="done"
            maxLength={40}
            style={[styles.createInput, { color: theme.text }]}
          />
          {name.trim().length > 0 ? (
            <Pressable onPress={add} hitSlop={8}>
              <ThemedText color={theme.terracotta} style={{ fontFamily: Fonts.sansSemiBold }}>
                Add
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {collections.length === 0 ? (
          <View style={{ marginTop: 40 }}>
            <EmptyState
              title="No collections yet"
              body="Create one above, then add the pieces you're taking — the stylist will only use those."
            />
          </View>
        ) : (
          <View style={{ marginTop: 18, gap: 12 }}>
            {collections.map((c, i) => {
              const pieces = collectionGarments(c, closet);
              return (
                <Animated.View key={c.id} entering={FadeInDown.duration(320).delay(Math.min(i, 6) * 50)}>
                  <PressScale
                    onPress={() => router.push(`/collection/${c.id}` as any)}
                    style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.thumbs}>
                      {pieces.slice(0, 4).map((p) => {
                        const src = sampleImageSource(p.id, p.imageUri);
                        return (
                          <View key={p.id} style={[styles.thumb, { backgroundColor: theme.backgroundImage }]}>
                            {src ? <Image source={src} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                          </View>
                        );
                      })}
                      {pieces.length === 0 ? (
                        <View style={[styles.thumb, { backgroundColor: theme.backgroundImage, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="shirt-outline" size={18} color={theme.textTertiary} />
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="heading" style={{ fontSize: 15 }}>
                        {c.name}
                      </ThemedText>
                      <ThemedText variant="caption" style={{ marginTop: 2 }}>
                        {pieces.length} piece{pieces.length === 1 ? '' : 's'}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                  </PressScale>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  createInput: { flex: 1, paddingVertical: 14, fontSize: 14.5, fontFamily: Fonts.sans },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  thumbs: { flexDirection: 'row' },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 9,
    overflow: 'hidden',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
