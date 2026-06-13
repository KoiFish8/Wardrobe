import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ThemedText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, enterDemo, supabaseConfigured } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ThemedText variant="overline">Wardrobe Stylist</ThemedText>
        <ThemedText variant="display" style={{ fontSize: 52, lineHeight: 56, marginTop: 10 }}>
          Capsule
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: Spacing.two }}>
          Wear what you own. Buy less, better.
        </ThemedText>

        <View style={{ marginTop: Spacing.five, gap: Spacing.three }}>
          <TextInput
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={supabaseConfigured}
            style={[styles.input, { backgroundColor: theme.backgroundInput, color: theme.text }]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={supabaseConfigured}
            style={[styles.input, { backgroundColor: theme.backgroundInput, color: theme.text }]}
          />
          {error ? (
            <ThemedText variant="caption" color={theme.danger}>
              {error}
            </ThemedText>
          ) : null}
          <Button
            title="Sign in"
            onPress={handleSignIn}
            loading={busy}
            disabled={!supabaseConfigured || email.length === 0 || password.length === 0}
          />
          <Link href="/signup" asChild>
            <Button title="Create an account" kind="secondary" onPress={() => {}} disabled={!supabaseConfigured} />
          </Link>
        </View>

        <View style={{ marginTop: Spacing.five, gap: Spacing.two }}>
          {!supabaseConfigured ? (
            <ThemedText variant="caption" style={{ textAlign: 'center' }}>
              Supabase isn’t configured (.env) — explore the full app offline:
            </ThemedText>
          ) : null}
          <Button title="Try the demo" kind={supabaseConfigured ? 'ghost' : 'primary'} onPress={enterDemo} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: Spacing.five, maxWidth: 480, width: '100%', alignSelf: 'center' },
  input: { borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 13, fontSize: 14.5 },
});
