# Style Library — Graph Data Model

*The style library is the app's most important asset (see product plan §1a). This doc captures the weighted-graph design and the open decisions to resolve before building.*

---

## 1. The idea

Model style as a **weighted graph**, not as folders. Styles aren't crisp buckets and tags don't belong to a single style — a tag like "oversized" leans strongly into streetwear, weakly into minimal, not at all into old-money. Weighted edges capture that; folders can't.

## 2. Node and edge types

### Nodes

- **Style** — an aesthetic anchor (e.g. clean minimal, vintage street, old money).
  - Properties: `formality_level` (required), `price_level` (optional), `popularity` (optional).
- **Tag** — a descriptive attribute (e.g. oversized, cream, denim, chunky-sole, cropped). Floats freely; not owned by any style.
- **Outfit** — see Open Fork A below; may be computed at runtime rather than stored.

### Edges (all weighted: strong / weak / none — see Open Fork C on whether to use continuous weights)

- **Tag → Style** — how well a tag fits a style.
- **Tag ↔ Tag** — *must be split into two edge types* (see Open Fork B):
  - **compatibility** — these tags pair well in an outfit (oversized top ↔ baggy bottom).
  - **similarity** — these tags are alike / substitutable (cream ↔ beige).
- **Outfit → Style / Outfit → Tag** — used for ranking (strongest-connected outfits surface on top, weak ones buried or hidden).

## 3. How the core loop uses the graph

1. **Scan** places each garment into tag-space (the garment = its set of tags).
2. **Generate** for a target style = find combinations of the user's garments whose tags (a) connect strongly to that style and (b) are *compatible* with each other. Score each candidate outfit; rank.
3. **Rank/surface** — strongest-connected outfits on top; weak ones at the bottom or hidden.
4. **Gap analysis** = which new tag/garment, if added to the closet, would create the most new high-scoring outfits for the target style. (Falls out of the same scoring mechanism — a strong sign the model is right.)

Note: most of this is **deterministic graph scoring**, not LLM calls. The LLM tags garments (scan) and optionally writes the "why this works" blurb. The matching itself is cheap math over the graph.

---

## 4. The weights are the product

The graph *structure* is trivial to build. Assigning the edge weights across hundreds of tags × styles is the hard, valuable work — it's the encoded taste, and it's the moat. Plan for how they get set:

- **LLM-proposed, human-corrected (recommended start).** Have a model propose weights for every tag→style and tag↔tag edge, then review/fix. Fast, and the corrections are your first proprietary data.
- **Hand-curated.** Highest quality, slowest. Reserve for the most important edges.
- **Learned from user behavior (later).** Once users accept/reject outfits, tune weights from real signal. This is the long-term flywheel.

A beautiful graph with mediocre weights produces mediocre outfits. Budget real effort here.

---

## 5. Open forks to resolve

### Fork A — Are outfits stored nodes, or computed at runtime? — RESOLVED: HYBRID (computed engine + reference set)

**Decision:** computed is THE engine; a small curated reference set is a supporting asset with a strict hierarchy.

- **Computed engine (primary, non-negotiable):** the library holds only styles + tags + weights. Every outfit the user sees is a combination of *their* garments, scored against the graph at runtime. Powers generation + gap analysis. This is the only approach that respects "wear what you own."
- **Curated reference outfits (supporting, phased in):** a small set of known-good outfits per style. Two jobs only:
  1. **Weight calibration / ground truth** — if the graph scores a known-great outfit as weak, the weights are wrong → fix them. This directly solves computed-only's single weakness (it otherwise trusts the weights blindly with nothing to check them against).
  2. **Onboarding inspiration** — so a brand-new user with ~5 items isn't staring at a thin result.
- **Hard rule:** reference outfits must NEVER generate the user's actual outfits. They are a calibration ruler and an inspiration shelf, not the generator.

*Rationale:* stored-only is dead on arrival (ignores the user's closet). Computed-only is the right engine but blindly trusts the hardest-to-get-right part (the weights). Hybrid keeps computed as the engine and uses the reference set to fix exactly that weakness — best of both, no compromise to the core loop.

### Fork B — Tag↔tag must be two relationships, not one
Compatibility (pairs well) vs. similarity (is alike) are different and used differently. Collapsing them makes the system treat two similar items (two cream tops) as a good outfit. *Decision: confirm we model these as separate edge types.* (Strong recommendation: yes.)

### Fork C — Three buckets vs. continuous weights
strong/weak/none is a clean start and easy to reason about. Continuous weights (0.0–1.0) give finer ranking. *Recommendation: start with 3 buckets, move to continuous only if ranking feels too coarse.*

### Fork D — Where does formality live?
Style has a formality level (per the design). But garments also have formality (already in the tagging schema), and good outfits need formality *consistency within the outfit* (no blazer + gym shorts). *Recommendation: keep formality at both levels — style sets the target, garment-level formality enforces within-outfit coherence.*

---

## 6. Implementation note (not an MVP blocker)

This does **not** require a fancy graph database to start. A weighted adjacency table (tag→style weights, tag↔tag weights) stored relationally or as JSON is enough for MVP scoring. Reach for a real graph DB (e.g. Neo4j) only if traversal complexity actually demands it. Don't let "we need a graph database" become a reason to delay.

**Suggested phasing:**
1. Style ↔ tag weights only → enables generation + ranking. (Smallest thing that works.)
2. Add tag ↔ tag *compatibility* edges → better outfit coherence.
3. Add *similarity* edges → powers substitution + sharper gap analysis.
4. Add behavior-learned weight tuning → the long-term moat.

---

*Companion docs: `wardrobe-stylist-product-plan.md` (§1a core loop), `garment-tagging-schema.md` (the tags that populate this graph).*
