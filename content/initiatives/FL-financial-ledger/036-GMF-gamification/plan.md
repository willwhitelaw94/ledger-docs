---
title: "Implementation Plan: Gamification — Streaks, Challenges & Rewards"
---

# Implementation Plan: Gamification — Streaks, Challenges & Rewards

**Branch**: `036-GMF-gamification` | **Date**: 2026-03-19 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/036-GMF-gamification/spec)

## Summary

Build the backend gamification engine that powers the already-built frontend components (9 production-ready React components exist). The core is an **achievement event bus** — domain actions (reconcile, post JE, send invoice, clear queue) fire achievement events that auto-increment streaks, award badges, and trigger celebrations. No manual tracking — everything is automatic.

**Frontend state**: 9 components built (concentric rings, streak counter, all-clear celebration, badge dropdown, challenge grid, health ring, value counter, etc.). All use props — just need real API data.

**Backend state**: Nothing built. Models, actions, API endpoints, event listeners all needed.

## Technical Context

**Language/Version**: PHP 8.4, Laravel 12, Next.js 16 (TypeScript)
**Primary Dependencies**: Spatie laravel-event-sourcing v7, Lorisleiva Actions, Laravel Pennant
**Storage**: SQLite (local), MySQL (production)
**Testing**: Pest v4
**Feature Flag**: `gamification` — ON by default, all tiers
**Performance Goals**: Streak increment < 50ms (inline with action), no user-visible latency
**Constraints**: Workspace-scoped, user-scoped dual streaks. Period boundaries in workspace timezone.

## Gate 3: Architecture Pre-Check

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Achievement event bus — domain events → listeners → streak/badge actions |
| Existing patterns leveraged | PASS | Follows Action pattern, existing event/listener pattern from notifications |
| No impossible requirements | PASS | All spec items buildable |
| Performance considered | PASS | Streak increment is lightweight DB update, queued for badges |
| Security considered | PASS | Workspace + user scoped, no cross-tenant leakage |
| Data model understood | PASS | 5 models — see below |
| API contracts clear | PASS | REST endpoints for streaks, challenges, badges, stats |
| Use Lorisleiva Actions | PASS | All business logic in Actions |
| Feature flags dual-gated | PASS | `gamification` Pennant flag + API response |

## Data Model

### New Models

```
Streak (tenant-scoped)
├── id: bigint PK
├── workspace_id: FK → workspaces
├── user_id: FK → users (nullable — null for workspace-level streaks)
├── scope: StreakScope enum (user, workspace)
├── type: StreakType enum (reconciliation, transaction_processing, invoice_sending, report_review, custom)
├── challenge_id: FK → challenges (nullable — for custom challenge streaks)
├── current_count: int (default 0)
├── best_count: int (default 0)
├── frequency: StreakFrequency enum (daily, weekly, fortnightly, monthly)
├── status: StreakStatus enum (active, at_risk, broken, paused)
├── last_completed_at: datetime (nullable)
├── last_period_start: date (nullable — start of last completed period)
├── perfect_periods: int (default 0 — count of "Perfect Period" completions)
├── recovery_used_at: datetime (nullable — last recovery this month)
├── timestamps
│
├── Relationships:
│   ├── workspace() → BelongsTo Workspace
│   ├── user() → BelongsTo User (nullable)
│   └── challenge() → BelongsTo Challenge (nullable)
│
├── Scopes:
│   ├── scopeForUser(q, userId) → where user_id AND scope=user
│   ├── scopeForWorkspace(q) → where scope=workspace
│   ├── scopeActive(q) → where status in (active, at_risk)
│   └── scopeAtRisk(q) → where status=at_risk

Challenge (tenant-scoped)
├── id: bigint PK
├── workspace_id: FK → workspaces
├── user_id: FK → users (creator)
├── name: string
├── task_type: StreakType enum
├── frequency: StreakFrequency enum
├── description: text (nullable)
├── challenge_template_id: FK → challenge_templates (nullable — if from practice suggestion)
├── status: ChallengeStatus enum (active, paused, completed)
├── paused_at: datetime (nullable)
├── timestamps

ChallengeTemplate (central — practice-scoped)
├── id: bigint PK
├── practice_id: FK → practices
├── name: string
├── task_type: StreakType enum
├── frequency: StreakFrequency enum
├── description: text (nullable)
├── is_active: boolean (default true)
├── activation_count: int (default 0 — how many clients activated)
├── timestamps

Badge (tenant-scoped)
├── id: bigint PK
├── workspace_id: FK → workspaces
├── user_id: FK → users
├── badge_type: string (e.g., 'reconciliation_1w', 'reconciliation_4w', 'all_clear', 'perfect_period')
├── source_type: string (streak, goal, all_clear, custom)
├── source_id: int (nullable — streak_id, goal_id, etc.)
├── milestone_threshold: int (nullable — e.g., 4 for 4-week milestone)
├── tier: BadgeTier enum (bronze, silver, gold, diamond)
├── earned_at: datetime
├── timestamps

AchievementEvent (tenant-scoped — event log)
├── id: bigint PK
├── workspace_id: FK → workspaces
├── user_id: FK → users
├── event_type: string (streak_incremented, streak_broken, badge_earned, all_clear, perfect_period)
├── payload: json (event-specific data)
├── source_epic: string (nullable — e.g., '004-BFR', '005-IAR')
├── created_at: datetime
```

### Enums

```php
enum StreakScope: string { case User = 'user'; case Workspace = 'workspace'; }
enum StreakType: string {
    case Reconciliation = 'reconciliation';
    case TransactionProcessing = 'transaction_processing';
    case InvoiceSending = 'invoice_sending';
    case ReportReview = 'report_review';
    case Custom = 'custom';
}
enum StreakFrequency: string { case Daily = 'daily'; case Weekly = 'weekly'; case Fortnightly = 'fortnightly'; case Monthly = 'monthly'; }
enum StreakStatus: string { case Active = 'active'; case AtRisk = 'at_risk'; case Broken = 'broken'; case Paused = 'paused'; }
enum ChallengeStatus: string { case Active = 'active'; case Paused = 'paused'; case Completed = 'completed'; }
enum BadgeTier: string { case Bronze = 'bronze'; case Silver = 'silver'; case Gold = 'gold'; case Diamond = 'diamond'; }
```

### Milestone Thresholds → Badge Tiers

| Consecutive Periods | Badge Tier | Badge Name Pattern |
|--------------------|-----------|--------------------|
| 1 week | Bronze | "{Type} Beginner" |
| 4 weeks | Silver | "{Type} Monthly Master" |
| 12 weeks | Gold | "{Type} Quarter Champion" |
| 26 weeks | Gold | "{Type} Half-Year Hero" |
| 52 weeks | Diamond | "{Type} Annual Legend" |

## Achievement Event Bus Architecture

The event bus connects domain actions to gamification without coupling:

```
Domain Action (reconcile, post JE, send invoice, ...)
    ↓ fires existing domain event
Existing Event Listener (e.g., NotifyOwnersOnBankFeedSynced)
    ↓ (unchanged — notifications continue to work)
NEW: Gamification Listener (e.g., IncrementStreakOnReconciliation)
    ↓ dispatches
IncrementStreak action
    ↓ checks period, increments count
    ↓ if milestone hit → AwardBadge action
    ↓ if queue cleared → fires AllClearAchieved event
    ↓ logs AchievementEvent
API returns updated streak/badge data to frontend
    ↓
Frontend shows celebration / badge unlock animation
```

### Trigger Map — What Increments What

| Domain Action | Streak Type | How Detected |
|---------------|-------------|--------------|
| Reconcile bank transaction | `reconciliation` | `ReconcileTransaction` action completes |
| Match bank transaction | `reconciliation` | `MatchTransaction` action completes |
| Classify feed item | `transaction_processing` | `ProcessFeedItem` action → status=Posted |
| Post journal entry | `transaction_processing` | `JournalEntrySubmitted` event |
| Send invoice | `invoice_sending` | `InvoiceSent` event |
| View P&L / Balance Sheet | `report_review` | `GET /reports/*` endpoint hit |

### "All Clear" Detection

| Queue | Trigger Condition |
|-------|-------------------|
| Bank reconciliation | `BankTransaction::where(workspace_id, X)->where(reconciliation_status, 'unmatched')->count() === 0` after reconcile/match |
| Feed items | `FeedItem::where(workspace_id, X)->pending()->count() === 0` after process/classify |
| Overdue invoices | `Invoice::where(workspace_id, X)->overdue()->count() === 0` after payment received |

Returns `{ queue_type, items_cleared_this_session, was_first_all_clear }` to frontend for celebration data.

## API Contracts

### Streaks

```
GET    /api/v1/streaks                        — all streaks for current user in workspace
GET    /api/v1/streaks/dashboard              — dashboard summary (3 ring values + best streaks)
GET    /api/v1/streaks/{id}                   — streak detail with history
```

### Challenges

```
GET    /api/v1/challenges                     — user's challenges + suggested templates
POST   /api/v1/challenges                     — create custom challenge
PATCH  /api/v1/challenges/{id}                — update challenge
PATCH  /api/v1/challenges/{id}/pause          — pause challenge
PATCH  /api/v1/challenges/{id}/resume         — resume challenge
DELETE /api/v1/challenges/{id}                — delete challenge
POST   /api/v1/challenges/activate-template   — activate a practice-suggested template
```

### Badges

```
GET    /api/v1/badges                         — user's earned badges
GET    /api/v1/badges/statistics              — badge count, best streak, hours saved
```

### Achievement Events

```
GET    /api/v1/achievements/recent            — recent achievement events (for activity feed)
GET    /api/v1/achievements/value-counter     — money saved + time saved calculation
```

### Dashboard Widget

```
GET    /api/v1/gamification/dashboard         — unified endpoint returning:
                                                { rings, streaks, recent_badges, value_counter,
                                                  all_clear_status, health_score }
```

## Implementation Phases

### Phase 1: Core Engine — Streaks + Rings + Badges + "All Clear" (~3 weeks)

**Goal**: The minimum lovable gamification loop. Streaks auto-track, rings fill, milestones earn badges, clearing queues triggers celebrations.

| Task | Files | Notes |
|------|-------|-------|
| Create 6 enums | `app/Enums/Gamification/` | StreakScope, StreakType, StreakFrequency, StreakStatus, ChallengeStatus, BadgeTier |
| Create 5 migrations | `database/migrations/` | streaks, challenges, challenge_templates, badges, achievement_events |
| Create 5 models | `app/Models/Tenant/` | Streak, Challenge, Badge, AchievementEvent + `app/Models/Central/ChallengeTemplate` |
| Create IncrementStreak action | `app/Actions/Gamification/IncrementStreak.php` | Core logic: check period, increment/create, update best, check milestones |
| Create CheckStreakPeriod action | `app/Actions/Gamification/CheckStreakPeriod.php` | Determine if current timestamp is in a new period vs same period |
| Create AwardBadge action | `app/Actions/Gamification/AwardBadge.php` | Create badge at milestone thresholds, log achievement event |
| Create DetectAllClear action | `app/Actions/Gamification/DetectAllClear.php` | Check if a queue is fully cleared, return celebration data |
| Create CalculateValueCounter action | `app/Actions/Gamification/CalculateValueCounter.php` | Time saved (auto-matched txns × 2min) + money saved (anomalies caught) |
| Create GetDashboardData action | `app/Actions/Gamification/GetDashboardData.php` | Unified dashboard response: rings, streaks, badges, value counter |
| Create gamification listeners (4) | `app/Listeners/Gamification/` | IncrementStreakOnReconciliation, IncrementStreakOnJeSubmitted, IncrementStreakOnInvoiceSent, IncrementStreakOnReportView |
| Wire listeners to events | `app/Providers/EventServiceProvider.php` or event discovery | Map domain events to gamification listeners |
| Create streak-at-risk detection command | `app/Console/Commands/DetectAtRiskStreaks.php` | Runs daily, checks 75% period elapsed, creates notifications |
| Create broken streak detection command | `app/Console/Commands/BreakExpiredStreaks.php` | Runs daily, breaks streaks where period expired without activity |
| Schedule commands | `routes/console.php` | streak:detect-at-risk daily, streak:break-expired daily |
| Create API controllers | `app/Http/Controllers/Api/` | StreakController, BadgeController, GamificationDashboardController |
| Create policies | `app/Policies/` | StreakPolicy, BadgePolicy (workspace-scoped, user can view own) |
| Create API resources | `app/Http/Resources/Gamification/` | StreakResource, BadgeResource, DashboardResource |
| Register routes | `routes/api.php` | Under workspace middleware group |
| Feature flag | `app/Providers/AppServiceProvider.php` | `Feature::define('gamification', fn () => true)` |
| Feature tests | `tests/Feature/Gamification/` | Streak increment, badge award, all clear, period boundary, tenant isolation |
| Connect frontend components to API | `frontend/src/hooks/` | useStreaks, useBadges, useGamificationDashboard hooks |

### Phase 2: Challenges + Practice Templates + Value Counter

| Task | Files | Notes |
|------|-------|-------|
| Challenge CRUD controller | `app/Http/Controllers/Api/ChallengeController.php` | Create, pause, resume, delete + activate template |
| ChallengeTemplate controller | Practice-scoped | CRUD for practice managers |
| Value counter endpoint | `app/Http/Controllers/Api/GamificationDashboardController.php` | Money/time saved calculation |
| Connect challenge-grid.tsx | `frontend/src/hooks/` | useChallenges hook |
| Connect value-counter.tsx | Frontend | Real data from API |

### Phase 3: Recovery + Team Streaks

| Task | Files | Notes |
|------|-------|-------|
| RecoverStreak action | `app/Actions/Gamification/RecoverStreak.php` | 1 per month, preserves streak with visual flag |
| Practice streak aggregation | Practice controller extension | Flame status per workspace |
| Practice leaderboard endpoint | Practice controller | Sorted workspace health |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Streak increment adds latency to reconciliation | Low | High | Streak update is 1 DB query. If needed, queue it — but should be <50ms inline. |
| Period boundary edge cases (timezone, DST) | Medium | Medium | Use Carbon with workspace timezone. Test thoroughly with AU/NZ timezones. |
| "All Clear" fires incorrectly (empty workspace) | Low | Medium | Only fire when transitioning from >0 to 0. Don't fire if queue was never populated. |
| Badge inflation (too many badges too fast) | Low | Low | Milestones at 1/4/12/26/52 weeks are spaced out. Max ~5 badges per streak type per year. |

## Testing Strategy

### Key Test Scenarios

1. **Streak increment**: Reconcile a transaction → streak increments. Reconcile again in same period → no double-count.
2. **Period boundary**: Miss a full period → streak breaks. Use recovery → streak preserved.
3. **All Clear**: Clear last unmatched transaction → all_clear detected. Empty workspace → no false trigger.
4. **Badge milestone**: Hit 4-week streak → silver badge awarded. Already have badge → no duplicate.
5. **Workspace vs user scope**: Two users reconcile same workspace → workspace streak increments once. Both users' personal streaks increment independently.
6. **Feature flag**: Disable gamification → API returns empty, no listeners fire.
7. **Tenant isolation**: Workspace A streaks invisible to workspace B users.

## Next Steps

1. `/speckit-tasks` — Generate implementation task list
2. Begin Phase 1: Core engine
