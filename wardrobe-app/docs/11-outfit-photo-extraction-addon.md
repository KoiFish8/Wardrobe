# Add-on: Extract Individual Items from a Full-Outfit Photo (v0.1)

This is the "multi-piece outfit tagging" add-on referenced in `CLAUDE.md` as
out-of-core/optional. It is **not part of the core loop** — the core scan flow
(one garment at a time → Haiku tags) stays as-is. This add-on gives users an
alternative entry point: upload/snap a photo of a full outfit being worn, and
the app splits it into individual garment thumbnails (background removed) that
get added to the closet the same way a normal scan would.

Build this AFTER the core loop (steps 1–6 in `docs/09-claude-code-build-prompt.md`)
is working. Treat it as its own phase, gated behind a flag/screen so it never
blocks the core build.

---

## Pipeline

1. **Detect items + bounding boxes.** Send the full-outfit photo to a vision
   model with a prompt asking for every clothing item/accessory, plus a
   normalized bounding box (`box_2d: [ymin, xmin, ymax, xmax]`, 0-1000 scale)
   and the same tag schema as `docs/02-tagging-schema.md` (category, subtype,
   color, pattern, etc.) so each extracted piece is tagged in the same step.

2. **Crop.** For each detected item, crop the original image to its bounding
   box (+ small padding, ~10px) using basic image manipulation
   (`expo-image-manipulator` client-side, or `sharp`/Pillow server-side).

3. **Remove background.** Run each crop through a background-removal step to
   produce a transparent-PNG cutout of just the garment.

4. **(Pro only) AI reconstruction/cleanup.** Optionally pass the cutout
   through an image-generation/editing model to (a) reconstruct parts of the
   garment hidden behind another item (e.g. a shirt mostly covered by a
   jacket) and/or (b) clean up wrinkles/lighting into a catalog-style shot.
   See "Tier gating" below.

5. **Save.** Store each thumbnail as a normal garment image (Supabase
   Storage), pre-filled with the tags from step 1, routed through the same
   "confirm or correct" UI as a regular scan.

---

## Model choice for step 1: Gemini 2.5 Flash (new dependency — flag this)

This introduces **Google Gemini** as a second model provider, alongside the
Anthropic-only stack in `docs/09-claude-code-build-prompt.md`. Reason: Gemini
2.5 Flash has first-class, accurate bounding-box object detection; Claude's
vision is good at description but less reliable for precise multi-item boxes.

- Model: `gemini-2.5-flash`
- Cost: tested at **~990 tokens per outfit photo ≈ $0.0006/photo** (negligible)
- Tested prompt + output format: see `scripts/extract_clothing_items.py` in
  this repo — already prototyped and validated against a real outfit photo,
  detection quality was good (4/4 main items correct; missed a held accessory
  — worth tuning the prompt to explicitly call out accessories).
- Secret: `GEMINI_API_KEY` — add to Edge Function secrets alongside
  `ANTHROPIC_API_KEY`.

If you'd rather stay single-provider, an alternative is prompting Claude for
boxes too and A/B-testing accuracy — but default to Gemini given it's already
validated.

## Step 3: background removal

Two options, pick based on what's easiest to run in a Supabase Edge Function
(Deno):

- **`@imgly/background-removal` (preferred default)** — WASM-based, runs
  without Python/GPU, no external API cost. Good fit for Deno Edge Functions
  or even client-side. Quality is good on simple/plain backgrounds (typical
  for cropped garment regions).
- **Hosted API (e.g. Replicate-hosted rembg, remove.bg)** — fallback if WASM
  approach proves too slow/heavy in Edge Functions. Has a small per-image cost
  (remove.bg ~$0.20/image — much pricier than the detection step, so avoid
  unless quality demands it).

Start with `@imgly/background-removal`. Only fall back to a paid API if
cutout quality is visibly bad on real wardrobe photos.

---

## Step 4 (Pro only): AI reconstruction/cleanup

For items partially hidden under another garment (the classic case: a shirt
mostly covered by a jacket), the plain crop+cutout only shows the visible
sliver. To get a full "as if laid flat" thumbnail, pass the cutout + its tags
(color, subtype, pattern, etc.) to an image-generation/editing model with a
prompt like:

> "Generate a clean, flat-lay product photo of this [light blue button-up
> shirt], on a plain white background. Use this image as reference for color,
> pattern, and visible details; reconstruct any parts not visible based on the
> garment type."

Same model also handles general cleanup (wrinkles/lighting → catalog look)
for fully-visible items, if desired.

**Model + cost:** Gemini 2.5 Flash Image ("Nano Banana") at ~$0.039/image, or
GPT-image-1 at ~$0.034–0.042/image. This is **per item**, not per photo — a
5-item outfit photo costs ~$0.04 × 5 ≈ $0.20 for this step alone, vs. ~$0.0006
for the whole-photo detection step. ~300x more expensive — this is the cost
basis for gating it to Pro.

**Honest caveat to surface in the UI:** for occluded items, the result is the
model's best guess, not a literal photo of the user's garment — exact logo
placement, pattern details, or shade may be slightly off. Frame it as "AI
preview" rather than "photo of your item."

**Persistent labeling.** Any thumbnail that went through step 4 must be
permanently flagged — store an `image_source` field on the garment record
(`"cropped"` vs `"ai_enhanced"`). Show a small "AI-enhanced" badge on the
thumbnail wherever it appears (closet grid, garment detail, outfit cards) for
as long as that image is in use. This isn't just a one-time disclosure — the
user should always be able to tell, at a glance, which items have a real
photo vs. an AI reconstruction, so they know which ones might be worth
retaking later (see below).

---

## Retake photo feature

Give the user an easy way to replace any garment's image later — most useful
for `ai_enhanced` items, but available for any garment.

- On the garment detail screen, add a "Retake photo" action.
- Opens the normal single-item scan flow (core loop camera/picker), captures
  a new photo, re-runs the standard tagging step
  (`docs/02-tagging-schema.md`), and on save:
  - Replaces `image_url` with the new photo
  - Resets `image_source` to `"cropped"` (or just drop the flag — it's now a
    real photo, no longer AI-derived)
  - Optionally re-merges/updates tags if the new tagging pass disagrees with
    the existing ones (flag for user confirmation rather than silently
    overwriting, same confirm/correct pattern as initial scan)
- Surface a gentle prompt for `ai_enhanced` items — e.g. a "Retake for a real
  photo" nudge on the garment card or in a periodic "tidy your closet"
  reminder — but never force it; AI-enhanced thumbnails should remain fully
  usable indefinitely.

---

## Tier gating

This add-on sits on top of the existing tier structure
(`docs/04-pricing-model.md`):

- **Free:** no access to "Scan a full outfit" — stays on single-item scanning
  (core loop only).
- **Plus:** "Scan a full outfit" available — steps 1-3 (detect, crop,
  background-removal cutout). Thumbnails are real crops of the user's photo,
  just background-removed. Free to provide (cost is the ~$0.0006/photo
  detection call, same order of magnitude as existing scan costs).
- **Pro:** adds step 4 — AI reconstruction/cleanup per item (~$0.04/item).
  Surface this as a per-item toggle or "Enhance with AI" button in the review
  screen, not automatic for every item, to keep cost predictable even at Pro.

---

## Where this fits in the app

- New entry point alongside the existing Scan button: "Scan a full outfit"
  vs. "Scan one item" (existing core flow, unchanged).
- After extraction, show a review screen: each detected item as a card
  (cutout thumbnail + pre-filled tags), user can confirm/edit/discard each
  before it's saved to the closet — same confirm/correct pattern as core scan.
- Gate this behind the **Plus/Pro** tier if you want an upsell lever (it's a
  more expensive, more "wow" feature than single-item scanning) — not a hard
  requirement, just an option.

---

## Build checklist

- [ ] Add `GEMINI_API_KEY` to Edge Function secrets + `.env.example`
- [ ] New Edge Function: `extract-outfit` — takes full-outfit image, returns
      array of `{ tags..., box_2d }` (reuse `docs/02-tagging-schema.md` schema
      + box_2d field)
- [ ] Crop + background-removal step (Edge Function or client-side)
- [ ] "Scan full outfit" entry point + multi-item review/confirm screen
- [ ] Gate "Scan full outfit" behind Plus/Pro (check `profiles.subscription_tier`,
      same pattern as gap analysis gating)
- [ ] (Pro) "Enhance with AI" per-item button → image-gen reconstruction/cleanup
      Edge Function; show the "AI preview" caveat in the UI
- [ ] Add `image_source` field (`"cropped"` | `"ai_enhanced"`) to `garments`
      table; show an "AI-enhanced" badge anywhere that thumbnail appears
- [ ] "Retake photo" action on garment detail — re-runs core scan flow,
      replaces image + clears `image_source` flag; gentle nudge for
      `ai_enhanced` items
- [ ] Save confirmed items to `garments` table via existing save path
- [ ] Reference prototype script: `scripts/extract_clothing_items.py` (Python,
      for testing/tuning the prompt before porting to the Edge Function)
