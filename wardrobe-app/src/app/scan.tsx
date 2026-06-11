/**
 * Scan — photograph ONE garment, get structured tags back, confirm/correct,
 * save. This is the app's single LLM touchpoint (Haiku via the tag-garment
 * Edge Function; fixture tags in demo mode). Corrections are stored — they're
 * future training data.
 */
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, ThemedText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAddGarment } from '@/lib/queries';
import { SAMPLE_IMAGES } from '@/lib/sampleImages';
import { RequireSession, useBackend } from '@/lib/session';
import { ALL_TAGS } from '@/lib/styleLibrary';
import { deriveLibraryTags } from '@/lib/tagMapping';
import type { Category, GarmentSchema } from '@/lib/types';

const CATEGORIES: Category[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];

type Phase = 'pick' | 'tagging' | 'confirm';

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

  const [phase, setPhase] = useState<Phase>('pick');
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
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'images',
      quality: 0.7,
      base64: true,
    };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setSampleId(null);
    await runTagging({ base64: asset.base64 ?? undefined }, asset.uri);
  }

  async function useSample(id: string) {
    setSampleId(id);
    await runTagging({ sampleId: id }, null);
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
      router.back();
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
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        {pendingSource ? (
          <Image
            source={pendingSource}
            style={[styles.taggingPreview, { backgroundColor: theme.backgroundElement }]}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <ActivityIndicator color={theme.text} style={{ marginTop: Spacing.four }} />
        <ThemedText variant="heading" style={{ marginTop: Spacing.three }}>
          Reading your garment…
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: Spacing.two, textAlign: 'center' }}>
          {backend.kind === 'supabase'
            ? 'Looking at color, fit, material, and formality.'
            : 'Demo mode — using bundled fixture tags.'}
        </ThemedText>
      </View>
    );
  }

  if (phase === 'confirm' && schema) {
    const availableTags = ALL_TAGS.filter((t) => !tags.includes(t));
    const confidenceLine =
      schema.confidence === 'high'
        ? 'Nice scan — these tags look solid.'
        : schema.confidence === 'medium'
          ? 'Mostly confident — worth a quick look below.'
          : 'Hard to read this photo — please check the tags below.';
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}>
        {imageUri || (sampleId && SAMPLE_IMAGES[sampleId]) ? (
          <Image
            source={imageUri ? { uri: imageUri } : SAMPLE_IMAGES[sampleId!]}
            style={[styles.preview, { backgroundColor: theme.backgroundElement }]}
            contentFit="cover"
          />
        ) : null}

        <View>
          <ThemedText variant="title">
            {schema.primary_color} {schema.subtype}
          </ThemedText>
          <ThemedText
            variant="caption"
            color={schema.confidence === 'high' ? theme.positive : theme.warning}
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
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}>
      <ThemedText variant="caption">
        One garment per photo — lay it flat or hang it with decent light.
      </ThemedText>
      <Button title="Take a photo" onPress={() => pickImage(true)} />
      <Button title="Choose from library" kind="secondary" onPress={() => pickImage(false)} />

      <ThemedText variant="heading" style={{ marginTop: Spacing.three }}>
        Or scan a sample garment
      </ThemedText>
      <ThemedText variant="caption">
        Six real phone photos from data/sample-wardrobe — instant in demo mode.
      </ThemedText>
      <View style={styles.sampleGrid}>
        {Object.entries(SAMPLE_IMAGES).map(([id, source]) => (
          <View key={id} style={styles.sampleItem}>
            <Image
              source={source}
              style={[styles.sampleImage, { backgroundColor: theme.backgroundElement }]}
              contentFit="cover"
            />
            <Button title="Scan" kind="secondary" onPress={() => useSample(id)} style={styles.sampleButton} />
          </View>
        ))}
      </View>
      {error ? (
        <ThemedText variant="caption" color={theme.danger}>
          {error}
        </ThemedText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  preview: { width: '100%', height: 280, borderRadius: Radius.lg },
  taggingPreview: { width: 180, height: 220, borderRadius: Radius.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  sampleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  sampleItem: { width: '30%', minWidth: 96 },
  sampleImage: { width: '100%', aspectRatio: 0.8, borderRadius: Radius.md },
  sampleButton: { marginTop: Spacing.one, minHeight: 36, paddingVertical: 6 },
});
