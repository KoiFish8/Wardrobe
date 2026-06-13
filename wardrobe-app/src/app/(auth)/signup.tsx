import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ThemedText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

export default function SignupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signUp, supabaseConfigured } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    setError(null);
    setBusy(true);
    try {
      await signUp(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ThemedText variant="display" style={{ fontSize: 38 }}>Create account</ThemedText>
        <ThemedText variant="caption" style={{ marginTop: Spacing.two }}>
          Scan your closet once — get outfits forever.
        </ThemedText>

        <View style={{ marginTop: Spacing.five, gap: Spacing.three }}>
          <TextInput
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { backgroundColor: theme.backgroundInput, color: theme.text }]}
          />
          <TextInput
            placeholder="Password (8+ characters)"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { backgroundColor: theme.backgroundInput, color: theme.text }]}
          />
          {error ? (
            <ThemedText variant="caption" color={theme.danger}>
              {error}
            </ThemedText>
          ) : null}
          <Button
            title="Sign up"
            onPress={handleSignUp}
            loading={busy}
            disabled={!supabaseConfigured || email.length === 0 || password.length < 8}
          />
          <Button title="Back to sign in" kind="ghost" onPress={() => router.back()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: Spacing.five, maxWidth: 480, width: '100%', alignSelf: 'center' },
  input: { borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 13, fontSize: 15 },
});
