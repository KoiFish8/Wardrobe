import type { SubscriptionTier } from '../types';

export interface Offering {
  tier: Exclude<SubscriptionTier, 'free'>;
  title: string;
  price: string;
  period: 'month';
  features: string[];
}

/**
 * Single seam for all payment calls (locked decision). Implemented with
 * Stripe Checkout for dev/web today; production native subscriptions swap in
 * a RevenueCat implementation of this same interface (Apple/Google require
 * IAP for in-app digital goods — Stripe in-app would be rejected on iOS).
 */
export interface PaymentProvider {
  readonly kind: 'stripe' | 'demo';
  getOfferings(): Promise<Offering[]>;
  /** Starts a purchase; resolves to the active tier afterwards. */
  purchase(tier: Offering['tier']): Promise<SubscriptionTier>;
  restore(): Promise<SubscriptionTier>;
  getActiveTier(): Promise<SubscriptionTier>;
}

export const OFFERINGS: Offering[] = [
  {
    tier: 'plus',
    title: 'Plus',
    price: '$6.99',
    period: 'month',
    features: ['Unlimited outfit generation', 'All 8 aesthetics', 'Sort & filter by style'],
  },
  {
    tier: 'pro',
    title: 'Pro',
    price: '$12.99',
    period: 'month',
    features: ['Everything in Plus', 'Gap analysis — what to buy next', 'Wardrobe analytics'],
  },
];
