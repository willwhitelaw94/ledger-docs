---
title: "Feature Specification: Retirement Planning"
---

# Feature Specification: Retirement Planning

**Feature Branch**: `070-retirement-planning`
**Created**: 2026-03-22
**Status**: Draft
**Input**: Personalised retirement projection tool connecting real ledger data to life's biggest financial question — when can I retire, and will my money last?

---

## User Scenarios & Testing

### User Story 1 — Set Up a Retirement Profile (Priority: P1)

As an individual user, I want to create a retirement profile by answering a short questionnaire so that the system has the inputs it needs to project my retirement trajectory.

The profile is set up through a 3-step onboarding wizard. Only the first step (date of birth and target retirement age) is required — steps 2 (superannuation details) and 3 (income goal) can be completed later. Every field has sensible defaults and a "learn more" tooltip. The profile belongs to me as a person (not to any single workspace) so I have one retirement plan regardless of how many entities I manage.

**Why this priority**: Without a retirement profile, there is no input data for projections. This is the foundational step that every other story depends on.

**Independent Test**: Can be fully tested by completing the onboarding wizard, verifying the profile is saved, and confirming sensible defaults are applied for skipped fields.

**Acceptance Scenarios**:

1. **Given** I am a logged-in user who has not created a retirement profile, **When** I navigate to the Retirement section of my personal workspace, **Then** I am presented with a 3-step onboarding wizard starting at "About You."

2. **Given** the "About You" step, **When** I enter my date of birth and target retirement age and click "Continue", **Then** step 1 is saved and I advance to "Your Super" with the SG rate pre-filled at the current legislated rate (12%).

3. **Given** I am on step 2 ("Your Super"), **When** I click "Skip for now", **Then** I advance to step 3 with super fields left at their defaults (zero balance, legislated SG rate, no salary sacrifice, no voluntary contributions).

4. **Given** I am on step 3 ("Your Income Goal"), **When** I see the ASFA Comfortable Retirement Standard benchmark displayed as a reference point, **Then** I can enter my own desired annual retirement income in today's dollars or accept the benchmark.

5. **Given** I have completed at least step 1 with a date of birth, **When** the profile is saved, **Then** the system records my jurisdiction as "AU" by default and sets life expectancy to 90 years.

---

### User Story 2 — View My Retirement Projection (Priority: P1)

As a user with a retirement profile, I want to see a year-by-year projection of my retirement savings so I can understand whether I am on track to meet my retirement income goal.

The projection engine runs a two-phase simulation: an accumulation phase (from today until my target retirement age) where contributions and investment returns grow my balance, followed by a drawdown phase (from retirement until life expectancy) where inflation-adjusted withdrawals deplete my balance. The output is a timeline chart showing the trajectory from today through to life expectancy.

**Why this priority**: The projection is the core value of the feature. Without it, the retirement profile is just a form with no output.

**Independent Test**: Can be tested by creating a profile with a super balance and viewing the resulting projection chart with accumulation and drawdown phases visible.

**Acceptance Scenarios**:

1. **Given** I have a completed retirement profile with a super balance of $200,000, target retirement age of 65, and desired income of $60,000/year, **When** I open the retirement projection page, **Then** I see a timeline chart with my age on the horizontal axis and projected balance on the vertical axis, split into accumulation and drawdown phases with a vertical line marking my retirement age.

2. **Given** the projection is displayed, **When** I hover over any year on the chart, **Then** a tooltip shows the projected super balance, investment balance, total balance, contributions (accumulation phase), or withdrawals (drawdown phase) for that year.

3. **Given** a projection where my savings are exhausted before life expectancy, **Then** the chart clearly marks the age at which funds run out and the summary shows a shortfall warning: "At current trajectory, your savings may be exhausted by age [X]."

4. **Given** a projection with a super balance, **Then** the accumulation phase applies a 15% contributions tax on concessional contributions (employer SG and salary sacrifice) and compounds returns annually at the rate mapped from my risk tolerance.

5. **Given** a projection, **Then** my desired retirement income is inflation-adjusted from today's dollars at the default CPI rate of 2.5% to calculate the actual withdrawal needed in each future year, and a footnote explains: "All amounts shown in future dollars."

6. **Given** a projection, **Then** the drawdown phase applies a reduced return rate (accumulation rate minus 1.5%) to reflect a more conservative retirement portfolio.

---

### User Story 3 — Compare Retirement Scenarios (Priority: P1)

As a user exploring my retirement options, I want to create named scenarios with different assumptions and compare them side-by-side so I can see how changing my retirement age, contribution level, or return expectations affects my outcome.

Retirement scenarios are created through the Scenario Planning Engine (068-SPE). The retirement module registers domain-specific variables (target retirement age, extra contributions, return rate override, inflation rate override, desired income, business exit value and year) with the scenario engine. The scenario engine provides the CRUD, comparison, and overlay chart capabilities.

**Why this priority**: Scenario comparison transforms a single projection into a planning tool. It is the primary value proposition — "what if I retire at 60 vs 65?" or "what if I max out my super contributions?"

**Independent Test**: Can be tested by creating two scenarios with different retirement ages, selecting them for comparison, and verifying the overlay chart shows distinct trajectories.

**Acceptance Scenarios**:

1. **Given** my retirement projection page, **When** I click "New Scenario" and name it "Retire at 60", **Then** a scenario is created in the Scenario Planning Engine with my current retirement profile values as defaults and retirement-specific variables available for adjustment.

2. **Given** two scenarios — "Retire at 60" (target age 60) and "Retire at 65" (target age 65), **When** I select both for comparison, **Then** the overlay chart shows two distinct balance trajectories in different colours, with the differing retirement ages clearly visible as separate vertical markers.

3. **Given** the scenario comparison page, **When** I view the summary table, **Then** I see columns for each scenario with rows showing: projected balance at retirement, years of income in retirement, shortfall age (if applicable), and total contributions.

4. **Given** a scenario with the variable "extra salary sacrifice" set to $15,000/year, **Then** the projection for that scenario shows higher accumulation-phase growth reflecting the additional concessional contributions (subject to the $30,000 annual cap, with excess treated as non-concessional).

---

### User Story 4 — Automatic Retirement Goal Tracking (Priority: P1)

As a user with a retirement profile, I want the system to automatically create and maintain a retirement goal so I can track my progress toward retirement readiness alongside my other financial goals.

When a retirement profile is created, the system automatically creates a Goal with the type "Retirement." The goal's target is set to the computed lump sum needed at retirement age to sustain the desired income until life expectancy. The goal's current value reflects total retirement assets (super plus investments). The goal auto-updates whenever the projection is recomputed.

**Why this priority**: Goal integration connects retirement planning to the existing goals dashboard, giving users a single view of all their financial progress without building a separate tracking system.

**Independent Test**: Can be tested by creating a retirement profile, navigating to the goals list, and verifying the retirement goal appears with correct target and current values.

**Acceptance Scenarios**:

1. **Given** I have completed my retirement profile with a desired income of $60,000/year and a target retirement age of 65, **When** I navigate to my goals list, **Then** a "Retirement Fund" goal appears with a target amount equal to the computed required lump sum, a deadline matching my target retirement date, and a "Retirement" type badge.

2. **Given** the retirement goal exists, **When** my super balance increases due to a contribution or market revaluation, **Then** the goal's current value updates to reflect total retirement assets and a new progress history entry is recorded.

3. **Given** I change my desired retirement income on my profile from $60,000 to $80,000, **When** the projection is recomputed, **Then** the retirement goal's target amount updates to reflect the higher required lump sum.

4. **Given** the retirement goal on the goals dashboard, **When** I click "View Full Projection", **Then** I am navigated to the retirement projection page with the full timeline chart.

---

### User Story 5 — Australian Superannuation Rules Engine (Priority: P1)

As an Australian user, I want the projection to correctly model superannuation-specific rules — contribution caps, SG rate schedules, preservation age, and contributions tax — so that my projection reflects the actual regulatory environment.

The AU super rules are encapsulated in a standalone calculator service, separate from the generic drawdown engine. This calculator handles the SG rate schedule (11.5% rising to 12%), concessional cap ($30,000/year), non-concessional cap ($120,000/year), 15% contributions tax, and preservation age (60 for most users). The rules are stored as versioned configuration, not hardcoded, so they can be updated annually without code changes.

**Why this priority**: Incorrect super modelling would undermine trust in the entire projection. Australian users expect projections to reflect real super rules, not generic assumptions.

**Independent Test**: Can be tested by creating a profile with known inputs and verifying the projection output matches a manual calculation using current ATO rates.

**Acceptance Scenarios**:

1. **Given** a user with an employer SG rate set to "use legislated rate", **When** the projection runs for the year 2025-26, **Then** employer contributions are calculated at 11.5% of salary, and for 2027-28 onwards at 12%.

2. **Given** a user with salary sacrifice of $20,000/year and employer SG of $12,000/year, **When** the projection calculates contributions for a year, **Then** total concessional contributions ($32,000) are flagged as exceeding the $30,000 cap, and the $2,000 excess is modelled as a non-concessional contribution.

3. **Given** a user born after 30 June 1964, **When** the projection determines preservation age, **Then** preservation age is set to 60.

4. **Given** concessional contributions of $25,000 in a year, **When** the projection applies contributions tax, **Then** $3,750 (15% of $25,000) is deducted from the contributions before adding them to the super balance.

5. **Given** a user's projected super balance at retirement exceeds $1,900,000, **Then** the projection displays an informational warning: "Your projected super balance may exceed the transfer balance cap. This could affect your tax treatment in retirement. Speak with your financial adviser."

---

### User Story 6 — Regulatory Disclaimer Framework (Priority: P2)

As a platform operator, I need every retirement projection output to carry a persistent regulatory disclaimer so that the tool clearly operates as an informational projection and does not cross into personal financial advice territory.

Every page, chart, AI chatbot response, and exported output related to retirement projections must display a general advice warning. The disclaimer is not dismissable. Practice advisors see projections labelled as "Client Projection" — never "Financial Plan" or "Recommendation." The AI chatbot appends the disclaimer to every retirement-related response.

**Why this priority**: Regulatory compliance is non-negotiable. Without persistent disclaimers, the tool risks being construed as personal financial advice under ASIC RG 244, which would require an AFSL.

**Independent Test**: Can be tested by navigating to every retirement-related page and verifying the disclaimer is visible, not dismissable, and contains the required language.

**Acceptance Scenarios**:

1. **Given** any retirement projection page, **Then** a persistent disclaimer banner is displayed containing: "This is a projection tool for informational purposes only. It is not financial advice. Projections are based on assumptions that may not reflect actual outcomes. Consult a licensed financial adviser before making financial decisions."

2. **Given** the AI chatbot receives a retirement-related question, **When** it responds with a projection summary, **Then** the response includes the disclaimer appended at the end.

3. **Given** a practice advisor viewing a client's retirement projection, **Then** the page header labels the output as "Client Projection" and the disclaimer includes: "MoneyQuest does not hold an Australian Financial Services Licence."

4. **Given** the retirement projection page, **When** I attempt to dismiss or minimise the disclaimer, **Then** the disclaimer cannot be dismissed — it remains persistently visible.

---

### User Story 7 — Couples Retirement Planning (Priority: P2)

As a user planning retirement with a partner, I want to link our retirement profiles and see individual and combined projections so we can plan our retirement together.

Linking is initiated by entering a partner's email address. The partner receives an invitation to link profiles. Once linked, the projection engine runs two individual projections and one combined view showing total household retirement assets, combined income needs, and the combined drawdown trajectory accounting for different retirement ages.

**Why this priority**: A significant proportion of users plan retirement as a couple. Household-level planning is a differentiator over simple individual calculators.

**Independent Test**: Can be tested by creating two user profiles, linking them, and verifying the combined projection view shows aggregated assets and accounts for different retirement ages.

**Acceptance Scenarios**:

1. **Given** I have a retirement profile, **When** I enter my partner's email and they accept the link invitation, **Then** both profiles show a "Partner" badge and both users can see the combined projection view.

2. **Given** linked profiles where I retire at 60 and my partner retires at 65, **When** I view the combined projection, **Then** the drawdown phase accounts for the 5-year period where my partner is still contributing (reducing the household withdrawal rate during that period).

3. **Given** the combined projection view, **Then** I see three tabs: "My Projection", "Partner's Projection", and "Combined" — each showing the relevant trajectory chart and summary.

4. **Given** linked profiles, **When** either partner clicks "Unlink", **Then** both profiles are unlinked and the combined view is no longer available, with the individual projections unaffected.

---

### User Story 8 — Practice Advisory View (Priority: P2)

As an accountant managing multiple clients, I want to view my clients' retirement projections and add advisory notes so I can provide informed guidance during advisory meetings.

Practice advisors access client retirement projections through the existing practice client detail page (a new "Retirement" tab). The view is read-only — the advisor cannot edit the client's profile. The advisor can attach notes using the existing polymorphic notes system. The practice dashboard gains a "Retirement Reviews" widget showing clients sorted by trajectory status.

**Why this priority**: Retirement advisory is a key value-add for accounting practices. Giving advisors a read-only view with notes bridges the gap between self-service projections and professional advice without crossing regulatory boundaries.

**Independent Test**: Can be tested by logging in as a practice advisor, navigating to a client's detail page, and verifying the Retirement tab shows their projection with an advisory notes section.

**Acceptance Scenarios**:

1. **Given** I am a practice advisor connected to a client who has a retirement profile, **When** I open the client's detail page, **Then** I see a "Retirement" tab alongside the existing tabs (Financials, Documents, etc.).

2. **Given** the Retirement tab, **Then** I see the client's projection chart, summary metrics (projected balance at retirement, shortfall age if applicable, trajectory status), and an "Advisory Notes" section where I can add notes.

3. **Given** I add an advisory note, **Then** the note is saved with my name, timestamp, and is visible on future visits to the same client's Retirement tab.

4. **Given** I am a practice advisor, **When** I attempt to edit the client's retirement profile fields (retirement age, super balance, contributions), **Then** the fields are read-only and a message states: "Only the client can edit their retirement profile."

---

### User Story 9 — AI Retirement Trajectory Insights (Priority: P3)

As a user, I want to ask the AI chatbot questions about my retirement trajectory and receive natural language answers so I can understand my retirement outlook without interpreting charts manually.

A single endpoint is registered with the existing AI chatbot (021-AIQ) that runs the projection engine and returns a plain-language summary. The AI describes trends and shows the mathematical impact of changes — it does not recommend specific actions. Every AI response about retirement includes the regulatory disclaimer.

**Why this priority**: AI-powered insights make retirement planning accessible to users who are not comfortable reading financial charts. Lower priority because the core projection and chart must work first.

**Independent Test**: Can be tested by asking the AI chatbot "when can I retire?" and verifying it returns a natural language summary with projection data and the regulatory disclaimer.

**Acceptance Scenarios**:

1. **Given** I have a completed retirement profile, **When** I ask the AI chatbot "When can I retire?", **Then** it responds with a summary like: "Based on your current super balance of $200,000, contributions of $15,000/year, and desired income of $60,000/year, your projection shows your savings supporting you until age 83 if you retire at 65" followed by the regulatory disclaimer.

2. **Given** I ask "What if I increase my salary sacrifice by $5,000?", **Then** the AI runs a modified projection and responds with the impact: "Increasing salary sacrifice by $5,000/year would extend your projected savings by approximately 3 years, supporting you until age 86."

3. **Given** any AI chatbot response about retirement, **Then** the response uses descriptive language ("your projection shows...") and never directive language ("you should..."), and the regulatory disclaimer is appended.

---

### User Story 10 — Practice Retirement Overview Widget (Priority: P3)

As an accountant, I want a dashboard widget showing all my clients' retirement trajectory statuses at a glance so I can prioritise advisory conversations with clients who are most off-track.

The widget appears in the practice dashboard widget catalogue. It displays a table of clients with retirement profiles, sorted by trajectory status (critical first), with columns for client name, target retirement age, years to retirement, projected shortfall or surplus, and last reviewed date. Quick actions allow navigating to the full projection or adding an advisory note.

**Why this priority**: The widget increases daily engagement with retirement advisory data without requiring the advisor to visit each client individually. Lower priority because the underlying client projection views must exist first.

**Independent Test**: Can be tested by adding the widget to a practice dashboard and verifying it lists clients with retirement profiles sorted by trajectory status.

**Acceptance Scenarios**:

1. **Given** the dashboard widget catalogue in a practice workspace, **Then** a "Retirement Reviews" widget is available for selection.

2. **Given** the widget is on my practice dashboard and I have clients with retirement profiles, **Then** the widget shows a table sorted by trajectory status (critical first) with columns: client name, retirement age target, years to retirement, projected shortfall/surplus, last reviewed date.

3. **Given** the widget, **When** I click "View Projection" on a client row, **Then** I am navigated to that client's retirement projection on the practice client detail page.

4. **Given** the widget, **Then** I can filter clients by trajectory status: On Track, Behind, or Critical.

---

### Edge Cases

- **What happens when a user has no super balance and skips step 2 of the wizard?** The projection runs with a zero super balance. The accumulation phase shows only employer SG contributions growing over time, and a prompt encourages the user to enter their current balance for a more accurate projection.

- **What happens when a user's desired retirement income exceeds what their projected balance can sustain?** The projection chart shows the balance reaching zero before life expectancy. The summary displays the shortfall age and the gap: "Your savings may be exhausted by age [X], which is [Y] years before your planning horizon of age [Z]."

- **What happens when contribution caps are exceeded?** The projection flags the excess. Concessional contributions above the $30,000 cap are modelled as non-concessional contributions (after-tax, no 15% contributions tax). Non-concessional contributions above the $120,000 cap are flagged with a warning but still included in the projection with a note that excess non-concessional contributions may incur additional tax.

- **What happens when a non-Australian user accesses retirement planning?** The profile defaults to jurisdiction "AU." Non-AU users can still create a profile and get generic drawdown projections using manually entered retirement savings and configurable return rates — the AU super rules engine is simply not applied.

- **What happens when linked partner profiles have different risk tolerances?** Each partner's individual projection uses their own risk tolerance and corresponding return rate. The combined view aggregates the individual projections — it does not blend risk tolerances.

- **What happens when the user changes their date of birth on the profile?** The preservation age, years to retirement, and all projection calculations are recomputed. If the date of birth change affects the preservation age lookup, the new preservation age is applied.

- **What happens when a practice advisor's client has not created a retirement profile?** The "Retirement" tab on the client detail page shows: "This client has not set up a retirement profile. The client can create one from their personal workspace."

- **What happens when a user enters a target retirement age below preservation age?** The projection runs normally (users may have non-super assets to draw from before preservation age), but an informational note states: "Your target retirement age of [X] is below the preservation age of 60. You will not be able to access superannuation until you reach preservation age."

- **What happens when a user includes a business exit value?** The business exit proceeds are added to the investment balance in the specified exit year. The accumulation phase accounts for this one-time inflow, and the drawdown phase includes it in the total retirement asset base.

---

## Requirements

### Functional Requirements

**Retirement Profile**

- **FR-001**: System MUST allow users to create a retirement profile through a 3-step onboarding wizard where only step 1 (date of birth and target retirement age) is required.
- **FR-002**: System MUST store the retirement profile as a per-user record (not per-workspace), with a jurisdiction field defaulting to "AU" for future extensibility.
- **FR-003**: System MUST provide sensible defaults for all profile fields: target retirement age (67), life expectancy (90), SG rate (current legislated rate), salary sacrifice (zero), voluntary contributions (zero).
- **FR-004**: System MUST support home ownership status (owner without mortgage, owner with mortgage, renter) for future Age Pension eligibility modelling.
- **FR-005**: System MUST support an optional business exit value and exit year for users who plan to sell a business before retirement.
- **FR-006**: System MUST include a "learn more" tooltip on every profile field explaining what it means and why it matters.

**Projection Engine**

- **FR-007**: System MUST run a two-phase year-by-year simulation: accumulation (today to retirement age) and drawdown (retirement age to life expectancy).
- **FR-008**: System MUST apply compound annual returns based on risk tolerance mapping: conservative (5%), balanced (6.5%), growth (8%), aggressive (9.5%).
- **FR-009**: System MUST inflate the desired retirement income at the configured CPI rate (default 2.5%) to calculate inflation-adjusted withdrawals in each drawdown year.
- **FR-010**: System MUST apply a reduced return rate during the drawdown phase (accumulation rate minus 1.5%) to reflect a more conservative retirement portfolio.
- **FR-011**: System MUST flag a shortfall when the projected balance reaches zero before the life expectancy age, reporting the exact age at which funds are exhausted.
- **FR-012**: System MUST pull current asset values from the user's personal workspace (investments, cash, property) and aggregate them with the super balance for the total retirement asset base.
- **FR-013**: System MUST use live asset prices from feed links (049-APF) where available, falling back to static asset values when no feed link exists.
- **FR-014**: System MUST cache projection results and invalidate the cache when the retirement profile, underlying asset values, or scenario variables change.

**Australian Superannuation Rules**

- **FR-015**: System MUST model the legislated SG rate schedule: 11.5% for FY2025-26, 12% for FY2027-28 onwards, holding at the final legislated rate for future years.
- **FR-016**: System MUST enforce the concessional contribution cap ($30,000/year for FY2024-25, indexed at 3% annually) and model excess concessional contributions as non-concessional.
- **FR-017**: System MUST enforce the non-concessional contribution cap ($120,000/year, equal to 4x the concessional cap).
- **FR-018**: System MUST apply 15% contributions tax on concessional contributions (employer SG plus salary sacrifice).
- **FR-019**: System MUST determine preservation age from the user's date of birth using the legislated birth-year table, with a simplified default of 60 for users born after 30 June 1964.
- **FR-020**: System MUST display an informational warning when the projected super balance at retirement exceeds the transfer balance cap threshold ($1,900,000).
- **FR-021**: System MUST store all super rules as versioned configuration (not hardcoded) so they can be updated annually.
- **FR-022**: System MUST allow users to override the employer SG rate on their profile for employers who pay above the minimum.

**Scenario Integration**

- **FR-023**: System MUST register retirement-specific variables with the Scenario Planning Engine (068-SPE): target retirement age, desired income, extra salary sacrifice, return rate override, inflation rate override, business exit value, and business exit year.
- **FR-024**: System MUST be registered as a scenario projector with 068-SPE so that scenario comparisons invoke the retirement projection engine with variable overrides.
- **FR-025**: System MUST support creating up to 3 named retirement scenarios for side-by-side comparison using the scenario engine's comparison and overlay chart capabilities.
- **FR-026**: System MUST NOT build its own scenario CRUD or comparison interface — it consumes the shared capabilities of 068-SPE.

**Goal Integration**

- **FR-027**: System MUST auto-create a Goal with type "Retirement" when a retirement profile is created, with a target equal to the computed required lump sum at retirement age and a deadline matching the target retirement date.
- **FR-028**: System MUST auto-update the retirement goal's current value and record a progress history entry whenever the projection is recomputed.
- **FR-029**: System MUST display the retirement goal in the existing goals dashboard alongside other financial goals.

**Couples Planning**

- **FR-030**: System MUST support linking two retirement profiles via an email-based invitation flow, similar to workspace invitations.
- **FR-031**: System MUST run individual projections for each partner plus a combined household projection when profiles are linked.
- **FR-032**: System MUST account for different retirement ages in the combined projection (reducing the household withdrawal rate when one partner is still working).
- **FR-033**: System MUST allow either partner to unlink profiles, which removes the combined view without affecting individual projections.

**Practice Advisory View**

- **FR-034**: System MUST display a read-only "Retirement" tab on the practice client detail page for clients who have a retirement profile.
- **FR-035**: System MUST allow practice advisors to attach advisory notes to a client's retirement projection using the existing polymorphic notes system.
- **FR-036**: System MUST prevent practice advisors from editing a client's retirement profile — only the client can modify their own profile.
- **FR-037**: System MUST provide a "Retirement Reviews" dashboard widget for practice workspaces showing clients with retirement profiles sorted by trajectory status.

**Regulatory Compliance**

- **FR-038**: System MUST display a persistent, non-dismissable regulatory disclaimer on every retirement projection page containing: the statement that projections are for informational purposes only, that they are not financial advice, that outcomes may differ materially, and that users should consult a licensed financial adviser.
- **FR-039**: System MUST append the regulatory disclaimer to every AI chatbot response related to retirement projections.
- **FR-040**: System MUST label practice advisor views of client projections as "Client Projection" and never as "Financial Plan", "Recommendation", or "Advice."
- **FR-041**: System MUST ensure the AI chatbot uses descriptive language ("your projection shows...") and never directive language ("you should...") when discussing retirement.

**Navigation & Access**

- **FR-042**: System MUST add a "Retirement" navigation item to the personal workspace navigation, positioned between "Net Worth" and "Settings."
- **FR-043**: System MUST restrict retirement profile creation to the profile owner — no other user can create or edit another user's retirement profile.

### Key Entities

- **Retirement Profile**: A per-user record capturing retirement planning inputs. Contains date of birth, target retirement age, life expectancy assumption, desired annual retirement income (in today's dollars), risk tolerance (conservative/balanced/growth/aggressive), current super balance, fund name, employer SG rate, salary sacrifice amount, voluntary contribution amount, home ownership status, optional business exit details, partner link, and jurisdiction. One profile per user, independent of workspaces.

- **Retirement Projection**: The computed output of the projection engine for a given retirement profile. Contains a year-by-year array of balance snapshots (age, super balance, investment balance, total balance, contributions or withdrawals, returns, shortfall flag) split into accumulation and drawdown phases, plus summary metrics (projected balance at retirement, shortfall age, required lump sum, trajectory status). Cached with a "computed at" timestamp and invalidated when inputs change.

- **Retirement Goal**: A Goal record with type "Retirement" auto-created from a retirement profile. Target is the required lump sum at retirement age. Current value is total retirement assets. Deadline is the target retirement date. Auto-updates when the projection is recomputed. Appears in the existing goals dashboard.

- **Jurisdiction Calculator**: A pluggable rules engine that encapsulates jurisdiction-specific retirement regulations. The AU calculator handles SG rate schedules, contribution caps and indexation, contributions tax, preservation age by birth year, and transfer balance cap thresholds. The calculator is selected based on the profile's jurisdiction field, enabling future NZ/UK/US extensions without changes to the core projection engine.

- **Projection Year**: A single year's snapshot within a projection. Contains the year, the user's age, the super balance, the investment balance, the total balance, the contributions added (accumulation phase) or withdrawals taken (drawdown phase), the investment returns earned, and whether the balance has been exhausted (shortfall flag).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete the retirement profile onboarding wizard (all 3 steps) in under 3 minutes.
- **SC-002**: Projection calculations complete and display results within 2 seconds of opening the projection page.
- **SC-003**: Projection output for a known set of inputs matches a manual calculation (using current ATO rates and rules) to within 1% variance across all projection years.
- **SC-004**: The regulatory disclaimer is visible and non-dismissable on 100% of retirement projection surfaces (pages, charts, AI responses, practice views).
- **SC-005**: At least 30% of personal workspace users create a retirement profile within 60 days of feature launch.
- **SC-006**: Users who create a retirement profile have 25%+ higher 90-day retention than those who do not.
- **SC-007**: 80%+ of surveyed practice advisors rate the client retirement projection view as "useful" or "very useful" for advisory meetings.
- **SC-008**: Scenario comparison loads and renders overlay charts for 3 retirement scenarios within 3 seconds.
- **SC-009**: Zero instances of directive language ("you should", "we recommend") appear in any system-generated retirement output, verified by automated content audit.
