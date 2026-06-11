# Wardrobe Stylist App

Scan your closet one garment at a time, get ranked outfits built from clothes you already own, and find the one piece worth buying next. Expo + React Native + TypeScript, with Supabase as the backend and a single Claude Haiku call per scan (~$0.003/item). Outfit generation and gap analysis are pure on-device tag math — no LLM, no cost, instant.

**Start with `CLAUDE.md`** — locked decisions, core loop, data model.

## Run it (demo mode — zero setup)

```bash
npm install
npm run web        # or: npm run ios / npm run android / npm start
```

With no `.env`, the app runs fully offline: tap **Try the demo** on the login screen, then scan the bundled sample garments (or import all 6), pick a style, and check the Gaps tab. Demo "purchases" on the Profile tab switch tiers instantly so gating is testable.

```bash
npm test           # scorer unit tests (15)
npm run typecheck
```

## Run it for real (Supabase + Anthropic + Stripe)

1. **Create a Supabase project** → copy the URL + anon key into `.env` (see `.env.example`).
2. **Schema:** open the SQL editor and run `supabase/migrations/0001_init.sql` (tables + RLS + storage bucket + profile trigger).
3. **Auth:** enable Email/Password (Apple/Google optional) in Supabase Auth settings.
4. **Edge Functions:**
   ```bash
   supabase functions deploy tag-garment
   supabase functions deploy create-subscription-checkout
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
5. **Stripe (dev/web only):** create Plus ($6.99/mo) and Pro ($12.99/mo) recurring prices, then
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_PLUS=price_... \
     STRIPE_PRICE_PRO=price_... STRIPE_WEBHOOK_SECRET=whsec_... \
     CHECKOUT_RETURN_URL=https://your-site/checkout-done
   ```
   and add a webhook endpoint for `customer.subscription.created|updated|deleted` →
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`.
6. `npm start` — sign up, scan, style, done.

> **IAP reality check:** Apple/Google require their own in-app purchase for digital subscriptions — Stripe in-app will get the iOS app rejected. All payment calls go through the `PaymentProvider` interface (`src/lib/payments/`) so production native builds can swap in RevenueCat without touching screens.

## Layout

```
wardrobe-app/
├── CLAUDE.md                  ← project context (read first)
├── src/
│   ├── app/                   ← Expo Router screens (auth, tabs, scan, details)
│   ├── lib/
│   │   ├── scoring.ts         ← THE engine: outfit generation + gap analysis (local math)
│   │   ├── styleLibrary.ts    ← typed access to the bundled scoring graph
│   │   ├── tagMapping.ts      ← vision schema → library tag vocabulary
│   │   ├── backend/           ← Supabase + offline demo backends (one interface)
│   │   └── payments/          ← PaymentProvider seam (Stripe now, RevenueCat later)
│   └── components/
├── supabase/
│   ├── migrations/0001_init.sql
│   └── functions/             ← tag-garment (the only LLM call), Stripe checkout + webhook
├── data/
│   ├── style-library-v1.json  ← the scoring graph (the key asset — weights live here)
│   ├── tagged-wardrobe-test.json
│   └── sample-wardrobe/       ← 6 real phone photos (HEIC; JPEG previews in assets/samples)
├── docs/                      ← product, business, style-library docs
└── archive/
```

## Status

Core loop implemented end to end: scan → tag → confirm → closet → ranked outfits per style → gap recommendation, with tier gating (Free / Plus / Pro). Scoring validated by unit tests against the real tagged wardrobe.
