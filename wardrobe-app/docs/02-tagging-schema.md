# Garment Tagging Schema + Prompt (v0.1)

This is the spec for the scan feature. The app sends a photo + the prompt below to a vision model and gets back structured JSON. No custom AI needed to start — this is rented intelligence with a tight contract.

---

## The schema (what every garment becomes)

Each scanned item is stored as one JSON object. Keep the fields constrained — open-ended tags create chaos at outfit-generation time.

```json
{
  "item_id": "auto-generated",
  "category": "top | bottom | dress | outerwear | shoes | accessory",
  "subtype": "t-shirt, button-up, sweater, jeans, trousers, sneakers, etc.",
  "primary_color": "single dominant color (named)",
  "secondary_colors": ["any other notable colors"],
  "pattern": "solid | striped | checked | floral | graphic | other",
  "material_guess": "cotton | denim | wool | leather | synthetic | unknown",
  "formality": "casual | smart-casual | formal",
  "season": ["spring", "summer", "fall", "winter"],
  "fit_silhouette": "slim | regular | relaxed | oversized | unknown",
  "neutral": true,
  "confidence": "high | medium | low"
}
```

Why these fields and not more: every field has to *earn its place* by being used in outfit generation or gap analysis. `category`, `color`, `formality`, and `season` do the heavy lifting for pairing. `neutral` (true for black/white/grey/navy/beige) is a cheap, powerful signal — neutrals combine with everything, so they matter a lot for a small wardrobe. `confidence` lets the app flag low-confidence tags for the user to confirm — and those confirmations are your future training data.

---

## The prompt (what the app sends the model)

> You are a fashion cataloguing assistant. Look at the clothing item in this image and return ONLY a JSON object matching this exact schema. If the image shows a person wearing multiple garments, tag only the single most prominent item unless told otherwise. Guess material and fit from visual cues; use "unknown" and set confidence to "low" rather than inventing detail. Never add fields outside the schema.
>
> [schema pasted here]

Constraining it to "ONLY JSON" and "never add fields" is what makes the output usable by code instead of being a paragraph of prose.

---

## What "confirming it works" actually means

You're testing three things, in order of how likely they are to break:

1. **Messy-photo robustness.** Catalog shots are easy. The real test is a wrinkled shirt on a bed, a dark hoodie in bad lighting, a flat-lay on a busy carpet. If it holds up there, it holds up.
2. **Attribute accuracy, not just category.** "It's a top" is trivial. "Slim navy smart-casual long-sleeve" is the useful part. Watch material and formality — those are the shakiest.
3. **Consistency.** Same item, two photos → same tags? Inconsistency quietly poisons outfit generation.

---

## Test plan

- **Phase 1 (single item):** 5–10 individual garments, deliberately including a few hard ones (dark colors, patterns, weird lighting). Confirm tags are right and useful.
- **Phase 2 (multi-piece):** a few full-outfit photos. Confirm the model can separate and tag each piece. This is harder — expect it to be the first place quality drops.
- **Phase 3 (sort by style):** group tagged items by aesthetic/vibe.
- **Phase 4:** outfit generation + gap analysis on the tagged set.

Each phase only proceeds if the previous one's output is good enough to build on.
