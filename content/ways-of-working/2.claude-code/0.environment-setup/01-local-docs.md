---
title: Local Docs & Tools
description: Set up TC Docs and TC WoW locally for documentation and development workflows
---

Get the TC documentation site and shared development toolkit running locally.

---

## What You're Installing

| Submodule   | Purpose                                            | Location    |
| ----------- | -------------------------------------------------- | ----------- |
| **tc-docs** | Documentation site (Nuxt-based)                    | `.tc-docs/` |
| **tc-wow**  | Ways of Working toolkit (skills, templates, gates) | `.tc-wow/`  |

Both are git submodules that live inside your `tc-portal` repository.

---

## Quick Start

From the `tc-portal` root directory:

```bash
# Initialize and sync all submodules + install dependencies
npm run submodule:sync
```

This single command:

1. Initializes git submodules
2. Pulls latest from `main` for each submodule
3. Runs the tc-wow install script (links skills, templates)
4. Installs tc-docs npm dependencies

---

## Running Docs Locally

### Development Mode (Hot Reload)

```bash
npm run docs:dev
```

Opens `http://localhost:3000` in your browser with hot reload enabled. Changes to documentation files appear instantly.

### Preview Production Build

```bash
npm run docs:build    # Build the static site
npm run docs:preview  # Serve the built site
```

---

## What `submodule:sync` Does

```bash
# The full command breakdown:
git submodule update --init --recursive
git submodule foreach --recursive 'git fetch origin && git checkout main && git reset --hard origin/main'
bash .tc-wow/install.sh
cd .tc-docs && npm install
```

| Step                       | What It Does                                           |
| -------------------------- | ------------------------------------------------------ |
| `submodule update --init`  | Clone submodules if missing, update to recorded commit |
| `foreach ... reset --hard` | Force each submodule to latest `main`                  |
| `install.sh`               | Symlink tc-wow skills and templates into your project  |
| `npm install`              | Install tc-docs dependencies                           |

---

## TC WoW Installation

The `install.sh` script creates symlinks from `.tc-wow/` into your project:

```text
.tc-wow/
├── claude/
│   ├── skills/          → .claude/skills/
│   └── mcp/             → .claude/mcp/
├── specify/
│   ├── scripts/bash/    → .specify/scripts/bash/
│   └── templates/       → .specify/templates/
├── gates/               (referenced by skills, not symlinked)
└── constitution.md      → .specify/memory/constitution.md (copied once)
```

This means:

- Skills like `/trilogy-clarify` and `/speckit-plan` are automatically available
- Templates for specs, plans, and designs are shared across the team
- Updates to tc-wow automatically appear in your project (via symlinks)

---

## Updating Submodules

### Pull Latest Changes

```bash
npm run submodule:sync
```

Run this periodically to get the latest documentation and toolkit updates.

### Check Submodule Status

```bash
git submodule status
```

Shows which commit each submodule is on and whether it has local changes.

---

## Troubleshooting

### "Submodule not initialized"

```bash
git submodule update --init --recursive
```

### "Permission denied" on install.sh

```bash
chmod +x .tc-wow/install.sh
bash .tc-wow/install.sh
```

### Docs Won't Start

```bash
cd .tc-docs
rm -rf node_modules .nuxt
npm install
npm run dev
```

### Skills Not Showing Up

Re-run the install script:

```bash
bash .tc-wow/install.sh
```

Check that symlinks exist:

```bash
ls -la .claude/skills/
```

---

## Available NPM Scripts

| Command                  | Description                      |
| ------------------------ | -------------------------------- |
| `npm run submodule:sync` | Full sync: init, update, install |
| `npm run docs:dev`       | Run docs locally with hot reload |
| `npm run docs:build`     | Build static docs site           |
| `npm run docs:preview`   | Preview built docs               |
| `npm run docs:generate`  | Generate static site (SSG)       |

---

## Contributing to Docs

1. Make changes in `.tc-docs/content/`
2. Preview locally with `npm run docs:dev`
3. Commit and push from within the submodule:

```bash
cd .tc-docs
git add .
git commit -m "docs: your change"
git push
```

4. Update the submodule reference in tc-portal:

```bash
cd ..  # back to tc-portal root
git add .tc-docs
git commit -m "chore: update tc-docs submodule"
```

---

## Next Steps

- [Ready to Go](/ways-of-working/environment-setup/00-ready-to-go) - Get your IDE ready
- [Skills Reference](/ways-of-working/spec-driven-development/09-skills-reference) - Available `/trilogy-*` and `/speckit-*` commands
- [Quality Gates](/ways-of-working/spec-driven-development/10-quality-gates) - Understand the development workflow
