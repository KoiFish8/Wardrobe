/** Capsule primitives: serif display text, ink buttons, pill chips, hairline cards. */
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Subtle press feedback used across cards and buttons (scale 1 → 0.97). */
export function PressScale({
  children,
  onPress,
  disabled,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 18, stiffness: 320 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 18, stiffness: 320 }))}>
      <Animated.View style={[animated, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function ThemedText({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: 'display' | 'displaySmall' | 'title' | 'heading' | 'body' | 'caption' | 'label' | 'overline';
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  const variants: Record<string, TextStyle> = {
    // Instrument Serif display sizes from the mock (38 / 26 hero headings)
    display: { fontFamily: Fonts.serif, fontSize: 38, lineHeight: 41 },
    displaySmall: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 30 },
    title: { fontFamily: Fonts.serif, fontSize: 25, lineHeight: 29 },
    heading: { fontFamily: Fonts.sansBold, fontSize: 16, lineHeight: 21 },
    body: { fontFamily: Fonts.sans, fontSize: 14.5, lineHeight: 21 },
    caption: { fontFamily: Fonts.sans, fontSize: 12.5, lineHeight: 17 },
    label: {
      fontFamily: Fonts.sansBold,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    overline: {
      fontFamily: Fonts.sansBold,
      fontSize: 11.5,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
  };
  const secondary = variant === 'caption';
  const overline = variant === 'overline';
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        variants[variant],
        {
          color:
            color ?? (overline ? theme.textOverline : secondary ? theme.textSecondary : theme.text),
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
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
          ? theme.backgroundElementAlt
          : 'transparent';
  const textColor = kind === 'primary' || kind === 'danger' ? theme.accentText : theme.text;
  return (
    <PressScale
      accessibilityLabel={title}
      onPress={disabled || loading ? undefined : onPress}
      style={[styles.button, { backgroundColor: background, opacity: disabled ? 0.45 : 1 }, style]}>
    {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </PressScale>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  small,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
  icon?: ReactNode;
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
          backgroundColor: selected ? theme.accent : theme.backgroundInput,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {icon}
      <Text
        style={{
          color: selected ? theme.accentText : '#4a443c',
          fontSize: small ? 12 : 12.5,
          fontFamily: selected ? Fonts.sansSemiBold : Fonts.sansMedium,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onPress,
  tone = 'plain',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'plain' | 'beige' | 'selected';
}) {
  const theme = useTheme();
  const toneStyle: ViewStyle =
    tone === 'beige'
      ? { backgroundColor: theme.backgroundElement }
      : tone === 'selected'
        ? {
            backgroundColor: theme.backgroundSelected,
            borderWidth: 1.5,
            borderColor: theme.borderSelected,
          }
        : { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border };
  const body = <View style={[styles.card, toneStyle, style]}>{children}</View>;
  if (!onPress) return body;
  return <PressScale onPress={onPress}>{body}</PressScale>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <ThemedText variant="displaySmall" style={{ textAlign: 'center' }}>
        {title}
      </ThemedText>
      <ThemedText variant="caption" style={{ textAlign: 'center', marginTop: Spacing.two, lineHeight: 19 }}>
        {body}
      </ThemedText>
      {action ? <View style={{ marginTop: Spacing.four, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.xl,
    minHeight: 52,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  buttonText: { fontSize: 15, fontFamily: Fonts.sansBold },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  chipSmall: { paddingHorizontal: 12, paddingVertical: 6 },
  card: { borderRadius: Radius.lg, padding: Spacing.three },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
});
