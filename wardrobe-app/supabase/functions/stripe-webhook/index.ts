/**
 * stripe-webhook — keeps profiles.subscription_tier in sync with Stripe.
 * Handles subscription created/updated/deleted. The client NEVER sets the
 * tier itself; this webhook (service role) is the single writer.
 *
 * Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
 * Secrets: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
 * Stripe dashboard: add endpoint https://<ref>.supabase.co/functions/v1/stripe-webhook
 *   with events: customer.subscription.created|updated|deleted
 */
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (e) {
    return new Response(`Webhook signature verification failed: ${e}`, { status: 400 });
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.supabase_user_id;
    const tierMeta = subscription.metadata?.tier;

    const active = subscription.status === 'active' || subscription.status === 'trialing';
    const tier =
      event.type === 'customer.subscription.deleted' || !active
        ? 'free'
        : tierMeta === 'pro'
          ? 'pro'
          : 'plus';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (userId) {
      await admin.from('profiles').update({ subscription_tier: tier }).eq('id', userId);
    } else {
      // Fallback: resolve the user via stored stripe_customer_id
      await admin
        .from('profiles')
        .update({ subscription_tier: tier })
        .eq('stripe_customer_id', subscription.customer as string);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'content-type': 'application/json' },
  });
});
