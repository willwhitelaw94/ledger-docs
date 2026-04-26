# Ledger Docs

Documentation site for the Ledgerly / Financial Ledger Platform — built with Next.js 16 + React 19 + shadcn/ui, content rendered via MDX.

This is the docs companion to the main [`financial-ledger`](https://github.com/willwhitelaw94/financial-ledger) application repo.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (React 19, App Router) |
| **UI** | shadcn/ui + Tailwind CSS v4 |
| **Content** | Markdown rendered via MDX (`next-mdx-remote`) |
| **Search** | Fuse.js (client-side fuzzy search) |

## Quick Start

```bash
npm install
npm run dev     # → http://localhost:3000
```

## Content Structure

```
content/
├── context/         Industry, product, and domain context
├── developer-docs/  Architecture, API references, technical guides
├── guides/          How-to guides
├── initiatives/     Epics & specs (FL-financial-ledger initiative)
└── ways-of-working/ Team practices, gates, templates
```

All content is written in Markdown under `content/`. Every `.md` file requires YAML frontmatter with a `title:` field.

## Adding an Epic

Epics live under `content/initiatives/FL-financial-ledger/{NUM}-{CODE}-{slug}/`. Each epic folder typically contains:

- `idea-brief.md` — initial problem framing
- `spec.md` — feature specification
- `plan.md` — technical implementation plan
- `tasks.md` — broken-down tasks
- `meta.yaml` — epic metadata (id, status, dependencies)

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — production build (Next.js standalone output)
- `npm run start` — start production server
- `npm run test` — run Vitest unit tests
- `npm run test:e2e` — run Playwright tests
