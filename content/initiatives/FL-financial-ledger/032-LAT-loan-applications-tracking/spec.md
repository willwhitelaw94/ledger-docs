---
title: "Feature Specification: Loan Applications & Tracking"
---

# Feature Specification: Loan Applications & Tracking

**Feature Branch**: `feature/032-LAT-loan-applications-tracking`
**Created**: 2026-03-15
**Status**: Draft
**Input**: Idea Brief — toggleable module for loan lifecycle tracking (borrower & lender), amortization schedules, auto journal entries, dashboard widget

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Add a Loan (Priority: P1)

As a workspace user, I want to add a loan to my ledger so I can track the balance, repayments, and interest over time without manual journal entries.

When adding a loan, the user specifies: loan name, type (Mortgage, Car/Vehicle, Personal, Business, Line of Credit, Student), original amount, interest rate, interest method (reducing balance or flat rate), term length, start date, repayment frequency (weekly, fortnightly, monthly), regular repayment amount, lender/borrower name, and whether this loan is held as a borrower (liability) or lender (asset).

The system auto-creates a dedicated chart account for each loan (e.g., "Mortgage — 123 Main St") — a liability account for borrower loans, an asset/receivable account for lender loans. Each loan gets its own account for independent GL tracking.

**Why this priority**: Without the ability to add a loan, nothing else works. This is the foundation.

**Independent Test**: Can be fully tested by adding a mortgage and verifying it appears in the loan register with correct details, linked to the right ledger account.

**Acceptance Scenarios**:

1. **Given** a workspace with the Loans module enabled, **When** a user creates a new loan as borrower with type "Mortgage", amount $500,000, 6.5% interest, 30-year term, monthly repayments, **Then** the loan appears in the register with status "Active", linked to a liability account, showing the correct repayment amount and next payment date.
2. **Given** a workspace user adding a loan, **When** they select "Lender" as the loan direction, **Then** the loan is linked to an asset/receivable account instead of a liability account.
3. **Given** a workspace user, **When** they add a loan with type "Line of Credit", **Then** the loan is created without a fixed term or amortization schedule, tracking only the drawn balance and interest charges.

---

### User Story 2 — View Amortization Schedule (Priority: P1)

As a user, I want to see the full amortization schedule for a loan so I can understand how each repayment splits between principal and interest over the life of the loan.

When viewing a loan's detail page, the user sees a table showing every scheduled repayment: date, payment amount, principal portion, interest portion, and remaining balance. The schedule is generated from the loan's terms at creation and recalculated if the interest rate changes.

**Why this priority**: The amortization schedule is the core value proposition — it shows users exactly where their money goes. Without it, the module is just a list of loans.

**Independent Test**: Can be tested by adding a 12-month personal loan and verifying the schedule shows 12 rows with correct principal/interest splits that sum to the total repaid.

**Acceptance Scenarios**:

1. **Given** a loan with $10,000 principal, 8% annual interest, 12-month term, monthly repayments, **When** the user views the amortization schedule, **Then** they see 12 rows where each row shows the date, payment amount, principal portion, interest portion, and remaining balance — with the final row showing $0 remaining.
2. **Given** a loan with reducing balance interest, **When** viewing the schedule, **Then** early repayments show higher interest and lower principal, with the ratio shifting over time.
3. **Given** a loan with flat rate interest, **When** viewing the schedule, **Then** the interest portion is the same each period.

---

### User Story 3 — Record a Repayment (Priority: P1)

As a user, I want to record a loan repayment so the system automatically creates a journal entry splitting the payment into principal reduction and interest expense.

When recording a repayment, the system suggests the next scheduled amount from the amortization schedule. The user can accept the suggested amount or enter a different amount (overpayment or partial payment). The system creates a journal entry: debit the loan liability account (principal portion) + debit interest expense (interest portion), credit the bank/cash account.

**Why this priority**: Auto journal entry generation on repayment is the key time-saver that replaces manual bookkeeping.

**Independent Test**: Can be tested by recording a repayment on an active loan and verifying the journal entry is created with correct debit/credit lines and the loan balance is reduced.

**Acceptance Scenarios**:

1. **Given** an active loan with a scheduled monthly repayment of $1,200, **When** the user records the repayment, **Then** a journal entry is created debiting the loan account (principal) and interest expense (interest), crediting the selected bank account, and the loan's outstanding balance decreases by the principal portion.
2. **Given** a scheduled repayment of $1,200, **When** the user records an overpayment of $2,000, **Then** the extra $800 is applied entirely to principal reduction, the amortization schedule is recalculated, and the payoff date moves earlier.
3. **Given** a lender loan (asset), **When** the user records a repayment received, **Then** the journal entry credits the loan receivable account (principal) and credits interest income (interest), debiting the bank account.

---

### User Story 4 — Loan Register (Priority: P2)

As a user, I want to see all my loans in a single register so I can understand my total debt (or lending) position at a glance.

The loan register shows a table of all loans with: name, type, lender/borrower name, original amount, current balance, interest rate, next payment date and amount, status, and a progress bar showing percentage paid off. The register supports filtering by status (Active, Paid Off, Applied, Approved) and loan type.

**Why this priority**: The register is the primary navigation point for loans. It delivers immediate value by showing the full debt/lending picture.

**Independent Test**: Can be tested by adding 3 loans of different types and statuses, then verifying the register shows all with correct balances and filters work.

**Acceptance Scenarios**:

1. **Given** a workspace with 5 loans (3 active, 1 paid off, 1 applied), **When** the user opens the loan register, **Then** all 5 loans appear with current balances, next payment dates, and progress indicators.
2. **Given** the loan register, **When** the user filters by "Active" status, **Then** only the 3 active loans are shown.
3. **Given** loans as both borrower and lender, **When** viewing the register, **Then** the register shows a summary row with total debt (borrower loans) and total receivable (lender loans).

---

### User Story 5 — Loan Lifecycle & Status (Priority: P2)

As a user, I want to track a loan through its lifecycle so I can manage loans from initial application through to full payoff.

Loans progress through statuses: Applied → Approved → Funded → Active → Paid Off. Users can also mark a loan as Declined or Cancelled. Status transitions are recorded with dates. The "Funded" → "Active" transition is when the amortization schedule begins and the opening journal entry is created (debit bank/asset, credit loan liability).

**Why this priority**: Not all loans start as "Active" — users may want to track applications in progress, especially for mortgages and business loans.

**Independent Test**: Can be tested by creating a loan as "Applied", progressing it through each status, and verifying that the opening journal entry is created only at the "Funded" transition.

**Acceptance Scenarios**:

1. **Given** a loan in "Applied" status, **When** the user transitions it to "Approved", **Then** the status updates and the transition date is recorded — no journal entries are created yet.
2. **Given** a loan in "Approved" status, **When** the user transitions it to "Funded", **Then** the system creates an opening journal entry (debit bank account, credit loan liability for the funded amount) and the amortization schedule becomes active.
3. **Given** an active loan, **When** the final repayment is recorded bringing the balance to zero, **Then** the loan automatically transitions to "Paid Off" status.
4. **Given** a loan in "Applied" or "Approved" status, **When** the user marks it as "Declined", **Then** the loan is archived with no financial impact.

---

### User Story 6 — Dashboard Loan Widget (Priority: P2)

As a user, I want to see a loans summary on my dashboard so I can quickly check my debt position and upcoming payments without navigating to the loan register.

The widget shows: total outstanding debt (borrower loans), total outstanding receivables (lender loans), next 3 upcoming payments with dates and amounts, and a payoff progress summary for the largest loan.

**Why this priority**: Dashboard visibility drives engagement and makes the loan module feel integrated rather than bolted on.

**Independent Test**: Can be tested by adding active loans and verifying the dashboard widget shows correct totals and upcoming payments.

**Acceptance Scenarios**:

1. **Given** a workspace with 3 active borrower loans totalling $450,000 outstanding, **When** the user views the dashboard, **Then** the loans widget shows "$450,000 total debt" and lists the next 3 upcoming payments.
2. **Given** no active loans, **When** the user views the dashboard, **Then** the widget shows an empty state with a prompt to add a loan.

---

### User Story 7 — Loan Detail Page (Priority: P2)

As a user, I want to view a loan's full details so I can see its terms, repayment history, amortization schedule, and linked journal entries in one place.

The detail page shows: loan summary (name, type, status, lender/borrower, original amount, current balance, interest rate, term), amortization schedule tab, repayment history tab (showing all recorded repayments with linked journal entries), and a summary of total interest paid vs remaining.

**Why this priority**: Users need a comprehensive view to manage individual loans effectively.

**Independent Test**: Can be tested by viewing a loan with 3 recorded repayments and verifying all sections display correct data.

**Acceptance Scenarios**:

1. **Given** an active loan with 6 recorded repayments, **When** the user opens the loan detail page, **Then** they see the loan summary, amortization schedule, repayment history with links to the 6 journal entries, and total interest paid to date.
2. **Given** a loan detail page, **When** the user clicks a repayment's linked journal entry, **Then** they navigate to the journal entry detail page.

---

### User Story 8 — Inter-Entity Lending (Priority: P2)

As a lender workspace, I want to create a loan and send it as an invitation to a borrower workspace so both sides automatically track the same loan — one as an asset, the other as a liability — with repayments syncing across both ledgers.

The lender creates the loan with all terms (amount, rate, term, repayment schedule) and sends an invitation to the borrower workspace. The borrower reviews the terms presented as a formal loan agreement summary within the acceptance form — showing all key terms (amount, interest rate, term, repayment amount, total interest payable). The borrower clicks "Accept & Sign" to confirm agreement. The system records who signed, when, and stores an immutable snapshot of the agreed terms as the loan contract. Once accepted, the loan appears in both workspaces: as an asset/receivable on the lender's ledger and a liability on the borrower's. When the borrower records a repayment, the matching journal entry is auto-created on the lender's workspace immediately — no manual reconciliation needed.

Standalone loans (counterparty not on MoneyQuest) can be converted to inter-entity loans later by sending a link invitation to the counterparty workspace.

**Why this priority**: Inter-entity lending is the differentiator — no SME tool does this. One loan, two ledger views, fully synced.

**Independent Test**: Can be tested by creating a loan on workspace A, sending invitation to workspace B, accepting, recording a repayment on B, and verifying the journal entry appears on A.

**Acceptance Scenarios**:

1. **Given** a lender workspace, **When** the user creates a loan and sends an invitation to a borrower workspace, **Then** the borrower workspace receives a pending loan invitation showing all terms.
2. **Given** a pending loan invitation, **When** the borrower reviews the loan agreement summary and clicks "Accept & Sign", **Then** the system records the signatory, timestamp, and immutable terms snapshot, and the loan appears in both workspaces with matching opening journal entries on both sides.
3. **Given** an active inter-entity loan, **When** the borrower records a repayment, **Then** a matching journal entry is auto-created on the lender's workspace (credit loan receivable + credit interest income, debit bank) with no action required from the lender.
4. **Given** a standalone loan (counterparty not on MoneyQuest), **When** the user sends a "link to entity" invitation to another workspace, **Then** the loan converts to an inter-entity loan with both sides synced going forward.
5. **Given** a pending loan invitation, **When** the borrower declines, **Then** the loan remains on the lender's workspace as a standalone loan with no impact.

---

### User Story 9 — Extra Repayments & Recalculation (Priority: P3)

As a user, I want to make extra or lump-sum repayments so I can pay off my loan faster and see the updated payoff timeline.

When an extra repayment is made (above the scheduled amount), the system applies the excess to principal, recalculates the remaining amortization schedule, and shows the new payoff date. Users can choose to reduce future payment amounts (keep term) or reduce the term (keep payment amount).

**Why this priority**: Extra repayments are a common real-world scenario but not essential for MVP.

**Independent Test**: Can be tested by making a lump-sum payment on a loan and verifying the schedule recalculates with a new payoff date.

**Acceptance Scenarios**:

1. **Given** a loan with 24 months remaining, **When** the user makes a lump-sum extra repayment of $5,000 and chooses "reduce term", **Then** the amortization schedule recalculates showing fewer remaining payments and an earlier payoff date.
2. **Given** a loan with 24 months remaining, **When** the user makes a lump-sum payment and chooses "reduce payment amount", **Then** the term stays the same but monthly payments decrease.

---

### User Story 10 — Loan Reporting (Priority: P3)

As a user, I want to run a loan summary report so I can see all loans, their balances, total interest paid, and projected payoff dates for financial planning.

The report shows: all active and paid-off loans, original vs current balance, total interest paid to date, total interest remaining, projected payoff date, and a breakdown by loan type.

**Why this priority**: Reporting adds analytical value but isn't needed for core tracking.

**Independent Test**: Can be tested by running the report with multiple loans and verifying totals are correct.

**Acceptance Scenarios**:

1. **Given** 4 active loans and 1 paid-off loan, **When** the user generates the loan summary report, **Then** the report shows all 5 loans with original amounts, current balances, total interest paid, and projected payoff dates.
2. **Given** the loan summary report, **When** the user filters by loan type "Mortgage", **Then** only mortgage loans appear.

---

### Edge Cases

- What happens when a loan has a 0% interest rate? System should handle interest-free loans with all repayments applied to principal.
- What happens when a repayment exceeds the remaining balance? System should cap the repayment at the outstanding balance and mark the loan as Paid Off.
- What happens when a variable rate loan's rate changes? Schedule recalculates from the next payment onwards using the new rate (future story — MVP uses fixed rate only).
- How does the system handle missed/skipped payments? The scheduled payment remains on the schedule but is marked as missed; the next payment includes any arrears calculation.
- What happens when a loan is deleted? Only loans with no recorded repayments (no journal entries) can be deleted. Loans with repayments must be archived.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create loans with: name, type, direction (borrower/lender), original amount, interest rate, interest method, term, start date, repayment frequency, regular repayment amount, and linked Contact (counterparty).
- **FR-002**: System MUST support loan types: Mortgage, Car/Vehicle, Personal, Business, Line of Credit, Student, and Other (custom label).
- **FR-003**: System MUST generate an amortization schedule for fixed-term loans showing payment date, payment amount, principal portion, interest portion, and remaining balance for each period.
- **FR-004**: System MUST support two interest methods: reducing balance and flat rate.
- **FR-005**: System MUST automatically create journal entries when a repayment is recorded — splitting the payment into principal (loan account) and interest (expense or income account).
- **FR-006**: System MUST auto-create a dedicated chart account per loan (e.g., "Mortgage — 123 Main St") — liability for borrower loans, asset/receivable for lender loans. Each loan is independently trackable in the GL.
- **FR-007**: System MUST track loan lifecycle through statuses: Applied, Approved, Funded, Active, Paid Off, Declined, Cancelled.
- **FR-008**: System MUST create an opening journal entry when a loan transitions to "Funded" status.
- **FR-009**: System MUST recalculate the amortization schedule when an overpayment or lump-sum payment is made.
- **FR-010**: System MUST display a loan register showing all loans with current balances, next payment dates, status, and payoff progress.
- **FR-011**: System MUST display a dashboard widget showing total debt, total receivables, and upcoming payments.
- **FR-012**: System MUST display a loan detail page with summary, amortization schedule, repayment history, and linked journal entries.
- **FR-013**: System MUST prevent deletion of loans that have recorded repayments (linked journal entries).
- **FR-014**: System MUST handle 0% interest loans with all repayments applied to principal.
- **FR-015**: System MUST cap repayments at the outstanding balance and auto-transition to "Paid Off" when balance reaches zero.
- **FR-016**: System MUST be a toggleable module — only visible when enabled in workspace settings.
- **FR-017**: System MUST support Line of Credit loans without a fixed term or amortization schedule, tracking only drawn balance and interest charges.
- **FR-018**: System MUST allow a lender workspace to create a loan and send an invitation to a borrower workspace, creating a linked inter-entity loan on acceptance.
- **FR-019**: System MUST auto-create matching journal entries on the lender's workspace when the borrower records a repayment on an inter-entity loan — fully synced, no manual action.
- **FR-020**: System MUST allow standalone loans to be converted to inter-entity loans by sending a link invitation to a counterparty workspace.
- **FR-021**: System MUST use workspace base currency only for loans (multi-currency loans deferred to future phase).
- **FR-022**: System MUST link loan counterparty to an existing Contact record (reuses Contacts module).
- **FR-023**: System MUST auto-suggest bank feed transaction matches against scheduled loan repayments (amount ± tolerance, within date range). Accepting the match records the repayment and reconciles the transaction in one action.
- **FR-024**: Inter-entity loan invitations are take-it-or-leave-it — lender sets all terms, borrower accepts or declines. To change terms, lender cancels and resends.
- **FR-026**: System MUST present a formal loan agreement summary within the acceptance form showing all key terms. Borrower confirms via "Accept & Sign". System records signatory, timestamp, and stores an immutable snapshot of the agreed terms.
- **FR-025**: System MUST include a generic Financial Schedule Engine that calculates and generates scheduled journal entries. Loans are the first consumer; the engine supports future use by depreciation, amortization, lease accounting, and prepayment schedules.

### Key Entities

- **Loan**: The core entity representing a loan agreement. Key attributes: name, type, direction (borrower/lender), original amount (cents), current balance (cents), interest rate (basis points), interest method, term months, start date, repayment frequency, repayment amount (cents), linked Contact (counterparty), status, linked chart account.
- **Financial Schedule**: A generic schedule of future journal entries. Key attributes: schedulable type (loan, asset, lease), calculation method, frequency, start/end dates, status. The engine that powers amortization, depreciation, and other recurring financial calculations.
- **Loan Schedule Entry**: A single row in the amortization schedule. Key attributes: period number, due date, payment amount, principal portion, interest portion, remaining balance, status (scheduled/paid/missed/overpaid).
- **Loan Repayment**: A recorded repayment against a loan. Key attributes: date, amount, principal portion, interest portion, linked journal entry, notes.
- **Loan Invitation**: An invitation from a lender workspace to a borrower workspace to link a loan. Key attributes: lender workspace, borrower workspace, loan reference, status (pending/accepted/declined), terms snapshot.
- **Loan Participant** *(future — syndicated lending)*: A participant in a syndicated loan. Key attributes: workspace, loan reference, share percentage, funded amount. Enables multiple lenders to each fund a portion of a single loan with proportional interest income.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a new loan and see its amortization schedule in under 2 minutes.
- **SC-002**: Recording a repayment automatically creates a correct journal entry with principal/interest split in a single action (no manual JE creation needed).
- **SC-003**: Loan register shows accurate current balances that match the sum of all related journal entries in the general ledger.
- **SC-004**: Dashboard widget displays total debt position within 1 second of page load.
- **SC-005**: 100% of amortization calculations match standard financial formulas (PMT/IPMT/PPMT) to the cent.
- **SC-006**: Inter-entity loan repayments sync to the counterparty workspace within 1 second of recording.

## Future Phases (Out of Scope for MVP)

### Phase 2: Syndicated / Fractional Lending
Multiple lenders each fund a portion of a single loan. Borrower sees one loan, makes one repayment, system splits it proportionally across lender workspaces. Each lender sees their share as an asset with proportional interest income. Data model supports this from day one via Loan Participant entity — UI deferred.

### Phase 2: Multi-Currency Loans
Loans denominated in a currency different from the workspace base currency. Requires FX conversion on each repayment and unrealised FX gains/losses on the outstanding balance.

### Phase 2: Variable Rate Loans
Rate change events that recalculate the amortization schedule from the next payment onwards. MVP supports fixed rate only.

## Clarifications

### Session 2026-03-15
- Q: How should chart account linking work when a loan is created? → A: Auto-create a dedicated liability/asset account per loan (e.g., "Mortgage — 123 Main St") for independent GL tracking.
- Q: Should loans support multi-currency? → A: No — workspace base currency only for MVP. Multi-currency deferred to future phase.
- Q: For inter-entity loans, how should the loan be initiated? → A: Lender creates the loan and sends an invitation to the borrower workspace. Borrower accepts to link.
- Q: When the borrower records a repayment on an inter-entity loan, what happens on the lender's side? → A: Auto-create the matching journal entry immediately. Both ledgers stay in sync with no manual action.
- Q: Should standalone loans support conversion to inter-entity loans later? → A: Yes — allow linking a standalone loan to another workspace via invitation after creation.
- Q: Should the system support syndicated/fractional lending (multiple lenders per loan)? → A: Captured as future phase. Data model supports it from day one (Loan Participant entity), UI deferred.
- Q: Should the loan counterparty be linked to a Contact record? → A: Yes — link to existing Contact, reuses Contacts module.
- Q: What permissions should loans use? → A: Follow Invoicing pattern — owner/accountant full access, bookkeeper create/view, approver accepts/declines inter-entity invitations, auditor/client read-only.
- Q: Should loan repayments integrate with bank feeds? → A: Yes — auto-suggest matches based on amount ± tolerance and scheduled date range.
- Q: Can borrowers negotiate inter-entity loan terms? → A: No — take-it-or-leave-it. Lender cancels and resends to change terms.
- Q: Should the amortization engine be generic or loan-specific? → A: Generic Financial Schedule Engine built inside this epic, reusable by depreciation, leases, prepayments.
