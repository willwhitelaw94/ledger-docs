---
title: "Feature Specification: Configurable Dashboard Grid"
---

# Feature Specification: Configurable Dashboard Grid

**Epic**: 057-CDB2
**Created**: 2026-03-20
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 5 (Experience Layer)
**Design Direction**: 12-column resizable grid with draggable tiles, multiple dashboards, rich widget library
**Supersedes**: 016-CDB (basic widget show/hide/reorder — still the fallback on mobile)

---

## Context

016-CDB shipped basic widget customisation — toggle visibility and drag-to-reorder in a single-column vertical list. It works, but it's a list of cards, not a dashboard. Users can't control how wide a widget is, can't have two widgets side-by-side, and can't save multiple dashboard layouts for different contexts (e.g. "Morning Review" vs "Month-End Close").

This epic replaces the vertical list with a **12-column CSS grid** where every widget is a tile that can be:
- **Dragged** to any grid cell
- **Resized** by dragging the right/bottom edges (snapping to column/row boundaries)
- **Added** from a widget library sidebar
- **Removed** with a single click

Layouts persist per user per workspace. Users can create **multiple named dashboards** and switch between them. A set of **preset dashboards** (Simple, Advanced, Bookkeeper, Business Owner) provide sensible starting points that can be customised further.

The same system powers both the **Home screen** (cross-entity overview below the welcome section) and the **Entity dashboard** (workspace-scoped at `/w/[slug]/dashboard`).

### Design Inspiration

The visual language draws from shadcn studio's dashboard blocks:
- **Dashboard Shell 05** — clean card-based grid with stat cards, charts, and activity feeds
- **Statistics Components** — compact KPI cards with sparklines, progress bars, trend indicators
- **Widgets Components** — progress trackers, activity tables, donut breakdowns
- **Charts Components** — area, bar, line, donut, stacked charts in card containers
- **Bento Grid** — asymmetric tile sizes for visual hierarchy (hero stat = 4 cols, small KPI = 2 cols)

All widgets use shadcn/ui Card as the container. Dark mode first. Geist Sans for labels, Geist Mono for numbers/amounts.

### What This Enables

| Role | Dashboard preset | Key widgets |
|------|-----------------|-------------|
| **Business Owner** | Simple | Net position hero, Cash in/out, Invoices owed, Bills to pay |
| **Bookkeeper** | Bookkeeper | Bank accounts, Reconciliation health, Unmatched txns, Tasks |
| **Accountant** | Advanced | P&L MTD, Balance sheet summary, Journal entries, Period status |
| **Sole Trader** | Simple | Cash position, Invoices owed, Upcoming repeating, Tax estimate |
| **Practice Manager** | Practice | Client workspaces grid, Overdue tasks, Compliance calendar |

### Relationship to Existing System

- The current `DashboardLayout` model stores `{ bank_accounts: string[], widgets: WidgetId[], onboarding_dismissed: boolean }` — a flat list
- This epic extends the schema to store a **grid layout** per dashboard: `{ columns, rows, tiles: [{ widgetId, x, y, w, h, config }] }`
- The existing vertical list layout is auto-migrated to the new grid format (widgets stacked in a single column)
- Mobile falls back to single-column stacked layout (no grid on < 768px)

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Supersedes** | 016-CDB | Replaces vertical list with grid; migrates saved layouts |
| **Depends on** | 002-CLE | Workspace context, tenant scoping |
| **Depends on** | 003-AUT | User identity for per-user layout persistence |
| **Depends on** | 004-BFR | Bank account list for bank widgets |
| **Depends on** | 005-IAR | Invoice/bill data for AR/AP widgets |
| **Depends on** | 007-FRC | P&L, balance sheet data for reporting widgets |
| **Depends on** | 021-AIQ | AI chatbot for AI insights widget |
| **Enhances** | Home screen | Grid replaces static layout below welcome section |

---

## Widget Library

The widget library is the catalogue of available tiles. Each widget has a **default size** (columns x rows) and a **minimum size**. Users can resize within the min/max bounds.

### Category: KPI Stats (Small Tiles)

| Widget ID | Name | Default Size | Min Size | Data Source |
|-----------|------|-------------|----------|-------------|
| `kpi_net_worth` | Net Worth | 3x2 | 2x2 | `/api/v1/consolidation/net-worth` |
| `kpi_cash_position` | Cash Position | 3x2 | 2x2 | Bank account balances aggregate |
| `kpi_revenue_mtd` | Revenue MTD | 2x2 | 2x1 | P&L endpoint (revenue only) |
| `kpi_expenses_mtd` | Expenses MTD | 2x2 | 2x1 | P&L endpoint (expenses only) |
| `kpi_net_profit_mtd` | Net Profit MTD | 2x2 | 2x1 | P&L endpoint (net) |
| `kpi_ar_outstanding` | AR Outstanding | 2x2 | 2x1 | Invoice aging total |
| `kpi_ap_outstanding` | AP Outstanding | 2x2 | 2x1 | Bill aging total |
| `kpi_unreconciled` | Unreconciled Txns | 2x2 | 2x1 | Banking unreconciled count |
| `kpi_overdue_invoices` | Overdue Invoices | 2x2 | 2x1 | Overdue invoice count + total |
| `kpi_tax_estimate` | Tax Estimate | 2x2 | 2x1 | BAS/tax calculation |

### Category: Charts (Medium/Large Tiles)

| Widget ID | Name | Default Size | Min Size | Data Source |
|-----------|------|-------------|----------|-------------|
| `chart_cash_flow` | Cash In & Out | 6x3 | 4x3 | `/api/v1/payments/cash-summary` |
| `chart_pnl_trend` | P&L Trend | 6x3 | 4x3 | Monthly P&L over 6–12 months |
| `chart_ar_aging` | AR Aging | 4x3 | 3x3 | Invoice aging buckets |
| `chart_ap_aging` | AP Aging | 4x3 | 3x3 | Bill aging buckets |
| `chart_revenue_breakdown` | Revenue by Category | 4x3 | 3x3 | Revenue by account category |
| `chart_expense_breakdown` | Expense Breakdown | 4x3 | 3x3 | Expense by account category |
| `chart_bank_balances` | Bank Balance Trend | 6x3 | 4x3 | Daily balance snapshots |
| `chart_budget_vs_actual` | Budget vs Actual | 6x3 | 4x3 | Budget comparison |

### Category: Tables & Lists (Medium Tiles)

| Widget ID | Name | Default Size | Min Size | Data Source |
|-----------|------|-------------|----------|-------------|
| `list_recent_journals` | Recent Journal Entries | 6x3 | 4x3 | Last 10 JEs |
| `list_overdue_invoices` | Overdue Invoices | 6x3 | 4x3 | Overdue invoices list |
| `list_upcoming_bills` | Upcoming Bills | 6x3 | 4x3 | Bills due next 14 days |
| `list_upcoming_repeating` | Upcoming Repeating | 4x3 | 3x2 | Next 5 recurring templates |
| `list_recent_payments` | Recent Payments | 6x3 | 4x3 | Last 10 payments |
| `list_unmatched_txns` | Unmatched Transactions | 6x3 | 4x3 | Bank txns needing matching |

### Category: Status & Health (Medium Tiles)

| Widget ID | Name | Default Size | Min Size | Data Source |
|-----------|------|-------------|----------|-------------|
| `status_reconciliation` | Reconciliation Health | 4x3 | 3x2 | Per-account reconciliation % |
| `status_period` | Period Status | 4x2 | 3x2 | Open/closed accounting periods |
| `status_compliance` | Compliance Checklist | 4x3 | 3x2 | BAS due dates, obligations |
| `status_entity_health` | Entity Health Score | 3x2 | 2x2 | 051-EHS score if available |

### Category: Bank Accounts (Variable)

| Widget ID | Name | Default Size | Min Size | Data Source |
|-----------|------|-------------|----------|-------------|
| `bank_{id}` | [Bank Account Name] | 4x2 | 3x2 | Per-account balance, last txn |

Bank widgets are dynamically generated — one per active bank account. They show current balance, last transaction, reconciliation status, and a "Reconcile" CTA.

### Category: Activity & Tasks

| Widget ID | Name | Default Size | Min Size | Data Source |
|-----------|------|-------------|----------|-------------|
| `tasks_attention` | Attention Queue | 4x3 | 3x2 | Intray items needing action |
| `tasks_my_tasks` | My Tasks | 4x3 | 3x2 | Practice tasks assigned to user |
| `activity_feed` | Activity Feed | 4x4 | 3x3 | Recent workspace activity |
| `ai_insights` | AI Insights | 4x3 | 3x2 | AI-generated financial observations |

### Category: Home Screen Only

| Widget ID | Name | Default Size | Min Size | Data Source |
|-----------|------|-------------|----------|-------------|
| `home_entities` | My Entities | 12x3 | 6x3 | Workspace cards with net position |
| `home_net_worth_hero` | Net Worth Hero | 12x2 | 6x2 | Cross-entity net worth |
| `home_alerts` | Attention Summary | 6x2 | 4x2 | Cross-entity overdue/pending counts |
| `home_quick_actions` | Quick Actions | 4x2 | 3x2 | New Invoice, Bill, JE, Contact |

---

## Grid System

### Layout Engine

- **12-column grid** with auto-sized rows (each row = fixed height, e.g. 80px)
- **Snap-to-grid**: tiles snap to column and row boundaries when dragged or resized
- **Collision detection**: tiles cannot overlap; dragging a tile into occupied space pushes others down
- **Responsive breakpoints**:
  - `>= 1280px` (xl): 12 columns — full grid
  - `>= 1024px` (lg): 8 columns — widgets scale proportionally
  - `>= 768px` (md): 6 columns — compact grid
  - `< 768px` (sm): single-column stack — no grid, widgets render full-width in order

### Library: `react-grid-layout`

Use [`react-grid-layout`](https://github.com/react-grid-layout/react-grid-layout) — the de facto React grid library. It provides:
- Drag-and-drop positioning
- Resize handles on tiles
- Responsive breakpoint layouts
- Collision avoidance with auto-compaction
- Serializable layout objects (`{ i, x, y, w, h, minW, minH }`)

This replaces `@dnd-kit/sortable` for dashboard layout (dnd-kit remains for other list reordering in the app).

### Layout Serialization

Each dashboard layout is stored as:

```typescript
type TileLayout = {
  i: string;       // widget ID (e.g. 'kpi_net_worth', 'bank_42')
  x: number;       // column position (0-11)
  y: number;       // row position
  w: number;       // width in columns
  h: number;       // height in rows
  minW?: number;   // minimum width
  minH?: number;   // minimum height
  config?: Record<string, unknown>; // widget-specific config (date range, etc.)
};

type Dashboard = {
  id: string;                     // UUID
  name: string;                   // User-given name
  is_default: boolean;            // Show this on load
  tiles: TileLayout[];            // Grid layout
  breakpoints?: {                 // Optional per-breakpoint overrides
    lg?: TileLayout[];
    md?: TileLayout[];
  };
};

type DashboardCollection = {
  dashboards: Dashboard[];
  active_dashboard_id: string;
};
```

---

## User Scenarios & Testing

### User Story 1 — Resize a Widget (Priority: P1)

A business owner finds the Cash In & Out chart too small to read the month labels. They enter edit mode, grab the bottom-right corner of the chart widget, and drag it from 6 columns wide to 8 columns. The chart re-renders at the larger size. They click "Done" and the layout is saved.

**Acceptance Scenarios**:

1. **Given** a user is in edit mode, **When** they hover over the bottom-right corner of a widget tile, **Then** a resize handle cursor appears.
2. **Given** a user is dragging the resize handle, **When** they drag right, **Then** the tile width increases in column increments (snaps to grid).
3. **Given** a user is dragging the resize handle, **When** they try to resize below the widget's minimum size, **Then** the resize stops at the minimum — the tile cannot be made smaller.
4. **Given** a user resizes a widget, **When** it expands into space occupied by another widget, **Then** the displaced widget is pushed down (not overlapped).
5. **Given** a user has resized a widget and clicks "Done", **When** they refresh the page, **Then** the resized layout persists.

---

### User Story 2 — Create a New Dashboard (Priority: P1)

An accountant wants a separate dashboard for month-end. They click the dashboard name dropdown, select "New Dashboard", name it "Month-End Review", and choose the "Advanced" preset as a starting point. They then customise it — removing bank account widgets and adding P&L Trend and Budget vs Actual charts.

**Acceptance Scenarios**:

1. **Given** a user is on the dashboard, **When** they click the dashboard name/switcher, **Then** a dropdown shows their saved dashboards plus a "+ New Dashboard" option.
2. **Given** the user clicks "+ New Dashboard", **When** the creation dialog opens, **Then** they can enter a name and select a preset (Blank, Simple, Advanced, Bookkeeper, Business Owner) or duplicate an existing dashboard.
3. **Given** the user creates a new dashboard, **When** they select a preset, **Then** the dashboard is initialised with that preset's tile layout and immediately enters edit mode.
4. **Given** a user has multiple dashboards, **When** they switch between them via the dropdown, **Then** the grid layout changes instantly (no page reload).
5. **Given** a user has multiple dashboards, **When** they set one as default, **Then** that dashboard loads automatically on their next visit.

---

### User Story 3 — Drag a Widget to a New Position (Priority: P1)

A bookkeeper wants their bank account widgets next to the reconciliation health widget instead of above it. They enter edit mode, grab the reconciliation health widget by its drag handle, and drag it to the right of the bank accounts row.

**Acceptance Scenarios**:

1. **Given** edit mode is active, **When** a user clicks and holds on a widget's drag handle, **Then** the widget lifts visually (shadow, slight scale) and follows the cursor.
2. **Given** a widget is being dragged, **When** it moves over an empty grid area, **Then** a placeholder shows where the widget will land.
3. **Given** a widget is dropped in a new position, **When** other widgets occupy nearby space, **Then** displaced widgets reflow automatically (compact upward).
4. **Given** a user has repositioned widgets and clicks "Done", **When** they refresh, **Then** the positions persist.

---

### User Story 4 — Add a Widget from the Library (Priority: P1)

A user wants to add a Revenue Breakdown chart to their dashboard. They enter edit mode, click "Add Widget", browse the widget library grouped by category (KPIs, Charts, Tables, Status), find "Revenue by Category", and click "Add". The widget appears at the bottom of the grid at its default size.

**Acceptance Scenarios**:

1. **Given** edit mode is active, **When** the user clicks "Add Widget", **Then** a sidebar panel opens showing the widget library grouped by category.
2. **Given** the library is open, **When** the user searches by name, **Then** the list filters in real-time.
3. **Given** the user clicks "Add" on a widget, **Then** the widget is placed at the first available position at its default size.
4. **Given** a widget is already on the dashboard, **Then** it shows as "Added" in the library (greyed out) — no duplicate widgets.
5. **Given** the library lists bank accounts, **Then** each bank account appears individually with its name and masked number.

---

### User Story 5 — Home Screen Grid (Priority: P2)

A user with 4 entities logs into the home screen. Below the welcome section, they see a grid dashboard: "Net Worth Hero" spanning the full width at the top, then a row of 4 entity cards, then an "Attention Summary" widget and "Quick Actions" side by side. They enter edit mode and rearrange these to put Quick Actions first.

**Acceptance Scenarios**:

1. **Given** a user is on the home screen (`/home`), **When** the page loads, **Then** the area below the welcome section renders as a configurable grid (same grid engine as entity dashboard).
2. **Given** the home screen grid, **When** the user enters edit mode, **Then** they can drag, resize, add, and remove widgets from the home widget catalogue.
3. **Given** the home screen layout, **When** it is saved, **Then** it is stored separately from workspace dashboards (scoped to user only, not workspace).
4. **Given** a user has no saved home layout, **When** they first visit, **Then** the default home preset loads (Net Worth Hero + Entity Cards + Alerts + Quick Actions).

---

### User Story 6 — Delete a Dashboard (Priority: P3)

A user has created a "Month-End" dashboard they no longer needs. They open the dashboard switcher, click the three-dot menu on "Month-End", and select "Delete". A confirmation dialog appears. After confirming, the dashboard is deleted and the user is switched to their default dashboard.

**Acceptance Scenarios**:

1. **Given** a user has multiple dashboards, **When** they click the three-dot menu on a non-default dashboard, **Then** options include "Set as default", "Duplicate", "Rename", and "Delete".
2. **Given** the user clicks "Delete", **When** a confirmation dialog appears and they confirm, **Then** the dashboard is permanently deleted.
3. **Given** the user tries to delete their only/default dashboard, **Then** the delete option is disabled with a tooltip explaining at least one dashboard is required.
4. **Given** a dashboard is deleted, **When** the active view was the deleted dashboard, **Then** the view switches to the default dashboard.

---

### User Story 7 — Preset Dashboards (Priority: P2)

A new user creates their first workspace. The dashboard loads with the "Simple" preset by default — a clean layout with: Cash Position (hero), Invoices Owed, Bills to Pay, and a Cash In & Out chart. They can switch to "Advanced" from the dashboard switcher to get the full data-dense layout, or start from scratch with "Blank".

**Acceptance Scenarios**:

1. **Given** a new user with no saved layouts, **When** they visit the dashboard for the first time, **Then** the "Simple" preset is loaded as the default dashboard named "Dashboard".
2. **Given** the user opens "New Dashboard", **When** they see the preset options, **Then** each preset shows a thumbnail preview of the layout.
3. **Given** a preset is selected, **Then** the following layouts are applied:

**Simple Preset** (4 tiles):
| Widget | Position | Size |
|--------|----------|------|
| `kpi_cash_position` | 0,0 | 6x2 |
| `kpi_net_profit_mtd` | 6,0 | 6x2 |
| `chart_ar_aging` | 0,2 | 6x3 |
| `chart_ap_aging` | 6,2 | 6x3 |
| `chart_cash_flow` | 0,5 | 12x3 |

**Advanced Preset** (10+ tiles):
| Widget | Position | Size |
|--------|----------|------|
| `kpi_revenue_mtd` | 0,0 | 3x2 |
| `kpi_expenses_mtd` | 3,0 | 3x2 |
| `kpi_net_profit_mtd` | 6,0 | 3x2 |
| `kpi_ar_outstanding` | 9,0 | 3x2 |
| `chart_pnl_trend` | 0,2 | 6x3 |
| `chart_cash_flow` | 6,2 | 6x3 |
| `chart_ar_aging` | 0,5 | 4x3 |
| `chart_ap_aging` | 4,5 | 4x3 |
| `status_reconciliation` | 8,5 | 4x3 |
| `list_recent_journals` | 0,8 | 6x3 |
| `list_upcoming_repeating` | 6,8 | 6x3 |

**Bookkeeper Preset** (8 tiles):
| Widget | Position | Size |
|--------|----------|------|
| `kpi_unreconciled` | 0,0 | 3x2 |
| `kpi_cash_position` | 3,0 | 3x2 |
| `kpi_ar_outstanding` | 6,0 | 3x2 |
| `kpi_ap_outstanding` | 9,0 | 3x2 |
| `status_reconciliation` | 0,2 | 6x3 |
| `list_unmatched_txns` | 6,2 | 6x3 |
| `tasks_attention` | 0,5 | 6x3 |
| `list_upcoming_repeating` | 6,5 | 6x3 |

**Business Owner Preset** (6 tiles):
| Widget | Position | Size |
|--------|----------|------|
| `kpi_cash_position` | 0,0 | 4x2 |
| `kpi_net_profit_mtd` | 4,0 | 4x2 |
| `kpi_overdue_invoices` | 8,0 | 4x2 |
| `chart_cash_flow` | 0,2 | 8x3 |
| `chart_ar_aging` | 8,2 | 4x3 |
| `list_overdue_invoices` | 0,5 | 6x3 |
| `list_upcoming_bills` | 6,5 | 6x3 |

---

### Edge Cases

- **Widget not available**: If a saved layout references a widget that requires a feature flag the user doesn't have (e.g. `ai_insights` requires AI chatbot), the tile renders with an "Upgrade" placeholder.
- **Bank account deleted**: If a `bank_{id}` tile references a deleted account, it is silently removed from the grid on next load.
- **New bank account added**: New accounts don't auto-appear on existing dashboards. The user adds them via the widget library. (Avoids layout disruption.)
- **Layout migration**: Existing 016-CDB layouts are migrated to a single "Dashboard" with tiles stacked vertically at default sizes.
- **Maximum dashboards**: 10 dashboards per user per workspace. Prevents unbounded storage.
- **Maximum tiles**: 24 tiles per dashboard. Prevents performance issues.
- **Empty dashboard**: If all tiles are removed, show empty state with "Add widgets to get started" prompt.
- **Concurrent edits**: Layout saves are last-write-wins. No real-time collaboration on layout editing.

---

## Requirements

### Functional Requirements

#### Grid Engine

- **FR-001**: The dashboard MUST render widgets in a 12-column CSS grid with snap-to-grid positioning.
- **FR-002**: Widgets MUST be draggable to any unoccupied grid position in edit mode.
- **FR-003**: Widgets MUST be resizable by dragging the bottom-right resize handle in edit mode.
- **FR-004**: Resize MUST snap to column and row boundaries (no fractional positions).
- **FR-005**: Resize MUST respect each widget's minimum size — the tile cannot be made smaller than minW x minH.
- **FR-006**: When a widget is dragged or resized into space occupied by another widget, the displaced widget MUST be pushed down (auto-compact vertically).
- **FR-007**: The grid MUST support responsive breakpoints: 12 columns (xl), 8 columns (lg), 6 columns (md), single-column stack (sm/mobile).
- **FR-008**: On mobile (< 768px), widgets MUST render in a single-column stack in their grid order — no drag/resize available.

#### Edit Mode

- **FR-010**: The dashboard MUST have an "Edit" button that enters edit mode, showing drag handles and resize handles on all tiles.
- **FR-011**: In edit mode, widget content MUST be non-interactive — clicks are captured by drag/resize handlers only.
- **FR-012**: Edit mode MUST show "Done" (save + exit) and "Cancel" (discard + exit) buttons.
- **FR-013**: An "Add Widget" button MUST open a sidebar panel showing the widget library grouped by category.
- **FR-014**: The widget library MUST support search by name.
- **FR-015**: Widgets already on the dashboard MUST show as "Added" in the library (not addable again).
- **FR-016**: Clicking "Add" on a widget MUST place it at the first available position at its default size.
- **FR-017**: Each widget tile MUST have a remove (x) button in edit mode that removes it from the grid.

#### Multiple Dashboards

- **FR-020**: Users MUST be able to create multiple named dashboards (up to 10 per workspace, up to 3 for home).
- **FR-021**: A dashboard switcher (dropdown in the page header) MUST be visible at ALL times (not only in edit mode) and allow switching between dashboards.
- **FR-022**: Creating a new dashboard MUST offer: name input + preset selection (Blank, Simple, Advanced, Bookkeeper, Business Owner) or "Duplicate existing".
- **FR-023**: One dashboard MUST be marked as default — this loads on page visit.
- **FR-024**: Non-default dashboards MUST be deletable via the switcher's context menu.
- **FR-025**: Dashboards MUST be renamable via the switcher's context menu.

#### Home Screen Grid

- **FR-030**: The home screen (`/home`) MUST render a configurable grid below the welcome section.
- **FR-031**: The home grid MUST use the same grid engine and edit mode as entity dashboards.
- **FR-032**: The home grid layout MUST be stored per user (not per workspace — home is cross-entity).
- **FR-033**: Home-specific widgets (`home_entities`, `home_net_worth_hero`, `home_alerts`, `home_quick_actions`) MUST only be available in the home widget library.
- **FR-034**: Entity-specific widgets (bank accounts, reconciliation, etc.) MUST NOT be available in the home widget library.

#### Persistence

- **FR-040**: Dashboard layouts MUST be persisted to the server via API.
- **FR-041**: Dashboard layouts MUST be scoped per user per workspace (entity dashboards) or per user (home dashboard).
- **FR-042**: The API MUST support CRUD operations on dashboards: list, get, create, update, delete.
- **FR-043**: Existing 016-CDB layouts MUST be auto-migrated to the new grid format on first load.

#### Widget Rendering

- **FR-050**: Each widget MUST render within a shadcn/ui Card container with consistent padding and border radius.
- **FR-051**: KPI widgets MUST show: metric label, current value (Geist Mono, large), trend indicator (up/down arrow + percentage), optional sparkline.
- **FR-052**: Chart widgets MUST use Recharts and auto-resize when the tile is resized.
- **FR-053**: List/table widgets MUST show a compact table with the most recent N items and a "View all" link.
- **FR-054**: Bank account widgets MUST show: account name, masked number, current balance, last transaction date, reconciliation %, and a "Reconcile" button.
- **FR-055**: All widgets MUST handle loading state (skeleton) and error state (retry button) independently.
- **FR-056**: All widgets MUST handle empty state gracefully (e.g. "No invoices yet" instead of an empty chart).

### Non-Functional Requirements

- **NFR-001**: Grid drag and resize interactions MUST feel smooth at 60fps — no jank during manipulation.
- **NFR-002**: Dashboard load time (API response + render) MUST be under 2 seconds for a 12-tile layout.
- **NFR-003**: Widget data fetching MUST be parallel — each widget fetches its own data independently.
- **NFR-004**: Widget library sidebar MUST open in under 200ms.
- **NFR-005**: Layout save (API round-trip) MUST complete in under 500ms.
- **NFR-006**: KPI widgets MUST auto-refresh every 60 seconds via TanStack Query `refetchInterval`. Chart and list widgets MUST auto-refresh every 5 minutes.
- **NFR-007**: Widget data fetch timeout is 10 seconds. Skeleton shows 0–2s, spinner shows 2–10s, timeout error after 10s. After 3 consecutive failures, widget stops auto-retrying.
- **NFR-008**: Row height is 80px per grid unit (frontend constant, not persisted). A 2-row tile = 160px, 3-row tile = 240px.
- **NFR-009**: Touch drag on tablets (>= 768px) requires 300ms long-press to distinguish from scroll. Resize handles are minimum 44x44px tap target.
- **NFR-010**: Grid compaction is vertical only (`compactType: 'vertical'`). Widgets compact upward to fill gaps, never horizontally.

### Key Entities

- **Dashboard**: A named grid layout belonging to a user.
  - DB table: `dashboards`
  - Columns: `id` (UUID PK), `user_id` (FK), `workspace_id` (FK, nullable — NULL for home dashboards), `name` (varchar 100), `is_default` (boolean), `tiles` (JSON array of TileLayout), `created_at`, `updated_at`
  - Constraints: `UNIQUE(user_id, workspace_id, name)`, `INDEX(user_id, workspace_id, is_default)`
  - Limits: 10 dashboards per user per workspace, 3 dashboards for home
- **TileLayout**: A widget placement within a dashboard grid. Attributes: widget_id (string), x, y, w, h, minW, minH, maxW (12), maxH (6), config (optional JSON).
- **WidgetDefinition**: System-defined metadata for a widget type. Attributes: id, name, category, description, default_size, min_size, max_size, data_requirements, icon, requires_feature (nullable — feature flag gate).
- **DashboardPreset**: A template layout that users can clone. Attributes: key (simple/advanced/bookkeeper/owner), name, tiles. First-time default is role-aware: bookkeeper → Bookkeeper preset, owner/accountant → Simple, all others → Simple.

---

## API Design

### Endpoints

```
GET    /api/v1/dashboards                    — List all dashboards for current user + workspace
POST   /api/v1/dashboards                    — Create a new dashboard
GET    /api/v1/dashboards/{id}               — Get a specific dashboard
PUT    /api/v1/dashboards/{id}               — Update dashboard (name, tiles, is_default)
DELETE /api/v1/dashboards/{id}               — Delete a dashboard
POST   /api/v1/dashboards/{id}/duplicate     — Duplicate a dashboard

GET    /api/v1/home/dashboards               — List home dashboards (no workspace scope)
POST   /api/v1/home/dashboards               — Create home dashboard
PUT    /api/v1/home/dashboards/{id}          — Update home dashboard
DELETE /api/v1/home/dashboards/{id}          — Delete home dashboard

GET    /api/v1/dashboard/widget-catalogue    — List available widgets for current workspace
```

### Migration from 016-CDB

The existing `dashboard_layouts` table stores a single layout per user per workspace. On first load under the new system:
1. Read the old `layout` JSON
2. Convert to a single Dashboard named "Dashboard" with `is_default: true`
3. Map old widget IDs to new tile positions (stack vertically at default widths):
   - `invoices_owed` → `chart_ar_aging` (4x3)
   - `bills_to_pay` → `chart_ap_aging` (4x3)
   - `tasks` → `tasks_attention` (4x3)
   - `profit_loss_mtd` → `kpi_net_profit_mtd` (3x2) + `chart_pnl_trend` (6x3)
   - `cash_in_out` → `chart_cash_flow` (6x3)
   - `recent_journal_entries` → `list_recent_journals` (6x3)
   - `reconciliation_health` → `status_reconciliation` (4x3)
   - `upcoming_repeating` → `list_upcoming_repeating` (4x3)
   - `revenue_goal` → `kpi_revenue_mtd` (2x2)
   - `intray` → `tasks_attention` (already mapped)
   - `loans` → dropped (no equivalent in v1)
   - `fixed_assets` → dropped (no equivalent in v1)
   - Bank account IDs → `bank_{id}` tiles (4x2 each)
4. Save the new format to the `dashboards` table
5. Stamp `migrated_at` on the old `dashboard_layouts` record
6. Old table retained for 90 days as rollback safety net, then removed via cleanup migration

The migration runs lazily (on first dashboard load), not as a batch artisan command. This avoids a long-running migration for workspaces that may never be visited again.

---

## Success Criteria

- **SC-001**: Users can drag-resize a widget and the new size persists across sessions.
- **SC-002**: Users can create, switch between, and delete multiple dashboards.
- **SC-003**: Preset dashboards render correctly with all widgets populated from real data.
- **SC-004**: Home screen grid is independently configurable from entity dashboards.
- **SC-005**: Existing 016-CDB layouts are seamlessly migrated — no user action required.
- **SC-006**: Grid interactions (drag, resize) maintain 60fps on a mid-range laptop.
- **SC-007**: 12-tile dashboard loads in under 2 seconds including all widget data.
- **SC-008**: Mobile users see a clean single-column stack — no broken grid layout.

---

## Technical Notes

### Library Choice: react-grid-layout

[`react-grid-layout`](https://github.com/react-grid-layout/react-grid-layout) is the recommended library:
- Mature (10+ years, 20k+ GitHub stars)
- Built-in responsive breakpoints
- Built-in collision detection and compaction
- Serializable layout format that maps directly to our persistence model
- CSS-based transforms (no Spring physics needed)
- Used by Grafana, Metabase, and similar dashboard products

Install: `npm install react-grid-layout @types/react-grid-layout`

### Widget Component Architecture

Each widget is a self-contained component that:
1. Receives its `widgetId` and optional `config` as props
2. Fetches its own data via a dedicated TanStack Query hook
3. Renders inside a Card with standardised header (title, optional menu)
4. Handles loading/error/empty states internally
5. Responds to container size changes via ResizeObserver (for chart re-rendering)

```
frontend/src/components/dashboard/widgets/
├── kpi/
│   ├── KpiNetWorth.tsx
│   ├── KpiCashPosition.tsx
│   ├── KpiRevenueMtd.tsx
│   └── ... (one per KPI widget)
├── charts/
│   ├── ChartCashFlow.tsx
│   ├── ChartPnlTrend.tsx
│   ├── ChartArAging.tsx
│   └── ... (one per chart widget)
├── lists/
│   ├── ListRecentJournals.tsx
│   ├── ListOverdueInvoices.tsx
│   └── ... (one per list widget)
├── status/
│   ├── StatusReconciliation.tsx
│   ├── StatusPeriod.tsx
│   └── ...
├── bank/
│   └── BankAccountWidget.tsx (parameterised by account ID)
├── home/
│   ├── HomeEntities.tsx
│   ├── HomeNetWorthHero.tsx
│   └── ...
└── WidgetRenderer.tsx          — Maps widgetId to component
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + E` | Toggle edit mode |
| `Escape` | Exit edit mode (cancel) |
| `Cmd/Ctrl + Enter` | Save and exit edit mode (done) |

---

## Resolved Questions

1. ~~Should widget-level configuration be supported in v1?~~ **No** — defer to v2. Ship with sensible defaults (6 months for charts, 10 items for lists).
2. ~~Should dashboards be shareable between users?~~ **No** — per-user only in v1. Sharing is a v2 feature.
3. ~~Should we support full-width "hero" tiles that break the 12-column grid?~~ **No** — a 12-column tile IS full width.

---

## Clarifications

### Session 2026-03-20

**Q1: What happens to the existing `dashboard_layouts` migration and table?**
A: Keep the table. Add a `migrated_at` timestamp column. The migration action reads the old format, creates a new `dashboards` record, and stamps `migrated_at`. The old table is NOT dropped — it serves as a rollback safety net for 90 days, after which a cleanup migration removes it.

**Q2: Should the new `dashboards` table be tenant-scoped (workspace_id) or a central table?**
A: Tenant-scoped for entity dashboards (`workspace_id` NOT NULL), central for home dashboards (`workspace_id` NULL). Single `dashboards` table with nullable `workspace_id`. Home dashboards are identified by `workspace_id IS NULL` + `user_id`. This avoids two tables for the same data shape.

**Q3: What is the row height in pixels for the grid?**
A: 80px per row unit. This makes a 2-row KPI card 160px tall (comfortable for a stat + sparkline) and a 3-row chart 240px tall (enough for Recharts to render readable axes). The row height is a frontend constant, not persisted — if we change it later, all layouts scale proportionally.

**Q4: Should widgets auto-refresh their data, or only on page load?**
A: Auto-refresh via TanStack Query's `refetchInterval`. KPI widgets refresh every 60 seconds. Chart/list widgets refresh every 5 minutes. The interval is per-widget-type, defined in the widget's hook, not configurable by the user. This keeps the dashboard alive without hammering the API.

**Q5: What happens when a widget's data endpoint returns an error?**
A: The widget shows an error card with "Failed to load [Widget Name]" and a "Retry" button. The error is isolated — other widgets continue rendering. After 3 consecutive failures, the widget shows a static error state and stops auto-retrying (to avoid infinite error loops). Manual retry always works.

**Q6: How does the preset selection interact with the user's role?**
A: Presets are available to ALL roles — they are starting points, not restrictions. A business owner can use the Bookkeeper preset and vice versa. The preset dropdown shows all 4 options regardless of role. However, the **default preset for first-time users** is role-aware: bookkeeper role → Bookkeeper preset, owner/accountant → Simple preset, all others → Simple preset.

**Q7: What is the maximum size a widget can be resized to?**
A: Maximum width = 12 columns (full width). Maximum height = 6 rows (480px). This prevents a single widget from consuming the entire viewport. The `maxW` and `maxH` are defined per widget type in the WidgetDefinition registry.

**Q8: Should the dashboard switcher be visible outside of edit mode?**
A: Yes — the dashboard switcher is ALWAYS visible in the page header (not only in edit mode). Users need to switch dashboards as part of their normal workflow, not just when editing. The switcher shows the current dashboard name as a clickable dropdown trigger.

**Q9: What happens to the existing `useDashboardEditStore` Zustand store?**
A: Replace it with a new `useDashboardGridStore` that manages: `isEditing`, `draftLayout` (react-grid-layout format), `activeDashboardId`, `libraryOpen`. The old store is deleted. The new store still uses the same pattern — enter edit mode clones the layout, cancel discards, done saves.

**Q10: How is the widget-catalogue endpoint scoped?**
A: The `/api/v1/dashboard/widget-catalogue` endpoint is workspace-scoped (reads `X-Workspace-Id` header). It returns all widget definitions available for that workspace, including dynamic bank account widgets. Feature-flagged widgets (e.g. `ai_insights`) are included in the catalogue but marked with `requires_feature: 'ai_chatbot'` so the frontend can show an upgrade prompt instead of the widget.

**Q11: Should the grid support undo/redo in edit mode?**
A: No — not in v1. The cancel button serves as the undo mechanism (reverts all changes). Granular undo/redo is a v2 polish item. This avoids complex state management for the initial release.

**Q12: How should the grid handle a widget that takes too long to load?**
A: Each widget has a 10-second timeout on its data fetch. If exceeded, the widget shows a timeout state (same as error, but with "Taking longer than expected" message). The skeleton loading state shows for the first 2 seconds. Between 2-10 seconds, a spinner replaces the skeleton. After 10 seconds, timeout error.

**Q13: What is the DB schema for the new `dashboards` table?**
A:
```
dashboards
├── id (UUID, primary key)
├── user_id (bigint, FK → users)
├── workspace_id (bigint, nullable, FK → workspaces)
├── name (varchar 100)
├── is_default (boolean, default false)
├── tiles (JSON — array of TileLayout objects)
├── created_at (timestamp)
├── updated_at (timestamp)
├── UNIQUE(user_id, workspace_id, name) — no duplicate names per user per workspace
├── INDEX(user_id, workspace_id, is_default)
```
Home dashboards have `workspace_id = NULL`. The unique constraint on `(user_id, workspace_id, name)` uses a partial index or treats NULL as a distinct value (SQLite handles this correctly).

**Q14: What happens when a user sets a new dashboard as default?**
A: Setting a dashboard as default is a single API call that atomically unsets the previous default and sets the new one. The action: `UPDATE dashboards SET is_default = false WHERE user_id = ? AND workspace_id = ? AND is_default = true; UPDATE dashboards SET is_default = true WHERE id = ?`. Wrapped in a transaction.

**Q15: Should the home dashboard support multiple named dashboards like entity dashboards?**
A: Yes, but limited to 3 (not 10). Home dashboards are simpler — most users will only have 1. The same dashboard switcher UI applies. Default home preset is "Home".

**Q16: What happens when a workspace has no bank accounts — are bank widgets shown in the catalogue?**
A: No. If a workspace has 0 active bank accounts, the "Bank Accounts" category is hidden from the widget library. The catalogue endpoint only returns bank widgets for accounts that exist and are active.

**Q17: Should the grid support touch/mobile drag interactions on tablets?**
A: Yes for tablets (>= 768px). `react-grid-layout` supports touch events natively. On tablets, drag requires a long-press (300ms) to distinguish from scroll. Resize handles are slightly larger on touch (44x44px minimum tap target). Below 768px, the grid collapses to single-column stack with no drag/resize.

**Q18: How should the migration handle users with the `revenue_goal`, `loans`, `fixed_assets`, and `intray` widgets from the old system?**
A: Map them to the new widget IDs:
- `revenue_goal` → `kpi_revenue_mtd` (closest equivalent, old goal widget was underused)
- `loans` → dropped (no new equivalent in v1 — add as a future widget)
- `fixed_assets` → dropped (no new equivalent in v1)
- `intray` → `tasks_attention` (same data, renamed)
- All other old widget IDs map 1:1 to their new counterparts (e.g. `invoices_owed` → `chart_ar_aging`, `bills_to_pay` → `chart_ap_aging`, `profit_loss_mtd` → `kpi_net_profit_mtd` + `chart_pnl_trend`, etc.)

**Q19: Should the "Practice" preset be available as a dashboard preset for practice managers?**
A: Defer to v2. The Practice portal has its own separate dashboard at `/practice` which is outside the entity dashboard system. Including practice-specific widgets in the entity dashboard would require cross-workspace data access which violates tenant isolation. Practice manager dashboard improvements should be a separate epic.

**Q20: What is the compaction behavior — vertical only or vertical+horizontal?**
A: Vertical compaction only. When a widget is removed or moved, remaining widgets compact upward to fill gaps — but NOT horizontally. This matches user expectations (gravity pulls things up, not sideways) and is the default behavior of `react-grid-layout` (`compactType: 'vertical'`). Users who want side-by-side layout achieve it by explicitly placing widgets in the same row.
