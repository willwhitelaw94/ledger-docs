---
title: Design System & Style Guide
description: MoneyQuest Ledger colour palette, typography, status colours, and component patterns.
---

# Design System & Style Guide

Reference guide for the MoneyQuest Ledger visual language. All colours, tokens, and component patterns documented here are sourced from the codebase and should be treated as the single source of truth.

---

## 1. Brand Identity

| Attribute    | Value                                                                 |
|--------------|-----------------------------------------------------------------------|
| Product      | **MoneyQuest Ledger**                                                 |
| Tagline      | Modern double-entry accounting for growing businesses                 |
| Personality  | Professional, trustworthy, modern financial software                  |
| Default mode | **Dark mode** for all dashboard and tool surfaces; light mode available |
| Colour space | oklch (used for all CSS custom properties / theme tokens)             |

---

## 2. Colour Palette

All colours are defined as CSS custom properties in `frontend/src/app/globals.css` using the oklch colour space. Approximate hex values are provided for quick visual reference only -- the oklch values are canonical.

### 2.1 Base Theme (Neutral / Zinc)

Core surface and text tokens. These form the monochromatic foundation of every page.

| Token                | Light (`:root`)            | ~Hex     | Dark (`.dark`)               | ~Hex     |
|----------------------|----------------------------|----------|------------------------------|----------|
| `--background`       | `oklch(1 0 0)`             | `#ffffff`| `oklch(0.145 0 0)`           | `#1a1a1a`|
| `--foreground`       | `oklch(0.145 0 0)`         | `#1a1a1a`| `oklch(0.985 0 0)`           | `#fafafa`|
| `--card`             | `oklch(1 0 0)`             | `#ffffff`| `oklch(0.205 0 0)`           | `#2e2e2e`|
| `--card-foreground`  | `oklch(0.145 0 0)`         | `#1a1a1a`| `oklch(0.985 0 0)`           | `#fafafa`|
| `--popover`          | `oklch(1 0 0)`             | `#ffffff`| `oklch(0.205 0 0)`           | `#2e2e2e`|
| `--popover-foreground`| `oklch(0.145 0 0)`        | `#1a1a1a`| `oklch(0.985 0 0)`           | `#fafafa`|
| `--primary`          | `oklch(0.205 0 0)`         | `#2e2e2e`| `oklch(0.922 0 0)`           | `#e5e5e5`|
| `--primary-foreground`| `oklch(0.985 0 0)`        | `#fafafa`| `oklch(0.205 0 0)`           | `#2e2e2e`|
| `--secondary`        | `oklch(0.97 0 0)`          | `#f5f5f5`| `oklch(0.269 0 0)`           | `#3b3b3b`|
| `--secondary-foreground`| `oklch(0.205 0 0)`      | `#2e2e2e`| `oklch(0.985 0 0)`           | `#fafafa`|
| `--muted`            | `oklch(0.97 0 0)`          | `#f5f5f5`| `oklch(0.269 0 0)`           | `#3b3b3b`|
| `--muted-foreground` | `oklch(0.556 0 0)`         | `#7c7c7c`| `oklch(0.708 0 0)`           | `#a3a3a3`|
| `--accent`           | `oklch(0.97 0 0)`          | `#f5f5f5`| `oklch(0.269 0 0)`           | `#3b3b3b`|
| `--accent-foreground`| `oklch(0.205 0 0)`         | `#2e2e2e`| `oklch(0.985 0 0)`           | `#fafafa`|
| `--destructive`      | `oklch(0.577 0.245 27.325)`| `#dc2626`| `oklch(0.704 0.191 22.216)`  | `#f87171`|
| `--border`           | `oklch(0.922 0 0)`         | `#e5e5e5`| `oklch(1 0 0 / 10%)`         | `rgba(255,255,255,0.1)`|
| `--input`            | `oklch(0.922 0 0)`         | `#e5e5e5`| `oklch(1 0 0 / 15%)`         | `rgba(255,255,255,0.15)`|
| `--ring`             | `oklch(0.708 0 0)`         | `#a3a3a3`| `oklch(0.556 0 0)`           | `#7c7c7c`|

### 2.2 Financial Semantic Tokens

Domain-specific colour tokens used throughout the application for financial data display. Use these instead of raw Tailwind colour classes whenever displaying monetary or reconciliation information.

| Token               | Purpose                              | Light oklch                    | ~Hex     | Dark oklch                     | ~Hex     |
|----------------------|--------------------------------------|--------------------------------|----------|--------------------------------|----------|
| `--money-positive`   | Credits, income, gains, profit       | `oklch(0.627 0.194 149.214)`   | `#22c55e`| `oklch(0.723 0.194 149.214)`   | `#4ade80`|
| `--money-negative`   | Debits, expenses, losses, amounts due| `oklch(0.577 0.245 27.325)`    | `#dc2626`| `oklch(0.704 0.191 22.216)`    | `#f87171`|
| `--money-neutral`    | Zero balances, inactive amounts      | `oklch(0.556 0 0)`             | `#7c7c7c`| `oklch(0.708 0 0)`             | `#a3a3a3`|
| `--recon-matched`    | Reconciled / matched transactions    | `oklch(0.627 0.194 149.214)`   | `#22c55e`| `oklch(0.723 0.194 149.214)`   | `#4ade80`|
| `--recon-suggested`  | Suggested matches (amber/gold)       | `oklch(0.769 0.188 70.08)`     | `#f59e0b`| `oklch(0.828 0.189 84.429)`    | `#fbbf24`|
| `--recon-unmatched`  | Unreconciled items                   | `oklch(0.577 0.245 27.325)`    | `#dc2626`| `oklch(0.704 0.191 22.216)`    | `#f87171`|
| `--recon-pending`    | Awaiting review (blue/purple)        | `oklch(0.488 0.243 264.376)`   | `#3b82f6`| `oklch(0.588 0.243 264.376)`   | `#60a5fa`|

**Usage in Tailwind:**

```tsx
// Positive value (profit, revenue, credit)
<span className="text-money-positive tabular-nums">{formatMoney(revenue)}</span>

// Negative value (loss, expense, debit)
<span className="text-money-negative tabular-nums">{formatMoney(expense)}</span>

// Conditional colouring
<span className={profit >= 0 ? "text-money-positive" : "text-money-negative"}>
  {formatMoney(profit)}
</span>

// Reconciliation status background
<div className="bg-recon-pending/10 text-recon-pending">Pending review</div>
```

### 2.3 Chart Colours

Five-colour palette for data visualisations (Recharts, chart components). Light and dark palettes differ to maintain contrast on their respective backgrounds.

| Token      | Light oklch                     | ~Hex     | Dark oklch                     | ~Hex     |
|------------|--------------------------------|----------|--------------------------------|----------|
| `--chart-1`| `oklch(0.646 0.222 41.116)`    | `#e76f51`| `oklch(0.488 0.243 264.376)`   | `#3b82f6`|
| `--chart-2`| `oklch(0.6 0.118 184.704)`     | `#2a9d8f`| `oklch(0.696 0.17 162.48)`     | `#34d399`|
| `--chart-3`| `oklch(0.398 0.07 227.392)`    | `#264653`| `oklch(0.769 0.188 70.08)`     | `#f59e0b`|
| `--chart-4`| `oklch(0.828 0.189 84.429)`    | `#e9c46a`| `oklch(0.627 0.265 303.9)`     | `#a855f7`|
| `--chart-5`| `oklch(0.769 0.188 70.08)`     | `#f4a261`| `oklch(0.645 0.246 16.439)`    | `#ef4444`|

### 2.4 Sidebar Colours

| Token                        | Light                 | Dark                           |
|------------------------------|----------------------|--------------------------------|
| `--sidebar`                  | `oklch(0.985 0 0)`   | `oklch(0.205 0 0)`             |
| `--sidebar-foreground`       | `oklch(0.145 0 0)`   | `oklch(0.985 0 0)`             |
| `--sidebar-primary`          | `oklch(0.205 0 0)`   | `oklch(0.488 0.243 264.376)`   |
| `--sidebar-primary-foreground`| `oklch(0.985 0 0)`  | `oklch(0.985 0 0)`             |
| `--sidebar-accent`           | `oklch(0.97 0 0)`    | `oklch(0.269 0 0)`             |
| `--sidebar-accent-foreground`| `oklch(0.205 0 0)`   | `oklch(0.985 0 0)`             |
| `--sidebar-border`           | `oklch(0.922 0 0)`   | `oklch(1 0 0 / 10%)`           |
| `--sidebar-ring`             | `oklch(0.708 0 0)`   | `oklch(0.556 0 0)`             |

---

## 3. Typography

Fonts are loaded via `next/font/google` in `frontend/src/app/layout.tsx`.

| Role         | Font Family        | CSS Variable    | Usage                                     |
|--------------|--------------------|-----------------|-------------------------------------------|
| UI / Body    | **Inter**          | `--font-sans`   | All interface text, labels, paragraphs     |
| Code / Data  | **JetBrains Mono** | `--font-mono`   | Code blocks, IDs, reference numbers        |

### Type Scale

Follows Tailwind CSS defaults. Key sizes used throughout the application:

| Class         | Size   | Usage                                        |
|---------------|--------|----------------------------------------------|
| `text-xs`     | 12px   | Badge text, helper text, timestamps          |
| `text-sm`     | 14px   | Table cells, form labels, secondary text     |
| `text-base`   | 16px   | Body text, paragraphs                        |
| `text-lg`     | 18px   | Card titles, section headings                |
| `text-xl`     | 20px   | Page section titles                          |
| `text-2xl`    | 24px   | Stat card values, KPI figures                |
| `text-3xl`    | 30px   | Page titles                                  |

### Financial Number Formatting

All monetary and numeric values MUST use `tabular-nums` for column alignment:

```tsx
// Monetary amounts -- always tabular-nums + font-mono for alignment
<span className="tabular-nums font-mono text-right">$12,345.67</span>

// Large stat values
<p className="text-2xl font-semibold tabular-nums">{formatMoney(total)}</p>
```

**Rules:**
- Use `tabular-nums` on every cell or element that displays numeric/monetary data.
- Use `font-mono` for reference numbers, IDs, and account codes.
- Use `text-right` for numeric table columns.
- Always use `formatMoney()` utility for currency display -- never format manually.

---

## 4. Status Badge Standards

The `StatusBadge` component (`frontend/src/components/financial/StatusBadge.tsx`) is the single source of truth for status colouring across the application. It supports five visual variants.

### Variant Styles

| Variant    | Background                          | Text                        | Dot Colour                   | Usage                      |
|------------|-------------------------------------|-----------------------------|------------------------------|----------------------------|
| `success`  | `bg-green-600/10` / `bg-green-400/10`| `text-green-600` / `text-green-400`| `bg-green-600` / `bg-green-400`| Positive final states      |
| `warning`  | `bg-amber-600/10` / `bg-amber-400/10`| `text-amber-600` / `text-amber-400`| `bg-amber-600` / `bg-amber-400`| Awaiting action, in-progress|
| `danger`   | `bg-destructive/10`                 | `text-destructive`          | `bg-destructive`             | Errors, irreversible       |
| `pending`  | transparent (outline style)         | `text-amber-600` / `text-amber-400`| none (uses AlertCircle icon) | Draft / initial state      |
| `neutral`  | `bg-muted`                          | `text-muted-foreground`     | `bg-muted-foreground`        | Terminal non-active states |

### Complete Status Map

| Status        | Variant    | Colour   | Domain(s)                        |
|---------------|------------|----------|----------------------------------|
| `draft`       | `pending`  | amber outline | Journal entries, invoices, bills, quotes |
| `pending`     | `warning`  | amber    | Journal entries (awaiting approval)       |
| `approved`    | `success`  | green    | Journal entries, invoices                 |
| `posted`      | `success`  | green    | Journal entries (final, immutable)        |
| `reversed`    | `danger`   | red      | Journal entries                           |
| `sent`        | `warning`  | amber    | Invoices, quotes                          |
| `viewed`      | `warning`  | amber    | Invoices                                  |
| `partial`     | `warning`  | amber    | Invoices (partially paid)                 |
| `paid`        | `success`  | green    | Invoices                                  |
| `overdue`     | `danger`   | red      | Invoices, bills                           |
| `voided`      | `danger`   | red      | Invoices                                  |
| `active`      | `success`  | green    | Jobs, periods, accounts                   |
| `open`        | `success`  | green    | Accounting periods                        |
| `completed`   | `neutral`  | muted    | Jobs                                      |
| `archived`    | `neutral`  | muted    | Jobs                                      |
| `closed`      | `neutral`  | muted    | Periods, jobs                             |
| `locked`      | `danger`   | red      | Accounting periods                        |
| `matched`     | `success`  | green    | Bank reconciliation                       |
| `suggested`   | `warning`  | amber    | Bank reconciliation                       |
| `unmatched`   | `pending`  | amber outline | Bank reconciliation                  |

### Usage

```tsx
import { StatusBadge } from '@/components/financial/StatusBadge'

// Always use the component -- never style status badges inline
<StatusBadge status="posted" />
<StatusBadge status="overdue" />
<StatusBadge status={invoice.status} />
```

The component accepts `EntryStatus`, `InvoiceStatus`, `JobStatus`, `PeriodStatus`, and `ReconciliationStatus` type unions. Unknown statuses fall back to the `neutral` variant.

---

## 5. Priority & Urgency Colours

Used in the intray (attention queue), notifications, and task systems.

| Priority   | Colour  | Tailwind Classes                                    |
|------------|---------|-----------------------------------------------------|
| Critical   | Red     | `bg-red-600/10 text-red-600 dark:text-red-400`      |
| High       | Amber   | `bg-amber-600/10 text-amber-600 dark:text-amber-400`|
| Normal     | Default | `bg-muted text-muted-foreground`                    |
| Low        | Muted   | `bg-muted text-muted-foreground`                    |

### Home Page Colour Map

The home page uses a structured colour map for stat chips and action feed items. Each colour provides coordinated values for background, icon, text, subtext, and badge:

| Colour   | Background                                          | Icon                                          |
|----------|-----------------------------------------------------|-----------------------------------------------|
| `red`    | `bg-red-50 dark:bg-red-950/30 border-red-200/60`    | `bg-red-100 dark:bg-red-900/50 text-red-600`  |
| `amber`  | `bg-amber-50 dark:bg-amber-950/30 border-amber-200/60`| `bg-amber-100 dark:bg-amber-900/50 text-amber-600`|
| `blue`   | `bg-blue-50 dark:bg-blue-950/30 border-blue-200/60` | `bg-blue-100 dark:bg-blue-900/50 text-blue-600`|
| `purple` | `bg-purple-50 dark:bg-purple-950/30 border-purple-200/60`| `bg-purple-100 dark:bg-purple-900/50 text-purple-600`|

---

## 6. Icon Guidelines

The project uses **Lucide React** as its sole icon library.

### General Rules

- Import individual icons: `import { FileText } from 'lucide-react'`
- Default size: `size-4` (16px) for inline, `size-5` (20px) for buttons, `size-6` (24px) for cards
- Stroke width: use Lucide defaults (2px) -- do not override unless there is a specific reason

### Context-Specific Colouring

| Context                | Colour Rule                                        |
|------------------------|----------------------------------------------------|
| Sidebar nav items      | `text-muted-foreground`; active state: `text-foreground` |
| Stat card icons        | Single accent colour with `/10` opacity background (e.g., `bg-blue-100 dark:bg-blue-900/50 text-blue-600`) |
| Financial directional  | `text-money-positive` for income/up, `text-money-negative` for expense/down |
| Destructive actions    | `text-destructive`                                 |
| Neutral / informational| `text-muted-foreground`                            |

### Stat Card Icon Pattern

Stat cards on the home page and dashboard use a consistent icon treatment -- a rounded container with a soft tinted background:

```tsx
<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
</div>
```

All stat card icons on a single page should use the **same accent colour** to maintain visual cohesion. Do not use rainbow/multicolour icon sets.

---

## 7. Component Patterns

### Cards

Use the shadcn `Card` component. Cards use `--card` background and `--border` borders.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Revenue</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-semibold tabular-nums text-money-positive">
      {formatMoney(revenue)}
    </p>
  </CardContent>
</Card>
```

### Buttons

shadcn `Button` component with these variants:

| Variant       | Usage                                    |
|---------------|------------------------------------------|
| `default`     | Primary actions (submit, save, create)   |
| `outline`     | Secondary actions (cancel, filter)       |
| `ghost`       | Tertiary actions (icon buttons, toggles) |
| `destructive` | Dangerous actions (delete, void, reverse)|
| `link`        | Inline text links styled as buttons      |

### Tables (DataTable)

All data grids use **TanStack Table v8** wrapped in a shared `DataTable` component at `frontend/src/components/data-table/data-table.tsx`.

- Server-side pagination for lists > 50 items
- Virtual scrolling for lists > 100 visible rows
- Numeric columns: `text-right tabular-nums`
- Monetary columns: use `formatMoney()` + `text-money-positive` / `text-money-negative`
- Bulk actions: `DataTableBulkActionTray` appears when rows are selected

### Forms

- **React Hook Form** for form state management
- **Zod** schemas for validation
- shadcn form components (`Input`, `Select`, `Textarea`, `Switch`, etc.)
- Submit via `Cmd/Ctrl + Enter` keyboard shortcut

### Badges

shadcn `Badge` component (`frontend/src/components/ui/badge.tsx`) with six variants:

| Variant       | Style                          |
|---------------|--------------------------------|
| `default`     | `bg-primary text-primary-foreground` |
| `secondary`   | `bg-secondary text-secondary-foreground` |
| `destructive` | `bg-destructive text-white`    |
| `outline`     | `border-border text-foreground`|
| `ghost`       | transparent, hover accent      |
| `link`        | text underline                 |

For **status badges**, always use the `StatusBadge` component instead of the raw `Badge` -- it handles the full status-to-colour mapping.

### StatusTabs

Xero-style tab bar for filtering index pages by status. Replaces dropdown facet filters.

```tsx
import { StatusTabs } from '@/components/status-tabs'

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
]

<StatusTabs
  tabs={TABS}
  activeTab={activeStatus}
  onTabChange={setActiveStatus}
  counts={countsData}   // from /counts endpoint
/>
```

The active tab shows a `bg-primary` underline and count badges use `bg-primary/10 text-primary`.

### ViewToggle

Table/Kanban view switcher for lifecycle-based pages (invoices, bills, jobs). Sidebar auto-collapses in kanban mode to maximise horizontal space.

---

## 8. Dark Mode

Dark mode is the **default** for all dashboard surfaces.

### Implementation Details

- Theme switching via `next-themes` (class-based: `.dark` on `<html>`)
- All theme tokens defined in oklch colour space
- The `.dark` class is applied by `<Providers>` wrapping the app

### Rules

1. **Always use semantic tokens** (`text-foreground`, `bg-card`, `border-border`) instead of raw colour classes where possible.
2. When using ad-hoc Tailwind colours (e.g., `bg-green-600`), **always include a `dark:` variant** (e.g., `bg-green-600/10 dark:bg-green-400/10`).
3. Opacity-based tinting works well for both modes: `bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400`.
4. Never assume a white background -- use `bg-background` or `bg-card`.
5. Border colour in dark mode uses `oklch(1 0 0 / 10%)` (white at 10% opacity) -- do not hardcode border greys.

---

## 9. Border Radius

The project uses a base radius variable with computed sizes:

| Token          | Computed Value          | Usage                     |
|----------------|------------------------|---------------------------|
| `--radius`     | `0.625rem` (10px)      | Base value                |
| `--radius-sm`  | `calc(radius - 4px)` = 6px | Small inputs, badges   |
| `--radius-md`  | `calc(radius - 2px)` = 8px | Buttons, inputs        |
| `--radius-lg`  | `radius` = 10px        | Cards, dialogs           |
| `--radius-xl`  | `calc(radius + 4px)` = 14px | Large containers      |
| `--radius-2xl` | `calc(radius + 8px)` = 18px | Hero cards            |

---

## 10. Animation

### Heartbeat Animation

A pulsing scale + box-shadow animation used for attention-drawing elements (e.g., overdue alerts):

```css
--animate-heartbeat: heartbeat 2s infinite ease-in-out;
```

Customise the pulse colour via `--heartbeat-color` (defaults to `--destructive`):

```tsx
<div
  className="animate-heartbeat"
  style={{ '--heartbeat-color': 'var(--recon-pending)' } as React.CSSProperties}
/>
```

---

## 11. Anti-patterns

These are common mistakes to avoid. Following these rules keeps the UI consistent and maintainable.

### Do NOT use rainbow colours for stat card icons

Every stat card on a page should use the **same accent colour**. Mismatched rainbow icons (red, blue, green, purple on one card each) look unprofessional and create visual noise.

```tsx
// BAD -- rainbow icons
<StatCard icon={<DollarSign className="text-green-500" />} />
<StatCard icon={<Users className="text-blue-500" />} />
<StatCard icon={<TrendingUp className="text-purple-500" />} />

// GOOD -- single accent, consistent
<StatCard icon={<DollarSign className="text-blue-600 dark:text-blue-400" />} />
<StatCard icon={<Users className="text-blue-600 dark:text-blue-400" />} />
<StatCard icon={<TrendingUp className="text-blue-600 dark:text-blue-400" />} />
```

### Do NOT redefine status badge colours inline

Always use the `StatusBadge` component. Inline colour definitions for statuses will inevitably drift.

```tsx
// BAD
<Badge className="bg-green-100 text-green-800">{entry.status}</Badge>

// GOOD
<StatusBadge status={entry.status} />
```

### Do NOT hardcode colours without dark: variants

Any ad-hoc colour MUST include its dark mode counterpart. Missing `dark:` variants cause invisible or low-contrast text in dark mode.

```tsx
// BAD
<span className="text-green-600">+$500</span>

// GOOD
<span className="text-money-positive">+$500</span>

// Also acceptable when semantic tokens don't apply
<span className="text-green-600 dark:text-green-400">Active</span>
```

### Do NOT use `bg-green-500` when you mean `money-positive`

Semantic tokens exist for a reason -- they communicate intent, are centrally maintained, and automatically adapt to light/dark mode.

```tsx
// BAD -- ambiguous intent
<span className="text-green-500">{formatMoney(profit)}</span>

// GOOD -- clear intent
<span className="text-money-positive">{formatMoney(profit)}</span>
```

### Do NOT use chart colours for non-chart purposes

`chart-1` through `chart-5` are reserved for data visualisations. Using them for badges, status indicators, or UI chrome creates confusing colour associations.

### Do NOT use floating-point numbers for money

This is an architecture rule, but it manifests visually. All monetary values are stored as integers (cents) and formatted for display via `formatMoney()`. Never construct currency strings manually.

```tsx
// BAD
<span>${(amount / 100).toFixed(2)}</span>

// GOOD
<span>{formatMoney(amount)}</span>
```
