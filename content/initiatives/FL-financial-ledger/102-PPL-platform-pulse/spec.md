---
title: "Feature Specification: Platform Pulse"
---

# Feature Specification: Platform Pulse

**Feature Branch**: `feature/102-ppl-platform-pulse`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "Super admin dashboard enhancement combining a live platform ticker (Net Assets Under Ledger with $1B target, Monthly Transaction Flow with $100M target, live journal entry pulse feed) and a Platform Map (geographic map of all workspace entities + account graph map leveraging 071-NOD Node Graph Engine)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Platform Pulse Ticker (Priority: P1)

A super admin opens the admin overview page. At the top, above existing KPI cards, a hero band shows two big numbers — **Assets Under Ledger** (e.g. $247M) and **Monthly Transaction Flow** (e.g. $18.4M). Under each number, a progress bar shows how close the platform is to its north-star target ($1B and $100M respectively). Alongside, a slow-scrolling pulse feed shows the last handful of journal entries posted anywhere on the platform — anonymised workspace name, amount, relative time (e.g. "just now", "2m ago"). The super admin now has a single-glance read on platform scale, growth trajectory, and liveness.

**Why this priority**: This is the single most valuable surface for platform-ops reasoning. It's also the cheapest to build — the data already exists in the ledger; it just needs aggregation and presentation. Delivers value without any new data capture.

**Independent Test**: Navigate to `/admin` as a super admin user. The ticker band is visible at the top. AUL and Transaction Flow values are populated from real ledger data. Progress bars reflect percentage of targets. Pulse feed shows real journal entries, updates automatically.

**Acceptance Scenarios**:

1. **Given** a super admin lands on `/admin` and the platform has at least one workspace with posted journal entries, **When** the page loads, **Then** the ticker band displays (a) Assets Under Ledger as a formatted dollar amount, (b) Monthly Transaction Flow as a formatted dollar amount, (c) progress bars toward $1B and $100M respectively.
2. **Given** the ticker is visible, **When** more than 5 seconds pass, **Then** the AUL figure animates (odometer-style count-up) on page load and refreshes to the latest value at most every 60 seconds.
3. **Given** the pulse feed is visible, **When** a new journal entry is posted on the platform, **Then** within 60 seconds a new entry appears at the top of the feed with the workspace display name (first word only, to anonymise), absolute amount, and relative timestamp.
4. **Given** a non-super-admin user navigates to `/admin`, **When** they attempt to access the ticker data, **Then** they are redirected away from the admin area (existing behaviour — no new protection needed).
5. **Given** the platform has no workspaces or no journal entries, **When** a super admin opens `/admin`, **Then** the ticker still renders, showing $0 with 0% progress, and the pulse feed shows a friendly "No activity yet" placeholder.

---

### User Story 2 - Platform Map: Geographic View (Priority: P2)

A super admin wants to see where on the map their platform has reach. Below the ticker, a map panel shows the world (zoomed to Australia by default) with pins for every workspace. Pins are coloured by plan tier. Clicking a pin shows a tooltip with workspace name, organisation name, plan tier, and a link to drill into the workspace detail page. Clusters form when many pins are close together; zooming in splits them.

**Why this priority**: Strong investor-demo surface and useful for spotting geographic concentration (e.g., "80% of our signups are within 5km of Sydney CBD"). Depends on workspaces having a location — may require a small address-capture step for existing workspaces without one.

**Independent Test**: Navigate to `/admin` as a super admin. Switch to the Map tab (or scroll to the map section). Every workspace that has a location shows as a pin. Clicking a pin opens a tooltip with workspace metadata. Filtering by plan tier hides/shows relevant pins.

**Acceptance Scenarios**:

1. **Given** there are 50 workspaces with valid locations, **When** a super admin opens the map, **Then** 50 pins are rendered; pins close together are clustered; clusters show the pin count.
2. **Given** a super admin hovers a pin, **When** the tooltip opens, **Then** it shows workspace name, organisation name, plan tier (as a coloured chip), and "Open workspace" link.
3. **Given** a super admin clicks the plan-tier filter, **When** they toggle a tier off, **Then** only pins for the remaining tiers are shown and the cluster counts update.
4. **Given** some workspaces have no location data, **When** the map loads, **Then** those workspaces are listed in a "No location" side panel showing count + link to edit, and are not rendered as pins.
5. **Given** a super admin clicks "Open workspace" in a tooltip, **When** the navigation completes, **Then** they are taken to the workspace detail page under `/admin/workspaces/{id}`.

---

### User Story 3 - Platform Map: Account Graph View (Priority: P3)

A super admin wants to see relationships, not just geography. A second tab on the map panel shows a node graph (reusing the existing Node Graph Engine): organisations sit at the top, workspaces branch from them, and (optionally) chart accounts branch from workspaces. Filters hide/show levels. Hovering a node reveals name + headline stats. This reveals concentration (e.g. one organisation with 20 workspaces), orphan entities, and cross-group patterns.

**Why this priority**: Analytically powerful but requires UI integration with the existing Node Graph Engine and some tuning. Geographic map is more demo-friendly; graph is more analyst-friendly. Ship after geographic.

**Independent Test**: Navigate to `/admin` as super admin. Switch to the Graph tab. Nodes render for organisations, workspaces, and (if toggled) accounts. Layout is readable with up to 200 nodes. Filters and hover interactions work.

**Acceptance Scenarios**:

1. **Given** there are 10 organisations with 30 workspaces total, **When** a super admin opens the Graph tab, **Then** 40 nodes are rendered with edges from each workspace to its parent organisation.
2. **Given** the "Accounts" toggle is off, **When** the graph renders, **Then** only organisation and workspace nodes are shown.
3. **Given** the "Accounts" toggle is on, **When** the graph renders, **Then** chart-account nodes are added under each workspace (summarised where a workspace has more than 20 accounts).
4. **Given** a super admin hovers a workspace node, **When** the tooltip opens, **Then** it shows workspace name, plan tier, entity count (organisation → workspaces), and "Open workspace" link.
5. **Given** the graph has more than 500 nodes, **When** it loads, **Then** a progressive-rendering indicator is shown and interactions remain responsive (pan/zoom under 200ms).

---

### Edge Cases

- **Zero data platform**: First-ever super admin visit on an empty platform — ticker shows $0 / 0% / "No activity yet", map shows empty state, graph shows empty state. No errors.
- **AUL negative or mixed**: If summed account balances net negative (e.g., heavy liabilities), AUL should use a defined rule (default: sum of positive asset-account balances only; liabilities and equity excluded).
- **Transaction flow double-count risk**: Double-entry means every journal entry debits and credits — flow must sum one side only (default: sum of absolute debit-line amounts), not both, to avoid doubling.
- **Very large workspace**: A single workspace with millions of journal entries must not tank the aggregate query. Aggregates must use a cached/materialised summary refreshed on a schedule, not computed per page load.
- **Pulse feed privacy**: Pulse feed must never show identifying info for amounts over a high-value threshold (e.g., $1M+) — show "Large entry posted" instead of amount.
- **Stale cache**: If the aggregate cache is more than 5 minutes old, the ticker must indicate it's refreshing (subtle spinner) rather than show stale numbers as live.
- **Workspace with no location**: Not pinnable on the map; surface in a "No location" sidebar with count.
- **Geocoding failure**: If a workspace's address can't be geocoded, it falls into the "No location" bucket — no silent failure.
- **Currency mixing**: Platform may have workspaces in different currencies. Default: sum all amounts at the workspace's currency face value in AUD-equivalent; indicate "mixed currencies" if conversion is missing.
- **Timezone**: Pulse feed relative times use viewer's local time. Absolute tooltip time on hover uses UTC.

## Requirements *(mandatory)*

### Functional Requirements

#### Ticker (P1)

- **FR-001**: The super admin overview page MUST display a Platform Pulse ticker band above existing KPI cards.
- **FR-002**: The ticker MUST display **Assets Under Ledger (AUL)** — defined as the sum of positive asset-type account balances across all workspaces, in platform base currency (AUD).
- **FR-003**: The ticker MUST display **Monthly Transaction Flow** — defined as the sum of absolute debit-line amounts from journal entries posted in the trailing 30 days, in AUD.
- **FR-004**: The ticker MUST display progress bars for each metric against configurable targets, with defaults **$1,000,000,000** for AUL and **$100,000,000** for Transaction Flow.
- **FR-005**: AUL and Transaction Flow values MUST be served from a materialised summary table, refreshed by a scheduled job every 5 minutes. API responses MUST include the `refreshed_at` timestamp so the UI can indicate staleness.
- **FR-006**: The ticker MUST animate the headline numbers on first render (odometer count-up) and update the displayed value when fresh data arrives.
- **FR-007**: The ticker MUST display a **pulse feed** showing the 10 most recently posted journal entries across the platform.
- **FR-008**: Each pulse feed item MUST show: (a) anonymised workspace display name (first word only), (b) absolute amount, (c) relative timestamp (e.g. "just now", "2m ago").
- **FR-009**: For journal entries with amounts over a high-value threshold of $1,000,000, the pulse feed MUST show "Large entry posted" in place of the amount.
- **FR-010**: The pulse feed MUST refresh at most every 60 seconds while the page is open.
- **FR-011**: Non-super-admin users attempting to access ticker data MUST be denied; existing `/admin` route protection applies.
- **FR-012**: Progress targets (AUL and Transaction Flow) MUST be configurable via a platform-level key/value setting accessible only to super admins. Defaults: **$1,000,000,000** AUL, **$100,000,000** monthly Transaction Flow.
- **FR-012a**: Each ticker headline MUST display a 30-day trend sparkline rendered from a daily metric history snapshot.
- **FR-012b**: Odometer and progress-bar animations MUST respect the viewer's `prefers-reduced-motion` media query — animations are suppressed when the user has opted out.
- **FR-012c**: Non-AUD workspaces MUST be converted to AUD using the most recent exchange rate from the existing FX rate table. Workspaces with no available exchange rate MUST be excluded from the total and reported in a small warning chip ("N workspaces excluded: no FX rate").

#### Geographic Map (P2)

- **FR-013**: The super admin overview MUST include a Map panel with a tabbed interface: **Geographic** (default) and **Graph**.
- **FR-014**: The Geographic tab MUST render a world map defaulting to Australia, with one pin per workspace that has a valid location.
- **FR-015**: Pins MUST be colour-coded by plan tier, using the same colours as the Plan Distribution chart.
- **FR-016**: Pins close together at the current zoom level MUST cluster into a single marker showing the pin count; clicking a cluster zooms in and splits it.
- **FR-017**: Hovering a pin MUST show a tooltip with workspace name, organisation name, plan tier chip, and an "Open workspace" action.
- **FR-018**: The map MUST include plan-tier filters; toggling a tier off MUST hide matching pins and update cluster counts.
- **FR-019**: Workspaces without a valid location MUST NOT be rendered as pins; they MUST be listed in a "No location" side panel with a count and a link to each workspace's settings.
- **FR-020**: Workspace locations MUST be derived from the workspace's existing address data (entity setup). Where only country is known, the pin MUST fall back to a deterministic jitter around the country centroid so clustering still works. These workspaces MUST still appear in the "No location" sidebar (data-hygiene nudge).
- **FR-021**: The map MUST gracefully handle up to 10,000 workspaces with pin clustering without freezing the browser.

#### Account Graph (P3)

- **FR-022**: The Graph tab MUST render a node graph with organisations, workspaces, and (optionally) chart accounts as nodes, with edges representing parent-child relationships.
- **FR-023**: The Graph tab MUST reuse the Node Graph Engine (epic 071-NOD) for layout and rendering. A Platform-Pulse-specific graph builder assembles nodes from Organisation → Workspace → (optionally) ChartAccount; no forking of the graph component.
- **FR-024**: A toggle MUST allow super admins to show/hide chart-account nodes; default is hidden.
- **FR-025**: When a workspace has more than 20 chart accounts, accounts MUST be grouped into a single "Accounts (N)" summary node rather than rendered individually.
- **FR-026**: Hovering a node MUST show a tooltip with the node name, plan tier (for workspaces), child count, and an "Open" action.
- **FR-027**: The graph MUST remain responsive (pan/zoom actions under 200ms) with up to 500 visible nodes.
- **FR-028**: Filters MUST allow showing/hiding nodes by plan tier.

### Key Entities

- **Platform Metric Aggregate**: A cached aggregate record representing a single platform-wide metric (e.g., AUL, Transaction Flow). Attributes: metric name, value, currency, timestamp of last refresh, source rule used for computation. Refreshed every 5 minutes by a scheduled job; stored in a materialised summary table read by the API.
- **Platform Metric History**: Daily snapshot of each platform metric. Attributes: metric name, date, value, currency. Used to render trend sparklines under each ticker headline.
- **Pulse Feed Entry**: A single item in the pulse feed. Represents one journal entry on the platform. Attributes: anonymised workspace display name (first word, max 20 chars), absolute amount (or "Large entry posted" placeholder if over threshold), relative timestamp, absolute timestamp (for tooltip).
- **Platform Target**: A configurable super-admin setting representing a north-star target for a metric. Stored in a platform-settings key/value table. Attributes: metric name, target amount, currency, last-updated-by, last-updated-at. Defaults: $1B AUL, $100M Transaction Flow.
- **Workspace Map Pin**: A renderable representation of a workspace on the geographic map. Attributes: workspace id, name, organisation name, plan tier, latitude, longitude. Derived from workspace address data; falls back to country centroid + deterministic jitter when only country is known.
- **Platform Graph Node**: A node in the account graph. Types: Organisation, Workspace, Account Group, Account. Attributes: id, type, label, plan tier (where relevant), child count, edges to parents/children. Rendered via the shared Node Graph Engine (071-NOD); data assembled by a Platform-Pulse-specific graph builder.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A super admin can read current AUL, current monthly transaction flow, and growth toward targets in under **3 seconds** from page load.
- **SC-002**: The ticker values reflect real platform activity with a maximum lag of **5 minutes** (cache TTL).
- **SC-003**: The pulse feed surfaces a newly posted journal entry within **60 seconds** of it being posted.
- **SC-004**: The geographic map renders all workspace pins and is interactive within **2 seconds** on a platform with up to **10,000 workspaces**.
- **SC-005**: The account graph pans and zooms with interaction latency under **200ms** for graphs with up to **500 visible nodes**.
- **SC-006**: Every journal entry amount above the high-value threshold ($1M) is anonymised in the pulse feed — **0 leaks** in any sampled review.
- **SC-007**: After first super-admin login on an empty platform, the ticker renders with $0 / 0% values and no errors in **100% of cases**.
- **SC-008**: Progress targets are editable by a super admin in under **30 seconds**, with changes reflected on the ticker within **1 page refresh**.
- **SC-009**: Workspaces without a valid location appear in the "No location" sidebar with a direct edit link — **100% visibility** of location gaps.
- **SC-010**: Across a representative board demo, a super admin can articulate platform scale, growth trajectory, and geographic reach without clicking through to other pages — validated by 3 recorded demos.

## Clarifications

### Session 2026-04-19 (self-clarified by PO)

- **Q**: How should Assets Under Ledger (AUL) be computed? → **A**: Sum of positive balances on asset-type chart accounts across all workspaces (liabilities and equity excluded).
- **Q**: How should Monthly Transaction Flow be computed? → **A**: Sum of absolute debit-line amounts from journal entries posted in the trailing 30 days (credits mirror debits in double-entry, so summing debits avoids doubling).
- **Q**: How should mixed-currency workspaces be aggregated? → **A**: Convert to AUD using the most recent exchange rate from the existing FX table. Workspaces with no available rate are excluded from the total and surfaced in a warning chip.
- **Q**: How should the platform metrics be refreshed and stored? → **A**: A scheduled job runs every 5 minutes and writes to a materialised summary table. API reads from the table; page reloads never recompute.
- **Q**: Should metrics have historical context for trend display? → **A**: Yes — a daily snapshot to a metric history table drives a 30-day sparkline under each headline number.
- **Q**: How should ticker targets be configured? → **A**: Stored in a platform-settings key/value table, editable by super admins. Defaults seeded at $1B AUL and $100M monthly flow.
- **Q**: How should workspaces without a full address appear on the map? → **A**: Fall back to country centroid + deterministic per-workspace jitter. Still listed in the "No location" sidebar.
- **Q**: Should ticker/odometer animations respect accessibility preferences? → **A**: Yes — suppress animations when `prefers-reduced-motion` is set.
- **Q**: How should workspace identity be anonymised in the pulse feed? → **A**: First word of workspace name, truncated to 20 chars. For entries over $1M, amount is replaced with "Large entry posted".
- **Q**: How far should reuse of 071-NOD Node Graph Engine go? → **A**: Reuse the component wholesale; add a new Platform-Pulse graph-builder as the data source. No fork.
