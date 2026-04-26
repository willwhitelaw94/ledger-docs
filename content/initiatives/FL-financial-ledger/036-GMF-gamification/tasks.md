---
title: "Implementation Tasks: Gamification — Streaks, Challenges & Rewards"
---

# Implementation Tasks: Gamification

**Mode**: AI Agent
**Plan**: [plan.md](/initiatives/FL-financial-ledger/036-GMF-gamification/plan)
**Spec**: [spec.md](/initiatives/FL-financial-ledger/036-GMF-gamification/spec)

---

## Phase 1: Foundation — Enums, Migrations, Models

- [ ] T001 [P] Enum: `StreakScope` — cases: User, Workspace. Each with `label(): string`. File: `app/Enums/Gamification/StreakScope.php`
- [ ] T002 [P] Enum: `StreakType` — cases: Reconciliation, TransactionProcessing, InvoiceSending, ReportReview, Custom. Each with `label(): string` and `ringColour(): string` (Reconciliation=teal, InvoiceSending=amber, ReportReview=violet, others=gray). File: `app/Enums/Gamification/StreakType.php`
- [ ] T003 [P] Enum: `StreakFrequency` — cases: Daily, Weekly, Fortnightly, Monthly. Each with `label(): string` and `periodDays(): int` (1, 7, 14, 30). File: `app/Enums/Gamification/StreakFrequency.php`
- [ ] T004 [P] Enum: `StreakStatus` — cases: Active, AtRisk, Broken, Paused. Each with `label(): string` and `colour(): string`. File: `app/Enums/Gamification/StreakStatus.php`
- [ ] T005 [P] Enum: `ChallengeStatus` — cases: Active, Paused, Completed. File: `app/Enums/Gamification/ChallengeStatus.php`
- [ ] T006 [P] Enum: `BadgeTier` — cases: Bronze, Silver, Gold, Diamond. Each with `label(): string`, `colour(): string` (bronze=#d97706, silver=#9ca3af, gold=#fbbf24, diamond=#22d3ee), `thresholdWeeks(): int` (1, 4, 12/26, 52). File: `app/Enums/Gamification/BadgeTier.php`
- [ ] T007 Migration: `create_streaks_table` — columns: id, workspace_id (FK workspaces), user_id (nullable FK users), scope (string StreakScope), type (string StreakType), challenge_id (nullable FK challenges), current_count (int default 0), best_count (int default 0), frequency (string StreakFrequency), status (string StreakStatus default 'active'), last_completed_at (datetime nullable), last_period_start (date nullable), perfect_periods (int default 0), recovery_used_at (datetime nullable), timestamps. Indexes: (workspace_id, user_id, type), (workspace_id, scope, status). File: `database/migrations/2026_03_19_200001_create_streaks_table.php`
- [ ] T008 Migration: `create_challenges_table` — columns: id, workspace_id (FK workspaces), user_id (FK users), name (string), task_type (string StreakType), frequency (string StreakFrequency), description (text nullable), challenge_template_id (nullable FK challenge_templates), status (string ChallengeStatus default 'active'), paused_at (datetime nullable), timestamps. Index: (workspace_id, user_id). File: `database/migrations/2026_03_19_200002_create_challenges_table.php`
- [ ] T009 Migration: `create_challenge_templates_table` — columns: id, practice_id (FK practices), name (string), task_type (string), frequency (string), description (text nullable), is_active (boolean default true), activation_count (int default 0), timestamps. Index: (practice_id, is_active). File: `database/migrations/2026_03_19_200003_create_challenge_templates_table.php`
- [ ] T010 Migration: `create_badges_table` — columns: id, workspace_id (FK workspaces), user_id (FK users), badge_type (string), source_type (string), source_id (int nullable), milestone_threshold (int nullable), tier (string BadgeTier), earned_at (datetime), timestamps. Index: (workspace_id, user_id), unique on (workspace_id, user_id, badge_type). File: `database/migrations/2026_03_19_200004_create_badges_table.php`
- [ ] T011 Migration: `create_achievement_events_table` — columns: id, workspace_id (FK workspaces), user_id (FK users), event_type (string), payload (json), source_epic (string nullable), created_at (datetime). Index: (workspace_id, user_id, event_type). File: `database/migrations/2026_03_19_200005_create_achievement_events_table.php`
- [ ] T012 Model: `Streak` — $fillable: all columns except id/timestamps. Casts: scope → StreakScope, type → StreakType, frequency → StreakFrequency, status → StreakStatus, last_completed_at → 'datetime', last_period_start → 'date', recovery_used_at → 'datetime', current_count/best_count/perfect_periods → 'integer'. Relationships: workspace() BelongsTo Workspace, user() BelongsTo User (nullable), challenge() BelongsTo Challenge (nullable). Scopes: scopeForUser($q, $userId), scopeForWorkspace($q), scopeActive($q), scopeAtRisk($q). File: `app/Models/Tenant/Streak.php`
- [ ] T013 Model: `Challenge` — $fillable: all columns except id/timestamps. Casts: task_type → StreakType, frequency → StreakFrequency, status → ChallengeStatus, paused_at → 'datetime'. Relationships: workspace() BelongsTo Workspace, user() BelongsTo User, template() BelongsTo ChallengeTemplate (nullable), streak() HasOne Streak (where challenge_id). File: `app/Models/Tenant/Challenge.php`
- [ ] T014 Model: `ChallengeTemplate` — $fillable: all except id/timestamps. Casts: is_active → 'boolean', activation_count → 'integer'. Relationships: practice() BelongsTo Practice. Scope: scopeActive($q). File: `app/Models/Central/ChallengeTemplate.php`
- [ ] T015 Model: `Badge` — $fillable: all except id/timestamps. Casts: tier → BadgeTier, earned_at → 'datetime', milestone_threshold → 'integer'. Relationships: workspace() BelongsTo Workspace, user() BelongsTo User. Unique constraint enforced in migration (workspace_id, user_id, badge_type). Method: `icon(): string` — returns Lucide icon name based on badge_type (e.g., 'flame', 'trophy', 'zap', 'crown'). File: `app/Models/Tenant/Badge.php`
- [ ] T016 Model: `AchievementEvent` — $fillable: workspace_id, user_id, event_type, payload, source_epic. Casts: payload → 'array', created_at → 'datetime'. No updated_at (immutable log). Relationships: workspace() BelongsTo Workspace, user() BelongsTo User. File: `app/Models/Tenant/AchievementEvent.php`
- [ ] T017 Run migrations — `php artisan migrate`. Verify all 5 tables created. File: (verification only)

---

## Phase 2: Core Actions — Streak Engine + Badge Pipeline

- [ ] T018 Action: `CheckStreakPeriod` — AsAction. `handle(StreakFrequency $frequency, int $workspaceId): array`. Returns `['period_start' => Carbon, 'period_end' => Carbon, 'is_new_period' => bool]`. Uses workspace timezone from `Workspace::find($workspaceId)->timezone ?? 'Australia/Sydney'`. Weekly: Monday 00:00 to Sunday 23:59. Monthly: 1st to last day. Daily: midnight to midnight. Fortnightly: every 2 Mondays from epoch. File: `app/Actions/Gamification/CheckStreakPeriod.php`
- [ ] T019 Action: `IncrementStreak` — AsAction. `handle(int $workspaceId, int $userId, StreakType $type, StreakFrequency $frequency): Streak`. Logic: (1) Find or create Streak (workspace+user+type+scope=user). (2) Call CheckStreakPeriod to get current period. (3) If last_period_start === current period_start → already counted this period, return (no double-count). (4) If last_period_start === previous period → streak continues, increment current_count. (5) If gap > 1 period → streak broken, reset to 1. (6) Update last_completed_at=now(), last_period_start=period_start, best_count=max(best_count, current_count). (7) Also find/create workspace-scope streak (user_id=null) and apply same logic (but any user's action counts). (8) Check milestone thresholds → if hit, dispatch AwardBadge. (9) Log AchievementEvent(type='streak_incremented'). Return user streak. File: `app/Actions/Gamification/IncrementStreak.php`
- [ ] T020 Action: `AwardBadge` — AsAction. `handle(int $workspaceId, int $userId, string $badgeType, string $sourceType, ?int $sourceId, int $milestoneThreshold): ?Badge`. Logic: (1) Check badge doesn't already exist (unique constraint). (2) Determine tier from milestone: 1→Bronze, 4→Silver, 12→Gold, 26→Gold, 52→Diamond. (3) Create Badge record. (4) Log AchievementEvent(type='badge_earned'). (5) Return badge or null if duplicate. File: `app/Actions/Gamification/AwardBadge.php`
- [ ] T021 Action: `DetectAllClear` — AsAction. `handle(int $workspaceId, string $queueType): ?array`. Checks queue count=0 for given type: 'reconciliation' → unmatched BankTransactions + pending FeedItems, 'invoices' → overdue Invoices. If count===0, return `['queue_type' => $queueType, 'cleared' => true]`. If count > 0, return null. Award 'all_clear' badge on first ever All Clear. Log AchievementEvent(type='all_clear'). File: `app/Actions/Gamification/DetectAllClear.php`
- [ ] T022 Action: `CalculateValueCounter` — AsAction. `handle(int $workspaceId): array`. Calculate: (1) time_saved_minutes = count of auto-reconciled/rule-matched BankTransactions this month × 2 (industry benchmark: 2 min per manual reconciliation). (2) money_saved_cents = sum of amounts from anomaly-flagged items (future: 040-AND, for now return 0). Return `['time_saved_minutes' => int, 'money_saved_cents' => int, 'auto_matched_count' => int, 'period' => 'this_month']`. File: `app/Actions/Gamification/CalculateValueCounter.php`
- [ ] T023 Action: `GetDashboardData` — AsAction. `handle(int $workspaceId, int $userId): array`. Aggregates: (1) rings — 3 default streaks (reconciliation/weekly, invoice_sending/weekly, report_review/monthly) with current_count and period progress %. (2) user streaks — all active user streaks. (3) recent badges — last 5 badges earned. (4) value counter — from CalculateValueCounter. (5) all_clear_status — current queue counts for reconciliation and invoices. Return structured array for frontend. File: `app/Actions/Gamification/GetDashboardData.php`
- [ ] T024 [P] Action: `RecoverStreak` — AsAction. `handle(Streak $streak): Streak`. Logic: (1) Check streak.status === 'broken'. (2) Check recovery_used_at is null or not in current calendar month. (3) Restore current_count to previous value (best_count if current=0), set status=active, recovery_used_at=now(). (4) Log AchievementEvent(type='streak_recovered'). (5) Throw DomainException if recovery already used this month. File: `app/Actions/Gamification/RecoverStreak.php`

---

## Phase 3: Event Listeners — Wire Domain Events to Streaks

- [ ] T025 Listener: `IncrementStreakOnReconciliation` — listens for: hook into ReconcileTransaction and MatchTransaction actions (add `event(new \App\Events\Banking\TransactionReconciled($transaction))` at end of each). Listener calls `IncrementStreak::run(workspace_id, reconciled_by, StreakType::Reconciliation, StreakFrequency::Weekly)`. Then calls `DetectAllClear::run(workspace_id, 'reconciliation')`. File: `app/Listeners/Gamification/IncrementStreakOnReconciliation.php`
- [ ] T026 Create `TransactionReconciled` event — simple event with `BankTransaction $transaction` property. Dispatched at end of ReconcileTransaction and MatchTransaction actions. File: `app/Events/Banking/TransactionReconciled.php`
- [ ] T027 Wire TransactionReconciled event — add `event(new TransactionReconciled($transaction))` at the end of `ReconcileTransaction::handle()` and `MatchTransaction::handle()`. File: `app/Actions/Banking/ReconcileTransaction.php`, `app/Actions/Banking/MatchTransaction.php`
- [ ] T028 Listener: `IncrementStreakOnJeSubmitted` — listens for `JournalEntrySubmitted` event. Calls `IncrementStreak::run(workspace_id, submitted_by, StreakType::TransactionProcessing, StreakFrequency::Weekly)`. File: `app/Listeners/Gamification/IncrementStreakOnJeSubmitted.php`
- [ ] T029 Listener: `IncrementStreakOnInvoiceSent` — listens for `InvoiceSent` event. Calls `IncrementStreak::run(workspace_id, sent_by, StreakType::InvoiceSending, StreakFrequency::Weekly)`. Then calls `DetectAllClear::run(workspace_id, 'invoices')`. File: `app/Listeners/Gamification/IncrementStreakOnInvoiceSent.php`
- [ ] T030 Listener: `IncrementStreakOnFeedItemProcessed` — listens for `FeedItemProcessed` event. Calls `IncrementStreak::run(workspace_id, user_id_from_context, StreakType::TransactionProcessing, StreakFrequency::Weekly)`. File: `app/Listeners/Gamification/IncrementStreakOnFeedItemProcessed.php`
- [ ] T031 Register all gamification listeners — use `EventServiceProvider` or Laravel event discovery. Map: TransactionReconciled → IncrementStreakOnReconciliation, JournalEntrySubmitted → IncrementStreakOnJeSubmitted, InvoiceSent → IncrementStreakOnInvoiceSent, FeedItemProcessed → IncrementStreakOnFeedItemProcessed. All listeners check `Feature::active('gamification')` before executing. File: `app/Providers/EventServiceProvider.php` (or event discovery)

---

## Phase 4: Scheduled Commands — At-Risk + Broken Streak Detection

- [ ] T032 Command: `DetectAtRiskStreaks` — Artisan command `streak:detect-at-risk`. For each active streak: calculate 75% of period elapsed. If past 75% and no activity this period, set status=AtRisk. Create notification via CreateNotification::run() with type 'streak_at_risk'. File: `app/Console/Commands/DetectAtRiskStreaks.php`
- [ ] T033 Command: `BreakExpiredStreaks` — Artisan command `streak:break-expired`. For each active/at_risk streak: if current period has ended with no activity (last_completed_at < period_start), set status=Broken, current_count=0. Log AchievementEvent(type='streak_broken'). File: `app/Console/Commands/BreakExpiredStreaks.php`
- [ ] T034 Schedule commands — add to `routes/console.php`: `Schedule::command('streak:detect-at-risk')->dailyAt('18:00')` and `Schedule::command('streak:break-expired')->dailyAt('00:30')`. File: `routes/console.php`
- [ ] T035 Add `streak_at_risk` to NotificationType enum — new case with label "Streak at Risk", icon "flame", filterCategory "gamification". File: `app/Enums/NotificationType.php`

---

## Phase 5: API Endpoints — Controllers, Resources, Routes

- [ ] T036 [P] Resource: `StreakResource` — fields: id, scope, type, type_label, ring_colour (from StreakType), frequency, frequency_label, current_count, best_count, status, status_label, status_colour, last_completed_at, perfect_periods, period_progress_pct (calculated: how far through current period). File: `app/Http/Resources/Gamification/StreakResource.php`
- [ ] T037 [P] Resource: `BadgeResource` — fields: id, badge_type, source_type, milestone_threshold, tier, tier_label, tier_colour, icon (from Badge::icon()), earned_at. File: `app/Http/Resources/Gamification/BadgeResource.php`
- [ ] T038 [P] Resource: `ChallengeResource` — fields: id, name, task_type, task_type_label, frequency, frequency_label, description, status, status_label, streak (StreakResource whenLoaded), template_name (from challenge_template if linked), paused_at. File: `app/Http/Resources/Gamification/ChallengeResource.php`
- [ ] T039 Controller: `StreakController` — methods: index (user's streaks in workspace), dashboard (GetDashboardData response). Use `Gate::authorize('viewAny', Streak::class)`. File: `app/Http/Controllers/Api/StreakController.php`
- [ ] T040 Controller: `BadgeController` — methods: index (user's badges), statistics (badge count, best streak, time saved). File: `app/Http/Controllers/Api/BadgeController.php`
- [ ] T041 Controller: `ChallengeController` — methods: index (challenges + suggested templates), store (create custom), update, pause, resume, destroy, activateTemplate. File: `app/Http/Controllers/Api/ChallengeController.php`
- [ ] T042 Controller: `GamificationDashboardController` — methods: dashboard (unified widget data from GetDashboardData), valueCounter (from CalculateValueCounter), recentAchievements (last 10 AchievementEvents). File: `app/Http/Controllers/Api/GamificationDashboardController.php`
- [ ] T043 [P] Form Request: `StoreChallengeRequest` — authorize via user permission. Rules: name (required, string, max:255), task_type (required, StreakType enum), frequency (required, StreakFrequency enum), description (nullable, string). File: `app/Http/Requests/Gamification/StoreChallengeRequest.php`
- [ ] T044 [P] Policy: `StreakPolicy` — viewAny/view: any authenticated workspace user. No create/update/delete (system-managed). File: `app/Policies/StreakPolicy.php`
- [ ] T045 [P] Policy: `ChallengePolicy` — viewAny: any user. create/update/delete: own challenges only ($challenge->user_id === $user->id). File: `app/Policies/ChallengePolicy.php`
- [ ] T046 Routes: Register gamification routes in `routes/api.php` under workspace middleware group. Streaks: GET /streaks, GET /streaks/dashboard. Badges: GET /badges, GET /badges/statistics. Challenges: GET/POST /challenges, PATCH /challenges/{id}, PATCH /challenges/{id}/pause, PATCH /challenges/{id}/resume, DELETE /challenges/{id}, POST /challenges/activate-template. Dashboard: GET /gamification/dashboard, GET /gamification/value-counter, GET /gamification/achievements. File: `routes/api.php`
- [ ] T047 Feature flag: Add `Feature::define('gamification', fn () => true)` in AppServiceProvider::boot(). All gamification API endpoints check this flag. File: `app/Providers/AppServiceProvider.php`
- [ ] T048 Register policies in AppServiceProvider — Gate::policy for Streak, Challenge, Badge. File: `app/Providers/AppServiceProvider.php`

---

## Phase 6: Frontend — Wire Existing Components to Real API

- [ ] T049 [P] Types: `gamification.ts` — TypeScript types matching API resources: Streak (id, scope, type, type_label, ring_colour, frequency, current_count, best_count, status, status_colour, last_completed_at, perfect_periods, period_progress_pct), Badge (id, badge_type, source_type, milestone_threshold, tier, tier_label, tier_colour, icon, earned_at), Challenge (id, name, task_type, frequency, description, status, streak, template_name, paused_at), GamificationDashboard (rings: Streak[], streaks: Streak[], recent_badges: Badge[], value_counter: {time_saved_minutes, money_saved_cents, auto_matched_count}, all_clear_status: {reconciliation_count, invoice_overdue_count}), ValueCounter, BadgeStatistics. File: `frontend/src/types/gamification.ts`
- [ ] T050 [P] Hook: `useGamificationDashboard` — TanStack Query. `useGamificationDashboard()` fetches GET /api/v1/gamification/dashboard. Returns typed GamificationDashboard. Polls every 60s. File: `frontend/src/hooks/use-gamification.ts`
- [ ] T051 [P] Hook: `useStreaks` — `useStreaks()` fetches GET /api/v1/streaks. `useStreakDashboard()` fetches /streaks/dashboard. File: (same file as T050)
- [ ] T052 [P] Hook: `useBadges` — `useBadges()` fetches GET /api/v1/badges. `useBadgeStatistics()` fetches /badges/statistics. File: (same file as T050)
- [ ] T053 [P] Hook: `useChallenges` — `useChallenges()` fetches GET /api/v1/challenges. Mutations: useCreateChallenge, usePauseChallenge, useResumeChallenge, useDeleteChallenge, useActivateTemplate. File: (same file as T050)
- [ ] T054 Wire `gamification-widget.tsx` — replace demo data props with `useGamificationDashboard()` hook. Map dashboard.rings to ConcentricRings props, dashboard.streaks to streak list, dashboard.recent_badges to badge display, dashboard.value_counter to ValueCounter props. File: `frontend/src/components/gamification/gamification-widget.tsx`
- [ ] T055 Wire `badge-dropdown.tsx` — replace demo badges with `useBadges()` and `useBadgeStatistics()`. Map earned badges to grid, stats to header row. File: `frontend/src/components/gamification/badge-dropdown.tsx`
- [ ] T056 Wire `challenge-grid.tsx` — replace demo challenges with `useChallenges()`. Wire pause/resume/delete mutations. Wire "Activate" button for practice-suggested templates. File: `frontend/src/components/gamification/challenge-grid.tsx`
- [ ] T057 Wire `all-clear-celebration.tsx` — trigger when DetectAllClear returns cleared=true. The API response from reconcile/classify endpoints should include `all_clear: true` when queue clears. Frontend shows celebration overlay on this flag. File: `frontend/src/components/gamification/all-clear-celebration.tsx`
- [ ] T058 Add gamification widget to entity dashboard — import GamificationWidget, render above or alongside existing dashboard content. Conditionally render based on `gamification` feature flag from workspace features API. File: `frontend/src/app/(dashboard)/dashboard/page.tsx`
- [ ] T059 Add "Streaks" nav item to sidebar — or integrate streak flame icons into existing nav items. Add fire emoji / flame indicator next to nav items that have active streaks (Banking if reconciliation streak active, Invoices if invoice streak active). File: `frontend/src/lib/navigation.ts`, `frontend/src/components/layout/app-sidebar.tsx`

---

## Phase 7: Tests

- [ ] T060 Test: `StreakIncrementTest` — Pest feature test. Create workspace + user. Call IncrementStreak for reconciliation/weekly. Assert: streak created with count=1. Call again in same period → count stays 1 (no double-count). Advance to next week, call again → count=2. Skip a week entirely, call → count resets to 1. Assert best_count tracks highest. File: `tests/Feature/Gamification/StreakIncrementTest.php`
- [ ] T061 Test: `BadgeAwardTest` — Pest feature test. Increment streak to 4 weeks. Assert silver badge created. Increment to 4 again → no duplicate badge. Assert achievement event logged. File: `tests/Feature/Gamification/BadgeAwardTest.php`
- [ ] T062 Test: `AllClearTest` — Pest feature test. Create workspace with 3 unmatched BankTransactions. Reconcile 2 → DetectAllClear returns null. Reconcile last → returns cleared=true. Assert AchievementEvent logged. Call again on already-empty queue → returns null (no false trigger). File: `tests/Feature/Gamification/AllClearTest.php`
- [ ] T063 Test: `StreakRecoveryTest` — Pest feature test. Create streak with count=5, break it. Call RecoverStreak → count restored, status=active, recovery_used_at set. Try to recover again same month → DomainException. Next month → recovery allowed. File: `tests/Feature/Gamification/StreakRecoveryTest.php`
- [ ] T064 Test: `ChallengeApiTest` — Pest feature test. CRUD challenges: create, list, pause, resume, delete. Activate practice template. Assert streak auto-created for custom challenge. Assert paused challenge streak doesn't break. File: `tests/Feature/Api/ChallengeApiTest.php`
- [ ] T065 Test: `GamificationDashboardApiTest` — Pest feature test. Create streaks + badges. Hit GET /gamification/dashboard. Assert response shape matches expected: rings, streaks, recent_badges, value_counter. Assert workspace isolation. File: `tests/Feature/Api/GamificationDashboardApiTest.php`
- [ ] T066 Test: `StreakListenerTest` — Pest feature test. Fire TransactionReconciled event. Assert streak incremented. Fire JournalEntrySubmitted event. Assert transaction_processing streak incremented. Fire InvoiceSent event. Assert invoice_sending streak incremented. Assert gamification feature flag check — disable flag, fire event, assert no streak created. File: `tests/Feature/Gamification/StreakListenerTest.php`
- [ ] T067 Test: `DualScopeStreakTest` — Pest feature test. Two users in same workspace. User A reconciles → user A's user-streak=1, workspace streak=1. User B reconciles → user B's user-streak=1, workspace streak still=1 (same period). Assert workspace streak doesn't double-count. File: `tests/Feature/Gamification/DualScopeStreakTest.php`
- [ ] T068 Test: `TenantIsolationTest` — Pest feature test. Create streaks/badges in workspace A. Assert workspace B user cannot see them via API. File: `tests/Feature/Gamification/TenantIsolationTest.php`

---

## Phase 8: Final Verification

- [ ] T069 Run full test suite — `php artisan test --compact`. ALL existing tests must pass. All new gamification tests must pass. File: (verification only)
- [ ] T070 Run Pint — `vendor/bin/pint --dirty`. File: (formatting only)
- [ ] T071 Verify existing banking/notification tests unchanged — `php artisan test --filter=BankFeed --filter=Notification`. File: (verification only)
