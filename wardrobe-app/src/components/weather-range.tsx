/**
 * Shows the temperature band an outfit is comfortable in (its "optimal weather
 * range"), optionally with a note on whether it fits today's weather.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { outfitWeatherRange, weatherFitForToday } from '@/lib/occasions';
import { useTempUnit } from '@/lib/settingsStore';
import { formatTempRange, toUnit } from '@/lib/temperature';
import type { Garment } from '@/lib/types';

const FIT_COPY = {
  good: 'Good for today',
  cold: 'Light for today',
  warm: 'Warm for today',
} as const;

export function WeatherRangeChip({
  pieces,
  temp,
  compact = false,
}: {
  pieces: Garment[];
  /** Today's temperature, if known — adds a fit note. */
  temp?: number | null;
  compact?: boolean;
}) {
  const theme = useTheme();
  const unit = useTempUnit();
  const range = outfitWeatherRange(pieces);
  const fit = temp != null ? weatherFitForToday(range, temp) : null;

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="thermometer-outline" size={12} color={theme.terracotta} />
        <ThemedText style={{ fontSize: 11, color: '#5a544b', fontFamily: Fonts.sansMedium }}>
          {toUnit(range.min, unit)}–{toUnit(range.max, unit)}°
        </ThemedText>
      </View>
    );
  }

  const fitColor = fit === 'good' ? theme.positive : theme.terracotta;
  return (
    <View style={[styles.full, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="thermometer-outline" size={15} color={theme.terracotta} />
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontSize: 13, fontFamily: Fonts.sansSemiBold }}>
          Best in {formatTempRange(range.min, range.max, unit)} · {range.label}
        </ThemedText>
        {fit ? (
          <ThemedText style={{ fontSize: 11.5, marginTop: 1, color: fitColor, fontFamily: Fonts.sansMedium }}>
            {FIT_COPY[fit]}
          </ThemedText>
        ) : null}
      </View>
      {fit ? (
        <Ionicons
          name={fit === 'good' ? 'checkmark-circle' : 'alert-circle-outline'}
          size={16}
          color={fitColor}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  full: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.lg,
  },
});
