# Starter Style Taxonomy + Weight Matrix (v0.1)

*This is the seed of the style library — the app's key asset. The weight matrix below is the **LLM-proposed** first draft (I generated it). Your job is the **human-correct** pass: change any cell that's wrong. That correction data is your first proprietary signal.*

**Scope decision:** starting narrow — young, contemporary, **menswear-leaning** style. Tighter library = better outfits + sharper content. Structure generalizes to other demographics later.

---

## 1. The 8 starter styles

| ID | Style | Formality | One-line identity |
|---|---|---|---|
| `minimal` | Clean Minimal | smart-casual | Neutral palette, simple lines, quality basics, minimal branding |
| `street` | Streetwear | casual | Oversized, graphics, statement sneakers, bold |
| `oldmoney` | Old Money / Preppy | smart-casual → formal | Heritage, tailored, muted, knits/polos/loafers |
| `smartcasual` | Smart Casual | smart-casual | Versatile put-together-but-relaxed; chinos, button-ups |
| `athleisure` | Athleisure | casual | Technical fabrics, joggers, performance sneakers, comfort |
| `grunge` | Grunge / Edgy | casual | Dark, distressed, layered, leather, boots |
| `y2kskate` | Y2K / Skate | casual | Baggy, faded, playful, 2000s/skate references |
| `workwear` | Workwear / Rugged | casual → smart-casual | Sturdy fabrics, earth tones, boots, utility detailing |

Each style also carries optional `price_level` and `popularity` (left blank for now — fill from real data later).

---

## 2. Initial tag vocabulary

Tags are the descriptive attributes that carry **style signal** — drawn from the garment schema plus style descriptors. (Note: `category` like top/bottom is NOT a style tag — every style has tops. Only attributes that *discriminate* style belong here.) Grouped by facet:

- **Fit / silhouette:** `oversized`, `slim-fit`, `baggy`, `tailored`, `wide-leg`, `cropped`
- **Palette:** `neutral-tones`, `earth-tones`, `all-black`, `washed-faded`, `bright-bold`, `monochrome`
- **Material:** `raw-denim`, `leather`, `chunky-knit`, `technical-synthetic`, `suede`
- **Pattern:** `solid`, `graphic-print`, `plaid`
- **Detail / vibe:** `minimal-branding`, `big-logo`, `distressed`, `chunky-sole-sneaker`, `utility-pockets`, `athletic-stripe`, `heritage-detail`

Expand this list over time — but resist letting it sprawl. Every tag you add is more edges to weight.

---

## 3. Tag → Style weight matrix (LLM-proposed draft)

Legend: **S** = strong fit · **W** = weak fit · **–** = no connection.
Columns: Min=minimal, Str=street, OldM=oldmoney, SmtC=smartcasual, Athl=athleisure, Grng=grunge, Y2K=y2kskate, Wkwr=workwear.

| Tag | Min | Str | OldM | SmtC | Athl | Grng | Y2K | Wkwr |
|---|---|---|---|---|---|---|---|---|
| oversized | W | **S** | – | – | W | W | **S** | W |
| slim-fit | W | – | **S** | **S** | – | W | – | – |
| baggy | – | **S** | – | – | W | W | **S** | W |
| tailored | W | – | **S** | **S** | – | – | – | – |
| wide-leg | W | **S** | – | – | – | – | **S** | W |
| neutral-tones | **S** | W | **S** | **S** | W | W | W | W |
| earth-tones | W | W | W | W | – | W | – | **S** |
| all-black | W | W | – | W | W | **S** | – | – |
| washed-faded | – | W | – | – | – | W | **S** | W |
| bright-bold | – | W | – | – | W | – | W | – |
| monochrome | **S** | W | – | W | – | W | – | – |
| raw-denim | W | W | W | W | – | W | W | **S** |
| leather | – | W | W | – | – | **S** | W | W |
| chunky-knit | **S** | – | **S** | W | – | W | – | W |
| technical-synthetic | – | W | – | – | **S** | – | – | – |
| suede | W | – | **S** | W | – | – | – | W |
| solid | **S** | W | **S** | **S** | W | W | W | W |
| graphic-print | – | **S** | – | – | W | W | **S** | – |
| plaid | – | – | W | W | – | **S** | – | W |
| minimal-branding | **S** | – | **S** | **S** | – | W | – | W |
| big-logo | – | **S** | – | – | W | – | W | – |
| distressed | – | W | – | – | – | **S** | **S** | W |
| chunky-sole-sneaker | W | **S** | – | – | W | – | W | – |
| utility-pockets | – | W | – | – | W | – | – | **S** |
| athletic-stripe | – | W | – | – | **S** | – | W | – |
| heritage-detail | W | – | **S** | W | – | – | – | W |

**How to read it:** a `street` outfit should be heavy on the **S** cells in the Str column (oversized, baggy, graphic-print, big-logo, chunky-sole). An item tagged `tailored` + `suede` + `heritage-detail` lights up `oldmoney` and basically nothing else.

**Note on weak-discriminators:** `solid` is **S/W almost everywhere** — it barely separates styles, so it should carry little ranking weight. That's expected and fine; not every tag is decisive. Watch for these and don't let them dominate scoring.

---

## 4. Your correction pass (the point of this doc)

Go cell by cell where you have an opinion and flag changes. Examples of the kind of call only you can make:
- Is `cropped` worth keeping as a tag for menswear, or drop it? (I left it out of the matrix as low-signal.)
- Should `leather` connect **strong** to `street` (leather bomber is very street right now), not weak?
- Does `washed-faded` deserve a **strong** link to `grunge`, not weak?

There are no objectively correct answers — this is taste. Your corrections become the training set that makes your graph better than a generic one.

---

## 5. The full weight-setting workflow

1. **Propose (done here):** an LLM fills the entire tag→style matrix as a first draft. Cheap, fast, covers everything.
2. **Correct (you):** review and fix cells. This is the high-value human step and the source of proprietary data.
3. **Validate against reference outfits:** take the curated known-good outfits (Fork A hybrid set) and score them with the graph. If a great `street` outfit scores weak, a weight is wrong → fix. This catches errors the cell-by-cell pass misses.
4. **Add tag↔tag compatibility (phase 2):** e.g. `oversized` ↔ `baggy` = strong (balanced proportions), `oversized` ↔ `slim-fit` = strong (contrast), `tailored` ↔ `athletic-stripe` = none. This layer is what stops the generator from pairing items that individually fit the style but clash with each other.
5. **Learn from behavior (phase 4):** once users accept/reject outfits, nudge weights from real signal. The long-term moat.

---

## 6. Storage shape (for whoever builds it)

No graph DB needed at MVP. A simple JSON/table is enough:

```json
{
  "styles": {
    "street": { "formality": "casual", "price_level": null, "popularity": null }
  },
  "tag_style_weights": {
    "oversized": { "street": "S", "y2kskate": "S", "minimal": "W", "grunge": "W", "athleisure": "W", "workwear": "W" },
    "graphic-print": { "street": "S", "y2kskate": "S", "athleisure": "W", "grunge": "W" }
  },
  "tag_tag_compatibility": {
    "oversized": { "baggy": "S", "slim-fit": "S" }
  }
}
```

Weights can map to numbers for scoring (S=2, W=1, none=0) and move to continuous later if ranking feels coarse.

---

*Companion docs: `style-library-data-model.md` (the graph model + resolved Fork A), `garment-tagging-schema.md` (where the tags come from), `wardrobe-stylist-product-plan.md` (§1a core loop).*
