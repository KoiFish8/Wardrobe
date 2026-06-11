#!/usr/bin/env bash
#
# loop-design.sh — runs ONE cycle of the Claude Code design loop for the
# Wardrobe Stylist app, on the isolated `loop/design` branch. Never touches main.
#
# Run it manually:        ./scripts/loop-design.sh
# Or schedule it (cron):  see the crontab line at the bottom of this file.
#
# Requirements: the Claude Code CLI (`claude`) installed and logged in.

set -euo pipefail

# --- Always run from the project root, regardless of where cron calls it ---
PROJECT_DIR="/Users/seanchoi/Desktop/app dev/wardrobe-app"
cd "$PROJECT_DIR"

# --- Safety: make sure this is a git repo before doing anything ---
if [ ! -d .git ] && ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "[loop-design] No git repo found in $PROJECT_DIR — aborting (won't touch files)." >&2
  exit 1
fi

PROMPT='Run ONE iteration of the Claude Code design loop for the Wardrobe Stylist app.
Read docs/10-looping-prompts.md — section "2. Claude Code loop" AND the "Ground rules — BOTH loops (the safety contract)" section — and follow them exactly.
NON-NEGOTIABLE: never commit/merge/push to main; do ALL work on branch loop/design (create it off main on first run, otherwise check it out and continue); the core loop, data model, and model routing are LOCKED — only improve how the app looks and feels; if git is not initialized or the branch cannot be created, STOP and report.
Do exactly ONE cycle: audit the weakest screen/flow, make one focused design improvement, build/run to verify it works and the locked logic is intact, re-score the rubric, commit to loop/design, and append a before/after entry to docs/design-log.md. NEVER merge to main — that happens later, manually, only after Sean approves.
End with a short summary: what screen changed, the score delta, and the next area to attack.'

echo "[loop-design] $(date '+%Y-%m-%d %H:%M:%S') — starting one design cycle on loop/design"

# --permission-mode acceptEdits lets it edit files and run its own git/build
# commands without pausing for a prompt each time. It is still fenced to the
# loop/design branch by the prompt above and can never merge to main on its own.
# If your Claude version still pauses on shell commands, swap in:
#   --dangerously-skip-permissions
claude -p "$PROMPT" --permission-mode acceptEdits

echo "[loop-design] $(date '+%Y-%m-%d %H:%M:%S') — cycle done"

# -----------------------------------------------------------------------------
# To run automatically a few times a day, add this to your crontab
# (run `crontab -e` and paste the line). Runs at 10am, 2pm, 6pm — offset from
# the Cowork business loop (9am/1pm/5pm) so they don't overlap:
#
#   0 10,14,18 * * * "/Users/seanchoi/Desktop/app dev/wardrobe-app/scripts/loop-design.sh" >> "/Users/seanchoi/Desktop/app dev/wardrobe-app/scripts/loop-design.log" 2>&1
#
# Then check progress anytime in scripts/loop-design.log and docs/design-log.md.
# -----------------------------------------------------------------------------
