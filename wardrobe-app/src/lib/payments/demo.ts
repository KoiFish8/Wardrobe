/** Demo PaymentProvider: instant fake purchases so tier gating is testable offline. */
import type { WardrobeBackend } from '../backend/types';
import type { SubscriptionTier } from '../types';
import { OFFERINGS, type Offering, type PaymentProvider } from './types';

export class DemoPaymentProvider implements PaymentProvider {
  readonly kind = 'demo' as const;

  constructor(private backend: WardrobeBackend) {}

  async getOfferings(): Promise<Offering[]> {
    return OFFERINGS;
  }

  async getActiveTier(): Promise<SubscriptionTier> {
    return (await this.backend.getProfile()).subscriptionTier;
  }

  async purchase(tier: Offering['tier']): Promise<SubscriptionTier> {
    return (await this.backend.setSubscriptionTier(tier)).subscriptionTier;
  }

  async restore(): Promise<SubscriptionTier> {
    return this.getActiveTier();
  }
}
