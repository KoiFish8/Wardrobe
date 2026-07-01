/** Password field with a show/hide (eye) toggle, styled like the auth inputs. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Password',
  editable = true,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
}) {
  const theme = useTheme();
  const [show, setShow] = useState(false);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.backgroundInput }]}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete="password"
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        style={[styles.input, { color: theme.text }]}
      />
      <Pressable
        accessibilityLabel={show ? 'Hide password' : 'Show password'}
        onPress={() => setShow((s) => !s)}
        hitSlop={10}
        style={({ pressed }) => [styles.eye, { opacity: pressed ? 0.5 : 1 }]}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, fontFamily: Fonts.sans },
  eye: { paddingLeft: 8 },
});
