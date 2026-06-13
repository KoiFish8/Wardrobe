/** Capsule stack-screen header: back chevron · centered title · optional right slot. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

export function ScreenHeader({ title, right }: { title?: string; right?: ReactNode }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={10}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </Pressable>
      <View style={styles.title}>
        {title ? <ThemedText variant="heading">{title}</ThemedText> : null}
      </View>
      <View style={styles.right}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: { flex: 1, alignItems: 'center' },
  right: { minWidth: 24, alignItems: 'flex-end' },
});
