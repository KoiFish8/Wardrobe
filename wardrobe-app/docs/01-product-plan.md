# AI Wardrobe Stylist — Product Plan (Exploration Draft)

*Working name: TBD. Stage: idea exploration. Goal of this doc: decide if it's worth building, and if so, what to build first.*

---

## 1. The one-sentence version

Scan your closet, tell the app the look you're going for, and it builds outfits from clothes you already own — then tells you the one or two pieces that would unlock the most new outfits.

## 1a. Core loop (LOCKED)

The app does exactly four things, in order. Everything else is optional.

1. **Scan** — the user photographs **individual pieces**, one at a time. Each becomes a structured tag set (see `garment-tagging-schema.md`). This is the only step that uses a vision model.
2. **Style library** — a curated set of aesthetics (e.g. clean minimal, vintage street, old money), each defined by tag-level pairing rules (palettes, silhouettes, formality).
3. **Generate** — outfits are built by matching the **text tags** of the user's pieces against the chosen aesthetic's rules. No image analysis here — pure tag logic. Cheap, fast, low failure surface.
4. **Gap analysis** — recommends the extra piece(s) that unlock the most new outfits. The differentiator and eventual revenue engine.

**Explicitly NOT core (optional add-ons, build only if wanted):**

- **Multi-piece outfit tagging** (parsing a full worn/laid-out outfit into separate items). Nice-to-have convenience; not on the critical path. If built later, use a detection/segmentation pipeline (Grounding DINO / SAM / YOLO) to crop items, then tag each crop — do *not* ask the LLM to separate a collage.
- **Style-from-a-picture** (user scans an inspiration photo to define a target look). A possible entry point into step 2, offered "if the person wants to," not required.

**Key implication:** after the single-item scan, the entire loop is text/tag-based. This collapses cost and complexity. It also means the **style library is now the most important asset** — outfit quality is only as good as how well each aesthetic encodes its pairing rules. Treat building it as first-class work, not an afterthought.

## 2. Why this is interesting (and where the real value sits)

There are a lot of "digital closet" apps. Most of them are good at *cataloguing* clothes and bad at the thing people actually want: **"what do I wear, and what should I buy next?"**

The valuable, under-served core is two features:

1. **Outfit generation from your real wardrobe**, matched to a target aesthetic.
2. **Wardrobe gap analysis** — "buy these black trousers and you unlock 9 new outfits." This is both the most useful feature *and* the natural revenue engine (affiliate / shopping).

Everything else (scanning, tagging, mood boards) is table stakes that makes those two features possible. Don't confuse the table stakes for the product.

## 3. Honest read on the hard parts

These are the things that look easy in a pitch and are actually where projects die. Worth knowing before you commit.

**Wardrobe scanning is more than a photo.** To generate outfits you need each garment as *structured data*: category (top/bottom/outerwear/shoes/accessory), color(s), pattern, fabric/texture, formality, season, fit/silhouette. That means background removal + segmentation + multi-attribute classification per item. Vision models can do this, but quality here makes or breaks the whole app. Bad tags → nonsense outfits → churn.

**Pinterest is a legal/technical dead end as a data source.** Pinterest's API is heavily restricted and scraping it violates their ToS — you can't reliably build a product on it. Realistic alternatives: build your own curated style-reference library, license a fashion image dataset, or let users import their *own* inspiration images (which is legally clean and arguably better data). Design around *not* having Pinterest from day one.

**"What looks good together" is subjective and cultural.** Color theory and basic rules get you part way, but taste is the moat and the risk. Early on, lean on rules + a target-aesthetic reference set rather than pretending you have a magic taste model.

**The shopping-recommendation space is crowded.** Whering, Acloset, Indyx, Pureple, Save Your Wardrobe, Stitch Fix, plus big retailers' own tools. Your wedge has to be sharper than "we also recommend clothes." The gap-analysis framing ("maximize outfits per purchase") is a real differentiator — most competitors just push products.

> Quick caveat: competitor details above are from general knowledge, not fresh research. Before you go deep, verify what each one actually does today — the space moves fast.

## 4. MVP — the smallest thing worth testing

Resist building all of it. The MVP exists to answer one question: **do people get real value from outfit generation + gap analysis on their own clothes?**

**In scope for v1:**

- Add a garment by photo. Auto-remove background, auto-tag attributes, let the user correct tags (correction data is gold — it trains the system and signals quality).
- Pick a target vibe from a small set of curated aesthetics (e.g. "clean minimal," "streetwear," "old money," "cozy casual"). Start with ~6–8, not infinite.
- Generate a handful of outfits from the user's actual wardrobe for that vibe, with a short "why this works" line.
- Gap analysis: surface the 1–3 highest-leverage items to buy, ranked by *new outfits unlocked*, not by what a retailer wants to push.

**Explicitly NOT in v1:**

- Pinterest integration (see above).
- Full e-commerce / checkout. Link out for now; add affiliate/shopping later.
- Social feed, sharing, community. Tempting, distracting, build it only if retention proves out.
- Body-type / virtual try-on. Cool, hard, later.

## 5. How the AI pipeline works (conceptually)

```
Photo of garment
   → background removal + segmentation
   → multi-attribute tagging (category, color, pattern, fabric, formality, season, fit)
   → stored as structured item in the user's wardrobe DB

Target aesthetic (user-selected vibe)
   → reference set of looks defining that aesthetic's "rules"
   (silhouettes, palettes, formality, pairing patterns)

Outfit generation
   = combinatorial matching of wardrobe items against aesthetic rules,
     scored for color/formality/silhouette compatibility,
     filtered to coherent full outfits

Gap analysis
   = for candidate "missing" item types, simulate adding them and
     count how many *new* valid outfits each would unlock → rank
```

The clever part is the scoring and the gap simulation. The tagging is the part that has to be *reliable* before any of the above is worth anything.

## 6. Build order (if you decide to go)

1. **Fake it first.** Before writing a line of vision code, hand-tag 20–30 of your own clothes in a spreadsheet and manually write the outfit + gap logic. If *you* don't find the output genuinely useful on your own closet, no amount of AI fixes that. This is a one-day gut check.
2. Build the tagging pipeline and prove it's reliable on real, messy phone photos (not just clean catalog shots).
3. Build outfit generation + the "why it works" explanation.
4. Build gap analysis — your differentiator.
5. Only then: shopping links / affiliate, more aesthetics, social, try-on.

## 7. Business model (early thoughts, not decisions)

- **Affiliate / shopping** on the gap-analysis recommendations is the obvious revenue path and aligns with the core feature.
- **Subscription** for unlimited wardrobe size / advanced styling could work but only once retention is proven — don't gate the magic moment.
- Watch the incentive conflict: the moment recommendations feel like ads, trust dies. The honest "buy *less*, wear what you own more" angle is both ethically cleaner and a marketing story.

## 8. The open questions worth answering before building

- Who is this *for* first? Fashion-confident people optimizing, or overwhelmed people who don't know what to wear? Different product, different UX.
- Where does inspiration come from if not Pinterest — curated by you, or imported by the user?
- What's the wedge that makes someone switch from doing nothing (which is what most people do)?
- Is the gap-analysis output actually good enough to change a purchase decision? That's the whole ballgame — test it manually first.

---

*Next natural steps if you want them: real competitor research (verify the landscape), a clickable prototype of the scan → vibe → outfits → gap flow, or a technical feasibility deep-dive on the tagging pipeline.*
