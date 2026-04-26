---
title: "Technical Plan: MoneyQuest Ledger"
---

# Technical Plan: MoneyQuest Ledger

**Created**: 2026-03-01
**Status**: Draft
**Source**: Architecture prompt + Complete Architecture guide + 50 spec clarifications

---

## Vision

A **bulletproof double-entry accounting ledger engine** that serves as the backbone for multiple distinct financial applications. The core ledger never gets compromised — it's rock-solid event-sourced double-entry accounting. Different applications are layered on top as **feature-flagged modules**, all sharing the same proven, auditable transaction engine.

One codebase. One database. One ledger. Many lenses.

---

## Architectural Approach

### Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Backend | Laravel 12 API | Ecosystem maturity, event sourcing support, tenancy packages |
| Frontend | Next.js 16 (React 19, TypeScript) | Decoupled SPA, API reusability, independent deployment, future mobile app |
| Auth | Laravel Sanctum (cookie-based SPA) | First-party SPA auth, subdomain cookie sharing |
| Multi-tenancy | Stancl/Tenancy v3.9 (**single-database mode**) | `tenant_id` scoping, faster to ship, clean migration path to per-tenant DB later |
| Event Sourcing | Spatie laravel-event-sourcing v7 | Immutable audit trail, aggregate roots, projectors — the ledger IS events |
| Accounting | Custom event-sourced layer + eloquent-ifrs reference | IFRS-compliant double-entry, reversal-only corrections |
| Billing | Laravel Cashier 16 (Stripe) in central layer | Module-based pricing, subscription management |
| Permissions | Spatie laravel-permission (teams mode) | Tenant-scoped RBAC, separation of duties, role-based UI |
| Bank Feeds | Basiq (CDR-accredited) | 135+ AU/NZ institutions, $0.50/user/month |
| Data Grids | TanStack Table v8 + TanStack Query v5 | Headless, virtual scrolling, server-side pagination |
| State Mgmt | Zustand v5 (client) + TanStack Query v5 (server) | Lightweight, no Redux overhead |
| Admin Panel | FilamentPHP (separate admin routes) | Best Laravel admin, runs alongside Next.js |
| WebSockets | Laravel Reverb | First-party, Pusher protocol, real-time reconciliation |
| Database | Aurora PostgreSQL Serverless v2 | JSONB for events, MVCC, Row Level Security |
| Hosting | AWS ap-southeast-2 (Sydney) | ATO DSP data sovereignty — market differentiator |
| Compute | ECS Fargate | Web, Worker, Scheduler, Frontend task definitions |
| Cache/Queue | Redis (ElastiCache, non-cluster) | Horizon requirement, AOF persistence |
| Email | AWS SES | Already in AWS ecosystem, cheap, good deliverability |
| Feature Flags | Laravel Pennant | Module toggling per tenant |

### Data Architecture

**Two-layer database structure** (conceptual, single-DB mode):

**Central/system layer**: organizations, users, authentication, billing (Stripe Cashier), tenant metadata, feature flags/modules
**Tenant-scoped layer** (all queries filtered by `tenant_id`): chart_of_accounts, stored_events, snapshots, journals, invoices, bank_connections, reconciliations, contacts, jobs, tracking_categories, activity_logs

A user authenticates against the central layer, then the system scopes all financial queries to their selected organization's `tenant_id`.

**Migration path preserved**: The codebase uses clean `tenant_id` abstraction so we can migrate to database-per-tenant later when scaling to external SMB customers or if regulatory requirements demand hard isolation.

### Key Architectural Decisions

1. **Single-database first** — faster to ship, simpler ops. Clean migration path to per-tenant DB via Stancl config when needed
2. **Event sourcing for ALL financial mutations** — immutable audit trail, replay capability. The ledger IS events
3. **Feature flags over separate apps** — one codebase, modules toggled per tenant via `features` config on organizations table. Avoids duplication of ledger logic
4. **Role-based UI, not app-based UI** — lending customers and accountants access the same system through different Next.js interfaces
5. **Next.js decoupled** over Inertia — API reusability for future mobile apps, independent deployment
6. **Basiq** over Yodlee/Plaid — AU-native, CDR-accredited, $0.50/user vs $5K+/month
7. **Cashier direct** over Spark — module-based pricing needs, Tenancy integration, Connect support
8. **Projectors for reports** — never query raw events, single-process queue for ordering
9. **Provider abstraction layer** — BankFeedProviderInterface from day one for vendor flexibility
10. **Australian hosting as differentiator** — not just compliance, but market positioning

---

## Module Architecture

The core ledger engine serves all modules. Each module is feature-flagged per tenant.

```
┌─────────────────────────────────────────────────┐
│                  Next.js Frontend                │
│   ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│   │ Customer │ │Accountant│ │  Admin Panel   │   │
│   │   View   │ │   View   │ │  (Filament)   │   │
│   └──────────┘ └──────────┘ └───────────────┘   │
├─────────────────────────────────────────────────┤
│              Laravel API + Sanctum               │
│   ┌──────────────────────────────────────────┐   │
│   │         Module Layer (Feature-Flagged)    │   │
│   │  ┌────────────┐ ┌─────────┐ ┌─────────┐ │   │
│   │  │Zone Ledger │ │ Lending │ │ SMB Tax │ │   │
│   │  └────────────┘ └─────────┘ └─────────┘ │   │
│   │  ┌────────────────┐ ┌──────────────┐     │   │
│   │  │ Family Office  │ │Budget Tracker│     │   │
│   │  └────────────────┘ └──────────────┘     │   │
│   └──────────────────────────────────────────┘   │
│   ┌──────────────────────────────────────────┐   │
│   │     Core Ledger Engine (Event-Sourced)    │   │
│   │  Double-Entry │ CoA │ Projectors │ GST   │   │
│   └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│    Aurora PostgreSQL (single-DB, tenant_id)       │
└─────────────────────────────────────────────────┘
```

### Module: Zone Ledger (MVP — Trilogy Care & CareVicinity)

The initial module. Full accounting for aged care organisations.

- Core double-entry accounting (journal entries, approval workflow)
- Chart of accounts (Australian standard + industry templates)
- Bank feed integration via Basiq
- 3-pass reconciliation engine (exact, fuzzy, rule-based)
- Grouped recommendations with batch confirm (human in the loop)
- Financial reporting (P&L, Balance Sheet, Trial Balance, Cash Flow, GL)
- GST/BAS reporting and lodgement
- Invoicing & AR (with customer portal, magic link auth)
- Bills & AP
- Contacts (hierarchical, with ABN, payment terms)
- Job costing (hierarchical: Client → Project → Phase → Task)
- Tracking categories (unlimited user-defined dimensions)
- Budget Tracker ($20/mo add-on — per-client funding, co-payments)
- Recurring transactions
- File attachments (S3)
- CSV/OFX bank statement import
- Data migration (CSV import from Xero/MYOB)
- Notifications (in-app + email)
- Dashboard (financial summary)
- Keyboard shortcuts (Xero-inspired reconciliation)
- Public REST API (documented, versioned, API key auth)
- Outbound webhooks

### Module: Lending (Future)

Micro-lending to marketplace participants (e.g., care providers needing working capital).

- Loan accounts in the ledger (new account types)
- Interest accrual (scheduled journal entries)
- Repayment tracking and schedules
- Customer dashboard (balance, transactions, payment schedule)
- Loan origination workflow
- Lending-specific reporting
- Regulatory compliance (ASIC credit licence requirements)

### Module: SMB Tax Compliance (Future)

Full accounting portal for small businesses. The Xero/MYOB competitor.

- Extends Zone Ledger with broader industry templates
- BAS preparation and lodgement (SBR2)
- Income tax tracking and deductions
- Payroll integration (import from KeyPay, Employment Hero)
- Multi-currency support
- Sole trader and company structures

### Module: Family Office / Trust Accounting (Future)

Multi-entity consolidation for wealth structures.

- Trust accounting (trust law compliance)
- Multi-entity consolidation with elimination
- Cross-structure tax planning (trusts, companies, individuals)
- Beneficiary tracking and distribution management
- Capital gains tracking
- Extends inter-entity transactions from Zone Ledger

---

## Role-Based Interfaces

The UI changes radically based on who's logged in — same ledger underneath, different experience on top.

| Role | See | Don't See |
|------|-----|-----------|
| **Platform Admin** | All tenants, billing, feature flags, system config | — |
| **Org Owner** | All workspaces, billing, team management | Other orgs |
| **Accountant** | Full ledger: journals, reconciliation, reports, bank feeds, CoA | Billing, system config |
| **Bookkeeper** | Create/edit transactions, reconcile. Submit for approval | Approve entries, modify CoA, settings |
| **Approver** | Review and approve pending entries, view reports | Create entries (separation of duties) |
| **Auditor** | Read-only across all financial data, full audit trail | Create/modify anything |
| **Client** | Selected reports shared with them | Ledger, bank feeds, settings |
| **Customer** (Lending/Invoice) | Simple dashboard: balance, transactions, payment schedule | Journals, CoA, reconciliation, admin |

One codebase with role-based interfaces, not separate applications. Laravel API enforces all ledger rules; Next.js renders different views based on role + tenant modules.

---

## Implementation Strategy

### Phase 1: Ledger Engine (Sprints 1-4)

- Single-DB multi-tenancy setup (Stancl, tenant_id scoping)
- Auth with mandatory MFA (Fortify + TOTP)
- Org → Workspace → User hierarchy with Spatie permissions
- Feature flag system (Laravel Pennant, modules per tenant)
- Chart of accounts (industry templates: AU Standard, Aged Care, Construction, Professional Services, Hospitality, Retail)
- Event-sourced journal entries (JournalEntryAggregate, Draft → Pending Approval → Posted)
- Core projectors (AccountBalance, GeneralLedger, TrialBalance)
- Period management (open/close, virtual year-end close)
- Next.js shell with Sanctum auth, workspace switcher, role-based routing
- TanStack Table data grids
- Guided onboarding wizard (< 10 min to first value)

### Phase 2: Bank Feeds & Reconciliation (Sprints 5-8)

- Basiq integration (Connect UI, webhook sync, token management)
- Provider abstraction layer (BankFeedProviderInterface)
- Raw bank transaction store with normalisation (all account types: transaction, savings, credit card, loan)
- CSV/OFX bank statement import with column mapping wizard
- Queue-based daily sync (6am AEST, staggered)
- 3-pass reconciliation engine (exact, fuzzy, rule-based — ML deferred)
- Grouped recommendations with batch confirm (human in the loop always)
- Reconciliation UX (split-pane, keyboard shortcuts, progress tracking)
- Bank feed rules management (workspace-scoped)
- Split transactions (multiple lines, different tax codes)
- Inter-account transfers (dedicated transaction type)
- Circuit breaker and CDR consent monitoring

### Phase 3: Invoicing, AR/AP & Contacts (Sprints 9-12)

- Contact management (hierarchical, ABN, payment terms, credit limits)
- Invoice aggregate (Draft → Approved → Sent → Payment → Paid)
- Credit notes and void (void for unsent, credit note for sent)
- Invoice branding (logo, colours, footer, ABN)
- Invoice delivery (email PDF + customer portal with magic link auth)
- Payment allocation (FIFO + manual override)
- Bills & Accounts Payable (due date management, batch payment runs)
- Payment terms (Net 7/14/30/60/90 + custom per contact)
- Recurring transactions (journal entries, invoices, bills)
- File attachments (S3, linked to any entity)
- Optimistic locking with conflict warnings

### Phase 4: Reporting & Compliance (Sprints 13-15)

- P&L, Balance Sheet, Cash Flow, General Ledger projectors
- BAS report projector and preparation workflow
- SBR2 gateway integration for lodgement
- Aging reports (AR/AP: Current / 1-30 / 31-60 / 61-90 / 90+)
- Comparative period reporting with variances
- PDF/Excel export
- Virtual year-end close (projector-calculated, no manual closing entries)
- Effective-dated tax codes (rate changes preserve history)

### Phase 5: Advanced Features (Sprints 16-19)

- Job costing (hierarchical: Client → Project → Phase → Task, 4 levels)
- Job profitability reports (revenue, costs, margin with drill-down)
- Tracking categories (unlimited user-defined dimensions)
- Budget Tracker module ($20/mo add-on — per-client funding, co-payments, multi-source)
- Data export (CSV/JSON for all entities)
- Data migration (CSV import from Xero/MYOB with mapping wizard)
- Unified global search
- Notifications (in-app + email, user-configurable preferences)
- Outbound webhooks (configurable per workspace)

### Phase 6: Billing & Monetisation (Sprints 20-21)

- Stripe billing in central layer (Cashier 16)
- Module-based pricing with feature flags
- 14-day free trial (Professional access, no card required)
- Budget Tracker add-on billing ($20/mo via Stripe subscription items)
- ABN validation + Stripe Tax for Australian GST on subscriptions
- Stripe Connect (Express) for tenant invoice payments
- Webhook handling and dunning

### Phase 7: Platform Maturity (Sprints 22-24)

- Public REST API (documented, versioned, API key auth with rate limiting)
- Dashboard (financial summary: cash position, P&L snapshot, outstanding, queue count)
- Inter-entity transactions (linked journal entries, intercompany accounts)
- Consolidated reporting (P&L + BS with elimination)
- Anomaly detection (amount outliers, duplicate payments, unexpected vendors)
- Cash flow forecasting (based on recurring patterns + outstanding invoices/bills)

### Future: Module — Lending

- Loan account types in the ledger
- Interest accrual engine (scheduled journal entries)
- Repayment tracking and schedules
- Customer/Client dashboard (stripped-down view: balance, transactions, payments)
- Loan origination workflow

### Future: Module — SMB Tax Compliance

- Extended BAS/income tax features
- Broader industry templates
- Payroll import integration
- Multi-currency support

### Future: Module — Family Office / Trust Accounting

- Trust accounting compliance
- Multi-entity consolidation with elimination
- Beneficiary and distribution management
- Cross-structure tax planning

---

## Infrastructure & DevOps

### Compute Architecture

- **Web**: Nginx + PHP-FPM behind ALB (auto-scaling)
- **Worker**: PHP-FPM running Horizon (6 queue supervisors)
- **Scheduler**: `php artisan schedule:run`
- **Frontend**: Node.js Next.js server

### Queue Architecture

| Queue | Processes | Timeout | Retries | Purpose |
|-------|-----------|---------|---------|---------|
| bank-feeds | 2-10 | 300s | 3 | Bank API calls |
| reconciliation | 1-5 | 600s | 3 | Matching pipeline |
| report-generation | 1-8 | 1800s | 1 | Financial reports |
| webhooks | 2-6 | 30s | 5 | Stripe/Basiq webhooks |
| event-projector | **1** | 120s | 3 | Guaranteed ordering |
| default | 2-10 | 60s | 3 | Notifications, mail |

### Security

- MFA mandatory (TOTP), 30-min session timeout, lockout after 5 attempts
- AES-256 at rest (KMS), TLS 1.2+ in transit
- Spatie Activity Log per tenant, 12+ month retention
- Tiered audit visibility: users see activity log, admins see full detail (IP, user agent, payloads), auditor sees everything read-only
- Rate limiting: 60 req/min general, 10 req/min bank feeds
- OWASP Top 10 mitigations throughout

### DR & Backup

- Aurora continuous backup (35-day PITR)
- Nightly pg_dump to S3 (SSE-KMS), Glacier after 90 days
- Aurora Global DB to ap-southeast-4 (Melbourne) — <1s RPO, <1min RTO
- 7-year retention in Glacier Deep Archive (ATO requirement)
- Soft-delete workspaces with 90-day grace period, then cold storage archive

---

## Testing Strategy

- **Central tests**: Billing, tenant CRUD, auth, feature flags
- **Tenant tests**: Accounting logic, event sourcing, projectors, reconciliation
- **Integration tests**: End-to-end flows across modules
- Stancl/Tenancy scoping verified in tests
- CI via GitHub Actions, blue-green deploy via CodeDeploy

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| CDR screen-scraping ban timeline | HIGH | Basiq is CDR-native, no screen-scraping dependency |
| Event store growth at scale (single DB) | HIGH | Snapshotting every 50-100 events, Closing the Books pattern, partition by tenant_id |
| Single-DB tenant isolation concerns | MEDIUM | tenant_id scoping + Row Level Security. Migration path to per-tenant DB preserved |
| Module complexity creep | MEDIUM | Each module is feature-flagged and independently deployable. Ledger engine is stable core. |
| Lending regulatory requirements (ASIC) | MEDIUM | Defer lending module until legal framework is clear. Build ledger hooks first. |
| Database-per-tenant migration timing | LOW | Stancl supports both modes. Config change, not architecture change. |

---

## Development Clarifications

### Session 2026-03-01

See spec.md `## Clarifications` section for full 50-question clarification log.

Key decisions that shaped this plan:
- Single-DB first (reversed from initial per-tenant decision)
- Module architecture with feature flags (evolved from tier-based pricing)
- Zone Ledger as initial module for Trilogy Care / CareVicinity
- Human in the loop always for reconciliation (grouped recommendations for speed)
- Budget Tracker as $20/mo add-on (not tier-gated)
- Lending, SMB Tax, Family Office as future modules
- Role-based UI (customer sees simple dashboard, accountant sees full portal)
