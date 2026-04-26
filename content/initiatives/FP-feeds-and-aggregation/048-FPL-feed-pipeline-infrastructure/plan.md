---
title: "Implementation Plan: Feed Pipeline Infrastructure"
---

# Implementation Plan: Feed Pipeline Infrastructure

**Branch**: `048-FPL-feed-pipeline-infrastructure` | **Date**: 2026-03-19 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/048-FPL-feed-pipeline-infrastructure/spec)

## Summary

Build a universal feed pipeline that generalises the existing bank feed infrastructure (`BankFeedProviderInterface`, `BankTransaction`, `BankFeedRule`) into a type-agnostic ingestion engine. Any external data source implements `FeedProvider`, ingested items flow through a shared classify → transform → generate JE pipeline. Bank transactions migrate to become the first provider on the new pipeline, proving the abstraction before other sources (049-APF) plug in.

**Migration strategy**: Adapter pattern — existing banking models (`BankAccount`, `BankTransaction`, `BankFeedRule`) remain unchanged. New `FeedSource` and `FeedItem` models wrap and delegate to them for bank transactions. No breaking changes to existing banking API endpoints or tests.

## Technical Context

**Language/Version**: PHP 8.4, Laravel 12, Next.js 16 (TypeScript)
**Primary Dependencies**: Spatie laravel-event-sourcing v7, Lorisleiva Actions, Spatie Laravel Data
**Storage**: SQLite (local dev), MySQL (production)
**Testing**: Pest v4 (Feature + Browser)
**Performance Goals**: 500 items/batch in < 30s, individual item processing < 100ms
**Constraints**: Zero data loss, idempotent ingestion, tenant isolation via workspace_id

## Gate 3: Architecture Pre-Check

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Adapter pattern wrapping existing banking infra |
| Existing patterns leveraged | PASS | Follows Action pattern, tenant scoping, existing rules engine |
| No impossible requirements | PASS | All spec items buildable with current stack |
| Performance considered | PASS | Queue-based, debounced, backpressure |
| Security considered | PASS | Tenant-scoped, raw payloads encrypted at rest |
| Data model understood | PASS | FeedSource, FeedItem, FeedRule — see data model below |
| API contracts clear | PASS | RESTful, follows existing conventions |
| Dependencies identified | PASS | All dependencies (004, 010, 021, 002) complete |
| Integration points mapped | PASS | JE creation via existing CreateJournalEntry action |
| Use Lorisleiva Actions | PASS | All business logic in Actions with AsAction trait |
| Model route binding | PASS | UUID-based route model binding |
| Migrations schema-only | PASS | No data operations in migrations |
| Event sourcing: granular events | PASS | FeedItemProcessed captures full provenance |

## Data Model

### New Models

```
FeedSource (tenant-scoped)
├── id: bigint PK
├── uuid: uuid (unique, route binding)
├── workspace_id: FK → workspaces
├── name: string (user-facing label, e.g., "ANZ Business Account", "Property Portfolio")
├── type: FeedSourceType enum
├── provider: string (basiq, redbook, asx, rpdata, sharesight, class_super, manual)
├── config: json (encrypted — provider-specific settings, credentials, polling interval)
├── status: FeedSourceStatus enum
├── error_message: text (nullable — last error detail)
├── error_count: int (default 0 — consecutive errors)
├── last_synced_at: datetime (nullable)
├── next_sync_at: datetime (nullable)
├── sync_interval_minutes: int (default 60)
├── items_processed_count: int (default 0 — lifetime counter)
├── meta: json (nullable — provider-specific metadata)
├── timestamps
│
├── Relationships:
│   ├── workspace() → BelongsTo Workspace
│   ├── items() → HasMany FeedItem
│   ├── bankAccount() → BelongsTo BankAccount (nullable — for bank feed sources)
│   └── rules() → HasMany FeedRule (scoped by type)
│
├── Scopes:
│   ├── scopeActive(query) → where status = active
│   ├── scopeDueForSync(query) → where next_sync_at <= now() and status = active
│   └── scopeForType(query, type) → where type = $type

FeedItem (tenant-scoped)
├── id: bigint PK
├── uuid: uuid (unique, route binding)
├── workspace_id: FK → workspaces
├── feed_source_id: FK → feed_sources
├── external_id: string (dedup key — unique per feed_source_id)
├── type: FeedItemType enum (mirrors source type for fast filtering)
├── raw_payload: json (immutable — original provider response)
├── normalised_payload: json (canonical shape after normalisation)
├── status: FeedItemStatus enum
├── classification: json (nullable — matched rule, confidence, suggested accounts)
├── journal_entry_id: FK → journal_entries (nullable — once JE created)
├── bank_transaction_id: FK → bank_transactions (nullable — link to existing banking model)
├── error_message: text (nullable)
├── retry_count: int (default 0)
├── processed_at: datetime (nullable)
├── timestamps
│
├── Relationships:
│   ├── workspace() → BelongsTo Workspace
│   ├── feedSource() → BelongsTo FeedSource
│   ├── journalEntry() → BelongsTo JournalEntry (nullable)
│   └── bankTransaction() → BelongsTo BankTransaction (nullable)
│
├── Scopes:
│   ├── scopePending(query) → where status = pending
│   ├── scopeErrors(query) → where status = error
│   └── scopeForSource(query, sourceId) → where feed_source_id = $sourceId

FeedRule (tenant-scoped) — generalisation of BankFeedRule
├── id: bigint PK
├── workspace_id: FK → workspaces
├── feed_type: FeedSourceType enum (scopes which items this rule applies to)
├── name: string
├── match_field: string (field name in normalised_payload to match against)
├── match_type: FeedRuleMatchType enum (exact, contains, starts_with, regex, greater_than, less_than)
├── match_value: string
├── target_chart_account_id: FK → chart_accounts (nullable)
├── target_tax_code: string (nullable)
├── target_contact_id: FK → contacts (nullable)
├── auto_post: boolean (default false — if true, auto-create and post JE)
├── priority: int (lower = higher priority)
├── is_active: boolean (default true)
├── last_matched_at: datetime (nullable)
├── timestamps
│
├── Relationships:
│   ├── workspace() → BelongsTo Workspace
│   ├── targetAccount() → BelongsTo ChartAccount
│   └── targetContact() → BelongsTo Contact
│
├── Methods:
│   └── matches(array $normalisedPayload): bool
```

### New Enums

```php
enum FeedSourceType: string
{
    case BankTransaction = 'bank_transaction';
    case AssetPrice = 'asset_price';
    case MarketData = 'market_data';
    case PropertyValuation = 'property_valuation';
    case VehicleValuation = 'vehicle_valuation';
    case InvestmentPortfolio = 'investment_portfolio';
    case SmsfAdmin = 'smsf_admin';
    case InterestRate = 'interest_rate';
    case Custom = 'custom';
}

enum FeedSourceStatus: string
{
    case Active = 'active';
    case Paused = 'paused';
    case Error = 'error';
    case Disconnected = 'disconnected';
    case Warning = 'warning';  // synced but stale
}

enum FeedItemStatus: string
{
    case Pending = 'pending';         // ingested, awaiting classification
    case Classified = 'classified';   // rule matched or user classified
    case Transformed = 'transformed'; // JE lines generated, awaiting post
    case Posted = 'posted';           // JE created and posted
    case Skipped = 'skipped';         // user chose to skip
    case Error = 'error';             // processing failed
}

enum FeedRuleMatchType: string
{
    case Exact = 'exact';
    case Contains = 'contains';
    case StartsWith = 'starts_with';
    case Regex = 'regex';
    case GreaterThan = 'greater_than';
    case LessThan = 'less_than';
}
```

### Existing Models (unchanged, referenced via FK)

- `BankAccount` — FeedSource has optional `bank_account_id` FK for bank-type sources
- `BankTransaction` — FeedItem has optional `bank_transaction_id` FK for bank items
- `BankFeedRule` — continues to work for existing banking endpoints; FeedRule is the new generalised version
- `JournalEntry` — FeedItem links to created JE via `journal_entry_id`

### Migration Strategy (No Breaking Changes)

The adapter pattern ensures zero disruption:

1. **New tables** created alongside existing: `feed_sources`, `feed_items`, `feed_rules`
2. **Existing bank tables untouched**: `bank_accounts`, `bank_transactions`, `bank_feed_rules` remain as-is
3. **Bridge FKs**: `FeedSource.bank_account_id` and `FeedItem.bank_transaction_id` link new ↔ old
4. **Existing API endpoints unchanged**: All `/api/v1/bank-*` routes continue to work exactly as before
5. **New pipeline endpoints** added under `/api/v1/feed-*` for the generalised pipeline
6. **Gradual migration**: Bank feed sources are auto-created from existing BankAccounts with active providers. New bank syncs write to both old and new models via the `BasiqFeedAdapter`.

## Core Abstractions

### FeedProvider Interface

```php
interface FeedProviderInterface
{
    /** Provider identifier (e.g., 'basiq', 'redbook', 'asx') */
    public function identifier(): string;

    /** What feed type this provider handles */
    public function feedType(): FeedSourceType;

    /** Provider capabilities (supports_webhook, supports_historical, min_interval) */
    public function capabilities(): FeedProviderCapabilities;

    /** Initiate connection (OAuth, API key, etc.) — returns config to store on FeedSource */
    public function connect(FeedSource $source, array $params): array;

    /** Revoke connection */
    public function disconnect(FeedSource $source): void;

    /** Fetch raw items since last sync */
    public function fetch(FeedSource $source, ?Carbon $since = null): array;

    /** Normalise a single raw item to canonical shape */
    public function normalise(array $rawItem): array;

    /** Verify webhook signature (if supported) */
    public function verifyWebhook(Request $request): bool;

    /** Parse webhook to extract event context */
    public function parseWebhook(Request $request): array;
}
```

### BasiqFeedAdapter

Wraps the existing `BasiqProvider` to implement `FeedProviderInterface`:

```php
class BasiqFeedAdapter implements FeedProviderInterface
{
    public function __construct(
        private BankFeedProviderInterface $basiqProvider,
    ) {}

    public function identifier(): string { return 'basiq'; }
    public function feedType(): FeedSourceType { return FeedSourceType::BankTransaction; }

    public function fetch(FeedSource $source, ?Carbon $since = null): array
    {
        // Delegate to existing BasiqProvider via the BankAccount link
        $bankAccount = $source->bankAccount;
        return $this->basiqProvider->fetchTransactions($bankAccount, $since);
    }

    public function normalise(array $rawItem): array
    {
        // Already normalised by BasiqProvider.fetchTransactions()
        return [
            'external_id' => $rawItem['external_id'],
            'date' => $rawItem['transaction_date'],
            'description' => $rawItem['description'],
            'amount' => $rawItem['amount'],
            'direction' => $rawItem['direction'],
            'reference' => $rawItem['reference'] ?? null,
            'merchant_name' => $rawItem['merchant_name'] ?? null,
            'category_code' => $rawItem['category_code'] ?? null,
        ];
    }
    // ... connect/disconnect delegate to existing provider
}
```

### FeedProcessor (Orchestrator Action)

```php
class ProcessFeedItem
{
    use AsAction;

    public function handle(FeedItem $item): ProcessResult
    {
        // 1. Classify — find matching rule or suggest
        $classification = ClassifyFeedItem::run($item);

        if (!$classification->matched) {
            // Leave as pending for manual classification
            return ProcessResult::needsReview($classification->suggestions);
        }

        // 2. Transform — map to JE lines
        $lines = TransformFeedItem::run($item, $classification);

        // 3. Generate JE (if auto-post enabled, or create as draft)
        $journalEntry = GenerateFeedJournalEntry::run($item, $lines, $classification);

        // 4. Update item status
        $item->update([
            'status' => FeedItemStatus::Posted,
            'journal_entry_id' => $journalEntry->id,
            'classification' => $classification->toArray(),
            'processed_at' => now(),
        ]);

        return ProcessResult::posted($journalEntry);
    }
}
```

## API Contracts

### Feed Sources

```
GET    /api/v1/feed-sources                      — list sources for workspace
POST   /api/v1/feed-sources                      — create new source
GET    /api/v1/feed-sources/{uuid}               — source detail + sync history
PATCH  /api/v1/feed-sources/{uuid}               — update config
DELETE /api/v1/feed-sources/{uuid}               — disconnect and remove
POST   /api/v1/feed-sources/{uuid}/sync          — manual sync trigger
POST   /api/v1/feed-sources/{uuid}/pause         — pause syncing
POST   /api/v1/feed-sources/{uuid}/resume        — resume syncing
GET    /api/v1/feed-sources/{uuid}/health        — health metrics (last sync, errors, pending)
GET    /api/v1/feed-sources/counts               — counts by status (for StatusTabs)
```

### Feed Items

```
GET    /api/v1/feed-items                        — paginated items (cursor-based for infinite scroll)
GET    /api/v1/feed-items/{uuid}                 — item detail with raw + normalised payload
POST   /api/v1/feed-items/{uuid}/classify        — manual classification
POST   /api/v1/feed-items/{uuid}/skip            — skip item
POST   /api/v1/feed-items/{uuid}/retry           — retry failed item
POST   /api/v1/feed-items/bulk-classify          — bulk classification
POST   /api/v1/feed-items/bulk-skip              — bulk skip
GET    /api/v1/feed-items/counts                 — counts by status
```

### Feed Rules

```
GET    /api/v1/feed-rules                        — list rules (filterable by feed_type)
POST   /api/v1/feed-rules                        — create rule
PATCH  /api/v1/feed-rules/{id}                   — update rule
DELETE /api/v1/feed-rules/{id}                   — delete rule
POST   /api/v1/feed-rules/reorder               — reorder priorities
POST   /api/v1/feed-rules/test                  — test rule against recent items
PATCH  /api/v1/feed-rules/{id}/toggle            — activate/deactivate
```

## Implementation Phases

### Phase 1: Core Models & Abstractions (Sprint 1)

**Goal**: Database foundation + provider interface + enums. No behaviour yet.

| Task | Files | Notes |
|------|-------|-------|
| Create FeedSourceType, FeedSourceStatus, FeedItemStatus, FeedRuleMatchType enums | `app/Enums/Feed/` | PHP 8.4 enums with labels |
| Create feed_sources migration | `database/migrations/` | See data model above |
| Create feed_items migration | `database/migrations/` | Composite unique on (feed_source_id, external_id) |
| Create feed_rules migration | `database/migrations/` | Generalised version of bank_feed_rules |
| Create FeedSource model | `app/Models/Tenant/FeedSource.php` | Relationships, scopes, casts |
| Create FeedItem model | `app/Models/Tenant/FeedItem.php` | Relationships, scopes, casts |
| Create FeedRule model | `app/Models/Tenant/FeedRule.php` | matches() method generalised from BankFeedRule |
| Create FeedProviderInterface | `app/Contracts/FeedProviderInterface.php` | Universal provider contract |
| Create FeedProviderCapabilities DTO | `app/Data/Feed/FeedProviderCapabilities.php` | Spatie Data class |
| Create BasiqFeedAdapter | `app/Services/FeedProviders/BasiqFeedAdapter.php` | Wraps existing BasiqProvider |
| Register provider in AppServiceProvider | `app/Providers/AppServiceProvider.php` | IoC binding for feed providers |
| Feature tests: model CRUD + relationships | `tests/Feature/Api/FeedSourceTest.php` | Tenant isolation, enum casting |

**Exit Criteria**: All new models exist with migrations, BasiqFeedAdapter compiles, existing banking tests still pass.

### Phase 2: Pipeline Processing & Scheduler (Sprint 2)

**Goal**: The processing engine — classify, transform, generate JE. Scheduler for automated syncs.

| Task | Files | Notes |
|------|-------|-------|
| Create SyncFeedSource action | `app/Actions/Feed/SyncFeedSource.php` | Calls provider.fetch(), creates FeedItems idempotently |
| Create ClassifyFeedItem action | `app/Actions/Feed/ClassifyFeedItem.php` | Runs FeedRules in priority order, returns classification |
| Create TransformFeedItem action | `app/Actions/Feed/TransformFeedItem.php` | Maps classification → JE line data |
| Create GenerateFeedJournalEntry action | `app/Actions/Feed/GenerateFeedJournalEntry.php` | Uses existing CreateJournalEntry + SubmitJournalEntry |
| Create ProcessFeedItem action | `app/Actions/Feed/ProcessFeedItem.php` | Orchestrator: classify → transform → generate |
| Create ProcessFeedBatch action | `app/Actions/Feed/ProcessFeedBatch.php` | Processes all pending items for a source |
| Create SyncFeedSourceJob | `app/Jobs/SyncFeedSourceJob.php` | Queue job wrapping SyncFeedSource, 3 retries |
| Create ProcessFeedItemJob | `app/Jobs/ProcessFeedItemJob.php` | Queue job for individual item processing |
| Create feed:sync Artisan command | `app/Console/Commands/SyncDueFeeds.php` | Runs every minute, dispatches SyncFeedSourceJob for due sources |
| Schedule command in console.php | `routes/console.php` | `->everyMinute()` |
| Create FeedItemProcessed event | `app/Events/Feed/FeedItemProcessed.php` | Domain event for provenance tracking |
| Feature tests: full pipeline flow | `tests/Feature/Feed/FeedPipelineTest.php` | Ingest → classify → transform → JE created |
| Feature tests: retry + error handling | `tests/Feature/Feed/FeedRetryTest.php` | Failed items retry, max retries → error status |

**Exit Criteria**: A bank transaction can flow from Basiq through the new pipeline and create a JE. Existing banking endpoints still work unchanged.

### Phase 3: API Endpoints & Controllers (Sprint 3)

**Goal**: REST API for feed sources, items, and rules. Backend complete.

| Task | Files | Notes |
|------|-------|-------|
| Create FeedSourceController | `app/Http/Controllers/Api/FeedSourceController.php` | CRUD + sync + pause/resume + health |
| Create FeedItemController | `app/Http/Controllers/Api/FeedItemController.php` | List (cursor-based) + classify + skip + retry + bulk |
| Create FeedRuleController | `app/Http/Controllers/Api/FeedRuleController.php` | CRUD + reorder + test + toggle |
| Create Form Requests (6-8 files) | `app/Http/Requests/Feed/` | Validation + authorization via policies |
| Create FeedSourcePolicy | `app/Policies/FeedSourcePolicy.php` | Permission-based, workspace-scoped |
| Create FeedItemPolicy | `app/Policies/FeedItemPolicy.php` | Permission-based |
| Create FeedRulePolicy | `app/Policies/FeedRulePolicy.php` | Permission-based |
| Create API Resources | `app/Http/Resources/Feed/` | FeedSourceResource, FeedItemResource, FeedRuleResource |
| Register routes | `routes/api.php` | Workspace-scoped middleware group |
| Create webhook handler for feed sources | `app/Http/Controllers/Api/FeedWebhookController.php` | Generic webhook receiver, delegates to provider |
| Feature tests: all endpoints | `tests/Feature/Api/FeedSourceApiTest.php` etc. | Auth, validation, tenant isolation |

**Exit Criteria**: All API endpoints functional with tests. Authorization enforced via policies.

### Phase 4: Frontend — Entity Feed View (Sprint 4)

**Goal**: Feed UI on the entity dashboard — infinite scroll, filtering, inline actions.

| Task | Files | Notes |
|------|-------|-------|
| Create feed types | `frontend/src/types/feed.ts` | FeedSource, FeedItem, FeedRule types matching API resources |
| Create useFeedSources hook | `frontend/src/hooks/useFeedSources.ts` | TanStack Query for feed sources |
| Create useFeedItems hook | `frontend/src/hooks/useFeedItems.ts` | useInfiniteQuery for cursor-based infinite scroll |
| Create FeedSourceCard component | `frontend/src/components/feed/` | Source status, sync button, health indicators |
| Create FeedItemRow component | `frontend/src/components/feed/` | Item display with status badge, amount, source icon |
| Create FeedItemList component | `frontend/src/components/feed/` | Infinite scroll with TanStack Virtual |
| Create ClassifyModal component | `frontend/src/components/feed/` | Manual classification with rule suggestion |
| Create Feed page (entity dashboard tab) | `frontend/src/app/(dashboard)/feed/` | StatusTabs + FeedItemList |
| Create Feed Settings page | `frontend/src/app/(dashboard)/settings/feeds/` | Source management, health dashboard |
| Add feed nav item to sidebar | `frontend/src/components/layout/` | With keyboard shortcut (G then F) |
| Browser tests | `tests/Browser/FeedTest.php` | Feed page loads, sources display, items scroll |

**Exit Criteria**: Users can view feed items, manage sources, classify items. Infinite scroll works.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration breaks existing bank feed tests | Low | High | Adapter pattern — zero changes to existing models/endpoints. Run full banking test suite at each phase. |
| Queue processing bottleneck at scale | Medium | Medium | Individual item jobs, not batch. Debounced downstream triggers. Backpressure on unprocessed count. |
| FeedRule generalisation loses bank-specific matching quality | Low | Medium | BankFeedRule continues to work for existing endpoints. FeedRule.matches() uses same matching logic. |
| Provider isolation failure (one provider crashes others) | Low | High | Each provider is a separate class. SyncFeedSourceJob catches all exceptions. Error count per source with auto-pause at threshold. |

## Testing Strategy

### By Phase

- **Phase 1**: Model CRUD, relationship tests, enum tests, migration tests
- **Phase 2**: Full pipeline flow (ingest → classify → transform → JE), retry logic, error handling, idempotency
- **Phase 3**: API endpoint tests (auth, validation, responses), policy tests (role-based access)
- **Phase 4**: Browser tests (feed page loads, scroll, classify modal)

### Key Test Scenarios

1. **Idempotent ingestion**: Re-syncing the same items doesn't create duplicates (assert FeedItem count unchanged)
2. **Tenant isolation**: Feed items from workspace A never visible to workspace B
3. **Pipeline end-to-end**: Raw bank transaction → FeedItem → classification → JE with correct amounts/accounts
4. **Error recovery**: Failed item → retry → success on second attempt
5. **Existing banking unbroken**: Full existing bank feed test suite passes without modification

## Next Steps

1. `/speckit-tasks` — Generate implementation task list from this plan
2. Begin Phase 1: Core models & abstractions
