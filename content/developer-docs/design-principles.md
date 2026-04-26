---
title: "Design Principles: MoneyQuest Ledger"
---

# Design Principles: MoneyQuest Ledger

**The vision**: Linear for accounting. Fast, keyboard-driven, no clutter. A tool that gets out of the way and lets the numbers speak.

---

## Core Principles

### 1. Speed is a feature

Every interaction should feel instant. Pages load fast, actions confirm fast, the AI answers fast. If something takes time, show progress — never leave the user wondering.

- Optimistic UI updates where safe (lists, status changes)
- Skeleton loaders, not spinners
- Sub-second page transitions
- AI responses under 3 seconds for common queries

### 2. Keyboard first

Power users — bookkeepers, accountants, owners — live in this product daily. They should never need to reach for the mouse to do common tasks.

- Every page has keyboard shortcuts (see CLAUDE.md for the full map)
- `?` shows the shortcut help overlay on any page
- `Cmd/Ctrl + /` opens the AI assistant from anywhere
- `G` + letter navigates between sections
- `N` creates a new item on list pages
- `J`/`K` moves through lists

### 3. One thing at a time

Don't present 10 options. Present the right one. The interface should reflect what the user is most likely to do next — not every possible action.

- Primary action is always the most prominent element
- Secondary actions are available but not competing
- Destructive actions require confirmation and are visually distinct
- Empty states suggest the next step, not just "no data found"

### 4. Trust through transparency

Financial software must be trusted. The user should always know what happened, why, and where to verify it.

- The AI always cites its sources ("Based on INV-001, INV-002, INV-003")
- Status badges are unambiguous — overdue is red, paid is green, draft is muted
- Audit trails are accessible, not buried
- Errors explain what went wrong and what to do next

### 5. Forms are conversations

Data entry is the enemy of productivity. Reduce it wherever possible.

- AI inbox review replaces form-filling for incoming documents
- Conversational document creation via the AI assistant
- Smart defaults and auto-population from existing contacts/accounts
- Required fields are minimal — ask only what's needed

### 6. Consistent visual language

The app should feel like one product, not a collection of pages.

- Settings-style 3-column layout for all create/edit forms
- `rounded-lg border bg-card` container with `<Separator />` between sections
- Unified action bar at bottom of forms: Cancel (ghost) left, primary action right
- Stat tiles use `grid divide-x` pattern for summary sections
- Status badges follow the same color system across all domains

#### Keyboard shortcut hints on buttons

Buttons and nav items that have a keyboard shortcut **must show the shortcut key(s)** inline, like Linear does. This reinforces discoverability without requiring the user to open the help overlay.

**Pattern for single key:**

```tsx
<Button>
  New Invoice
  <kbd className="ml-2 hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
    N
  </kbd>
</Button>
```

**Pattern for chord shortcuts (G + key):**

```tsx
<span className="ml-2 hidden items-center gap-0.5 sm:flex">
  <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">G</kbd>
  <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">I</kbd>
</span>
```

**Rules:**
- Use `<kbd>` element styled with `rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground`
- Hide on mobile with `hidden sm:inline-flex` — shortcuts are desktop only
- Show on primary action buttons (New, Save, Submit) and sidebar nav items
- Do NOT show on every button — only where the shortcut is meaningful and regularly used
- `Cmd/Ctrl` renders as `⌘` — always use the platform symbol, not the word

### 7. Context always present

The user should never lose their place or wonder what they're looking at.

- Breadcrumbs or back navigation on all detail pages
- The AI assistant is context-aware — it knows what page you're on
- The context panel in the assistant shows relevant data, never blank
- Navigation badge counts keep ambient state visible at all times

---

## Visual Tone

- **Clean, not sparse** — whitespace is intentional, not empty
- **Confident, not loud** — color is used for meaning, not decoration
- **Dense where needed** — data tables and grids can be compact; don't waste space
- **Dark mode first** — financial tools are often used in low-light environments; dark mode is a peer of light mode, not an afterthought

---

## Anti-patterns to Avoid

- Modals for complex flows — use pages or slide-in panels instead
- Inline editing of posted/locked records — mutations go through explicit actions
- Toast notifications for errors — errors belong inline, near the cause
- Empty screens without guidance — always suggest a next step
- Pagination for short lists — only paginate when genuinely needed (>50 items)
- Generic confirmation dialogs — confirmations should state exactly what will happen

---

## Reference

- **Keyboard shortcuts map**: See `CLAUDE.md` → Keyboard Shortcuts section
- **Form layout pattern**: Settings-style 3-column grid, documented in session history
- **AI assistant spec**: `/019-AIX-ai-document-inbox/spec.md` and `/020-AIB-ai-assistant/spec.md`
- **Intray / inbox**: `/018-ITR-intray-attention-queue/spec.md`
