# AI Wardrobe Stylist — Business Model

*Stage: exploration. This is a thinking document, not a finished plan. Numbers labeled "illustrative" are assumptions to test, not facts.*

---

## 1. The bet, in one paragraph

Most people who feel bad about getting dressed don't need more clothes — they need to know how to use what they own and what *one or two* things to buy. This app digitizes a person's existing wardrobe, generates outfits matched to a style they want, and tells them the highest-leverage purchase to make. It targets the style-*unconfident* (not fashion enthusiasts) and explicitly helps them own *less*, not more. The wedge is **gap analysis** — automating what people otherwise pay a $60 stylist for.

---

## 2. Market

| Segment (per 2026 market reports) | Size | Growth |
|---|---|---|
| Wardrobe apps (overall) | ~$224M (2024) | — |
| Virtual closet apps | ~$160M (2026) → $390M (2035) | ~10% CAGR |
| Styling apps (broad) | → $3.5B by 2033 | ~12.5% CAGR |
| AI fashion stylist apps | $1.2B (2024) → $7.6B (2033) | ~22.7% CAGR |

**Honest caveat:** these come from market-research-report vendors and are almost always inflated and loosely defined. Treat them as "this is a real and growing category," not as a number to put in a pitch deck without a pinch of salt. The *useful* signal: the AI-stylist sub-segment is the fastest-growing slice, and sustainability/"use what you own" is a named top adoption driver (McKinsey) — which is exactly this app's angle.

---

## 3. Target customer

**Primary:** style-unconfident people who own a modest wardrobe and feel friction getting dressed. They don't follow fashion, they want to look put-together with minimal effort and minimal spending. Emotionally: relief, not aspiration.

**Why this segment and not fashion enthusiasts:** enthusiasts are already served (Indyx, Whering) and they want *more* features, more items, more shopping. The unconfident majority is larger, underserved, and the value prop ("just tell me what to wear and what to buy") is sharper for them.

**Tension to watch:** this segment is also more price-sensitive and harder to convince to pay for a "fashion" app they don't see themselves as the audience for. The messaging can't feel like fashion — it has to feel like *solving a daily annoyance*.

---

## 4. Value proposition

- **For the user:** "Look good without thinking about it, using clothes you already own — and never make a pointless purchase again."
- **Functional:** outfit generation from their real closet + gap analysis.
- **Emotional:** removes daily decision friction and buyer's regret.
- **Vs. alternatives:** vs. doing nothing (the real competitor) — it removes effort. Vs. other apps — it's built for people who *don't* like fashion, and it optimizes for buying *less*.

---

## 5. Moat / differentiation

Be honest: tagging and outfit generation are commoditizing — any team can rent the same vision models. Durable advantage has to come from:

1. **Gap-analysis quality.** "Which single purchase unlocks the most outfits" is a genuine reasoning problem most competitors don't do well. If yours is clearly better, that's the wedge.
2. **The proprietary correction data flywheel.** Every time a user fixes a tag or rejects an outfit, you learn. Over time that data lets you fine-tune and out-tag generic models. This is the only *compounding* moat — worth instrumenting from day one even though it pays off late.
3. **Brand/positioning** around "own less, wear it better." Defensible emotionally, hard for shopping-driven competitors to copy without cannibalizing their affiliate revenue.

What is *not* a moat: the AI itself, the scanning, the UI. Assume those get copied.

---

## 6. Revenue streams

1. **Subscriptions (primary).** Free / Plus ~$6.99/mo / Pro ~$12.99/mo, annual ~40% off. (See `pricing-model.md` for full tier breakdown.)
2. **Affiliate (secondary, later).** Commission on gap-analysis "what to buy" recommendations. Aligns with the core feature — but only introduce once trust is established, and never let it distort recommendations or the "buy less" brand dies.
3. **Human-stylist / wardrobe-audit upsell (later).** $49–60 one-off, mirroring Indyx/Cladwell. High-margin, validates that Pro is likely underpriced vs. value.

Order of introduction matters: subscriptions first, affiliate only after retention is proven, human styling last.

---

## 7. Cost structure

The defining feature of this business: **marginal cost per user is near zero.**

- **AI inference:** scan ~$0.003/item (Haiku), generation a few cents, gap analysis a few cents (Sonnet/Opus). Even a heavy free user costs cents/month. Gross margins on paid users are ~90%+.
- **Real costs are fixed/up-front:** development, app-store presence, infra, and — the big one — **customer acquisition**.

This cost shape is *why* the free tier can be generous: giving away scans and a taste of generation costs almost nothing, and the constraint on the business is conversion and acquisition, not compute.

---

## 8. Unit economics (illustrative — assumptions, not promises)

| Lever | Assumption | Note |
|---|---|---|
| Free → paid conversion | 3% | Conservative consumer-freemium rate |
| Blended paid ARPU | ~$7.50/mo | Mix of Plus/Pro, annual discounts |
| Gross margin | ~90% | AI costs are pennies |
| Avg paid lifetime | ~15 months | Consumer subs churn 5–8%/mo; annual plans extend |
| **LTV per paying user** | **~$100** | $7.50 × 0.90 × 15 |
| **LTV per free signup** | **~$3** | At 3% conversion |

**The make-or-break number is CAC.** This is a low-ARPU consumer subscription, which means **paid advertising usually does not work** — a $3–5 install cost against a ~$3 blended signup value is underwater before you even count non-converters. The model only works if **CAC stays near zero via organic/viral growth.** If you have to buy users, the math collapses. This is the single most important thing to be honest with yourself about.

---

## 9. Go-to-market

Because paid acquisition is structurally hard, GTM *is* the business risk, and it has to be organic:

- **Short-form video (TikTok/Reels/Shorts).** "Here's every outfit in my 12-piece closet" / "the one $30 buy that unlocked 9 outfits" is natively viral content and demonstrates the gap-analysis feature. This is the most plausible channel.
- **Before/after + minimalism/"capsule wardrobe" communities.** The "own less" angle has an existing, engaged audience.
- **Referral / social styling.** Let users share looks; sharing is acquisition.
- **Influencer seeding** with micro-creators in the "I'm not a fashion person" lane, not high-fashion.

If none of these produce sub-$2 effective CAC, the business doesn't scale regardless of how good the product is. Validate one channel early.

---

## 10. Honest risks

- **Acquisition economics (biggest).** Low ARPU + hard paid acquisition = organic-or-bust. Most consumer apps die here.
- **The "do nothing" competitor.** Most people just keep getting dressed badly and don't download anything. Activation friction (scanning a closet) is real work — the aha has to come fast or they quit.
- **Retention after novelty.** People scan their closet once, get some outfits, then stop opening the app. Recurring value (new outfits, seasonal gap analysis, "what to pack") has to be real, or churn kills LTV.
- **Commoditization.** Tagging/generation get copied. Only the data flywheel and brand compound.
- **Tagging quality on messy real photos.** Already partly validated (single-item test passed; dark-photo case correctly flagged low-confidence) — but multi-piece and edge cases still unproven.

---

## 11. What would actually prove this model

In rough order:

1. **Does gap analysis change a real purchase decision?** Test manually on real wardrobes. If no, there's no wedge.
2. **Can you acquire users organically for ~free?** Post the content yourself; see if it travels. This de-risks the scariest assumption cheaply.
3. **Do people come back in week 3–4?** Retention, not signups.
4. **Will the unconfident segment pay at all?** Even a tiny paid cohort converting validates willingness.

If 1 and 2 work, the rest is execution. If either fails, no feature set saves it.

---

*Companion docs: `wardrobe-stylist-product-plan.md` (product), `garment-tagging-schema.md` (scan feature), `pricing-model.md` (tiers). Revisit cost/LTV math if API prices or conversion assumptions change.*
