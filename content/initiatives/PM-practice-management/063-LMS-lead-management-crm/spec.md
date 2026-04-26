---
title: "Feature Specification: Lead Management & Platform CRM"
---

# Feature Specification: Lead Management & Platform CRM

**Feature Branch**: `063-LMS-lead-management-crm`
**Created**: 2026-03-22
**Status**: Draft
**Epic**: 063-LMS
**Initiative**: FL -- Financial Ledger Platform
**Effort**: XL (5-6 sprints)
**Depends On**: 009-BIL (complete), 023-EML (complete), 024-NTF (complete), 051-EHS (complete)

### Out of Scope

- **Full marketing automation** -- no Mailchimp/HubSpot-level campaign builders
- **A/B testing for emails** -- single template per trigger, no variant testing
- **In-app messaging / intercom-style chat** -- admin-to-user communication is email only
- **Payment processing for referral rewards** -- tracking only, no payouts
- **Custom reporting builder** -- use existing 043-CRB for ad-hoc reports
- **User-facing referral UI** -- referral dashboard is admin-only in v1; user-facing referral pages deferred to 065-VGR
- **Real-time analytics** -- metrics are computed on-demand or cached, not streamed

---

## Overview

The super admin portal at `/admin` currently shows basic entity counts (organisations, workspaces, users, practices) and plan tier distribution. There is no lead capture, no growth funnel tracking, no trial lifecycle management, no churn detection, and no outreach tooling. Growth is effectively blind.

This epic delivers a lightweight platform CRM embedded in the super admin portal:

1. **Lead Pipeline** -- capture and track leads from landing page to conversion via kanban board
2. **Trial Management** -- monitor 30-day free trials, track conversion signals, extend or convert trials
3. **Onboarding Funnel** -- visualise drop-off points across onboarding steps
4. **Usage Analytics Dashboard** -- MAU, DAU, feature adoption, workspace activity heatmaps
5. **Churn Signals** -- detect inactive workspaces and declining engagement before users cancel
6. **Email Drip Sequences** -- automated lifecycle emails (welcome, tips, conversion nudge, expiry warning)
7. **Revenue Dashboard** -- MRR, ARR, LTV, churn rate tied to existing billing models
8. **Referral Tracking** -- referral link generation, conversion tracking, incentive logging
9. **Practice Partner Pipeline** -- dedicated pipeline for onboarding accounting practices
10. **Admin Activity Feed** -- audit trail of all admin CRM actions

All models are **central** (not tenant-scoped). All pages are behind `EnsureSuperAdmin` middleware. This is a platform growth tool, not a customer-facing feature.

---

## User Stories

### Super Admin

**US-01**: As a super admin, I want to capture leads from the landing page so I can track interest before signup.

**US-02**: As a super admin, I want a kanban pipeline of leads so I can see where each prospect is in the funnel.

**US-03**: As a super admin, I want to see which trials are active, expiring, or converted so I can intervene at the right time.

**US-04**: As a super admin, I want to see where users drop off during onboarding so I can improve the flow.

**US-05**: As a super admin, I want platform-wide usage metrics (MAU, DAU, feature adoption) so I can measure product health.

**US-06**: As a super admin, I want to see workspaces at risk of churning so I can take proactive action.

**US-07**: As a super admin, I want automated email sequences for trial users so new signups get guided through onboarding without manual effort.

**US-08**: As a super admin, I want to see MRR, ARR, LTV, and churn rate so I can track business health.

**US-09**: As a super admin, I want to track referrals so I can measure organic growth.

**US-10**: As a super admin, I want a separate pipeline for practice partners so high-value prospects get appropriate attention.

**US-11**: As a super admin, I want an activity feed of all CRM actions so I have an audit trail.

---

## Functional Requirements

### FR1: Lead Model & Pipeline

- **FR1.1**: `Lead` model (central, not tenant-scoped) with fields: name, email, company, phone, entity_type (enum matching workspace entity types), source (website/referral/partner/event/manual), status (new/contacted/demo_booked/trial_started/converted/lost), notes (text), assigned_to_user_id (FK to users, nullable -- must be super admin), utm_source, utm_medium, utm_campaign, referred_by_user_id (FK to users, nullable), lead_score (integer, 0-100), organisation_id (FK, nullable -- set when lead converts to signup)
- **FR1.2**: Kanban board at `/admin/leads` with 6 columns: New, Contacted, Demo Booked, Trial Started, Converted, Lost. Drag-and-drop between columns calls `PATCH /api/v1/admin/leads/{id}/status`. Status transitions validated via `LeadStatus::canTransitionTo()` (following the `InvoiceStatus` pattern): no moving backwards past Converted, Lost is terminal (can only reopen to New). Pipeline stages are fixed (not custom) in v1 -- the 6-stage pipeline covers the B2B SaaS funnel adequately. No SLA tracking on stage duration in v1; `days_in_stage` is computed on-read from `lead_activities` timestamps for display on kanban cards, but no automated alerts for stale leads.
- **FR1.3**: Lead detail slide-over on card click: all fields editable, activity timeline (status changes, notes, emails sent), linked organisation (if converted)
- **FR1.4**: Manual lead creation via "New Lead" button. CSV import via `POST /api/v1/admin/leads/import` accepting columns: name, email, company, phone, entity_type, source. Duplicate detection by email -- skip or update existing.
- **FR1.5**: Lead scoring (computed, not ML): entity_type weight (practice=30, business=20, sole_trader=10) + source weight (referral=25, partner=20, website=10, event=15, manual=5) + engagement bonus (opened email=+5 each, up to +20). Score recalculated on relevant events.
- **FR1.6**: StatusTabs above kanban: All | New | Contacted | Demo Booked | Trial Started | Converted | Lost -- with counts from `GET /api/v1/admin/leads/counts`
- **FR1.7**: Filter bar: source (multi-select), entity_type (multi-select), assigned_to (select), date range (created_at). Search by name or email.
- **FR1.8**: Public lead capture endpoint: `POST /api/v1/leads/capture` -- no auth required, rate-limited (10/min per IP via dedicated `lead-capture` rate limiter in `AppServiceProvider::boot()`). Accepts: name, email, company, phone, entity_type, source, utm_source, utm_medium, utm_campaign. Creates lead with status `new`. Returns 201 with lead UUID (no sensitive data). Spam prevention: honeypot field (`website` -- hidden, must be empty), plus email format and domain MX validation via `dns` rule. No CAPTCHA in v1 (server-side measures sufficient for B2B volume); add Cloudflare Turnstile if abuse detected post-launch.

### FR2: Trial Management

- **FR2.1**: When a user registers and creates an Organisation, check for existing lead by email. If found, update lead: set `organisation_id`, transition status to `trial_started`, record `trial_started_at` on lead activity.
- **FR2.2**: Trial tracking fields on Organisation model (already exists: `trial_ends_at`, `plan_tier`). Add: `trial_extended_until` (datetime, nullable), `converted_at` (datetime, nullable), `trial_source_lead_id` (FK to leads, nullable).
- **FR2.3**: Trial dashboard at `/admin/trials` showing: active trials count, expiring this week, expiring today, conversion rate (last 30 days), average trial duration before conversion.
- **FR2.4**: Trial list table: organisation name, owner email, plan tier, trial start, trial end, days remaining, onboarding progress %, status badge (active/expiring/expired/converted).
- **FR2.5**: Extend trial action: `POST /api/v1/admin/trials/{organisation}/extend` with `days` parameter (max 30, lifetime max 60 days total extension across multiple extends). Updates `trial_ends_at` by adding days. `trial_extended_until` records the latest extended date for audit trail. Logs activity. No automatic extension rules or grace period -- all extensions are manual admin decisions. When a trial expires without conversion, the organisation retains read-only access to its data (existing `isOnTrial()` check returns false, feature gates restrict mutations).
- **FR2.6**: Convert trial action: `POST /api/v1/admin/trials/{organisation}/convert` with `plan_tier` parameter (must be non-trial: Starter, Professional, or Enterprise -- validated against `PlanTier` enum). Sets `plan_tier`, clears trial dates, sets `converted_at`, updates linked lead status to `converted`.

### FR3: Onboarding Funnel

- **FR3.1**: `OnboardingProgress` model (central): organisation_id (FK, unique), steps completed as JSON column tracking: `registered` (always true), `entity_setup` (workspace created with entity type), `coa_selected` (CoA template applied), `first_transaction` (first JE or invoice created), `bank_connected` (first bank account linked), `first_reconciliation` (first bank transaction reconciled), `team_invited` (second user added to workspace). Each step records `completed_at` timestamp.
- **FR3.2**: Onboarding steps are populated by Eloquent `created` model observers (not event-sourced events) on: Organisation, Workspace, ChartAccount (first seeded batch), JournalEntry, Invoice, BankAccount, BankTransaction (reconciled), and workspace_user pivot. No new user-facing instrumentation needed. Registration creates the `OnboardingProgress` record in the `CreateNewUser` action (Fortify). Subsequent steps update on relevant model creation. Observer approach chosen over polling because it provides exact timestamps and zero query overhead on read.
- **FR3.3**: Funnel visualisation at `/admin/analytics` (onboarding tab): horizontal bar chart showing count at each step and drop-off percentage between steps. E.g., "Registered: 500 (100%) -> Entity Setup: 380 (76%) -> CoA Selected: 320 (64%) -> ..."
- **FR3.4**: "Stuck" alerts: organisations that have not progressed to the next onboarding step in 3+ days. Shown as a card on the trials dashboard: count of stuck organisations, link to filtered list.

### FR4: Usage Analytics Dashboard

- **FR4.1**: Platform metrics page at `/admin/analytics`: total organisations, total workspaces, total users, MAU (distinct users with login in last 30 days), DAU (today), WAU (last 7 days).
- **FR4.2**: Feature adoption rates: percentage of workspaces that have used each major feature (invoicing, banking, jobs, reports, AI chatbot, repeating entries, budgets). Computed from existence of related records per workspace.
- **FR4.3**: Activity heatmap: logins by hour-of-day and day-of-week (7x24 grid). Requires adding a `last_login_at` column to the `users` table (currently absent -- must be added in migration). Updated via Fortify `LoginResponse` on each successful authentication. Heatmap queries aggregate `last_login_at` values over the trailing 30 days.
- **FR4.4**: Growth charts: new signups over time (daily for last 30 days, weekly for last 12 weeks, monthly for last 12 months). MoM growth rate percentage.
- **FR4.5**: Top 10 most active workspaces: ranked by a composite score of logins + transactions created + invoices sent in the last 30 days.
- **FR4.6**: Metrics are computed by a `ComputePlatformMetrics` action (Lorisleiva `AsAction`) that caches results in a `platform_metrics` table (key-value with `computed_at` timestamp). Cache TTL: 1 hour. Manual refresh button for super admin. Batch computation (not real-time): all metrics are computed via aggregate SQL queries against live tables, then stored as JSON snapshots. No materialized views needed -- the platform_metrics table serves the same purpose with simpler maintenance. The action runs as a single database transaction to ensure metric consistency within a snapshot.

### FR5: Churn Signals

- **FR5.1**: Inactive workspace detection: workspaces where no user has logged in for 14+ days. Computed daily by `DetectChurnSignals` artisan command scheduled in `routes/console.php`. The 14-day threshold applies only to workspaces on paid plans or active trials -- workspaces on expired trials are excluded (already handled by trial expiry flow). To prevent false positives: solo-user workspaces with seasonal patterns (e.g., accountant workspaces outside EOFY) are not exempt in v1, but the admin can manually resolve signals. Threshold is a config value (`crm.churn_inactive_days`, default 14) to allow tuning post-launch.
- **FR5.2**: Declining engagement: compare workspace activity (logins + record creation) in the last 7 days vs the previous 7 days. Flag if decline > 50%. Minimum activity threshold: only flag if the previous 7-day period had at least 5 events (avoids flagging workspaces that had 2 events last week and 0 this week as high-risk when baseline is negligible).
- **FR5.3**: "At risk" page at `/admin/churn`: table of flagged workspaces with columns: workspace name, organisation, last activity date, signal type (inactive/declining), days since last activity, plan tier, MRR contribution.
- **FR5.4**: Churn signal model: `ChurnSignal` (central) with workspace_id, signal_type (inactive/declining_engagement/trial_expiring_no_activity), detected_at, resolved_at (nullable -- resolved when user logs back in or converts), notes.
- **FR5.5**: Churn risk score per workspace: inactive 14d = 40pts, declining engagement = 30pts, no onboarding progress in 7d = 20pts, trial expiring in 3d with <50% onboarding = 10pts. Score displayed as badge (low 0-30, medium 31-60, high 61+).
- **FR5.6**: Resolved signals: when a flagged workspace shows renewed activity (login or record creation), auto-resolve the signal by setting `resolved_at`.

### FR6: Email Drip Sequences

- **FR6.1**: `DripSequence` model (central): name, trigger (signup/trial_day_3/trial_day_7/trial_day_14/trial_expiring/churn_risk/lead_captured), subject, body (rich text, stored as HTML with `{{placeholder}}` tokens rendered by the existing `EmailTemplateRenderer` service from 023-EML), enabled (boolean, default true), delay_hours (integer -- hours after trigger before sending). All emails include an unsubscribe link (`/unsubscribe?token=...`) in the footer -- implemented via a `drip_unsubscribes` table (email, unsubscribed_at) checked before each send. `ProcessDripSequences` skips recipients in that table. This is required for CAN-SPAM / Australian Spam Act compliance. No physical mailing address is included (platform emails, not commercial marketing to purchased lists) but a "Sent by MoneyQuest" footer line is added.
- **FR6.2**: Default sequences seeded via `DripSequenceSeeder`: welcome (0h after signup), getting started tips (72h), feature highlight (168h), conversion nudge (336h -- day 14), trial expiring warning (648h -- 3 days before 30-day trial ends), churn risk re-engagement (0h after churn signal detected), lead follow-up (24h after lead captured).
- **FR6.3**: Admin template management at `/admin/email`: list of sequences, click to edit subject/body in rich text editor, enable/disable toggle. Preview button renders template with sample data.
- **FR6.4**: `DripSendLog` model (central): drip_sequence_id (FK), recipient_email, recipient_user_id (FK, nullable), organisation_id (FK, nullable), lead_id (FK, nullable), sent_at, opened_at (nullable -- tracking pixel), clicked_at (nullable).
- **FR6.5**: `ProcessDripSequences` artisan command scheduled hourly: finds organisations/leads matching each enabled trigger and delay, checks send log for duplicates (same sequence + recipient = skip), checks `drip_unsubscribes` table (skip unsubscribed recipients), sends via existing `NotificationMailer` service (023-EML) which handles logging to `email_notifications` table, then logs to DripSendLog. Uses `Mail::to()` with standard Laravel Mailable -- no custom template engine needed beyond the existing `EmailTemplateRenderer` for placeholder substitution.
- **FR6.6**: Send log viewable at `/admin/email/log`: table with recipient, sequence name, sent date, opened (boolean), clicked (boolean). Filter by sequence, date range.

### FR7: Revenue Dashboard

- **FR7.1**: Revenue page at `/admin/revenue` showing: MRR (sum of all active monthly subscription amounts), ARR (MRR x 12), average revenue per workspace, total paying customers. All revenue figures are in AUD cents (integers) matching the existing `PlanTier::monthlyPrice()` convention (Starter=2900, Professional=5900, Enterprise=9900). Displayed using `formatMoney()` with AUD currency. Multi-currency billing is out of scope for v1 -- all prices are AUD-only.
- **FR7.2**: LTV estimate: average revenue per customer per month x average customer lifetime in months (computed from historical churn data, or default to 24 months if insufficient data).
- **FR7.3**: Churn rate: percentage of paying customers who downgraded to trial or were deleted in the last 30 days.
- **FR7.4**: Revenue by plan tier: bar chart showing count and total revenue per PlanTier (Starter, Professional, Enterprise). Uses `PlanTier::monthlyPrice()` x count per tier.
- **FR7.5**: Growth trend: MRR over last 12 months as a line chart. MoM growth rate.
- **FR7.6**: Revenue data computed from Organisation model's `plan_tier` field and `PlanTier::monthlyPrice()`. No separate subscription/payment model needed for v1 -- billing actuals come from 009-BIL.

### FR8: Referral Tracking

- **FR8.1**: `Referral` model (central): referrer_user_id (FK), referred_email, referred_organisation_id (FK, nullable -- set on registration), status (pending/registered/converted/expired), referral_code (unique string), reward_status (none/eligible/claimed -- tracking only, no automated payouts in v1), created_at, converted_at (nullable), expired_at (nullable). Reward type is implicit: "eligible" means the referrer qualifies for a reward (e.g., 1 month free); "claimed" means admin has manually marked it as fulfilled. No automated reward processing or payment integration.
- **FR8.2**: Referral code generation: each user gets one referral code (one-to-one, not one-to-many). Generated via `POST /api/v1/admin/referrals/generate-code` (admin creates on behalf of user). Code format: `MQ-{6-char-alphanumeric}`. If a code already exists for the user, return the existing code. Fraud prevention: referrer cannot refer their own email, referred email must not already be registered, max 10 pending referrals per referrer (prevents mass generation). Code uniqueness enforced by database unique index with retry loop (following `Practice::generateShortCode()` pattern).
- **FR8.3**: When a new user registers with a referral code (passed as query param `?ref=MQ-XXXXXX`), create Referral record linking referrer to new organisation. Update status to `registered`. On trial conversion, update to `converted`.
- **FR8.4**: Referral dashboard at `/admin/referrals`: total referrals, conversion rate, top referrers table (user name, referral count, conversion count), referral timeline chart.
- **FR8.5**: Referral expiry: pending referrals expire after 90 days. `ExpireStaleReferrals` artisan command runs daily.

### FR9: Practice Partner Pipeline

- **FR9.1**: Practice leads use the same `Lead` model but with `source = 'partner'` and `entity_type = 'practice'`. Filtered view at `/admin/leads?source=partner` or dedicated tab.
- **FR9.2**: Practice-specific pipeline stages: Prospect -> Contacted -> Onboarding -> Active -> Churned. Implemented as a separate status enum `PracticeLeadStatus` (not overloading the general lead status).
- **FR9.3**: Practice metrics card on leads page: total practice leads, active practices, average client workspaces per practice, practice conversion rate.
- **FR9.4**: Practice health score (mirrors 051-EHS pattern): computed from client workspace count (0-25pts), monthly active client workspaces (0-25pts), feature adoption breadth (0-25pts), days since last practice user login (0-25pts). Stored on Practice model as `health_score` integer column.
- **FR9.5**: `ComputePracticeHealthScores` artisan command scheduled weekly. Updates `health_score` on all Practice records.

### FR10: Admin Activity Feed

- **FR10.1**: `AdminActivity` model (central): user_id (FK -- the admin), action (string -- e.g., 'lead.status_changed', 'trial.extended', 'email.sent', 'note.added'), subject_type (morph type -- Lead, Organisation, Practice), subject_id (integer), metadata (JSON -- before/after values, notes), created_at.
- **FR10.2**: Activity feed page at `/admin/activity`: reverse-chronological list with: admin name, action description, subject link, timestamp. Filter by action type, admin user, date range.
- **FR10.3**: All CRM mutations (lead status change, trial extension, trial conversion, drip sequence enable/disable, note added, referral code generated) automatically log to AdminActivity via a `LogAdminActivity` action called from each relevant action.
- **FR10.4**: Export to CSV via `GET /api/v1/admin/activity/export?format=csv` with date range filter.

---

## Data Model

### New Tables (all central -- no workspace_id)

**`leads`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `uuid` | uuid, unique | Public identifier |
| `name` | string(255) | |
| `email` | string(255), index | |
| `company` | string(255), nullable | |
| `phone` | string(50), nullable | |
| `entity_type` | string, nullable | Matches workspace entity types |
| `source` | string | website, referral, partner, event, manual |
| `status` | string, default `'new'` | new, contacted, demo_booked, trial_started, converted, lost |
| `notes` | text, nullable | |
| `assigned_to_user_id` | FK -> users, nullable, nullOnDelete | Super admin assigned |
| `utm_source` | string(255), nullable | |
| `utm_medium` | string(255), nullable | |
| `utm_campaign` | string(255), nullable | |
| `referred_by_user_id` | FK -> users, nullable, nullOnDelete | |
| `lead_score` | integer, default 0 | 0-100 |
| `organisation_id` | FK -> organisations, nullable, nullOnDelete | Set on conversion |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

Indexes: `[status]`, `[source]`, `[email]`, `[assigned_to_user_id]`

**`lead_activities`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `lead_id` | FK -> leads, cascadeOnDelete | |
| `user_id` | FK -> users, nullable, nullOnDelete | Admin who performed action |
| `action` | string | status_changed, note_added, email_sent, score_updated, assigned |
| `metadata` | json, nullable | Before/after values, note text |
| `created_at` | timestamp | |

**`onboarding_progress`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `organisation_id` | FK -> organisations, unique, cascadeOnDelete | |
| `steps` | json | `{ step_name: completed_at_timestamp }` |
| `completion_percentage` | integer, default 0 | Computed: completed / total * 100 |
| `last_progressed_at` | timestamp, nullable | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**`churn_signals`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | FK -> workspaces, cascadeOnDelete | |
| `signal_type` | string | inactive, declining_engagement, trial_expiring_no_activity |
| `risk_score` | integer, default 0 | 0-100 |
| `detected_at` | timestamp | |
| `resolved_at` | timestamp, nullable | |
| `notes` | text, nullable | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

Index: `[workspace_id, resolved_at]`

**`drip_sequences`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `name` | string(255) | |
| `trigger` | string | signup, trial_day_3, trial_day_7, trial_day_14, trial_expiring, churn_risk, lead_captured |
| `subject` | string(255) | Email subject line |
| `body` | text | HTML email body |
| `delay_hours` | integer, default 0 | Hours after trigger event |
| `enabled` | boolean, default true | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**`drip_send_log`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `drip_sequence_id` | FK -> drip_sequences, cascadeOnDelete | |
| `recipient_email` | string(255) | |
| `recipient_user_id` | FK -> users, nullable, nullOnDelete | |
| `organisation_id` | FK -> organisations, nullable, nullOnDelete | |
| `lead_id` | FK -> leads, nullable, nullOnDelete | |
| `sent_at` | timestamp | |
| `opened_at` | timestamp, nullable | |
| `clicked_at` | timestamp, nullable | |

Index: `[drip_sequence_id, recipient_email]` (unique -- prevents duplicate sends)

**`referrals`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `referrer_user_id` | FK -> users, cascadeOnDelete | |
| `referred_email` | string(255) | |
| `referred_organisation_id` | FK -> organisations, nullable, nullOnDelete | |
| `referral_code` | string(20), unique | Format: MQ-XXXXXX |
| `status` | string, default `'pending'` | pending, registered, converted, expired |
| `reward_status` | string, default `'none'` | none, eligible, claimed |
| `converted_at` | timestamp, nullable | |
| `expired_at` | timestamp, nullable | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

Index: `[referral_code]`, `[referrer_user_id]`

**`admin_activities`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `user_id` | FK -> users, nullOnDelete | Admin user |
| `action` | string | lead.status_changed, trial.extended, email.sent, etc. |
| `subject_type` | string, nullable | Morph type (Lead, Organisation, Practice) |
| `subject_id` | bigint, nullable | |
| `metadata` | json, nullable | |
| `created_at` | timestamp | |

Index: `[user_id]`, `[subject_type, subject_id]`, `[created_at]`

**`platform_metrics`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `key` | string(100), unique | Metric name (e.g., 'mau', 'dau', 'mrr') |
| `value` | json | Metric value (number, object, or array) |
| `computed_at` | timestamp | |

**`drip_unsubscribes`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `email` | string(255), unique | Unsubscribed email address |
| `unsubscribed_at` | timestamp | |

**`login_events`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `user_id` | FK -> users, cascadeOnDelete | |
| `logged_in_at` | timestamp | |

Index: `[user_id, logged_in_at]`

Note: This table stores individual login timestamps for heatmap computation (FR4.3). `last_login_at` on users is insufficient for hour-of-day/day-of-week aggregation. Rows older than 90 days are pruned by `crm:compute-metrics` to prevent unbounded growth.

### Modified Tables

**`users`** -- add column:
- `last_login_at` (datetime, nullable) -- updated on each successful Fortify login via `LoginResponse`

**`organisations`** -- add columns:
- `trial_extended_until` (datetime, nullable)
- `converted_at` (datetime, nullable)
- `trial_source_lead_id` (FK -> leads, nullable, nullOnDelete)

**`practices`** -- add column:
- `health_score` (integer, nullable)

### New Enums

- `App\Enums\Admin\LeadSource` -- website, referral, partner, event, manual
- `App\Enums\Admin\LeadStatus` -- new, contacted, demo_booked, trial_started, converted, lost (with `label()` and `canTransitionTo()`)
- `App\Enums\Admin\PracticeLeadStatus` -- prospect, contacted, onboarding, active, churned
- `App\Enums\Admin\ChurnSignalType` -- inactive, declining_engagement, trial_expiring_no_activity
- `App\Enums\Admin\DripTrigger` -- signup, trial_day_3, trial_day_7, trial_day_14, trial_expiring, churn_risk, lead_captured
- `App\Enums\Admin\ReferralStatus` -- pending, registered, converted, expired
- `App\Enums\Admin\AdminAction` -- lead.status_changed, lead.assigned, lead.note_added, trial.extended, trial.converted, email.sent, referral.generated (string-backed enum with `label()`)

All enums placed in `app/Enums/Admin/` subdirectory.

---

## API Endpoints

All endpoints under `/api/v1/admin/` prefix, protected by `auth:sanctum` + `super_admin` middleware.

### Lead Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/admin/leads` | LeadController@index | List/filter leads, paginated |
| GET | `/admin/leads/counts` | LeadController@counts | Status counts for StatusTabs |
| POST | `/admin/leads` | LeadController@store | Create lead manually |
| POST | `/admin/leads/import` | LeadController@import | CSV import |
| GET | `/admin/leads/{lead}` | LeadController@show | Lead detail |
| PATCH | `/admin/leads/{lead}` | LeadController@update | Update lead fields |
| PATCH | `/admin/leads/{lead}/status` | LeadController@updateStatus | Transition status |
| PATCH | `/admin/leads/{lead}/assign` | LeadController@assign | Assign admin |
| GET | `/admin/leads/{lead}/activities` | LeadController@activities | Activity timeline |
| POST | `/admin/leads/{lead}/notes` | LeadController@addNote | Add note |

### Public Lead Capture (no auth)

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| POST | `/leads/capture` | LeadCaptureController@store | Public lead capture from landing page |

### Trial Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/admin/trials` | TrialController@index | Trial list with stats |
| GET | `/admin/trials/stats` | TrialController@stats | Trial summary metrics |
| POST | `/admin/trials/{organisation}/extend` | TrialController@extend | Extend trial |
| POST | `/admin/trials/{organisation}/convert` | TrialController@convert | Convert to paid |

### Analytics Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/admin/analytics/overview` | AnalyticsController@overview | Platform-wide metrics (cached) |
| GET | `/admin/analytics/onboarding-funnel` | AnalyticsController@onboardingFunnel | Funnel step counts |
| GET | `/admin/analytics/feature-adoption` | AnalyticsController@featureAdoption | Feature usage percentages |
| GET | `/admin/analytics/activity-heatmap` | AnalyticsController@activityHeatmap | Login heatmap data |
| GET | `/admin/analytics/growth` | AnalyticsController@growth | Signup trend data |
| GET | `/admin/analytics/top-workspaces` | AnalyticsController@topWorkspaces | Top 10 most active |
| POST | `/admin/analytics/refresh` | AnalyticsController@refresh | Force recompute metrics |

### Churn Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/admin/churn` | ChurnController@index | At-risk workspaces |
| GET | `/admin/churn/stats` | ChurnController@stats | Churn summary metrics |
| PATCH | `/admin/churn/{churnSignal}/resolve` | ChurnController@resolve | Manually resolve signal |
| POST | `/admin/churn/{churnSignal}/notes` | ChurnController@addNote | Add note to signal |

### Email Drip Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/admin/email/sequences` | DripSequenceController@index | List sequences |
| PATCH | `/admin/email/sequences/{dripSequence}` | DripSequenceController@update | Edit template |
| PATCH | `/admin/email/sequences/{dripSequence}/toggle` | DripSequenceController@toggle | Enable/disable |
| GET | `/admin/email/log` | DripSequenceController@sendLog | Send log with filters |

### Revenue Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/admin/revenue` | RevenueController@index | Revenue dashboard data |
| GET | `/admin/revenue/trend` | RevenueController@trend | MRR over time |
| GET | `/admin/revenue/by-tier` | RevenueController@byTier | Revenue by plan tier |

### Referral Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/admin/referrals` | ReferralController@index | Referral list |
| GET | `/admin/referrals/stats` | ReferralController@stats | Referral summary |
| POST | `/admin/referrals/generate-code` | ReferralController@generateCode | Generate code for user |
| GET | `/admin/referrals/top-referrers` | ReferralController@topReferrers | Top referrer leaderboard |

### Activity Feed Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/admin/activity` | AdminActivityController@index | Activity feed, paginated |
| GET | `/admin/activity/export` | AdminActivityController@export | CSV export |

---

## UI/UX Requirements

### Admin Pages

**`/admin/leads` -- Lead Pipeline**
- Default view: kanban board with 6 columns (New, Contacted, Demo Booked, Trial Started, Converted, Lost)
- Toggle to list view (table) via ViewToggle
- StatusTabs above board with counts
- Filter bar: source multi-select, entity_type multi-select, assigned_to select, date range, search
- "New Lead" primary button top-right, "Import CSV" secondary button
- Lead card shows: name, company, source badge, score indicator, assigned avatar, days in stage
- Click card opens slide-over: editable fields, activity timeline, notes input, status transition buttons
- Practice leads tab: filtered view showing only `source=partner` and `entity_type=practice` leads

**`/admin/trials` -- Trial Management**
- Summary cards at top: active trials, expiring this week, expiring today, 30-day conversion rate
- Table below: organisation name, owner email, trial start, trial end, days remaining, onboarding %, actions (extend/convert)
- StatusTabs: All | Active | Expiring | Expired | Converted
- "Stuck" alert card: count of organisations with no onboarding progress in 3+ days, click to filter
- Extend modal: number input for days (1-30), confirm button
- Convert modal: plan tier select (Starter/Professional/Enterprise), confirm button

**`/admin/analytics` -- Usage Analytics**
- Tab navigation: Overview | Onboarding | Adoption | Activity
- Overview tab: stat cards (total orgs, workspaces, users, MAU, DAU, WAU), growth chart (line), MoM rate badge
- Onboarding tab: horizontal funnel bar chart, drop-off percentages, stuck count card
- Adoption tab: feature adoption bar chart (% of workspaces per feature), top 10 active workspaces table
- Activity tab: login heatmap (7x24 grid, colour intensity = count)
- Refresh button in header to force recompute

**`/admin/churn` -- Churn Signals**
- Summary cards: total at-risk, inactive (14d+), declining engagement, trial expiring with low activity
- Table: workspace name, organisation, signal type badge, risk score badge (low/medium/high), last activity date, days inactive, plan tier, actions (resolve/add note)
- Filter: signal type, risk level, plan tier
- Resolve action: confirm modal with optional note

**`/admin/email` -- Drip Sequences**
- Table of sequences: name, trigger, delay, subject, enabled toggle, last sent count
- Click row opens edit slide-over: subject input, body rich text editor (TipTap), delay hours input, preview button
- Send log tab: table with recipient, sequence, sent date, opened, clicked. Filter by sequence, date range.

**`/admin/revenue` -- Revenue Dashboard**
- Stat cards: MRR, ARR, LTV, churn rate, paying customers, avg revenue per workspace
- Revenue by tier: horizontal bar chart with count and total per tier
- MRR trend: line chart over last 12 months
- Growth rate badge (MoM %)

**`/admin/referrals` -- Referral Tracking**
- Summary cards: total referrals, conversion rate, top referrer
- Referral table: referrer name, referred email, status badge, referral code, created date, converted date
- Top referrers leaderboard: table ranked by conversion count
- "Generate Code" button: select user from dropdown, generates code

**`/admin/activity` -- Activity Feed**
- Reverse-chronological feed: admin avatar, action description, subject link, timestamp
- Filter: action type, admin user, date range
- "Export CSV" button with date range filter

### Admin Sidebar Navigation

Add new items under existing admin nav:

| Item | Path | Icon | Badge |
|------|------|------|-------|
| Leads | `/admin/leads` | Target | New lead count |
| Trials | `/admin/trials` | Clock | Expiring count |
| Analytics | `/admin/analytics` | BarChart3 | -- |
| Churn | `/admin/churn` | AlertTriangle | At-risk count |
| Email | `/admin/email` | Mail | -- |
| Revenue | `/admin/revenue` | DollarSign | -- |
| Referrals | `/admin/referrals` | Share2 | -- |
| Activity | `/admin/activity` | Activity | -- |

---

## Artisan Commands

| Command | Schedule | Description |
|---------|----------|-------------|
| `crm:detect-churn` | Daily at 6:00 AM | Run `DetectChurnSignals` action, create/resolve ChurnSignal records |
| `crm:process-drips` | Hourly | Run `ProcessDripSequences` action, send due emails |
| `crm:compute-metrics` | Hourly | Run `ComputePlatformMetrics` action, update platform_metrics cache |
| `crm:expire-referrals` | Daily at midnight | Run `ExpireStaleReferrals` action, expire 90-day-old pending referrals |
| `crm:compute-practice-health` | Weekly (Sunday 2:00 AM) | Run `ComputePracticeHealthScores` action |

---

## Testing Strategy

All CRM tests follow the existing `AdminApiTest` pattern: `beforeEach` creates a super admin user via `User::factory()->create(['is_super_admin' => true])` and a regular user. Super admin tests use `actingAs($this->superAdmin)`. No workspace context or `X-Workspace-Id` header needed since all CRM models are central.

- **Feature tests** (`tests/Feature/Api/Admin/`): all admin API endpoints (CRUD, status transitions, CSV import, metric computation). Split into separate test files per domain: `LeadApiTest.php`, `TrialApiTest.php`, `ChurnApiTest.php`, `DripSequenceApiTest.php`, `ReferralApiTest.php`, `AnalyticsApiTest.php`, `RevenueApiTest.php`, `AdminActivityApiTest.php`
- **Authorization tests**: every test file includes a 403 test for regular users and a 401 test for unauthenticated users on each endpoint group (mirroring existing `AdminApiTest` patterns)
- **Public endpoint tests**: `LeadCaptureApiTest.php` tests the unauthenticated `/leads/capture` endpoint including rate limiting (10/min), honeypot rejection, email validation, and duplicate handling
- **Churn detection tests**: seed workspaces with varying `last_login_at` values and record counts, run `DetectChurnSignals` action, verify correct signal creation and that minimum-activity threshold prevents false positives
- **Drip sequence tests**: verify dedup logic (same sequence + recipient = skip), verify delay calculation, verify unsubscribe list is respected, verify `NotificationMailer` integration
- **Onboarding funnel tests**: create organisations at various onboarding stages via model factories, verify funnel counts and drop-off percentages
- **Lead scoring tests**: verify score computation for different entity types and sources, verify score recalculation on engagement events
- **Referral flow tests**: end-to-end from code generation to registration to conversion, including fraud prevention (self-referral blocked, duplicate email blocked, max 10 pending limit)
- **Command tests**: each artisan command (`crm:detect-churn`, `crm:process-drips`, `crm:compute-metrics`, `crm:expire-referrals`, `crm:compute-practice-health`) has a dedicated test verifying correct execution and idempotency

---

## Migration Order

1. Add `last_login_at` column to `users` table + `login_events` table
2. `leads` and `lead_activities` tables + Organisation column additions (`trial_extended_until`, `converted_at`, `trial_source_lead_id`)
3. `onboarding_progress` table
4. `churn_signals` table
5. `drip_sequences`, `drip_send_log`, and `drip_unsubscribes` tables + DripSequenceSeeder
6. `referrals` table
7. `admin_activities` table
8. `platform_metrics` table
9. Practice `health_score` column addition

---

## Clarifications

20 clarification questions raised during requirements analysis, answered using codebase patterns. Answers have been applied inline to the relevant FR sections above.

### Lead Capture

**Q1: What rate limiting mechanism should the public `/leads/capture` endpoint use?**
A: Use a dedicated named rate limiter registered in `AppServiceProvider::boot()` (following the existing `RateLimiter::for('api', ...)` pattern at line 125). Define `RateLimiter::for('lead-capture', fn (Request $request) => Limit::perMinute(10)->by($request->ip()))` and apply via `->middleware('throttle:lead-capture')` on the route. This is separate from the global `api` limiter (60/min per user/IP) to allow tighter control on the unauthenticated endpoint.

**Q2: What spam prevention measures should be applied to the public lead capture endpoint? Is CAPTCHA needed?**
A: No CAPTCHA in v1. The endpoint is B2B-targeted with low expected volume, so server-side measures suffice: (1) honeypot field (`website` -- hidden CSS field, must be empty or request is silently dropped with 201 to avoid leaking detection), (2) email format validation with `dns` rule (validates MX record exists), (3) IP-based rate limiting at 10/min. If abuse is detected post-launch, add Cloudflare Turnstile as a follow-up. The codebase has no existing CAPTCHA integration (confirmed by searching for `honeypot`, `captcha`, `turnstile`, `recaptcha` -- zero results in app code).

### Pipeline Management

**Q3: Should pipeline stages be customisable by the admin, or are they fixed?**
A: Fixed in v1. The 6-stage pipeline (New, Contacted, Demo Booked, Trial Started, Converted, Lost) is hardcoded in the `LeadStatus` enum with `canTransitionTo()` validation (following the `InvoiceStatus::canTransitionTo()` pattern). Custom pipeline stages would require a `pipeline_stages` table, drag-to-reorder UI, and dynamic enum replacement -- significant complexity for minimal gain at current scale. Revisit if the platform adds multiple sales teams.

**Q4: Should there be SLA tracking on how long a lead stays in each pipeline stage?**
A: No automated SLA tracking or alerting in v1. The `days_in_stage` value displayed on kanban cards is computed on-read by querying the most recent `lead_activities` record with `action = 'status_changed'`. This gives visibility without the overhead of SLA configuration, escalation rules, and notification infrastructure. If needed later, add a `stage_entered_at` column to leads and a scheduled command to detect stale leads.

### Trial Tracking

**Q5: Are there automatic trial extension rules (e.g., extend if user completes onboarding step X)?**
A: No automatic extensions. All trial extensions are manual admin decisions via `POST /admin/trials/{organisation}/extend`. This is intentional -- automatic extensions reduce conversion urgency and complicate the trial lifecycle. The admin dashboard surfaces "expiring today" and "expiring this week" counts to prompt timely intervention. A lifetime cap of 60 total extension days prevents indefinite free usage.

**Q6: Is there a grace period after trial expiry? What happens to data?**
A: No grace period. When `trial_ends_at` passes and `plan_tier` is still `trial`, the existing `Organisation::isOnTrial()` method returns `false`, and feature gates restrict mutations. The organisation retains read-only access -- data is never deleted on trial expiry. The admin can still extend or convert an expired trial. This matches SaaS best practice: preserve data to reduce conversion friction.

### Onboarding Funnel

**Q7: How are onboarding steps tracked -- event-driven listeners or polling?**
A: Event-driven via Eloquent model observers (not event-sourced events). Observers on `Organisation`, `Workspace`, `ChartAccount`, `JournalEntry`, `Invoice`, `BankAccount`, `BankTransaction`, and the `workspace_user` pivot fire on `created` and update the `OnboardingProgress` JSON `steps` column with `completed_at` timestamps. This is preferred over polling because: (1) exact timestamps for each step, (2) zero overhead on admin dashboard reads, (3) no scheduled command needed for step detection.

**Q8: The existing `OnboardingController::status()` tracks 3 steps (register, create_workspace, complete). How does the new 7-step funnel relate?**
A: They are independent systems. The existing `OnboardingController` serves the user-facing onboarding wizard with 3 coarse steps. The new `OnboardingProgress` model tracks 7 granular steps for the admin analytics funnel. The user-facing onboarding flow is unchanged. The admin funnel provides deeper visibility into where users get stuck (e.g., "registered and created workspace but never selected a CoA template").

### Usage Analytics

**Q9: Should analytics be computed in real-time or batch?**
A: Batch. The `ComputePlatformMetrics` action runs hourly via `crm:compute-metrics` and writes JSON snapshots to the `platform_metrics` table. Admin dashboard reads are instant (just fetching cached JSON). Manual refresh button triggers an on-demand recomputation. Real-time analytics would require WebSocket infrastructure and significantly increase database query load -- not justified for a single-user admin dashboard.

**Q10: Should materialized views be used for complex metric queries?**
A: No. The `platform_metrics` key-value table serves the same purpose with simpler maintenance. PostgreSQL materialized views would require `REFRESH MATERIALIZED VIEW` commands, migration management, and are harder to test. The action computes all metrics via standard Eloquent/DB queries within a single database transaction (ensuring snapshot consistency), then upserts into the `platform_metrics` table. This pattern is portable across database engines.

### Churn Signals

**Q11: What thresholds prevent false positive churn signals?**
A: Two safeguards: (1) The 14-day inactivity threshold is configurable via `config('crm.churn_inactive_days')` with a default of 14, allowing post-launch tuning. (2) The declining engagement signal (FR5.2) requires a minimum of 5 events in the baseline period (previous 7 days) before flagging a >50% decline. This prevents low-activity workspaces (e.g., 2 events -> 0 events) from generating noise. Only workspaces on paid plans or active trials are evaluated -- expired trials are excluded.

**Q12: How are churn signals resolved, and can the same signal type recur for a workspace?**
A: Signals auto-resolve when renewed activity is detected (login or record creation). The `DetectChurnSignals` command checks for existing unresolved signals before creating new ones (`where('workspace_id', $id)->where('signal_type', $type)->whereNull('resolved_at')->exists()`). After resolution, a new signal of the same type can be created if the workspace becomes inactive again. Manual resolution is also available via `PATCH /admin/churn/{churnSignal}/resolve`.

### Email Drip

**Q13: What template engine is used for drip email body rendering?**
A: The existing `EmailTemplateRenderer` service from 023-EML. It performs simple `{{placeholder}}` token substitution (e.g., `{{client_name}}`, `{{workspace_name}}`, `{{trial_days_remaining}}`). Unknown placeholders are stripped gracefully. This is sufficient for lifecycle emails. The admin edits templates via TipTap rich text editor (matching the existing notes/email template editing pattern), and the HTML output is stored in the `body` column.

**Q14: How is CAN-SPAM / Australian Spam Act compliance handled for drip emails?**
A: Every drip email includes an unsubscribe link in the footer. A `drip_unsubscribes` table (email, unsubscribed_at) tracks opt-outs. The `ProcessDripSequences` command checks this table before each send. The unsubscribe endpoint is public (no auth required) and sets the record immediately. The existing codebase has unsubscribe patterns in the 024-NTF notification preferences system (`NotificationPreference` model), but drip emails target leads who may not have user accounts, so a separate email-based unsubscribe table is needed.

### Revenue Dashboard

**Q15: What currency are revenue metrics in? How does this interact with multi-currency (011-MCY)?**
A: All revenue metrics are AUD-only. `PlanTier::monthlyPrice()` returns integer cents in AUD (Starter=2900, Professional=5900, Enterprise=9900). The revenue dashboard computes MRR as `sum(PlanTier::monthlyPrice() * count)` per tier. Multi-currency billing is out of scope -- 011-MCY handles workspace-level transaction currencies, not platform billing. If multi-currency pricing is added later, the revenue dashboard would need a `billing_currency` column on Organisation.

**Q16: How does the revenue dashboard interact with the existing 009-BIL billing models?**
A: In v1, the revenue dashboard derives all figures from `Organisation.plan_tier` counts multiplied by `PlanTier::monthlyPrice()`. It does not query actual payment/subscription records from 009-BIL. This is intentional -- 009-BIL defines plan limits and feature gates, not payment processing. When a real payment processor (Stripe) is integrated, the revenue dashboard should switch to querying actual subscription records. FR7.6 explicitly states this: "No separate subscription/payment model needed for v1."

### Referral System

**Q17: What type of reward do referrers receive? How is fraud prevented?**
A: Rewards are tracking-only in v1. `reward_status` transitions from `none` -> `eligible` (on referred user's trial conversion) -> `claimed` (admin manually marks as fulfilled, e.g., after applying a 1-month credit). No automated payouts or payment integration. Fraud prevention: (1) referrer cannot use their own email as referred_email, (2) referred_email must not already be registered (checked against users table), (3) max 10 pending referrals per referrer, (4) referral codes expire after 90 days via `crm:expire-referrals` command.

**Q18: Can a user have multiple referral codes, or is it one code per user?**
A: One code per user. The `generate-code` endpoint checks for an existing code before generating. If the user already has a referral code, it returns the existing code (idempotent). The Referral model uses `referrer_user_id` with the code being a unique string -- multiple Referral rows can share the same `referrer_user_id` (one per referred person), but the `referral_code` value is the same across all of them for that user.

### Testing Strategy

**Q19: How should admin-only API endpoints be tested given the existing patterns?**
A: Follow the established `AdminApiTest.php` pattern at `tests/Feature/Api/AdminApiTest.php`. Each test file: (1) seeds `RolesAndPermissionsSeeder` in `beforeEach`, (2) creates `$this->superAdmin = User::factory()->create(['is_super_admin' => true])` and `$this->regularUser = User::factory()->create()`, (3) tests the happy path with `actingAs($this->superAdmin)`, (4) includes a 403 test with `actingAs($this->regularUser)`, (5) includes a 401 test without `actingAs()`. No workspace context headers are needed since all CRM models are central (no `workspace_id` scoping).

**Q20: Should there be browser/Playwright tests for the admin CRM pages?**
A: Not in v1. The admin portal is single-user (super admin only) with low interaction complexity. Feature tests on API endpoints provide sufficient coverage. Browser tests are expensive to maintain and the admin pages have no complex client-side state machines or multi-step wizards. If the admin portal gains more interactive features (e.g., drag-and-drop kanban with real-time updates), add targeted Playwright tests for those interactions. The existing 247 browser tests focus on customer-facing flows, which is the correct priority.
