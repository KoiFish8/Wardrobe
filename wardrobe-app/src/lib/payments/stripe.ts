/**
 * Stripe implementation of PaymentProvider — for development, testing, and a
 * future web app. Opens a Stripe Checkout session created by the
 * create-subscription-checkout Edge Function (the secret key never leaves
 * the server); the stripe-webhook function updates profiles.subscription_tier.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import type { SubscriptionTier } from '../types';
import { OFFERINGS, type Offering, type PaymentProvider } from './types';

export class StripePaymentProvider implements PaymentProvider {
  readonly kind = 'stripe' as const;

  constructor(
    private client: SupabaseClient,
    private userId: string
  ) {}

  async getOfferings(): Promise<Offering[]> {
    return OFFERINGS;
  }

  async getActiveTier(): Promise<SubscriptionTier> {
    const { data, error } = await this.client
      .from('profiles')
      .select('subscription_tier')
      .eq('id', this.userId)
      .single();
    if (error) throw error;
    return (data.subscription_tier ?? 'free') as SubscriptionTier;
  }

  async purchase(tier: Offering['tier']): Promise<SubscriptionTier> {
    const { data, error } = await this.client.functions.invoke('create-subscription-checkout', {
      body: { tier },
    });
    if (error) throw error;
    const url = (data as { url?: string }).url;
    if (!url) throw new Error('Checkout session did not return a URL');
    await WebBrowser.openBrowserAsync(url);
    // The webhook updates the tier server-side; re-read after checkout closes.
    return this.getActiveTier();
  }

  async restore(): Promise<SubscriptionTier> {
    return this.getActiveTier();
  }
}
