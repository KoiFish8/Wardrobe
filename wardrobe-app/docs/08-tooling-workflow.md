# Tooling Workflow — Cowork vs Claude Code

How to split the work so each part of the business uses the right tool. Getting this split right keeps the project clean.

## The mental model

- **Cowork = the business brain + back-office.** Research, strategy, content, ops, and curating the style-library *data*. Anything that produces knowledge, documents, content, or coordinates your other apps.
- **Claude Code = the product.** The app that ships. Anything that produces code that runs.
- **The bridge is `data/`.** Cowork researches and refines `style-library-v1.json`; Code consumes it. Same handoff for any spec or asset.

## Rule of thumb

"Does it produce code that runs in the app?" → **Code.**
"Does it produce knowledge, content, data, or coordinate my tools?" → **Cowork.**

## Part-by-part

| Part of the business | Tool |
|---|---|
| Scan/tagging pipeline (code calling Haiku) | Code |
| Outfit generator + gap-analysis engine | Code |
| Frontend, backend, database, auth, payments | Code |
| In-app pricing/tier logic | Code |
| Style library: researching aesthetics, proposing/correcting weights, curating reference outfits | Cowork |
| Market & competitor research, ongoing price monitoring | Cowork (can be scheduled) |
| Pricing & business strategy | Cowork |
| Marketing: hooks, scripts, content calendar, faceless video planning | Cowork |
| Creator sponsorship: finding, vetting, outreach, tracking | Cowork |
| Investor/pitch materials, one-pagers | Cowork |
| Live analytics dashboards, ops reviews | Cowork (artifacts + connectors) |

## Example of the handoff

When 2026 trends shift and streetwear weights need updating: do it in **Cowork** — research the change, re-score, update `style-library-v1.json`. **Code** just picks up the new file. You never retune taste inside the codebase, and you never do trend research inside app code.

## Ongoing Cowork back-office tasks

- Weekly competitor-price check (scheduled) — see `Scheduled/` task `wardrobe-competitor-price-check`.
- (Later) content calendar generation, creator-outreach tracking, analytics review.
