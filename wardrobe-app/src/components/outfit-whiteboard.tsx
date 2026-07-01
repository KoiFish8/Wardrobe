/**
 * OutfitWhiteboard — the flat-lay "moodboard" thumbnail (doc-11 / design ref):
 * the look's pieces arranged on a clean neutral board, like a styled flat-lay.
 *
 * Drop-in replacement for <OutfitCollage> (same {pieces,height,gap} props). It
 * prefers each garment's background-removed `cutoutUri` (from the crop-garment
 * pipeline) and falls back to the raw photo, so it looks right before cutouts
 * exist and upgrades automatically once they do.
 */
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { OutfitCollage } from '@/components/outfit-collage';
import { ThemedText } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { sampleImageSource } from '@/lib/sampleImages';
import type { Garment } from '@/lib/types';

/** Gentle alternating tilt so the board reads as a hand-arranged flat-lay. */
const TILTS = ['-4deg', '3deg', '-2deg', '4deg', '-3deg'];

function pieceSource(piece: Garment) {
  // A real cutout URL wins; otherwise resolve the sample/scan photo.
  if (piece.cutoutUri) return { uri: piece.cutoutUri };
  return sampleImageSource(piece.id, piece.imageUri);
}

export function OutfitWhiteboard({
  pieces,
  height,
  board,
}: {
  pieces: Garment[];
  height: number;
  /** Override the board (background) color; defaults to a soft neutral. */
  board?: string;
}) {
  const theme = useTheme();
  const shown = pieces.slice(0, 5);
  const boardColor = board ?? '#e8e2d6';

  // Until pieces have background-removed cutouts, the flat-lay board would just
  // show raw photos-with-backgrounds — so fall back to the clean collage. Once
  // the crop-garment pipeline has run (any piece has a cutout), show the board.
  const hasCutouts = shown.some((p) => p.cutoutUri);
  if (!hasCutouts) return <OutfitCollage pieces={pieces} height={height} />;

  return (
    <View style={[styles.board, { height, backgroundColor: boardColor }]}>
      {shown.length === 0 ? (
        <ThemedText variant="caption" color={theme.textSecondary}>
          No pieces yet
        </ThemedText>
      ) : (
        <View style={styles.scatter}>
          {shown.map((piece, i) => {
            const source = pieceSource(piece);
            // First piece is the anchor (larger); the rest fan around it.
            const big = i === 0 && shown.length > 2;
            return (
              <View
                key={piece.id}
                style={[
                  styles.item,
                  big ? styles.itemBig : styles.itemSmall,
                  { transform: [{ rotate: TILTS[i % TILTS.length] }] },
                ]}>
                {source ? (
                  <Image
                    source={source}
                    style={styles.image}
                    contentFit="contain"
                    transition={220}
                  />
                ) : (
                  <ThemedText variant="caption" numberOfLines={1}>
                    {piece.subtype}
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 14,
  },
  scatter: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBig: { width: '52%', height: '88%' },
  itemSmall: { width: '40%', height: '46%' },
  image: { width: '100%', height: '100%' },
});
