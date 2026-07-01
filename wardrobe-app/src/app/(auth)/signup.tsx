import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ThemedText } from '@/components/ui';
import { PasswordInput } from '@/components/password-input';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

export default function SignupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signUp, supabaseConfigured } = useSession();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSignUp() {
    setError(null);
    setBusy(true);
    try {
      await signUp(email.trim(), password, username);
      // Supabase requires email confirmation — no session yet. Tell the user to
      // check their inbox instead of leaving them on a silent screen.
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.container, { alignItems: 'center' }]}>
          <View style={[styles.envelope, { backgroundColor: theme.terracottaSoft }]}>
            <Ionicons name="mail-outline" size={30} color={theme.terracotta} />
          </View>
          <ThemedText variant="display" style={{ fontSize: 32, marginTop: Spacing.four, textAlign: 'center' }}>
            Check your email
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={{ marginTop: Spacing.two, textAlign: 'center', lineHeight: 21 }}>
            We sent a confirmation link to{'\n'}
            <ThemedText style={{ color: theme.text }}>{email.trim()}</ThemedText>.{'\n'}
            Tap it to verify your account, then come back and sign in.
          </ThemedText>
          <View style={{ marginTop: Spacing.five, width: '100%', gap: Spacing.two }}>
            <Button title="Back to sign in" onPress={() => router.replace('/login')} />
            <Button
              title="Use a different email"
              kind="ghost"
              onPress={() => {
                setSent(false);
                setPassword('');
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
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
            placeholder="Username"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            value={username}
            onChangeText={setUsername}
            style={[styles.input, { backgroundColor: theme.backgroundInput, color: theme.text }]}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { backgroundColor: theme.backgroundInput, color: theme.text }]}
          />
          <PasswordInput
            placeholder="Password (8+ characters)"
            value={password}
            onChangeText={setPassword}
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
            disabled={
              !supabaseConfigured ||
              username.trim().length < 2 ||
              email.length === 0 ||
              password.length < 8
            }
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
  envelope: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
