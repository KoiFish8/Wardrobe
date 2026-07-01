/**
 * Compare items (Pro) — buy-or-toss decisions. Put 2–4 items side by side
 * (pieces you own OR new ones you're considering, via photo/upload), optionally
 * tell the stylist what you need them for, and get a verdict.
 *
 * #4 (this file): the full picker + side-by-side UI, Pro-gated, in the
 * What-to-buy flow. The AI verdict itself (#6) calls a `compare-items` Edge
 * Function — until that + Gemini billing are live, the verdict shows a graceful
 * "coming soon" state instead of erroring.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Button, Card, Chip, EmptyState, PressScale, ThemedText } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { compressImage } from '@/lib/imageCompression';
import { useGarments, useProfile } from '@/lib/queries';
import { sampleImageSource } from '@/lib/sampleImages';
import { RequireSession } from '@/lib/session';
import type { Garment } from '@/lib/types';

const MAX_ITEMS = 4;
const CONTEXTS = ['Everyday', 'Travel', 'Work', 'Home', 'Going out', 'Exercise'];

type Slot =
  | { kind: 'closet'; garmentId: string }
  | { kind: 'photo'; uri: string }
  | null;

export default function CompareScreen() {
  return (
    <RequireSession>
      <Compare />
    </RequireSession>
  );
}

function Compare() {
  const theme = useTheme();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: garments } = useGarments();
  const closet = useMemo(() => garments ?? [], [garments]);

  const [slots, setSlots] = useState<Slot[]>([null, null]);
  const [context, setContext] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [pickingFor, setPickingFor] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);

  const tier = profile?.subscriptionTier ?? 'free';
  const isPro = tier === 'pro';

  const filledCount = slots.filter(Boolean).length;
  const byId = useMemo(() => new Map(closet.map((g) => [g.id, g])), [closet]);

  function setSlot(index: number, value: Slot) {
    setSlots((prev) => prev.map((s, i) => (i === index ? value : s)));
    setVerdict(null);
  }

  function addSlot() {
    if (slots.length < MAX_ITEMS) setSlots((prev) => [...prev, null]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => (prev.length <= 2 ? prev.map((s, i) => (i === index ? null : s)) : prev.filter((_, i) => i !== index)));
    setVerdict(null);
  }

  async function pickPhoto(index: number, fromCamera: boolean) {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return;
    const compressed = await compressImage(result.assets[0].uri, {});
    setSlot(index, { kind: 'photo', uri: compressed.uri });
  }

  function runCompare() {
    // #6 will POST the items (+ context) to the compare-items Edge Function and
    // render the model's keep/buy verdict. Until Gemini billing is enabled it
    // would just error, so we show the graceful pending state.
    setVerdict('pending');
  }

  if (!isPro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <ScreenHeader title="Compare items" />
        <EmptyState
          title="Buy or toss, decided"
          body="Put two or more items side by side — pieces you own or ones you're about to buy — and get a verdict on which earns its place. A Pro feature."
          action={<Button title="Upgrade to Pro" onPress={() => router.push('/profile')} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader title="Compare items" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <ThemedText variant="display" style={{ fontSize: 30 }}>Worth keeping?</ThemedText>
        <ThemedText variant="caption" style={{ marginTop: 6, lineHeight: 19 }}>
          Add the items you're weighing — owned or new — and the stylist compares them for your use case.
        </ThemedText>

        {/* Item slots */}
        <View style={styles.slots}>
          {slots.map((slot, i) => (
            <SlotCard
              key={i}
              slot={slot}
              garment={slot?.kind === 'closet' ? byId.get(slot.garmentId) : undefined}
              onPickCloset={() => setPickingFor(i)}
              onUpload={() => pickPhoto(i, false)}
              onCamera={() => pickPhoto(i, true)}
              onRemove={() => removeSlot(i)}
            />
          ))}
          {slots.length < MAX_ITEMS ? (
            <Pressable onPress={addSlot} style={[styles.addSlot, { borderColor: theme.border }]}>
              <Ionicons name="add" size={22} color={theme.terracotta} />
              <ThemedText variant="caption" color={theme.terracotta} style={{ fontFamily: Fonts.sansSemiBold }}>
                Add item
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {/* Context */}
        <ThemedText variant="label" style={{ marginTop: 24 }}>What's it for? (optional)</ThemedText>
        <View style={styles.chips}>
          {CONTEXTS.map((c) => (
            <Chip key={c} small label={c} selected={context === c} onPress={() => setContext((p) => (p === c ? null : c))} />
          ))}
        </View>
        <TextInput
          placeholder="Anything else the stylist should weigh? (e.g. “need it to pack small”)"
          placeholderTextColor={theme.textSecondary}
          value={note}
          onChangeText={setNote}
          multiline
          style={[styles.note, { backgroundColor: theme.backgroundInput, color: theme.text }]}
        />

        {/* Verdict */}
        {verdict === 'pending' ? (
          <Card tone="beige" style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles-outline" size={16} color={theme.terracotta} />
              <ThemedText variant="label" color={theme.terracotta}>AI verdict</ThemedText>
            </View>
            <ThemedText variant="body" style={{ marginTop: 8, fontSize: 13.5, lineHeight: 20 }}>
              Your {filledCount} items{context ? ` for ${context.toLowerCase()}` : ''} are ready to compare. The
              AI keep-or-buy verdict turns on once the comparison model is connected — everything else here is set.
            </ThemedText>
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={filledCount < 2 ? 'Add at least 2 items' : 'Compare'}
          disabled={filledCount < 2}
          onPress={runCompare}
          icon={filledCount < 2 ? undefined : <Ionicons name="git-compare-outline" size={18} color={theme.accentText} />}
        />
      </View>

      {/* Closet picker */}
      <Modal visible={pickingFor !== null} animationType="slide" onRequestClose={() => setPickingFor(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
          <ScreenHeader
            title="Pick a piece"
            right={
              <Pressable accessibilityLabel="Close" onPress={() => setPickingFor(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            }
          />
          {closet.length === 0 ? (
            <EmptyState title="No pieces yet" body="Scan some garments first, or compare new photos instead." />
          ) : (
            <ScrollView contentContainerStyle={styles.pickerGrid}>
              {closet.map((g) => {
                const src = sampleImageSource(g.id, g.imageUri);
                return (
                  <View key={g.id} style={styles.pickerCell}>
                    <PressScale
                      onPress={() => {
                        if (pickingFor !== null) setSlot(pickingFor, { kind: 'closet', garmentId: g.id });
                        setPickingFor(null);
                      }}
                      accessibilityLabel={g.subtype}>
                      <View style={[styles.tile, { backgroundColor: theme.backgroundImage }]}>
                        {src ? <Image source={src} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                      </View>
                    </PressScale>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SlotCard({
  slot,
  garment,
  onPickCloset,
  onUpload,
  onCamera,
  onRemove,
}: {
  slot: Slot;
  garment: Garment | undefined;
  onPickCloset: () => void;
  onUpload: () => void;
  onCamera: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const uri = slot?.kind === 'photo' ? slot.uri : undefined;
  const src = slot?.kind === 'closet' && garment ? sampleImageSource(garment.id, garment.imageUri) : uri ? { uri } : null;
  const label = slot?.kind === 'closet' ? (garment ? `${garment.primary_color} ${garment.subtype}` : 'Piece') : slot?.kind === 'photo' ? 'New item' : null;

  return (
    <View style={[styles.slot, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {slot ? (
        <>
          <View style={[styles.slotImage, { backgroundColor: theme.backgroundImage }]}>
            {src ? <Image source={src} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          </View>
          <ThemedText variant="caption" numberOfLines={1} style={{ marginTop: 8, textAlign: 'center' }}>
            {label}
          </ThemedText>
          <Pressable accessibilityLabel="Remove item" onPress={onRemove} hitSlop={8} style={[styles.slotRemove, { backgroundColor: 'rgba(251,250,247,0.92)' }]}>
            <Ionicons name="close" size={15} color={theme.text} />
          </Pressable>
        </>
      ) : (
        <View style={styles.slotEmpty}>
          <Ionicons name="add-circle-outline" size={22} color={theme.textTertiary} />
          <View style={styles.slotActions}>
            <SlotAction icon="shirt-outline" label="Closet" onPress={onPickCloset} />
            <SlotAction icon="image-outline" label="Upload" onPress={onUpload} />
            <SlotAction icon="camera-outline" label="Photo" onPress={onCamera} />
          </View>
        </View>
      )}
    </View>
  );
}

function SlotAction({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.slotAction, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={15} color={theme.text} />
      <ThemedText style={{ fontSize: 11, fontFamily: Fonts.sansMedium }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  slot: {
    width: '47%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 10,
    minHeight: 180,
    justifyContent: 'center',
  },
  slotImage: { width: '100%', height: 130, borderRadius: Radius.md, overflow: 'hidden' },
  slotRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: { alignItems: 'center', gap: 12 },
  slotActions: { gap: 6, width: '100%' },
  slotAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  addSlot: {
    width: '47%',
    minHeight: 180,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: 10 },
  note: {
    marginTop: 14,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 14,
    fontFamily: Fonts.sans,
    minHeight: 70,
    textAlignVertical: 'top',
  },
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
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  pickerCell: { width: '31.5%' },
  tile: { height: 104, borderRadius: Radius.lg, overflow: 'hidden' },
});
