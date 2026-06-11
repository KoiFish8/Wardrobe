# Wardrobe Stylist App

Planning + design workspace for an AI wardrobe styling app. Scan your closet, get outfits built from clothes you already own, and find the one or two pieces worth buying.

This folder holds the full project context so it can be used as a Claude project and with Claude Code. **Start with `CLAUDE.md`** — it has the locked decisions, the core loop, and where the build picks up.

## Layout

```
wardrobe-app/
├── CLAUDE.md        ← project context (read first)
├── README.md
├── docs/            ← product, business, style-library docs (numbered in reading order)
├── data/            ← machine-usable assets
│   ├── style-library-v1.json     ← the scoring graph (the key asset)
│   ├── tagged-wardrobe-test.json ← sample tagged garments
│   └── sample-wardrobe/          ← 6 real phone photos for testing the scanner
└── archive/         ← superseded drafts
```

## Status

Design phase complete and validated. Core loop locked, style library v1 built and tested in code against real outfits. **Next build step:** the outfit generator + gap-analysis pass (see `CLAUDE.md` → "What's next to build").
