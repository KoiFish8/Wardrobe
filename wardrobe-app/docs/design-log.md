# Design Log — loop/design

State file for the continuous design loop (docs/10-looping-prompts.md §2).
Each iteration: audit the weakest screen, one focused improvement, verify,
re-score, commit. Nothing here merges to `main` without explicit approval.

## Rubric

Scored 1–5 per screen. Dimensions:

1. **Clarity** — would a style-unconfident, non-fashion user instantly get it?
2. **Polish** — visual refinement: spacing, alignment, color, type.
3. **Hierarchy** — does the eye land on the right thing first?
4. **Motion/feedback** — loading, transitions, touch response.
5. **A11y** — contrast, touch targets, labels, dynamic type tolerance.
6. **Friction** — steps/confusion between intent and outcome.
7. **Tone** — "relief, not aspiration": calm, encouraging, never judgy.

## Baseline — 2026-06-10 (post-build, pre-design-work)

| Screen | Clarity | Polish | Hierarchy | Motion | A11y | Friction | Tone | Avg |
|---|---|---|---|---|---|---|---|---|
| Login / first-run | 4 | 3 | 4 | 2 | 3 | 3 | 3 | 3.1 |
| Closet (incl. empty state) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 2.9 |
| **Scan (pick → tagging → confirm)** | 3 | 2 | **2** | **2** | 3 | 3 | **2** | **2.4** |
| Style results | 4 | 3 | 3 | 2 | 3 | 3 | 3 | 3.0 |
| Outfit detail | 4 | 3 | 4 | 2 | 3 | 4 | 3 | 3.3 |
| Gaps | 4 | 3 | 3 | 2 | 3 | 4 | 3 | 3.1 |
| Profile / paywall | 4 | 3 | 3 | 2 | 3 | 4 | 3 | 3.1 |

Worst: **Scan flow (2.4)** — and it's the product's emotional core ("the app
understood my clothes"). Specific failures:

- Confirm screen renders all 30 library tags as one undifferentiated chip wall;
  detected tags are visually drowned by 25+ unselected ones. (Hierarchy 2)
- "Tagging your garment…" interstitial is static text: no spinner, no image,
  no sense that anything is happening. (Motion 2)
- The headline fact — "charcoal pullover hoodie" — sits under a dry DETECTED
  label with metadata in one cramped line. The moment should feel like a small
  win, not a database row. (Tone 2)

## Iterations

(appended below, newest last)

### Iteration 1 — 2026-06-10 — Scan flow (confirm + tagging states)

**What changed** (`src/app/scan.tsx`, plus a shared guard in `src/lib/session.tsx`):

- Confirm screen hierarchy rebuilt: the detected garment ("charcoal pullover
  hoodie") is now the title — the win moment — with a confidence-colored
  encouragement line ("Nice scan — these tags look solid." / "Hard to read
  this photo…") and material/formality/fit as chips instead of a cramped
  metadata row.
- The 30-tag chip wall is split into **On this piece (N)** (selected, with ✕
  remove affordance) and **Add a tag** (the remaining vocabulary, muted).
  Detected tags no longer drown in the unselected pool.
- Tagging interstitial now shows the photo being read + an ActivityIndicator
  + calmer copy, instead of two lines of static text.
- **Bug found by verification:** cold-loading `/scan`, `/garment/*`, or
  `/outfit/*` (refresh/deep link) crashed with "No backend — user is signed
  out" because those stack screens rendered before the async session restore.
  Added `RequireSession` guard (in `session.tsx`) wrapping all three.

**Verify:** `tsc` clean; 15/15 scorer tests pass (locked logic intact);
clicked through scan → confirm on the dev server at desktop and 375×812
mobile widths; cold-load of /scan no longer crashes. Screenshots reviewed
in-loop (preview MCP; not saved to disk).

**Scores — Scan flow:** Clarity 3→4 · Polish 2→3 · Hierarchy 2→4 ·
Motion 2→3 · A11y 3→3 · Friction 3→4 · Tone 2→4. **Avg 2.4 → 3.6.**

**Next-lowest area:** Closet (2.9) — the grid is serviceable but the empty
state is text-only and the low-confidence REVIEW badge is the only visual
signal; no pull-to-refresh or scan affordance inside a populated grid beyond
the FAB. Also Style results' Motion (2) — generation results pop in with no
transition.
