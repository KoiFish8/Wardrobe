# CLAUDE.md — Wardrobe Stylist App

Context for Claude Code. Read this first. It captures the locked product decisions, the data model, and where the build picks up. Detailed docs live in `docs/`; machine-usable data in `data/`.

## What this app is

Scan a closet (one garment at a time) → tag each piece → match those tags against a weighted **style library** → generate ranked outfits from the user's own clothes → recommend the highest-leverage piece to buy. Target user: **style-unconfident people with small wardrobes** who want to look put-together and buy *less*, not more.

## Core loop (LOCKED — do not redesign without flagging)

1. **Scan** — user photographs **individual pieces**, one at a time. Each becomes a structured tag set. *Only step that uses a vision model.*
2. **Style library** — weighted graph of styles + tags (see `data/style-library-v1.json`).
3. **Generate** — outfits built by scoring the user's garment **tags** against a target style. Pure tag math, no image analysis. Cheap, deterministic.
4. **Gap analysis** — recommend the piece(s) that unlock the most new outfits. The differentiator.

**Out of core (optional add-ons only):** multi-piece outfit tagging (parsing a full worn look), style-from-a-picture. Do not put these on the critical path.

**Multi-piece outfit tagging is now spec'd** (was previously just a placeholder) — see `docs/11-outfit-photo-extraction-addon.md`. It introduces Gemini 2.5 Flash as a second model provider (for bounding-box detection, ~$0.0006/photo, already prototyped/validated). Build it AFTER the core loop, as its own phase.

## Key locked decisions

- **No custom AI to start.** Rent vision models. Custom training only after thousands of user corrections.
- **Model routing:** scan/tag → **Haiku 4.5** (no extended thinking). Generation → **Sonnet 4.6**, low effort. Gap analysis → **Sonnet/Opus**, higher effort (the one genuinely reasoning-heavy step). Tagging cost ≈ $0.003/item.
- **Outfits are computed, not stored** (Fork A = HYBRID). The library holds only styles + tags + weights. A small curated reference-outfit set exists ONLY to calibrate weights + onboard — it must NEVER generate the user's actual outfits.
- **No Pinterest.** API locked + scraping breaks ToS. Use a self-curated style library or user-imported inspiration.
- **Scope is narrow on purpose:** young, contemporary, menswear-leaning. Generalize later.

## The style library (the app's key asset)

`data/style-library-v1.json` — the scoring graph. Structure:
- `styles` — 8 aesthetics, each with a formality level.
- `tag_style_weights` — how strongly each tag fits each style (S=2, W=1, none=0).
- `tag_tag_compatibility` — how well two tags pair *within* one outfit (prevents clashing combos).
- `incompatible_pairs` — hard clashes to suppress.
- `tag_style_anti_affinity` — **negative** edges; a tag that pushes an outfit *away* from a style. (Added after validation caught a false positive.)

**Scoring (reference implementation):** for a target style, sum `tag_style_weights` for all of the user's garment tags, subtract `tag_style_anti_affinity`, rank styles/outfits by total. Gap analysis = which added tag/garment most raises the count of high-scoring outfits. This was validated in code against 3 real outfits (see `docs/07-style-library-v1.md` §4) — all classified correctly.

## Garment tagging

Schema + the exact vision prompt are in `docs/02-tagging-schema.md`. Tags carry a `confidence` field — route low-confidence items to a stronger model. Sample tagged output: `data/tagged-wardrobe-test.json`. Sample raw photos: `data/sample-wardrobe/` (6 real phone photos, HEIC).

## What's next to build

The **outfit generator + gap-analysis pass**: take a tagged closet + `style-library-v1.json`, output ranked outfits for a chosen style, then the gap recommendation. The scoring logic is already proven (see validation). This is the first time all pieces run together.

## Conventions

- Keep the style library data-driven in `data/` — don't hardcode weights in app code.
- Weights are taste, not ground truth. Build for them to improve from user accept/reject signal over time.
- When changing the core loop or a locked decision, say so explicitly.

## Doc index

- `docs/01-product-plan.md` — product + locked core loop (§1a)
- `docs/02-tagging-schema.md` — scan feature: schema + prompt
- `docs/03-business-model.md` — market, unit economics, risks (acquisition is the key risk)
- `docs/04-pricing-model.md` — Free / Plus ~$6.99 / Pro ~$12.99 tiers
- `docs/05-marketing-playbook.md` — faceless content + small-creator sponsorship (use after launch)
- `docs/06-style-library-data-model.md` — the graph model + resolved forks
- `docs/07-style-library-v1.md` — built/validated library, changelog, limitations
- `docs/08-tooling-workflow.md` — Cowork vs Code division of labor
- `docs/09-claude-code-build-prompt.md` — the full Expo/React Native build spec (paste-ready)
- `docs/11-outfit-photo-extraction-addon.md` — optional add-on: split a full-outfit photo into individual tagged/cutout garments
- `archive/` — superseded drafts

## MCP servers (`.mcp.json`)

Project-scoped MCP servers, available to anyone working in this repo via Claude Code:

- **supabase** — read-only schema/data inspection during development (project ref + access token)
- **github** — repo/PR/issue access (personal access token)
- **playwright** — browser automation for testing the Expo web build

All required tokens are env vars (see `.env.example`) — never hardcoded in `.mcp.json`. Set them in your shell before launching Claude Code.
