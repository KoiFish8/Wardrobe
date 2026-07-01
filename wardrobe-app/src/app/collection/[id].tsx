/**
 * Collection detail (Plus) — tap pieces to add/remove them, rename or delete the
 * collection, and generate outfits built ONLY from its pieces.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Button, Chip, EmptyState, PressScale, ThemedText } from '@/components/ui';
import { showToast } from '@/components/toast';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCollectionsStore } from '@/lib/collectionsStore';
import { useGarments } from '@/lib/queries';
import { sampleImageSource } from '@/lib/sampleImages';
import { RequireSession } from '@/lib/session';
import type { Category, Garment } from '@/lib/types';

const FILTERS: { id: Category | 'all' | 'in'; label: string }[] = [
  { id: 'in', label: 'In collection' },
  { id: 'all', label: 'All' },
  { id: 'top', label: 'Tops' },
  { id: 'bottom', label: 'Bottoms' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'shoes', label: 'Shoes' },
];

export default function CollectionDetailScreen() {
  return (
    <RequireSession>
      <CollectionDetail />
    </RequireSession>
  );
}

function CollectionDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: garments } = useGarments();
  const collections = useCollectionsStore((s) => s.collections);
  const hydrate = useCollectionsStore((s) => s.hydrate);
  const togglePiece = useCollectionsStore((s) => s.togglePiece);
  const rename = useCollectionsStore((s) => s.rename);
  const remove = useCollectionsStore((s) => s.remove);

  const [filter, setFilter] = useState<Category | 'all' | 'in'>('in');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const collection = collections.find((c) => c.id === id);
  const closet = useMemo(() => garments ?? [], [garments]);
  const memberIds = useMemo(() => new Set(collection?.garmentIds ?? []), [collection]);

  const visible = useMemo(() => {
    if (filter === 'in') return closet.filter((g) => memberIds.has(g.id));
    if (filter === 'all') return closet;
    return closet.filter((g) => g.category === filter);
  }, [closet, filter, memberIds]);

  if (!collection) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <ScreenHeader title="Collection" />
        <EmptyState title="Collection not found" body="It may have been deleted." />
      </SafeAreaView>
    );
  }

  const count = collection.garmentIds.length;

  function confirmDelete() {
    Alert.alert('Delete collection?', `"${collection!.name}" will be removed. Your pieces stay in your closet.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove(collection!.id);
          router.back();
        },
      },
    ]);
  }

  function saveName() {
    rename(collection!.id, nameDraft);
    setEditingName(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader
        title="Collection"
        right={
          <Pressable accessibilityLabel="Delete collection" onPress={confirmDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={theme.text} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          {editingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                autoFocus
                maxLength={40}
                onSubmitEditing={saveName}
                style={[styles.nameInput, { color: theme.text, borderColor: theme.border }]}
              />
              <Pressable onPress={saveName} hitSlop={8}>
                <ThemedText color={theme.terracotta} style={{ fontFamily: Fonts.sansSemiBold }}>Save</ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setNameDraft(collection.name);
                setEditingName(true);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ThemedText variant="display" style={{ fontSize: 30 }}>{collection.name}</ThemedText>
              <Ionicons name="pencil-outline" size={16} color={theme.textSecondary} />
            </Pressable>
          )}
          <ThemedText variant="caption" style={{ marginTop: 4 }}>
            {count} piece{count === 1 ? '' : 's'} · tap any piece to add or remove it
          </ThemedText>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip key={f.id} small label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
          ))}
        </ScrollView>

        {visible.length === 0 ? (
          <EmptyState
            title={filter === 'in' ? 'No pieces yet' : 'Nothing here'}
            body={filter === 'in' ? 'Switch to “All” and tap pieces to add them to this collection.' : 'No pieces in this category.'}
          />
        ) : (
          <View style={styles.grid}>
            {visible.map((g) => (
              <PieceTile
                key={g.id}
                garment={g}
                selected={memberIds.has(g.id)}
                onToggle={() => {
                  const wasIn = memberIds.has(g.id);
                  togglePiece(collection.id, g.id);
                  showToast(wasIn ? 'Removed from collection' : 'Added to collection', wasIn ? 'remove-circle-outline' : 'add-circle');
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={count < 2 ? 'Add at least 2 pieces' : `Generate from ${collection.name}`}
          disabled={count < 2}
          onPress={() => router.push(`/occasion?collection=${collection.id}` as any)}
          icon={count < 2 ? undefined : <Ionicons name="sparkles-outline" size={18} color={theme.accentText} />}
        />
      </View>
    </SafeAreaView>
  );
}

function PieceTile({
  garment,
  selected,
  onToggle,
}: {
  garment: Garment;
  selected: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const source = sampleImageSource(garment.id, garment.imageUri);
  return (
    <View style={styles.tileWrap}>
      <PressScale onPress={onToggle} accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${garment.subtype}`}>
        <View style={[styles.tile, { backgroundColor: theme.backgroundImage }, selected && { borderWidth: 2, borderColor: theme.terracotta }]}>
          {source ? (
            <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={160} />
          ) : (
            <View style={styles.tileEmpty}>
              <ThemedText variant="caption" numberOfLines={2} style={{ textAlign: 'center' }}>{garment.subtype}</ThemedText>
            </View>
          )}
          <View style={[styles.check, { backgroundColor: selected ? theme.terracotta : 'rgba(251,250,247,0.9)' }]}>
            <Ionicons name={selected ? 'checkmark' : 'add'} size={15} color={selected ? '#fff' : theme.text} />
          </View>
        </View>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  tileWrap: { width: '31.5%' },
  tile: { height: 104, borderRadius: Radius.lg, overflow: 'hidden' },
  tileEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 6 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: { flex: 1, fontSize: 24, fontFamily: Fonts.serif, borderBottomWidth: 1, paddingVertical: 4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 16,
    backgroundColor: '#fbfaf7',
  },
});
