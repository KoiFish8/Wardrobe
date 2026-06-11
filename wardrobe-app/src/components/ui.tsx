/** Small shared primitives: themed text, buttons, chips, cards, empty states. */
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ThemedText({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: 'title' | 'heading' | 'body' | 'caption' | 'label';
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  const variants: Record<string, TextStyle> = {
    title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    heading: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 15, lineHeight: 21 },
    caption: { fontSize: 13, lineHeight: 18 },
    label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  };
  const secondary = variant === 'caption' || variant === 'label';
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[variants[variant], { color: color ?? (secondary ? theme.textSecondary : theme.text) }, style]}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const background =
    kind === 'primary'
      ? theme.accent
      : kind === 'danger'
        ? theme.danger
        : kind === 'secondary'
          ? theme.backgroundElement
          : 'transparent';
  const textColor = kind === 'primary' || kind === 'danger' ? theme.accentText : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: kind === 'danger' ? '#fff' : textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        small && styles.chipSmall,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text
        style={{
          color: selected ? theme.accentText : theme.text,
          fontSize: small ? 12 : 14,
          fontWeight: selected ? '600' : '400',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const theme = useTheme();
  const body = (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>{children}</View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      {body}
    </Pressable>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <ThemedText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </ThemedText>
      <ThemedText variant="caption" style={{ textAlign: 'center', marginTop: Spacing.two }}>
        {body}
      </ThemedText>
      {action ? <View style={{ marginTop: Spacing.four }}>{action}</View> : null}
    </View>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={theme.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    minHeight: 48,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 5 },
  card: { borderRadius: Radius.lg, padding: Spacing.three },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
});
