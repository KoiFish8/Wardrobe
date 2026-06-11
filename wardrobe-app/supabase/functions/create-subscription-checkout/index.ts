/**
 * create-subscription-checkout — creates (or reuses) a Stripe customer for the
 * signed-in user and returns a Stripe Checkout URL for the Plus or Pro plan.
 *
 * NOTE (locked decision): Stripe is the dev/web payment path. Production
 * native subscriptions must ship via RevenueCat/IAP — the client already
 * isolates this behind the PaymentProvider interface.
 *
 * Deploy:  supabase functions deploy create-subscription-checkout
 * Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_test_... \
 *            STRIPE_PRICE_PLUS=price_... STRIPE_PRICE_PRO=price_... \
 *            CHECKOUT_RETURN_URL=https://your-app.example/checkout-done
 */
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Not authenticated' }, 401);

    const { tier } = await req.json();
    const priceId =
      tier === 'plus'
        ? Deno.env.get('STRIPE_PRICE_PLUS')
        : tier === 'pro'
          ? Deno.env.get('STRIPE_PRICE_PRO')
          : null;
    if (!priceId) return json({ error: `Unknown tier: ${tier}` }, 400);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

    // Service role: read/write stripe_customer_id regardless of RLS
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const returnUrl = Deno.env.get('CHECKOUT_RETURN_URL') ?? 'https://example.com/checkout-done';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}?status=success`,
      cancel_url: `${returnUrl}?status=cancelled`,
      metadata: { supabase_user_id: user.id, tier },
      subscription_data: { metadata: { supabase_user_id: user.id, tier } },
    });

    return json({ url: session.url }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
