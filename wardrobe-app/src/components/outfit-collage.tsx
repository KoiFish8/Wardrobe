/**
 * Outfit imagery for hero cards and detail screens — the app composes looks
 * from individual garment scans, so a look renders as a clean piece collage
 * on the design's warm image tone.
 */
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { sampleImageSource } from '@/lib/sampleImages';
import type { Garment } from '@/lib/types';

function Cell({ piece }: { piece: Garment }) {
  const theme = useTheme();
  const source = sampleImageSource(piece.id, piece.imageUri);
  return (
    <View style={[styles.cell, { backgroundColor: theme.backgroundImage }]}>
      {source ? (
        <Image source={source} style={styles.image} contentFit="cover" transition={220} />
      ) : (
        <ThemedText variant="caption" numberOfLines={1}>
          {piece.subtype}
        </ThemedText>
      )}
    </View>
  );
}

export function OutfitCollage({
  pieces,
  height,
  gap = 4,
}: {
  pieces: Garment[];
  height: number;
  gap?: number;
}) {
  const theme = useTheme();
  const shown = pieces.slice(0, 4);
  const rows: Garment[][] = [];
  if (shown.length <= 2) rows.push(shown);
  else if (shown.length === 3) rows.push(shown.slice(0, 1), shown.slice(1));
  else rows.push(shown.slice(0, 2), shown.slice(2));

  return (
    <View style={{ height, gap, backgroundColor: theme.backgroundImage }}>
      {shown.length === 0 ? (
        <View style={styles.cell}>
          <ThemedText variant="caption">No pieces yet</ThemedText>
        </View>
      ) : (
        rows.map((row, i) => (
          <View key={i} style={[styles.row, { gap }]}>
            {row.map((piece) => (
              <Cell key={piece.id} piece={piece} />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
