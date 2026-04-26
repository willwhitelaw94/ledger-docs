---
title: "Feature Specification: Industry Benchmarking & Financial Ratios"
---

# Feature Specification: Industry Benchmarking & Financial Ratios

**Feature Branch**: `feature/034-ibr-industry-benchmarking`
**Created**: 2026-03-16
**Status**: Draft

---

## User Scenarios & Testing

### User Story 1 — View My Financial Ratios (Priority: P1)

A sole trader plumber navigates to the Benchmarks page and sees their key financial ratios calculated automatically from their ledger data — gross profit margin, net profit margin, operating expense ratio, current ratio, debtor days, and creditor days. Each ratio is displayed as a clear number with a plain-English label explaining what it means.

**Why this priority**: Ratios are the foundation of the entire module. Without them, there's nothing to benchmark against. Even without industry comparison, seeing your own ratios computed automatically is valuable.

**Independent Test**: Navigate to `/benchmarks` for a workspace with 3+ months of data. All ratios are displayed with correct values matching manual calculation from the P&L and balance sheet.

**Acceptance Scenarios**:

1. **Given** a workspace has at least 3 months of transaction data, **When** the user navigates to the Benchmarks page, **Then** they see cards for each ratio: Gross Profit Margin, Net Profit Margin, Operating Expense Ratio, Current Ratio, Quick Ratio, Debtor Days, and Creditor Days.
2. **Given** a workspace has fewer than 3 months of data, **When** the user navigates to the Benchmarks page, **Then** they see a message "Not enough data yet — benchmarks require at least 3 months of transactions" with a progress indicator showing how many months of data exist.
3. **Given** the user views a ratio card, **Then** each card shows: the ratio name, the calculated value (percentage or days), a one-line description of what the ratio measures, and the time period used for calculation.
4. **Given** the user wants a different time period, **When** they select a period (current financial year, last 12 months, last quarter), **Then** all ratios recalculate for that period.

---

### User Story 2 — Compare Against Industry Benchmarks (Priority: P1)

The plumber's workspace is set to the "Trades & Construction" industry. Next to each of their ratios, the system shows the industry average and a healthy range (25th to 75th percentile). A colour-coded indicator shows whether they're above average (green), within range (amber), or below average (red). They instantly see that their gross profit is strong but their debtor days are worse than the industry average.

**Why this priority**: The comparison is what turns raw ratios into actionable insight. Without industry context, a gross profit of 42% means nothing to a non-accountant.

**Independent Test**: Set a workspace's industry to "Trades & Construction". Navigate to Benchmarks. Each ratio shows the industry average alongside the workspace's value with a colour-coded status.

**Acceptance Scenarios**:

1. **Given** a workspace has an industry set, **When** the user views the Benchmarks page, **Then** each ratio card additionally shows: the industry average, the industry range (25th–75th percentile), and a status indicator (above average / within range / below average).
2. **Given** a user's gross profit margin is 42% and the industry average is 38%, **Then** the status shows green with "Above average".
3. **Given** a user's debtor days are 45 and the industry average is 30, **Then** the status shows red with "Below average" and a brief suggestion (e.g., "Your customers are paying slower than typical — consider following up on overdue invoices").
4. **Given** a workspace's industry has no benchmark data available, **When** the user views the Benchmarks page, **Then** the industry comparison column shows "No industry data available" and the user can still see their own ratios.
5. **Given** a workspace has no industry set, **When** the user views the Benchmarks page, **Then** they see a prompt to set their industry in Settings with a direct link.

---

### User Story 3 — Dashboard Benchmark Summary (Priority: P1)

The workspace dashboard shows a compact "Financial Health" card with the 3 most important ratios (gross profit margin, current ratio, debtor days) and their benchmark status. Clicking the card navigates to the full Benchmarks page.

**Why this priority**: Most users live on the dashboard. Surfacing the top ratios there ensures benchmarks are seen without requiring users to discover a new page.

**Independent Test**: Log in to a workspace with 3+ months of data and an industry set. The dashboard shows a Financial Health card with 3 ratios and their benchmark status.

**Acceptance Scenarios**:

1. **Given** a workspace has sufficient data and an industry set, **When** the user views the dashboard, **Then** a "Financial Health" card shows Gross Profit Margin, Current Ratio, and Debtor Days — each with their value, industry average, and colour status.
2. **Given** any ratio is below the industry 25th percentile, **Then** the card highlights it in red with a brief actionable note.
3. **Given** the user clicks the Financial Health card, **Then** they navigate to the full `/benchmarks` page.
4. **Given** a workspace has insufficient data, **Then** the card shows "Building your benchmarks — X months of data so far".

---

### User Story 4 — AI Chatbot Benchmark Insights (Priority: P2)

A business owner asks Penny "How is my business doing?" or "What are my benchmarks?". Penny fetches the workspace's ratios and industry benchmarks and responds with a natural language summary — highlighting strengths, flagging areas of concern, and suggesting specific actions.

**Why this priority**: The chatbot is the most natural interface for getting business advice. Benchmark data makes Penny genuinely useful as a business advisor, not just a data fetcher.

**Independent Test**: Open the chat and ask "How are my benchmarks?". Penny responds with a summary referencing specific ratios and industry comparisons.

**Acceptance Scenarios**:

1. **Given** a user asks Penny about their benchmarks or financial health, **When** Penny processes the query, **Then** she fetches the workspace's ratios and industry benchmarks and responds with a natural language summary.
2. **Given** the summary includes a ratio below the industry average, **Then** Penny includes a specific, actionable suggestion (e.g., "Your debtor days are 45 vs industry average of 30 — consider sending overdue reminders more frequently").
3. **Given** the summary includes a ratio above the industry average, **Then** Penny acknowledges the strength (e.g., "Your gross profit margin of 42% is above the trades industry average of 38% — strong pricing").
4. **Given** the workspace has insufficient data for benchmarks, **Then** Penny explains that benchmarks need 3+ months of data and suggests checking back later.

---

### User Story 5 — Practice Client Benchmark Comparison (Priority: P2)

An accountant managing 8 client workspaces through the Practice portal opens a "Client Health" view showing a table of all clients with their key ratios side-by-side. Clients below the industry 25th percentile on any ratio are flagged. The accountant can quickly see which clients need attention and prioritise advisory conversations.

**Why this priority**: Accountants advise across many clients. A single view comparing client health against industry benchmarks saves hours of manual spreadsheet work and ensures no struggling client is overlooked.

**Independent Test**: Log in as a practice manager with 3+ connected client workspaces. Navigate to the Client Health view. See a comparison table with ratios and benchmark status per client.

**Acceptance Scenarios**:

1. **Given** an accountant has 5 connected client workspaces, **When** they open the Client Health view in the Practice portal, **Then** they see a table with one row per client showing: client name, industry, gross profit margin, current ratio, debtor days — each with colour-coded benchmark status.
2. **Given** a client's current ratio is below 1.0 (critical liquidity risk), **Then** that cell is highlighted red with a warning icon.
3. **Given** the accountant clicks a client row, **Then** they navigate to that client's full Benchmarks page.
4. **Given** a client workspace has insufficient data, **Then** the row shows "Insufficient data" in grey.

---

### User Story 6 — Benchmark Drift Alerts (Priority: P3)

A business owner opts in to receive alerts when any of their key ratios drift outside the industry healthy range. When their current ratio drops below the industry 25th percentile at month-end, they receive an in-app notification and optionally an email: "Your current ratio (0.9) has dropped below the industry healthy range (1.2–2.1). This may indicate a short-term cash flow concern."

**Why this priority**: Proactive alerts turn benchmarks from a passive report into an active monitoring system. Users don't need to check the Benchmarks page — the system watches for them.

**Independent Test**: Create a scenario where a ratio crosses below the industry 25th percentile at month-end. Verify the user receives an in-app notification.

**Acceptance Scenarios**:

1. **Given** a user has opted in to benchmark alerts, **When** a month-end ratio calculation finds a ratio below the industry 25th percentile, **Then** the user receives an in-app notification naming the ratio, the current value, and the healthy range.
2. **Given** a user has opted in to email alerts for benchmarks, **Then** they also receive an email notification with the same information.
3. **Given** a ratio was already below the threshold last month and remains below this month, **Then** no duplicate alert is sent — only alert on the initial crossing.
4. **Given** a user has not opted in to benchmark alerts, **Then** no alerts are sent regardless of ratio values.

---

### Edge Cases

- What if a workspace has zero revenue? — Ratios that divide by revenue (gross profit margin, expense ratio) show "N/A — no revenue recorded" instead of dividing by zero.
- What if a workspace has no COGS accounts? — Gross profit margin defaults to 100% (all revenue is gross profit). A note explains "No cost of goods sold accounts identified".
- What if the industry mapping changes? — Benchmark comparisons update immediately when the workspace industry is changed in Settings.
- What if ATO benchmark data is unavailable for a specific industry? — Fall back to "All Industries" aggregate benchmark. Show a note explaining the fallback.
- What about seasonal businesses? — Users can select the time period (quarter, YTD, 12 months) to get the most relevant comparison. Benchmarks are annual averages.

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST automatically calculate the following financial ratios from existing ledger data: Gross Profit Margin, Net Profit Margin, Operating Expense Ratio, Current Ratio, Quick Ratio, Debtor Days, and Creditor Days.
- **FR-002**: Ratios MUST be calculable for selectable time periods: current financial year, last 12 months, last quarter, and custom date range.
- **FR-003**: The system MUST store industry benchmark data (average, 25th percentile, 75th percentile) for each ratio, keyed by industry classification.
- **FR-004**: The system MUST compare the workspace's calculated ratios against the industry benchmark for the workspace's configured industry.
- **FR-005**: Each ratio comparison MUST display a status: "Above average" (above 75th percentile), "Within range" (25th–75th), or "Below average" (below 25th percentile), with corresponding colour coding (green/amber/red).
- **FR-006**: The system MUST display a dedicated Benchmarks page showing all ratios with their industry comparisons.
- **FR-007**: The system MUST display a summary "Financial Health" card on the workspace dashboard showing the top 3 ratios with benchmark status.
- **FR-008**: The system MUST require a minimum of 3 months of transaction data before displaying benchmark comparisons. Workspaces with less data see a progress message.
- **FR-009**: The AI chatbot MUST have access to a benchmark tool that returns the workspace's ratios and industry comparisons for use in natural language responses.
- **FR-010**: The system MUST provide a practice-level view showing client-by-client ratio comparison with benchmark status for each connected workspace.
- **FR-011**: The system MUST support optional in-app and email alerts when a ratio crosses below the industry 25th percentile at month-end.
- **FR-012**: Ratios involving division by zero (e.g., zero revenue) MUST display "N/A" with an explanatory note rather than an error.
- **FR-013**: When a workspace has no industry set, the Benchmarks page MUST prompt the user to configure their industry in Settings.
- **FR-014**: When no benchmark data exists for a specific industry, the system MUST fall back to "All Industries" aggregate benchmarks with a note explaining the fallback.
- **FR-015**: Each ratio card MUST include a plain-English description of what the ratio measures and why it matters, written for non-accountant business owners.
- **FR-016**: Below-average ratios MUST include a brief, actionable suggestion specific to the ratio (e.g., "Follow up on overdue invoices" for high debtor days).

### Key Entities

- **Industry Benchmark**: A reference data record storing the average, 25th percentile, and 75th percentile for each ratio, keyed by industry code. Sourced from ATO/ABS data and updated annually.
- **Financial Ratio**: A calculated value derived from the workspace's ledger data for a given time period. Not stored permanently — computed on demand from account balances and P&L data.
- **Benchmark Alert Preference**: A per-user opt-in setting for receiving notifications when ratios drift outside the industry healthy range.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Business owners can see all 8 financial ratios with industry benchmarks within 5 seconds of navigating to the Benchmarks page.
- **SC-002**: 100% of workspaces with 3+ months of data and an industry set display benchmark comparisons without user configuration.
- **SC-003**: The AI chatbot can answer "How is my business doing?" with specific ratio data and industry context in a single response.
- **SC-004**: Practice managers can compare all connected client workspaces on a single screen, identifying below-average clients in under 10 seconds.
- **SC-005**: Zero division-by-zero errors displayed to users — all edge cases handled gracefully with explanatory messages.

## Clarifications

### Session 2026-03-16
- Q: How should the system identify COGS accounts for gross profit? -> A: Use `AccountSubType::CostOfSales` — already in the schema, no user configuration needed.
- Q: How should current/non-current assets and liabilities be identified? -> A: Use existing account sub-types (`current_asset`, `non_current_asset`, `current_liability`, `non_current_liability`).
- Q: Should Revenue Growth be included, and how? -> A: Yes, as the 8th ratio — YoY (year-over-year) revenue growth. Requires 12+ months of data.
- Q: Where should ATO benchmark data live? -> A: JSON seed file in `database/seeders/` loaded into an `industry_benchmarks` table. Updated annually.
- Q: Should actionable suggestions be hardcoded or AI-generated? -> A: Hardcoded per ratio (2-3 static suggestions). AI-generated advice available via the chatbot separately.
