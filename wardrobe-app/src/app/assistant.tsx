/**
 * Capsule Stylist (Pro) — grounded chat over the user's wardrobe. Sends a compact
 * wardrobe summary + the conversation to the style-assistant Edge Function
 * (Anthropic Haiku). Demo mode returns a canned reply. Generation/scoring stay
 * local — this is purely a "talk about your closet" surface.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Button, EmptyState, ThemedText } from '@/components/ui';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeather } from '@/hooks/use-weather';
import { buildAssistantContext } from '@/lib/assistantContext';
import { useCollectionsStore } from '@/lib/collectionsStore';
import { useGarments, useProfile } from '@/lib/queries';
import { RequireSession, useBackend } from '@/lib/session';
import { useTempUnit } from '@/lib/settingsStore';
import { formatTemp } from '@/lib/temperature';
import type { AssistantMessage } from '@/lib/backend/types';

const SUGGESTIONS = [
  'What should I wear today?',
  "Pack me 4 days for a trip",
  "What's missing from my closet?",
  'Style my black trousers',
];

export default function AssistantScreen() {
  return (
    <RequireSession>
      <Assistant />
    </RequireSession>
  );
}

function Assistant() {
  const theme = useTheme();
  const router = useRouter();
  const backend = useBackend();
  const { data: profile } = useProfile();
  const { data: garments } = useGarments();
  const { data: weather } = useWeather();
  const unit = useTempUnit();
  const collections = useCollectionsStore((s) => s.collections);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const tier = profile?.subscriptionTier ?? 'free';
  const isPro = tier === 'pro';
  const closet = useMemo(() => garments ?? [], [garments]);

  const context = useMemo(
    () =>
      buildAssistantContext({
        closet,
        collections,
        preferredStyles: profile?.preferredStyles,
        tempLabel: weather ? `${formatTemp(weather.temperature, unit)} · ${weather.label}` : null,
      }),
    [closet, collections, profile?.preferredStyles, weather, unit]
  );

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const userMsg: AssistantMessage = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setSending(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    try {
      const res = await backend.askAssistant({ messages: next, context });
      setMessages((m) => [...m, { role: 'assistant', content: res.error ?? res.reply }]);
      if (typeof res.remaining === 'number') setRemaining(res.remaining);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Something went wrong — try again in a moment.' }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  if (!isPro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <ScreenHeader title="Capsule Stylist" />
        <EmptyState
          title="Your personal stylist"
          body="Chat with a stylist that knows your closet — what to wear, how to pack, what's worth buying. Grounded in your real wardrobe. A Pro feature."
          action={<Button title="Upgrade to Pro" onPress={() => router.push('/profile')} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScreenHeader
        title="Capsule Stylist"
        right={
          remaining !== null ? (
            <ThemedText variant="caption" color={theme.textSecondary} style={{ fontSize: 11.5 }}>
              {remaining} left
            </ThemedText>
          ) : null
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 18, paddingBottom: 24, gap: 12 }}
          showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <View style={{ paddingTop: 30, alignItems: 'center' }}>
              <View style={[styles.orb, { backgroundColor: theme.terracottaSoft }]}>
                <Ionicons name="sparkles" size={26} color={theme.terracotta} />
              </View>
              <ThemedText variant="display" style={{ fontSize: 26, marginTop: 16, textAlign: 'center' }}>
                Ask your stylist
              </ThemedText>
              <ThemedText variant="caption" style={{ marginTop: 6, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 }}>
                I know your {closet.length} pieces. Outfits, packing, what to wear, what to buy — just ask.
              </ThemedText>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} onPress={() => send(s)} style={[styles.suggestion, { borderColor: theme.border }]}>
                    <ThemedText style={{ fontSize: 13, color: theme.text }}>{s}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m, i) => (
              <Animated.View
                key={i}
                entering={FadeInUp.duration(240)}
                style={[
                  styles.bubble,
                  m.role === 'user'
                    ? { alignSelf: 'flex-end', backgroundColor: theme.accent }
                    : { alignSelf: 'flex-start', backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText
                  style={{
                    fontSize: 14,
                    lineHeight: 20,
                    color: m.role === 'user' ? theme.accentText : theme.text,
                  }}>
                  {m.content}
                </ThemedText>
              </Animated.View>
            ))
          )}
          {sending ? (
            <View style={[styles.bubble, { alignSelf: 'flex-start', backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>…</ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.inputBar, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <TextInput
            placeholder="Ask about your wardrobe…"
            placeholderTextColor={theme.textSecondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            multiline
            style={[styles.input, { backgroundColor: theme.backgroundInput, color: theme.text }]}
          />
          <Pressable
            accessibilityLabel="Send"
            onPress={() => send(input)}
            disabled={sending || input.trim().length === 0}
            style={[
              styles.sendBtn,
              { backgroundColor: input.trim().length === 0 || sending ? theme.backgroundElement : theme.accent },
            ]}>
            <Ionicons
              name="arrow-up"
              size={20}
              color={input.trim().length === 0 || sending ? theme.textTertiary : theme.accentText}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  orb: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  suggestions: { marginTop: 22, gap: 8, width: '100%' },
  suggestion: { borderWidth: 1, borderRadius: Radius.lg, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center' },
  bubble: { maxWidth: '86%', borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: Fonts.sans, maxHeight: 110 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
