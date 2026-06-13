/**
 * Add to Closet (design screen 03) — photograph ONE garment, get structured
 * tags back, confirm/correct, save. This is the app's single LLM touchpoint
 * (Haiku via the tag-garment Edge Function; fixture tags in demo mode).
 * Corrections are stored — they're future training data.
 *
 * "Full look" is the doc-11 add-on, gated to Plus/Pro: paid users can scan a
 * full-outfit photo (multi-piece extraction runs once the AI backend is live).
 * Captured photos are compressed before tagging/storage.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Button, Chip, PressScale, ThemedText } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useReplayKey } from '@/hooks/use-replay-key';
import { useTheme } from '@/hooks/use-theme';
import { compressImage } from '@/lib/imageCompression';
import { useAddGarment, useProfile } from '@/lib/queries';
import { SAMPLE_IMAGES } from '@/lib/sampleImages';
import { RequireSession, useBackend } from '@/lib/session';
import { ALL_TAGS } from '@/lib/styleLibrary';
import { deriveLibraryTags } from '@/lib/tagMapping';
import type { Category, GarmentSchema } from '@/lib/types';

const CATEGORIES: Category[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];

type Phase = 'pick' | 'tagging' | 'confirm';
type Mode = 'single' | 'full';

const MANUAL_SCHEMA: GarmentSchema = {
  category: 'top',
  subtype: 't-shirt',
  primary_color: 'white',
  secondary_colors: [],
  pattern: 'solid',
  material_guess: 'unknown',
  formality: 'casual',
  season: ['spring', 'summer', 'fall', 'winter'],
  fit_silhouette: 'regular',
  neutral: true,
  confidence: 'low',
  note: 'Added manually — set the category and tags below.',
};

export default function ScanScreen() {
  return (
    <RequireSession>
      <ScanFlow />
    </RequireSession>
  );
}

function ScanFlow() {
  const theme = useTheme();
  const router = useRouter();
  const backend = useBackend();
  const addGarment = useAddGarment();
  const { data: profile } = useProfile();
  const replay = useReplayKey();

  const tier = profile?.subscriptionTier ?? 'free';
  const fullLookUnlocked = tier === 'plus' || tier === 'pro';

  const [phase, setPhase] = useState<Phase>('pick');
  const [mode, setMode] = useState<Mode>('single');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [schema, setSchema] = useState<GarmentSchema | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runTagging(input: { base64?: string; sampleId?: string }, uri: string | null) {
    setPhase('tagging');
    setError(null);
    try {
      const result = await backend.tagImage(input);
      setSchema(result);
      setTags(deriveLibraryTags(result));
      setEdited(false);
      setImageUri(uri);
      setPhase('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tagging failed');
      setPhase('pick');
    }
  }

  async function pickImage(fromCamera: boolean) {
    // We compress ourselves, so ask the picker for full quality and no base64.
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return;
    setSampleId(null);
    setPhase('tagging'); // show the spinner during compression too
    // Compress before tagging/storage — smaller upload, fewer vision tokens.
    const compressed = await compressImage(result.assets[0].uri, { withBase64: true });
    await runTagging({ base64: compressed.base64 }, compressed.uri);
  }

  async function useSample(id: string) {
    setSampleId(id);
    await runTagging({ sampleId: id }, null);
  }

  function addManually() {
    setSampleId(null);
    setImageUri(null);
    setSchema(MANUAL_SCHEMA);
    setTags([]);
    setEdited(true);
    setPhase('confirm');
  }

  function toggleTag(tag: string) {
    setEdited(true);
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function setCategory(category: Category) {
    setEdited(true);
    setSchema((prev) => (prev ? { ...prev, category } : prev));
  }

  async function save() {
    if (!schema) return;
    try {
      await addGarment.mutateAsync({
        ...schema,
        // sample:// URIs resolve to the bundled JPEG previews on any backend
        imageUri: imageUri ?? (sampleId ? `sample://${sampleId}` : null),
        tags,
        userCorrected: edited,
      });
      if (router.canGoBack()) router.back();
      else router.replace('/wardrobe');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  }

  if (phase === 'tagging') {
    const pendingSource = imageUri
      ? { uri: imageUri }
      : sampleId && SAMPLE_IMAGES[sampleId]
        ? SAMPLE_IMAGES[sampleId]
        : null;
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.center}>
          {pendingSource ? (
            <Animated.View entering={FadeIn.duration(300)}>
              <Image
                source={pendingSource}
                style={[styles.taggingPreview, { backgroundColor: theme.backgroundImage }]}
                contentFit="cover"
                transition={200}
              />
            </Animated.View>
          ) : null}
          <ActivityIndicator color={theme.text} style={{ marginTop: Spacing.four }} />
          <ThemedText variant="displaySmall" style={{ marginTop: Spacing.three }}>
            {imageUri || sampleId ? 'Reading your garment…' : 'Compressing photo…'}
          </ThemedText>
          <ThemedText variant="caption" style={{ marginTop: Spacing.two, textAlign: 'center' }}>
            {backend.kind === 'supabase'
              ? 'Looking at color, fit, material, and formality.'
              : 'Demo mode — using bundled fixture tags.'}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'confirm' && schema) {
    const availableTags = ALL_TAGS.filter((t) => !tags.includes(t));
    const confidenceLine =
      schema.confidence === 'high'
        ? 'Nice scan — these tags look solid.'
        : schema.confidence === 'medium'
          ? 'Mostly confident — worth a quick look below.'
          : 'Please check the details below.';
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <ScreenHeader title="Confirm tags" />
        <ScrollView contentContainerStyle={{ padding: 20, gap: Spacing.three, paddingBottom: 40 }}>
          {imageUri || (sampleId && SAMPLE_IMAGES[sampleId]) ? (
            <Image
              source={imageUri ? { uri: imageUri } : SAMPLE_IMAGES[sampleId!]}
              style={[styles.preview, { backgroundColor: theme.backgroundImage }]}
              contentFit="cover"
              transition={200}
            />
          ) : null}

          <View>
            <ThemedText variant="displaySmall">
              {schema.primary_color} {schema.subtype}
            </ThemedText>
            <ThemedText
              variant="caption"
              color={schema.confidence === 'high' ? theme.positive : theme.terracotta}
              style={{ marginTop: Spacing.one }}>
              {confidenceLine}
            </ThemedText>
            {schema.confidence === 'low' && schema.note ? (
              <ThemedText variant="caption" style={{ marginTop: Spacing.one }}>
                {schema.note}
              </ThemedText>
            ) : null}
            <View style={[styles.chips, { marginTop: Spacing.two }]}>
              <Chip small label={schema.material_guess} />
              <Chip small label={schema.formality} />
              <Chip small label={`${schema.fit_silhouette} fit`} />
            </View>
          </View>

          <ThemedText variant="label">Category</ThemedText>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c} small label={c} selected={schema.category === c} onPress={() => setCategory(c)} />
            ))}
          </View>

          <ThemedText variant="label">On this piece ({tags.length})</ThemedText>
          {tags.length === 0 ? (
            <ThemedText variant="caption">
              No style tags yet — add the ones that fit from the list below.
            </ThemedText>
          ) : (
            <View style={styles.chips}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  small
                  selected
                  label={`${tag.replace(/-/g, ' ')}  ✕`}
                  onPress={() => toggleTag(tag)}
                />
              ))}
            </View>
          )}
          <ThemedText variant="caption">
            These drive outfit scoring. Tap ✕ to remove — your fixes make the stylist smarter.
          </ThemedText>

          <ThemedText variant="label">Add a tag</ThemedText>
          <View style={styles.chips}>
            {availableTags.map((tag) => (
              <Chip key={tag} small label={tag.replace(/-/g, ' ')} onPress={() => toggleTag(tag)} />
            ))}
          </View>

          {error ? (
            <ThemedText variant="caption" color={theme.danger}>
              {error}
            </ThemedText>
          ) : null}
          <Button title="Save to closet" onPress={save} loading={addGarment.isPending} />
          <Button title="Retake" kind="ghost" onPress={() => setPhase('pick')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const fullMode = mode === 'full';
  const fullLocked = fullMode && !fullLookUnlocked;
  // Full look is interactive only when the user's tier unlocks it.
  const viewportTappable = !fullMode || fullLookUnlocked;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <ScreenHeader title="Add to Closet" />
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <ThemedText variant="caption" style={styles.subcopy}>
          {fullMode
            ? 'Snap your whole outfit — the stylist tags each piece for your closet.'
            : 'Photograph one piece at a time so the stylist can tag it.'}
        </ThemedText>

        {/* Single item / Full look toggle */}
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('single')}
            style={[
              styles.modePill,
              { backgroundColor: !fullMode ? theme.accent : theme.backgroundInput },
            ]}>
            <ThemedText
              color={!fullMode ? theme.accentText : '#4a443c'}
              style={{ fontSize: 13, fontFamily: !fullMode ? Fonts.sansSemiBold : Fonts.sans }}>
              Single item
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setMode('full')}
            style={[
              styles.modePill,
              { backgroundColor: fullMode ? theme.accent : theme.backgroundInput },
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <ThemedText
                color={fullMode ? theme.accentText : '#4a443c'}
                style={{ fontSize: 13, fontFamily: fullMode ? Fonts.sansSemiBold : Fonts.sans }}>
                Full look
              </ThemedText>
              {!fullLookUnlocked ? (
                <Ionicons
                  name="lock-closed"
                  size={11}
                  color={fullMode ? theme.accentText : theme.terracotta}
                />
              ) : null}
            </View>
          </Pressable>
        </View>

        {/* Viewport with corner brackets */}
        <Animated.View key={replay} entering={FadeInDown.duration(360)}>
          <PressScale
            onPress={
              viewportTappable
                ? () => pickImage(false)
                : () => router.push('/profile')
            }
            accessibilityLabel={
              fullLocked ? 'Unlock full-look scanning' : 'Choose a photo from your library'
            }
            style={[styles.viewport, { backgroundColor: '#f0ebe1' }]}>
            <View style={styles.viewportInner}>
              <View style={[styles.viewportFill, { backgroundColor: theme.backgroundImage }]}>
                {fullLocked ? (
                  <View style={{ alignItems: 'center', paddingHorizontal: 36 }}>
                    <Ionicons name="lock-closed-outline" size={22} color={theme.terracotta} />
                    <ThemedText variant="heading" style={{ fontSize: 14, marginTop: 10, textAlign: 'center' }}>
                      Full-look scanning is a Plus feature
                    </ThemedText>
                    <ThemedText variant="caption" style={{ marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
                      Snap one outfit photo and have every piece tagged at once. Tap to upgrade.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="image-outline" size={26} color={theme.textSecondary} />
                    <ThemedText variant="caption" style={{ marginTop: 8 }}>
                      {fullMode
                        ? 'Frame your full outfit — tap to pick a photo'
                        : 'Center your garment — tap to pick a photo'}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </PressScale>
        </Animated.View>

        {fullMode && fullLookUnlocked ? (
          <ThemedText variant="caption" style={styles.fullNote}>
            Multi-piece splitting runs when the AI backend is connected — for now your most
            prominent piece is tagged.
          </ThemedText>
        ) : null}

        {/* Photo tips — recommendations, not actions */}
        <View style={styles.tipsBlock}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={13} color={theme.textSecondary} />
            <ThemedText variant="label" color={theme.textSecondary}>
              For a clean scan
            </ThemedText>
          </View>
          <View style={styles.tips}>
            {[
              { icon: 'checkmark-circle', label: 'Good light' },
              { icon: 'checkmark-circle', label: fullMode ? 'Full outfit' : 'Full item' },
              { icon: 'checkmark-circle', label: 'Plain background' },
            ].map((tip) => (
              <View key={tip.label} style={styles.tip}>
                <Ionicons name={tip.icon as any} size={14} color={theme.positive} />
                <ThemedText style={{ fontSize: 12.5, color: '#5a544b', fontFamily: Fonts.sans }}>
                  {tip.label}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Sample wardrobe — single-item demo only */}
        {!fullMode ? (
          <View style={{ paddingHorizontal: 22, paddingTop: 24 }}>
            <ThemedText variant="heading" style={{ fontSize: 14.5 }}>
              Or scan a sample garment
            </ThemedText>
            <ThemedText variant="caption" style={{ marginTop: 3 }}>
              Real reference photos — instant in demo mode.
            </ThemedText>
            <View style={styles.sampleGrid}>
              {Object.entries(SAMPLE_IMAGES).map(([id, source]) => (
                <PressScale key={id} onPress={() => useSample(id)} accessibilityLabel={`Scan sample ${id}`} style={styles.sampleItem}>
                  <Image
                    source={source}
                    style={[styles.sampleImage, { backgroundColor: theme.backgroundImage }]}
                    contentFit="cover"
                    transition={180}
                  />
                </PressScale>
              ))}
            </View>
          </View>
        ) : null}

        {error ? (
          <ThemedText variant="caption" color={theme.danger} style={{ paddingHorizontal: 22, marginTop: 10 }}>
            {error}
          </ThemedText>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { pointerEvents: 'box-none' }]}>
        <LinearGradient
          colors={['rgba(251,250,247,0)', '#fbfaf7']}
          locations={[0, 0.26]}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
        {fullLocked ? (
          <Button
            title="Upgrade to Plus"
            onPress={() => router.push('/profile')}
            icon={<Ionicons name="sparkles-outline" size={18} color={theme.accentText} />}
          />
        ) : (
          <Button
            title={fullMode ? 'Scan Outfit' : 'Scan Item'}
            onPress={() => pickImage(true)}
            icon={<Ionicons name="camera-outline" size={20} color={theme.accentText} />}
          />
        )}
        <Pressable onPress={addManually} hitSlop={8} style={{ alignItems: 'center', marginTop: 16 }}>
          <ThemedText style={{ fontSize: 14, fontFamily: Fonts.sansSemiBold }}>Add manually</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  subcopy: { textAlign: 'center', marginHorizontal: 34, marginTop: 6, lineHeight: 19 },
  modeRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 16 },
  modePill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.pill },
  viewport: {
    marginHorizontal: 22,
    marginTop: 14,
    height: 360,
    borderRadius: Radius.hero,
    overflow: 'hidden',
  },
  viewportInner: { flex: 1 },
  viewportFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: '#fbfaf7' },
  cornerTL: { top: 18, left: 18, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 18, right: 18, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 18, left: 18, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 18, right: 18, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  fullNote: {
    textAlign: 'center',
    marginHorizontal: 30,
    marginTop: 12,
    lineHeight: 17,
  },
  tipsBlock: { alignItems: 'center', marginTop: 18 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  tips: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  preview: { width: '100%', height: 280, borderRadius: Radius.hero },
  taggingPreview: { width: 180, height: 220, borderRadius: Radius.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  sampleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  sampleItem: { width: '30%', minWidth: 96 },
  sampleImage: { width: '100%', aspectRatio: 0.8, borderRadius: Radius.md },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingBottom: 32,
    paddingTop: 24,
  },
});
