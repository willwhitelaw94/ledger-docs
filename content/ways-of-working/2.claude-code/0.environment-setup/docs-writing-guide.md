---
title: Writing Documentation with Claude
description: How to use the /trilogy-docs-write skill to create and organize documentation efficiently
---

Learn how to write documentation efficiently using Claude's docs-write skill, add screenshots and videos, and keep your content organized.

---

## The /trilogy-docs-write Skill

The `/trilogy-docs-write` skill knows where documentation lives. It understands the TC Docs structure, file naming conventions, frontmatter requirements, and can create or update documents in the right location.

### What It Knows

- **Documentation structure** — Where each type of content belongs
- **Naming conventions** — kebab-case, numbered prefixes, index files
- **Frontmatter** — Required title and description fields
- **Navigation** — How to make new docs appear in the sidebar

### Basic Usage

Just tell Claude what you want to document:

```
Write a doc about our new sprint process
```

Claude will:
1. Determine the content type (this is team practice content)
2. Find the right location (`overview/4.team-practices/`)
3. Check for existing similar docs
4. Create the file with proper frontmatter
5. Suggest where to add navigation links

### Explicit Invocation

You can also invoke the skill directly:

```
/trilogy-docs-write Add a glossary entry for "Service Booking"
```

Or for reorganization:

```
/trilogy-docs-write Move the API docs to developer-docs/apis
```

---

## Adding Screenshots

Two approaches: traditional (manual) and skill-assisted.

### Traditional Approach

**Step 1: Take the screenshot**

| Shortcut | What It Does |
|----------|--------------|
| `Cmd+Shift+3` | Capture entire screen |
| `Cmd+Shift+4` | Capture selection |
| `Cmd+Shift+4` + `Space` | Capture window |

**Step 2: Move to correct folder**

Images must live in `.tc-docs/public/images/`, not in `content/`.

```
.tc-docs/public/images/
├── ways-of-working/      # WoW section images
├── features/             # Feature domain images
├── strategy/             # Strategy images
├── initiatives/          # Epic images
└── Screenshots/          # General screenshots
```

**Step 3: Rename appropriately**

- Use kebab-case: `my-screenshot.png`
- Be descriptive: `budget-overview-panel.png`
- Include context: `42-agents-warning.png`

**Step 4: Add to your document**

```markdown
![Alt text](/images/ways-of-working/section/my-screenshot.png)
```

Note: The path starts with `/images/`, not `/public/images/`.

### Skill-Assisted Approach

Use the `/trilogy-screenshot` skill for a faster workflow.

**Step 1: Configure macOS screenshot location**

You have two options for where screenshots land:

| Location | Path | Best For |
|----------|------|----------|
| **App Screenshots** | `~/Herd/tc-portal/public/Screenshots/` | General use, quick access |
| **TC Docs Screenshots** | `~/Herd/tc-portal/.tc-docs/public/images/Screenshots/` | Organized by doc structure |

To configure:
1. Press `Cmd+Shift+5`
2. Click **Options**
3. Select **Other Location...**
4. Navigate to your preferred location

**Step 2: Take screenshot and invoke skill**

```
[Take screenshot with Cmd+Shift+4]

add that screenshot as budget-overview
```

**What happens:**

The skill searches these locations (in order):
1. `public/Screenshots/` — App's public folder
2. `.tc-docs/public/images/Screenshots/` — TC Docs images
3. Desktop, Downloads, project root

Then it either:
- **Renames in place** (if already in a valid public folder) → `/Screenshots/budget-overview.png`
- **Moves to organized folder** (if from Desktop/Downloads) → `/images/features/budget/budget-overview.png`

**Example 1: Screenshot in public/Screenshots/**

```
You: [take screenshot, lands in public/Screenshots/]
You: "add that as docs-hero"

Claude:
- Found: Screenshot 2026-02-04... in public/Screenshots/
- Renamed to: docs-hero.png
- Insert: ![Docs hero](/Screenshots/docs-hero.png)
```

**Example 2: Screenshot on Desktop**

```
You: [take screenshot, lands on Desktop]
You: "add that as budget-overview"

Claude:
- Found: Screenshot 2026-02-04... on Desktop
- Current doc: features/domains/budget.md
- Moved to: .tc-docs/public/images/features/budget/budget-overview.png
- Insert: ![Budget overview](/images/features/budget/budget-overview.png)
```

The skill automatically finds the most recent screenshot and organizes it appropriately.

---

## Adding Videos

Videos can make documentation clearer for complex workflows.

### Loom Embeds (Recommended)

For quick recordings, use Loom:

1. Record with Loom browser extension
2. Copy the embed code
3. Add to your markdown:

```markdown
<iframe src="https://www.loom.com/embed/abc123" frameborder="0" allowfullscreen></iframe>
```

### YouTube Embeds

For longer or public content:

```markdown
<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>
```

### Self-Hosted Videos

For small videos (under 10MB), you can host them directly:

1. Save video to `.tc-docs/public/videos/`
2. Embed with HTML5 video tag:

```markdown
<video controls width="100%">
  <source src="/videos/my-demo.mp4" type="video/mp4">
</video>
```

### Recording Tips

| Tool | Best For |
|------|----------|
| **Loom** | Quick demos, async communication |
| **QuickTime** | Screen recordings on Mac |
| **OBS** | Professional recordings |
| **Cmd+Shift+5** | Quick Mac screen recording (no audio) |

**Guidelines:**
- Keep videos under 2 minutes when possible
- Include captions for accessibility
- Start with what you're about to show
- End with what was demonstrated

---

## Media Guidelines

### Image Formats

| Format | Use For |
|--------|---------|
| `.png` | Screenshots, UI captures (default) |
| `.webp` | Web images, smaller file size |
| `.jpg` | Photos, complex images |
| `.gif` | Short animations, simple demos |

### File Size

- Screenshots: Keep under 500KB
- Videos: Keep under 10MB (or use Loom/YouTube)
- Use WebP for large images

### Naming

- Use kebab-case: `my-image-name.png`
- Be descriptive: `claims-export-panel.png`
- Include version if updating: `budget-v2.png`

---

## Quick Reference: Where Images Go

| Doc Location | Image Destination |
|--------------|-------------------|
| `ways-of-working/...` | `public/images/ways-of-working/[section]/` |
| `features/domains/...` | `public/images/features/[domain]/` |
| `strategy/...` | `public/images/strategy/[section]/` |
| `initiatives/...` | `public/images/initiatives/[epic]/` |
| `context/...` | `public/images/context/[section]/` |

---

## Common Mistakes

### ❌ Image in wrong folder
```
content/images/screenshot.png  ← Won't be served
```

### ✅ Correct location
```
public/images/screenshot.png  ← Will be served
```

### ❌ Wrong path in markdown
```markdown
![Alt](/public/images/screenshot.png)  ← Won't resolve
```

### ✅ Correct path
```markdown
![Alt](/images/screenshot.png)  ← Works
```

---

## Related

- [Research with Subagents](/ways-of-working/claude-code-advanced/18-research-with-subagents) — Gathering content for docs
- [Local Docs & Tools](/ways-of-working/environment-setup/01-local-docs) — Running docs site locally
