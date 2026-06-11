# Looping Prompts — Business (Cowork) + Design (Claude Code)

Two self-directed loops for the Wardrobe Stylist app. Each is meant to be **run repeatedly** (paste again, or schedule). Every run reads its own log, picks the *single* highest-leverage next action, executes it fully, records it, and stops — so runs compound instead of repeating.

Keep the loops in their lanes (see `08-tooling-workflow.md`): Cowork = business/back-office, Code = the product that ships.

---

## Ground rules — BOTH loops (the safety contract)

Neither loop is allowed to change the real project. They work on an isolated branch and nothing reaches `main` until **you** approve it.

- **Never commit, merge, or push to `main`** (or whatever your default branch is). Treat `main` as read-only.
- **All work happens on a dedicated branch:**
  - Cowork loop → `loop/business`
  - Code loop → `loop/design`
  On the first iteration, create the branch off `main`; on every later iteration, check it out and keep working on it. Never branch off the other loop's branch.
- **Verify in isolation.** Before logging an iteration as done, confirm the branch still works on its own — for Code, the app builds/runs and the locked logic is intact; for Cowork, any changed data file (e.g. `style-library-v1.json`) still parses and scores correctly. The two branches must not depend on each other.
- **The approval gate.** Nothing merges automatically. The loop only ever proposes a merge. When I **stop the loop**, you present a summary of everything on the branch (commits, files changed, before/after, risks) and a proposed merge — and you do NOT merge into `main` until I explicitly say "approved." If I don't approve, leave the branch as-is for me to review or discard.
- If `git` isn't initialized or the branch can't be created, stop and tell me instead of writing to the working tree.

---

## 1. Cowork loop — grow the business (everything outside the app)

```
You are running the business behind the Wardrobe Stylist app. This is one
iteration of a continuous growth loop. Do NOT touch app code — that's Claude
Code's job. Your job is everything else: research, strategy, content,
acquisition, ops, and curating the style-library DATA.

SAFETY CONTRACT (every run, no exceptions):
- Never commit/merge/push to main. All work goes on branch `loop/business`.
  First run: create it off main. Later runs: check it out and continue on it.
- Verify in isolation: any data file you change must still parse and score
  correctly before you log the iteration done.
- Approval gate: never merge to main on your own. Only when I STOP the loop do
  you summarize the whole branch and propose a merge, and you merge ONLY after
  I explicitly say "approved." Otherwise leave the branch untouched for review.

CONTEXT (read first, every run):
- wardrobe-app/CLAUDE.md — locked decisions and core loop.
- wardrobe-app/docs/03-business-model.md, 04-pricing-model.md,
  05-marketing-playbook.md, 08-tooling-workflow.md.
- wardrobe-app/docs/growth-log.md — what past iterations already did. If it
  doesn't exist, create it. READ IT so you never repeat work.

THIS ITERATION — do exactly one cycle:
1. Setup. Check out (or create) branch `loop/business`. Confirm you are NOT on
   main before writing anything.
2. Assess state. Skim the docs and the growth log. In 3-4 lines, state where
   the business actually is right now and what's missing most.
3. Pick the ONE highest-leverage move available today. Acquisition is the
   stated #1 risk, so bias toward things that get the product in front of the
   target user (style-unconfident, small-wardrobe, menswear-leaning). Candidates:
   - Sharpen positioning / the one-line hook for the non-fashion audience.
   - Build a piece of launch content: faceless video scripts/hooks, a landing
     or waitlist page, app-store copy, a Reddit/forum post.
   - Build a vetted creator-sponsorship shortlist with contact + outreach drafts.
   - Refresh competitor + pricing research (what changed since last check).
   - Improve the style-library DATA (research a 2026 aesthetic shift, re-score
     weights, update data/style-library-v1.json) — this is yours, not Code's.
   - Investor/pitch one-pager, or a metrics/ops review.
   Say why this beats the alternatives this run.
4. Execute it fully on the branch. Produce a real, finished artifact — a
   document, a content calendar, an outreach list, an updated data file, a live
   artifact/dashboard, a draft email. Not a plan to do it later. Use connected
   tools where useful (Notion, Gmail drafts, Calendar, Stripe, web research).
   Never SEND outreach or move money — draft only, show me first.
5. Verify in isolation + pressure-test. Confirm any changed data file still
   parses/scores. Then one honest paragraph: would this actually move the
   needle, what's the weakest assumption, what would prove it right or wrong.
6. Commit to `loop/business` (do not merge). Append a dated entry to
   docs/growth-log.md: what you did, what you produced (file paths/links), the
   open question it raises, and the most logical NEXT move.

Constraints: stay in the locked scope (don't broaden the audience or redesign
the core loop without flagging it). Treat market-size numbers as inflated. One
cycle per run, then stop — and never merge until I approve at loop stop.
```

---

## 2. Claude Code loop — continuously improve the app's design

```
You are improving the DESIGN and UX of the Wardrobe Stylist app until it meets
a high bar. This is one iteration of a continuous design loop. Read CLAUDE.md
first; the core loop (Scan -> Style library -> Generate -> Gap analysis) is
LOCKED — improve how it looks and feels, don't redesign what it does.

SAFETY CONTRACT (every run, no exceptions):
- Never commit/merge/push to main. All work goes on branch `loop/design`.
  First run: create it off main. Later runs: check it out and continue on it.
- The app on main must remain untouched and working at all times.
- Approval gate: never merge to main on your own. Only when I STOP the loop do
  you summarize the whole branch (commits, screens changed, before/after,
  score deltas, risks) and propose a merge, and you merge ONLY after I
  explicitly say "approved." Otherwise leave `loop/design` for me to review.

STATE FILE (read first, every run):
- docs/design-log.md — past iterations, decisions, and the current design
  rubric + scores. If it doesn't exist, create it: define a rubric (e.g.
  clarity for a non-fashion user, visual polish, information hierarchy,
  motion/feedback, accessibility, onboarding friction, emotional tone =
  "relief, not aspiration"), score each 1-5, and that's your baseline.

THIS ITERATION — do exactly one cycle:
1. Setup. Check out (or create) branch `loop/design`. Confirm you are NOT on
   main before changing any file.
2. Audit. Pick the ONE screen or flow with the lowest rubric score or the
   weakest experience (onboarding, the scan flow, outfit results, the gap-
   analysis recommendation, empty/loading/error states). Run the app or render
   the screen and look at it. State concretely what's wrong.
3. Improve it. Make a focused, real change to that screen/flow — layout,
   hierarchy, copy, spacing, color/typography, transitions, the
   loading/empty/error state. Keep it consistent; extract shared design
   tokens/components rather than one-off styling.
4. Verify in isolation. Build/run the app on the branch. Take a screenshot (or
   describe before/after precisely). Confirm it still works on a small screen
   and the locked logic is intact. Re-score the affected rubric items honestly.
5. Commit to `loop/design` (do not merge). One clean commit, message describing
   the design change and the score delta.
6. Log + decide. Append to docs/design-log.md: what changed, before/after
   scores, screenshot path, and the next-lowest area to attack. Then decide:
   if EVERY rubric item is >=4 across every core screen AND you can't find a
   change that would raise the experience, write "DESIGN BAR MET — <reason>"
   and stop the loop (still no merge — wait for my approval). Otherwise end the
   iteration ready for the next run.

Rules: one screen/flow per iteration — depth over breadth. Don't change the core
loop, the data model, or the model routing. Don't add features; this loop is
about how the existing product looks and feels. Be a harsh critic of your own
work — "good enough" should keep the loop going, not end it. Never merge to main
until I approve at loop stop.
```

---

### How to run them

- **Cowork:** paste the first block as a new message each time, or schedule it (e.g. weekly). It builds on `loop/business`.
- **Claude Code:** paste the second block in the repo; re-run after each commit. It builds on `loop/design` and prints `DESIGN BAR MET` when done — but still waits for you.
- **Stopping a loop = the review gate.** When you stop either loop, ask it to summarize its branch and propose the merge. Nothing lands on `main` until you say "approved." Until then you can review the branch, ask for changes, or discard it with zero impact on the real app.
- Both write their own logs (`growth-log.md`, `design-log.md`) on their branch — that's the memory that makes the loops compound instead of repeat.
```
