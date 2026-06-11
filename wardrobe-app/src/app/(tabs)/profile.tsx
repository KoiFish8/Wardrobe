/** Profile — plan status, paywall (via PaymentProvider), preferences, sign out. */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, ThemedText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { OFFERINGS } from '@/lib/payments/types';
import { useProfile, useSetPreferredStyles } from '@/lib/queries';
import { usePayments, useSession } from '@/lib/session';
import { STYLE_IDS, styleName } from '@/lib/styleLibrary';
import type { StyleId } from '@/lib/types';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useSession();
  const payments = usePayments();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const setPreferred = useSetPreferredStyles();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tier = profile?.subscriptionTier ?? 'free';
  const preferred = profile?.preferredStyles ?? [];

  async function purchase(tierId: 'plus' | 'pro') {
    setError(null);
    setPurchasing(tierId);
    try {
      await payments.purchase(tierId);
      qc.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  }

  function togglePreferred(id: StyleId) {
    const next = preferred.includes(id) ? preferred.filter((s) => s !== id) : [...preferred, id];
    setPreferred.mutate(next);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}>
      <Card>
        <ThemedText variant="label">Account</ThemedText>
        <ThemedText variant="heading" style={{ marginTop: Spacing.one }}>
          {user?.isDemo ? 'Demo session' : (user?.email ?? '—')}
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: Spacing.one }}>
          Current plan: {tier.toUpperCase()}
          {user?.isDemo ? ' · purchases are simulated in demo mode' : ''}
        </ThemedText>
      </Card>

      <ThemedText variant="heading">Plans</ThemedText>
      {OFFERINGS.map((offering) => {
        const active = tier === offering.tier;
        return (
          <Card key={offering.tier}>
            <View style={styles.planHeader}>
              <ThemedText variant="heading">{offering.title}</ThemedText>
              <ThemedText variant="heading">
                {offering.price}
                <ThemedText variant="caption">/{offering.period}</ThemedText>
              </ThemedText>
            </View>
            {offering.features.map((f) => (
              <ThemedText key={f} variant="caption" style={{ marginTop: Spacing.one }}>
                · {f}
              </ThemedText>
            ))}
            <Button
              title={active ? 'Current plan' : `Get ${offering.title}`}
              kind={active ? 'secondary' : 'primary'}
              disabled={active}
              loading={purchasing === offering.tier}
              onPress={() => purchase(offering.tier)}
              style={{ marginTop: Spacing.three }}
            />
          </Card>
        );
      })}
      {error ? (
        <ThemedText variant="caption" color={theme.danger}>
          {error}
        </ThemedText>
      ) : null}

      <ThemedText variant="heading">Preferred styles</ThemedText>
      <ThemedText variant="caption">Used to personalize gap analysis and defaults.</ThemedText>
      <View style={styles.chips}>
        {STYLE_IDS.map((id) => (
          <Chip
            key={id}
            small
            label={styleName(id)}
            selected={preferred.includes(id)}
            onPress={() => togglePreferred(id)}
          />
        ))}
      </View>

      <Button title="Sign out" kind="danger" onPress={signOut} style={{ marginTop: Spacing.four }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
