# AI Wardrobe Stylist — Pricing Model

*Stage: exploration. Based on 2026 competitor research + the app's actual AI cost structure. Numbers are starting points to test, not final.*

---

## 1. What competitors charge (2026)

| App | Free tier | Paid tier | Notable |
|---|---|---|---|
| Pureple | Yes, ad-supported | — | Free but buggy, ad-heavy |
| Stylebook | No | $4.99 one-time | iOS only, no subscription |
| Acloset | Yes | ~$4.99/mo | Most features for the price |
| Whering | Generous free | ~$6.99/mo | Resale + cost-per-wear focus |
| Cladwell | 1 AI outfit/day, 5 AI chats/mo | $7.99/mo (+$49/mo w/ human stylist) | Gives a taste of AI free |
| Indyx | Very generous (unlimited items + outfits) | $12.99/mo or $74.99/yr (styling from $60) | Analytics + human styling upsell |

**Market read:**

- A free tier is table stakes — every serious app has one.
- Core premium clusters at **$5–8/mo**.
- Analytics/power tier pushes to **~$13/mo**.
- Human styling is a separate upsell at **$49–60+**.
- Annual plans (~40% off monthly) are where the real revenue is — monthly churns fast.

---

## 2. The cost structure that should drive pricing

Unlike a human-stylist business, this app's marginal cost per user is tiny — it's just AI API calls:

- **Scan/tag one garment (Haiku 4.5):** ~$0.003 (a third of a cent)
- **Outfit generation (Sonnet):** low single-digit cents
- **Gap analysis (Sonnet/Opus, higher effort):** a few cents — the most expensive call, run least often

**Implication:** scanning is essentially free to provide. So pricing should *not* be designed to ration scans. It should ration the reasoning-heavy features (generation volume, gap analysis), which are both more costly and more valuable.

---

## 3. Core strategic principle

> **Don't ration the thing that creates lock-in. Ration the thing that creates ongoing value.**

- The **digitized closet** is the retention hook. Once a user tags 40 items, that sunk effort keeps them from switching. Limiting free scans saves no money and churns users before they've built enough closet to feel value.
- The **AI brain** (generation + gap analysis) is the thing worth paying for. That's where the wall goes.
- But free users still need to *taste* the magic, or they won't convert. Cladwell gives 1 free AI outfit/day for exactly this reason. Gate generation to a limited free taste, not to zero.

---

## 4. Recommended tier structure (starting point)

### Free — "Build your closet"
- Unlimited scans + tagging
- Manual outfit building
- Save & track outfits
- **A taste of AI:** ~1 generated outfit/day (or ~5/week)
- *Goal: get the closet built, prove the magic exists, create lock-in.*

### Plus — ~$6.99/mo (or ~$45/yr)
- Unlimited AI outfit generation
- Sort/filter by style aesthetic
- All aesthetic templates
- *The bread-and-butter tier. Priced at the Whering/Cladwell line.*

### Pro — ~$12.99/mo (or ~$79/yr)
- Everything in Plus
- **Gap analysis** — "what to buy to unlock the most outfits" (the differentiator)
- Wardrobe analytics dashboard
- Packing / travel mode
- *Anchored at the Indyx price point; gap analysis justifies the top tier.*

**Annual discount:** ~40% off monthly across paid tiers. Push annual hard.

---

## 5. Later-stage monetization (not v1)

- **Human-stylist / wardrobe-audit upsell** ($49–60 range, like Indyx/Cladwell). If the AI gap analysis is genuinely good, the marketing line writes itself: *"What people pay a $60 stylist for — automatically, for $13/mo."* That also signals Pro may be *underpriced* relative to value.
- **Affiliate revenue** on gap-analysis "what to buy" recommendations — aligns with the core feature, but only after trust is established. The moment recs feel like ads, trust dies.

---

## 6. Open questions to settle with real users (not by guessing)

- Exact free→Plus wall: 1 generation/day vs 5/week vs 3 total? Start generous, tighten only if conversion holds.
- Does Plus need to exist, or should it be a single paid tier? Two paid tiers only make sense if enough users want gap analysis specifically.
- Price sensitivity of the target user (style-unconfident, wants a small wardrobe) — they may be more price-sensitive than Indyx's fashion-enthusiast base, which could argue for a lower Pro anchor (~$9.99).

---

*Cross-reference: model routing + per-call cost assumptions live in the build notes (Haiku for scan, Sonnet for generation, Sonnet/Opus for gap analysis). Revisit these numbers if API prices change.*
