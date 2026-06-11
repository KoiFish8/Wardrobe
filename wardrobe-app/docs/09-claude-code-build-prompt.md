# Claude Code Build Prompt — Wardrobe Stylist App

**How to use this:** open Claude Code in the `wardrobe-app/` folder (so it can read `CLAUDE.md` and `data/style-library-v1.json`), then paste everything in the `─── PROMPT ───` block below. It's written as a complete, self-contained instruction set.

A note before you start (read this, it'll save you pain): **native iOS/Android app stores require their own in-app purchase (StoreKit / Google Play Billing) for digital subscriptions — Stripe is not allowed for in-app digital goods on iOS.** You asked for Stripe, so the prompt uses Stripe (great for testing, web, and a future web app), but it also tells Code to structure payments so you can swap to **RevenueCat** (which wraps IAP) for production native subscriptions. Don't skip that note or Apple will reject the app.

---

```
─── PROMPT ───

You are building a mobile app called the Wardrobe Stylist App. First read CLAUDE.md and data/style-library-v1.json in this folder — they contain the locked product decisions and the style-scoring graph. Follow them. Build the app described below.

## PRODUCT (core loop — do not redesign)
1. Scan: user photographs INDIVIDUAL garments, one at a time. Each is sent to Claude Haiku, which returns structured tags.
2. Generate: outfits are built by scoring the user's garment TAGS against a target style using the bundled style library. This is pure tag math — it runs CLIENT-SIDE, no LLM call, no cost, instant.
3. Gap analysis: recommend the piece(s) that would unlock the most new outfits. Also client-side scoring.
Target user: style-unconfident people with small wardrobes who want to buy less and wear what they own.

## ARCHITECTURE PRINCIPLE (important)
Only the SCAN step calls an LLM (image -> Haiku -> tags). Outfit generation and gap analysis are deterministic scoring over the bundled style-library-v1.json and must NOT call an LLM. Do not waste API calls generating outfits — it's tag arithmetic. (Optional: a single Sonnet call may polish the "why this works" blurb, behind a flag, but generation itself stays local.)

## TECH STACK (use exactly this)
- Expo (managed workflow) + React Native + TypeScript
- Expo Router (file-based navigation)
- Supabase: Postgres (database), Auth (email/password + Sign in with Apple + Google), Storage (garment images)
- Supabase Edge Functions (Deno) for anything needing a secret key: (a) the tagging function that calls Anthropic, (b) Stripe checkout + webhook
- Anthropic API: model `claude-haiku-4-5` for tagging. Optional `claude-sonnet-4-6` for gap-analysis blurb polish only.
- Payments: Stripe via `@stripe/stripe-react-native` + a Supabase Edge Function. STRUCTURE the payment layer behind a single `PaymentProvider` interface so it can be swapped to RevenueCat (IAP) for production — see the IAP note at the end.
- State: TanStack Query for server state; light Zustand or React Context for local UI state
- Style library: bundle `data/style-library-v1.json` as a static app asset; write a pure-TypeScript scoring module that reads it.

## SCREENS (7, including login). Use Expo Router.
1. (auth)/login + (auth)/signup — Supabase auth; redirect to app when signed in.
2. (tabs)/closet — HOME. Grid of the user's scanned garments. Empty state prompts first scan. Tap a garment to view/edit its tags.
3. scan (modal/stack) — camera + image picker. On capture: upload image to Supabase Storage, call the tagging Edge Function, show the returned tags for the user to CONFIRM or CORRECT (corrections are valuable data — store them), then save the garment. Flag low-confidence tags for review.
4. (tabs)/style — user picks a target style from the 8 in the library. App generates and shows RANKED outfits from their closet (client-side scoring). Each card shows the pieces + a short "why it works".
5. outfit/[id] — outfit detail: the pieces, the score, the "why", and a Save/Favorite button (writes to saved_outfits).
6. (tabs)/gaps — Gap Analysis ("What to buy"). Runs the gap scorer: for candidate missing item-types/tags, simulate adding each and rank by how many NEW high-scoring outfits it unlocks for the user's preferred style(s). Show the top 1–3 recommendations with the reason. (PRO tier — gate it.)
7. (tabs)/profile — subscription management (Stripe paywall), plan status, settings, sign out.
Tab bar = Closet, Style, Gaps, Profile. Scan is a prominent + button. Outfit detail is a stack screen.

## DATABASE (Supabase Postgres) — generate SQL migrations AND give them to me to run, with Row-Level Security so each user only sees their own rows.
Tables:
- profiles: id uuid PK references auth.users, created_at timestamptz default now(), subscription_tier text default 'free' check in ('free','plus','pro'), stripe_customer_id text, preferred_styles jsonb default '[]'
- garments: id uuid PK default gen_random_uuid(), user_id uuid references auth.users, image_url text, category text, subtype text, primary_color text, secondary_colors jsonb, pattern text, material_guess text, formality text, season jsonb, fit_silhouette text, neutral boolean, confidence text, tags jsonb (the full normalized tag array used for scoring), created_at timestamptz default now()
- saved_outfits: id uuid PK default gen_random_uuid(), user_id uuid references auth.users, target_style text, garment_ids jsonb, score numeric, why text, created_at timestamptz default now()
- generation_events: id uuid PK default gen_random_uuid(), user_id uuid references auth.users, created_at timestamptz default now()  -- used to enforce free-tier daily generation limit
Enable RLS on all tables with policies: user can select/insert/update/delete only rows where user_id = auth.uid() (and profiles where id = auth.uid()). Create a Storage bucket `garments` with per-user folder policies. Add a trigger to auto-create a profiles row on new auth user.

## TAGGING EDGE FUNCTION
- Input: a garment image (Storage path or base64).
- Calls Anthropic Messages API, model `claude-haiku-4-5`, with the exact vision prompt + schema from docs/02-tagging-schema.md. Force JSON-only output.
- Returns the structured tag object. Map its descriptive attributes to the library's tag vocabulary (see data/style-library-v1.json keys) and store both the raw schema fields and a normalized `tags` array on the garment.
- Keep ANTHROPIC_API_KEY only in the Edge Function secret. Never ship it to the client.

## SCORING MODULE (client-side TypeScript)
- Load bundled style-library-v1.json.
- scoreOutfit(garmentTags[], styleId): sum tag_style_weights for all tags, subtract tag_style_anti_affinity, apply tag_tag_compatibility as a bonus and incompatible_pairs as a hard penalty. Return a number.
- generateOutfits(closet, styleId): build valid combinations (1 top + 1 bottom or 1 dress, + optional outerwear/shoes), score each, return ranked. Bury or hide low scores.
- classifyGarment / classifyOutfit: top style by score (used for "why it works").
- gapAnalysis(closet, styleId): for each candidate missing tag/item-type, simulate adding a garment with that tag, recount high-scoring outfits, rank candidates by net new outfits unlocked.
Write unit tests for the scorer using data/tagged-wardrobe-test.json as fixtures.

## SUBSCRIPTION GATING
- free: unlimited scans, manual outfit building, 1 AI-style generation per day (enforce via generation_events count), no gap analysis.
- plus (~$6.99/mo): unlimited generation, sort/filter by style, all aesthetics.
- pro (~$12.99/mo): everything in plus + gap analysis + wardrobe analytics.
Read the tier from profiles.subscription_tier. Gate features in the UI and enforce server-side where it matters.

## STRIPE
- Edge Functions: create-customer, create-subscription-checkout (returns a PaymentSheet/Checkout for Plus or Pro), and a stripe-webhook that updates profiles.subscription_tier on subscription created/updated/canceled.
- Keep STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET as Edge Function secrets.
- IMPORTANT: wrap all payment calls behind a PaymentProvider interface (methods: getOfferings, purchase(tier), restore, getActiveTier). Implement it with Stripe now, but make swapping to RevenueCat a drop-in. See note below.

## ENV / SECRETS
- Client (.env, EXPO_PUBLIC_*): EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
- Edge Function secrets (never in client): ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
Provide a .env.example and a README section listing exactly what I need to paste where, and the Supabase/Stripe dashboard steps I must do by hand.

## BUILD ORDER (do these in sequence, working app at each step)
1. Scaffold Expo + Expo Router + TS; install deps; set up Supabase client.
2. Output the SQL migrations + RLS + storage bucket + trigger for me to run; confirm schema.
3. Auth (login/signup/session, protected routes).
4. Closet grid + Scan flow + tagging Edge Function (the only LLM call).
5. Bundle style library + scoring module + unit tests; build the Style/generation screen + outfit detail.
6. Gap analysis screen.
7. Stripe payments + paywall + tier gating (behind the PaymentProvider interface).
8. Profile/settings, polish, empty/loading/error states.

## CONSTRAINTS / HONEST NOTES
- API keys NEVER in the client. All Anthropic/Stripe calls go through Edge Functions.
- Generation and gap analysis are LOCAL scoring — do not call an LLM for them.
- Keep all style weights in the bundled JSON, never hardcoded in components, so they can be updated without an app release.
- IAP REALITY: Apple and Google require their own in-app purchase for digital subscriptions inside native apps; Stripe for in-app digital goods will get the app rejected on iOS. Use Stripe for development/testing and any future web version, but plan to ship production native subscriptions through RevenueCat (which wraps StoreKit/Play Billing). The PaymentProvider interface is so this swap is painless.
- Ask me before introducing any dependency or service not listed here.

Start with step 1 and check in after the schema in step 2 so I can run it.

─── END PROMPT ───
```

---

## App structure at a glance (for your own reference)

```
Auth ─ login / signup  (Supabase)
│
└─ Tabs
   ├─ Closet   (home: garment grid, tap to edit tags)
   │     └─ Scan  (camera → Haiku tagging → confirm → save)   [+ button]
   ├─ Style    (pick aesthetic → ranked generated outfits)
   │     └─ Outfit detail  (pieces, why it works, save)
   ├─ Gaps     (what to buy — PRO)
   └─ Profile  (subscription / paywall, settings, sign out)
```

- **Only the Scan screen costs money** (one Haiku call per garment, ~$0.003). Everything else is free local math.
- **Tiers:** Free (unlimited scans, 1 generation/day) · Plus ~$6.99 (unlimited generation) · Pro ~$12.99 (gap analysis + analytics).
- **The style library JSON is bundled**, so updating taste = ship a new JSON, not a code change.

*Companion: `CLAUDE.md` (project context Code reads automatically), `data/style-library-v1.json` (the scoring graph), `docs/02-tagging-schema.md` (the exact tagging prompt the Edge Function uses).*
