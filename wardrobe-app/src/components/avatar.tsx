/** Avatar with the design's warm gradient ring (#c8895c → #e8cb9d). */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Avatar({ size = 42, initial }: { size?: number; initial?: string }) {
  const theme = useTheme();
  const ring = size > 50 ? 2.5 : 2;
  const inner = size - ring * 2;
  return (
    <LinearGradient
      colors={[theme.ringStart, theme.ringEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, padding: ring }}>
      <View
        style={[
          styles.inner,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            borderColor: theme.background,
            backgroundColor: theme.backgroundImage,
          },
        ]}>
        {initial ? (
          <Text style={{ fontFamily: Fonts.serif, fontSize: size * 0.42, color: theme.terracotta }}>
            {initial.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  inner: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
