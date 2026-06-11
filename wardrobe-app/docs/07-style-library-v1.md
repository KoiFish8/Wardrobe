# Style Library v1 — Built, Self-Corrected, Validated

*Supersedes `starter-style-taxonomy.md` (v0.1). The machine-usable version is `style-library-v1.json`. This was generated autonomously: researched against real 2026 menswear sources, rebuilt, red-teamed, then validated with code against the three reference outfits — which surfaced a real flaw that's now fixed.*

**Scope:** young, contemporary, menswear-leaning. 8 styles, 30 tags, weighted edges + compatibility + negative edges.

---

## 1. What changed from v0.1 (and why)

Research corrected several weights I'd guessed wrong:

| Change | v0.1 → v1 | Why (source) |
|---|---|---|
| `leather` → streetwear | W → **S** | The oversized leather jacket is a *defining* 2026 streetwear piece, not a fringe one |
| `earth-tones` → streetwear | W → **S** | Neutral earth tones now dominate streetwear over bright sportswear color |
| `washed-faded` → streetwear & grunge | W → **S** | Washed textures + faded graphics are "the new standard"; grunge is built on weathered/faded |
| `minimal-branding` → streetwear | none → **W** | Streetwear has matured toward minimal design + quality basics |
| `heritage-detail` → workwear | W → **S** | Heritage workwear detailing is core to the aesthetic |
| `raw-denim` → old money | W → **none** | Old money is tailored natural fibers; raw denim is a workwear signal |
| Added tags | — | `performance-sneaker`, `boots`, `loafers`, `skate-shoe` (footwear is high style-signal); dropped `cropped` (low signal for menswear) |

Sources: 2026 streetwear guides, old-money/quiet-luxury guides, grunge and workwear menswear guides (see chat for links).

---

## 2. The corrected tag → style matrix

Legend: **S**=strong (2) · **W**=weak (1) · **–**=none (0).
Min=minimal · Str=street · OldM=oldmoney · SmtC=smartcasual · Athl=athleisure · Grng=grunge · Y2K=y2kskate · Wkwr=workwear.

| Tag | Min | Str | OldM | SmtC | Athl | Grng | Y2K | Wkwr |
|---|---|---|---|---|---|---|---|---|
| oversized | W | **S** | – | – | W | W | **S** | W |
| slim-fit | W | W | **S** | **S** | W | W | – | – |
| baggy | – | **S** | – | – | W | W | **S** | W |
| tailored | W | – | **S** | **S** | – | – | – | – |
| wide-leg | W | **S** | – | – | – | W | **S** | W |
| neutral-tones | **S** | W | **S** | **S** | W | W | W | W |
| earth-tones | W | **S** | W | W | – | W | – | **S** |
| all-black | W | W | – | W | W | **S** | – | – |
| washed-faded | – | **S** | – | – | – | **S** | **S** | W |
| bright-bold | – | W | – | – | W | – | W | – |
| monochrome | **S** | W | W | W | – | W | – | – |
| raw-denim | W | W | – | W | – | W | W | **S** |
| leather | – | **S** | W | W | – | **S** | W | W |
| chunky-knit | **S** | W | **S** | W | – | W | – | W |
| technical-synthetic | – | W | – | – | **S** | – | W | – |
| suede | W | – | **S** | W | – | – | – | W |
| solid | **S** | W | **S** | **S** | W | W | W | W |
| graphic-print | – | **S** | – | – | W | W | **S** | – |
| plaid | – | – | W | W | – | **S** | W | W |
| chunky-sole-sneaker | W | **S** | – | – | W | – | W | – |
| performance-sneaker | – | W | – | – | **S** | – | – | – |
| boots | – | W | W | W | – | **S** | – | **S** |
| loafers | W | – | **S** | **S** | – | – | – | – |
| skate-shoe | – | W | – | – | – | W | **S** | – |
| minimal-branding | **S** | W | **S** | **S** | – | W | – | W |
| big-logo | – | **S** | – | – | W | – | W | – |
| distressed | – | W | – | – | – | **S** | **S** | W |
| utility-pockets | – | W | – | – | W | – | W | **S** |
| athletic-stripe | – | W | – | – | **S** | – | W | – |
| heritage-detail | W | – | **S** | W | – | – | – | **S** |

---

## 3. Three layers beyond the matrix

1. **Compatibility edges** (`tag_tag_compatibility`) — how well two tags pair *within* one outfit. E.g. `oversized`↔`wide-leg`=S (the dominant 2026 silhouette), `oversized`↔`slim-fit`=S ("considered volume"), `leather`↔`chunky-knit`=S (jacket over knit). Prevents the generator from stacking items that each fit the style but clash together.
2. **Incompatible pairs** (`incompatible_pairs`) — hard clashes to suppress (e.g. `tailored`+`athletic-stripe`, two `graphic-print` pieces).
3. **Negative edges** (`tag_style_anti_affinity`) — *added after validation* (see §4). A tag that actively pushes an outfit *away* from a style, e.g. `skate-shoe` → oldmoney −2.

---

## 4. Self-validation — and the flaw it caught

I scored the three reference outfits (worn looks you sent) against the graph in code.

**First pass (matrix only):**

| Outfit | Expected | Graph top-3 |
|---|---|---|
| 1 — leather jacket look | vintage street / grunge | street 13, grunge 11, y2k 9 ✅ |
| 2 — blue shirt + jorts | skate / y2k | y2k 8, street 7, grunge 6 ✅ |
| 3 — grey knit + jeans | clean minimal | minimal 10, **oldmoney 10 (tie)** ⚠️ |

The tie on #3 was a genuine false positive: grey knit + neutrals + no-logos scored old-money as high as minimal, because nothing penalized old money for the wide-leg jeans and casual sneakers it would never wear. Strong/weak/none can't express "this disqualifies the style."

**Fix:** added the negative-edge layer. **Re-validated:**

| Outfit | Graph top-3 (after fix) |
|---|---|
| 1 | street 13, grunge 11, y2k 9 ✅ |
| 2 | y2k 8, street 7, grunge 6 ✅ |
| 3 | **minimal 8**, street 7, grunge 6 ✅ (old money pushed out of top 3) |

The fix corrected #3 without breaking #1 or #2. (Also retagged #3 honestly in the process: Adidas Samba = `skate-shoe`/terrace sneaker, not `suede` loafer — a tagging error I'd made.)

---

## 5. Honest limitations still standing

- **"Streetwear" is really several substyles.** Research shows it splitting (minimal street vs loud-logo street). One node forces them together — note the internal tension (`big-logo`=S *and* `minimal-branding`=W on the same style). May need to split later.
- **Weak discriminators exist by design.** `solid` is S/W almost everywhere; it should carry little ranking weight. Don't let low-signal tags dominate.
- **Weights are one model's taste + my corrections, not ground truth.** The reference-outfit calibration (Fork A) and real user accept/reject data (phase 4) are what make this genuinely good over time.
- **Menswear-only.** Womenswear/unisex would need its own tag additions and re-weighting.

---

## 6. Status

`style-library-v1.json` is ready to drop into a scoring prototype: load it, tag a user's garments, sum weights (minus anti-affinity) per style, rank. Gap analysis runs on the same scorer — "which added tag/garment most raises the count of high-scoring outfits for the target style."

*Companion docs: `style-library-data-model.md` (the graph model), `garment-tagging-schema.md` (tags), `wardrobe-stylist-product-plan.md` (§1a core loop).*
