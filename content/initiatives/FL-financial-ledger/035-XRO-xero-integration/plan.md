---
title: "Implementation Plan: Xero Migration — One-Click Import"
---

# Implementation Plan: Xero Migration — One-Click Import

**Branch**: `035-XRO-xero-integration` | **Date**: 2026-03-19 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/035-XRO-xero-integration/spec)

## Summary

Build a Linear-style one-click Xero migration tool: OAuth connect → one-screen account mapping with completion bar → progress ticker → done. Imports chart of accounts, contacts, invoices/bills, journal entries, and bank transactions. Generates an opening balance JE from Xero trial balance. AI suggests account mappings for ambiguous items.

**Key architectural decision**: Imported invoices/contacts write **directly to the database**, bypassing InvoiceAggregate and event sourcing. This avoids 500+ fake notifications and state machine conflicts. The event-sourced system handles going-forward transactions after migration.

## Technical Context

**Language/Version**: PHP 8.4, Laravel 12, Next.js 16 (TypeScript)
**External API**: Xero REST API v2.0, OAuth 2.0 Authorization Code flow
**HTTP Client**: Laravel's `Http` facade (no `xero-php` package)
**Storage**: SQLite (local), MySQL (production)
**Testing**: Pest v4
**Performance Goals**: Full import (45 accounts + 128 contacts + 500 invoices + 200 JEs) in < 15 minutes
**Rate Limits**: Xero allows 60 calls/minute. Typical import needs ~15-20 calls. No aggressive throttling needed.

## Gate 3: Architecture Pre-Check

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | OAuth → mapping screen → queued import pipeline |
| Existing patterns leveraged | PASS | Follows Action pattern, queue job pattern, XeroClient service |
| No impossible requirements | PASS | All Xero API endpoints well-documented |
| Performance considered | PASS | Stream-process page by page, queue-based import |
| Security considered | PASS | Tokens encrypted at rest, `integration.manage` permission |
| Data model understood | PASS | XeroConnection, ImportJob, ImportRecordMap |
| API contracts clear | PASS | 10 endpoints defined |
| Dependencies identified | PASS | Xero API, existing Invoice/Contact/JE models |
| Use Lorisleiva Actions | PASS | All import logic in Actions |
| Event sourcing bypassed for imports | PASS | Direct DB writes for imported records, event-sourced for opening balance JE only |

## Critical Architecture Decisions

### 1. Bypass Event Sourcing for Imports

Imported invoices, contacts, and JEs write directly to the database via Eloquent models, NOT through aggregates. This prevents:
- 500+ fake notifications firing
- Misleading audit trail ("Invoice created" at import time vs original date)
- State machine conflicts (importing an already-paid invoice through draft→approved→sent→paid)

**Exception**: The opening balance JE uses `JournalEntryAggregate` because it's a single entry where side effects are appropriate.

### 2. Add `import_source` + `external_id` to Core Models

Add nullable columns to `contacts`, `invoices`, `chart_accounts`, `journal_entries`:
- `import_source`: enum (xero, csv, null for manual)
- `external_id`: string (Xero entity ID for direct lookups)

This enables idempotent re-imports without needing `ImportRecordMap` joins.

### 3. Simple Account Mapping Suggestions

NOT the full AI chatbot pipeline. Use:
1. Xero type → MoneyQuest type auto-mapping (14+ types, 95% coverage)
2. Keyword matching on account name ("suspense" → equity, "loan" → liability)
3. Single AI API call only for genuinely ambiguous accounts (no streaming, no tools)

### 4. New Permission: `integration.manage`

Owner + Accountant roles only. Bookkeeper/Approver/Auditor/Client cannot initiate imports.

## Data Model

### New Models

```
XeroConnection (tenant-scoped)
├── id: bigint PK
├── workspace_id: FK → workspaces (unique per xero_tenant_id)
├── xero_tenant_id: string (Xero org ID)
├── xero_org_name: string
├── access_token: text (encrypted)
├── refresh_token: text (encrypted)
├── token_expires_at: datetime
├── status: XeroConnectionStatus enum (connected, disconnected, expired)
├── last_imported_at: datetime (nullable)
├── timestamps

ImportJob (tenant-scoped)
├── id: bigint PK
├── workspace_id: FK → workspaces
├── xero_connection_id: FK (nullable — null for CSV imports)
├── source: ImportSource enum (xero_api, csv)
├── status: ImportJobStatus enum (pending, mapping, importing, completed, completed_with_errors, failed, cancelled)
├── data_types: json (which types to import)
├── progress: json (per-type: {total, imported, skipped, errors})
├── account_mappings: json (xero_account_code → moneyquest_chart_account_id)
├── error_log: json (array of {record_type, xero_id, xero_reference, error_message})
├── settings: json (date_range, options)
├── started_at: datetime (nullable)
├── completed_at: datetime (nullable)
├── timestamps

ImportRecordMap (tenant-scoped — dedup registry)
├── id: bigint PK
├── workspace_id: FK
├── import_job_id: FK
├── xero_id: string (Xero entity ID)
├── record_type: string (account, contact, invoice, journal_entry, bank_transaction)
├── local_model_type: string (polymorphic)
├── local_model_id: int
├── timestamps
├── unique: (workspace_id, xero_id, record_type)
```

### Enums

```php
enum XeroConnectionStatus: string { case Connected = 'connected'; case Disconnected = 'disconnected'; case Expired = 'expired'; }
enum ImportSource: string { case XeroApi = 'xero_api'; case Csv = 'csv'; }
enum ImportJobStatus: string { case Pending = 'pending'; case Mapping = 'mapping'; case Importing = 'importing'; case Completed = 'completed'; case CompletedWithErrors = 'completed_with_errors'; case Failed = 'failed'; case Cancelled = 'cancelled'; }
```

### Migrations on Existing Tables

```
ALTER contacts ADD import_source varchar nullable, ADD external_id varchar nullable;
ALTER invoices ADD import_source varchar nullable, ADD external_id varchar nullable;
ALTER chart_accounts ADD import_source varchar nullable, ADD external_id varchar nullable;
ALTER journal_entries ADD import_source varchar nullable, ADD external_id varchar nullable;
```

## Core Services

### XeroClient

```php
class XeroClient
{
    public function __construct(private XeroConnection $connection) {}

    public function get(string $endpoint, array $params = []): array
    {
        $this->refreshIfExpired();
        return Http::withToken($this->connection->access_token)
            ->get("https://api.xro/2.0/{$endpoint}", $params)
            ->throw()
            ->json();
    }

    private function refreshIfExpired(): void { /* refresh_token logic */ }
}
```

### AccountMappingSuggester

```php
class AccountMappingSuggester
{
    // Level 1: Xero type → MQ type (95% coverage)
    private const TYPE_MAP = [
        'BANK' => 'bank', 'CURRENT' => 'current_asset', 'FIXED' => 'fixed_asset',
        'CURRLIAB' => 'current_liability', /* ... 20+ types ... */
    ];

    // Level 2: Keyword matching (4% coverage)
    private const KEYWORD_MAP = [
        'suspense' => 'equity', 'clearing' => 'current_asset',
        'drawings' => 'equity', 'loan' => 'current_liability',
    ];

    // Level 3: Single AI API call for genuinely ambiguous (1%)
    public function suggestWithAi(string $name, string $description): string { /* ... */ }
}
```

## API Contracts

```
POST   /api/v1/xero/connect                    — initiate OAuth, return redirect URL
GET    /api/v1/xero/callback                    — handle OAuth callback, store tokens
GET    /api/v1/xero/connection                  — current connection status + org name
DELETE /api/v1/xero/connection                  — disconnect (revoke tokens)
POST   /api/v1/xero/import/start               — fetch Xero accounts, return mapping preview data
PATCH  /api/v1/xero/import/{id}/mappings        — save confirmed account mappings
POST   /api/v1/xero/import/{id}/confirm         — confirm mappings, begin queued import
GET    /api/v1/xero/import/{id}/progress        — poll import progress (per-type counts)
GET    /api/v1/xero/import/{id}/report          — final import report with errors
GET    /api/v1/xero/import/history              — past imports list
POST   /api/v1/xero/import/csv                  — upload CSV files for fallback import
GET    /api/v1/xero/import/{id}/suggest-mappings — AI suggestions for unmapped accounts
```

## Implementation Phases

### Phase 1: Foundation — Models, OAuth, XeroClient (Sprint 1)

| Task | Files | Notes |
|------|-------|-------|
| Create 3 enums | `app/Enums/Xero/` | XeroConnectionStatus, ImportSource, ImportJobStatus |
| Create 3 migrations (new tables) | `database/migrations/` | xero_connections, import_jobs, import_record_maps |
| Create 1 migration (alter existing) | `database/migrations/` | Add import_source + external_id to contacts, invoices, chart_accounts, journal_entries |
| Create 3 models | `app/Models/Tenant/` | XeroConnection, ImportJob, ImportRecordMap |
| Create XeroClient service | `app/Services/Xero/XeroClient.php` | HTTP wrapper with token refresh |
| Create config/xero.php | `config/xero.php` | client_id, client_secret, redirect_uri from .env |
| Create XeroOAuthController | `app/Http/Controllers/Api/` | connect, callback, connection, disconnect |
| Add `integration.manage` permission | `database/seeders/RolesAndPermissionsSeeder.php` | Owner + Accountant only |
| Register routes | `routes/api.php` | OAuth routes (connect, callback, connection, disconnect) |
| Feature tests: OAuth flow | `tests/Feature/Xero/` | Connect, callback, token storage, disconnect |

### Phase 2: Account Mapping — Fetch, Suggest, Map (Sprint 1-2)

| Task | Files | Notes |
|------|-------|-------|
| Create AccountMappingSuggester | `app/Services/Xero/AccountMappingSuggester.php` | 3-tier: type map → keyword → AI fallback |
| Create FetchXeroAccountsForMapping action | `app/Actions/Xero/FetchXeroAccountsForMapping.php` | Calls Xero API, runs suggester, returns mapping preview |
| Create SaveAccountMappings action | `app/Actions/Xero/SaveAccountMappings.php` | Saves confirmed mappings to ImportJob |
| Create ImportController (start, mappings, confirm) | `app/Http/Controllers/Api/XeroImportController.php` | Start import wizard, save mappings, trigger import |
| Register import routes | `routes/api.php` | Import wizard routes |
| Feature tests: mapping flow | `tests/Feature/Xero/` | Fetch accounts, suggest mappings, confirm |

### Phase 3: Import Pipeline — The Engine (Sprint 2-3)

| Task | Files | Notes |
|------|-------|-------|
| Create ImportXeroAccounts action | `app/Actions/Xero/ImportXeroAccounts.php` | Fetch paginated, create ChartAccount directly, record in ImportRecordMap |
| Create ImportXeroContacts action | `app/Actions/Xero/ImportXeroContacts.php` | Same pattern. Map customer/supplier type. |
| Create ImportXeroInvoices action | `app/Actions/Xero/ImportXeroInvoices.php` | Direct DB write (bypass aggregate). Include lines, payments, status. Resolve accounts via ImportRecordMap. |
| Create ImportXeroJournalEntries action | `app/Actions/Xero/ImportXeroJournalEntries.php` | Direct DB write for historical JEs. |
| Create ImportXeroBankTransactions action | `app/Actions/Xero/ImportXeroBankTransactions.php` | Optional P3. Import coded bank transactions. |
| Create ImportXeroTrackingCategories action | `app/Actions/Xero/ImportXeroTrackingCategories.php` | Create TrackingCategory + TrackingOption records. Map to jobs. |
| Create GenerateOpeningBalance action | `app/Actions/Xero/GenerateOpeningBalance.php` | Fetch trial balance at fiscal year start. Create single opening balance JE via JournalEntryAggregate. |
| Create RunXeroImportJob (queue job) | `app/Jobs/RunXeroImportJob.php` | Orchestrates all import actions in order. Updates ImportJob progress. |
| Create progress polling endpoint | `app/Http/Controllers/Api/XeroImportController.php` | GET /progress returns per-type counts |
| Feature tests: full import pipeline | `tests/Feature/Xero/` | End-to-end with mock XeroClient |

### Phase 4: Frontend — Import Wizard UI (Sprint 3-4)

| Task | Files | Notes |
|------|-------|-------|
| TypeScript types | `frontend/src/types/xero.ts` | XeroConnection, ImportJob, ImportProgress, MappingPreview |
| Hooks | `frontend/src/hooks/use-xero.ts` | useXeroConnection, useXeroImport, useImportProgress (polling) |
| XeroConnectButton component | `frontend/src/components/xero/` | OAuth initiate + status display |
| AccountMappingScreen component | `frontend/src/components/xero/` | Completion bar, auto/manual mapping, AI suggestions |
| ImportProgressTicker component | `frontend/src/components/xero/` | Per-type progress with ✅ ⏳ ⬚ indicators |
| ImportSummaryCard component | `frontend/src/components/xero/` | Final counts + error summary + "Go to Dashboard" |
| Settings > Integrations page | `frontend/src/app/(dashboard)/settings/integrations/` | Xero connection management |
| Import wizard page | `frontend/src/app/(dashboard)/settings/integrations/xero-import/` | Full import flow |

### Phase 5: CSV Fallback + Polish (Sprint 4)

| Task | Files | Notes |
|------|-------|-------|
| Create XeroCsvParser service | `app/Services/Xero/XeroCsvParser.php` | Parse Xero CSV exports (accounts, contacts, invoices) |
| CSV upload endpoint | Controller | Accept file uploads, parse, return mapping preview |
| Wire CSV to same mapping screen | Frontend | Reuse AccountMappingScreen with CSV data source |
| Import report page | Frontend | View past imports, error details |
| Browser tests | `tests/Browser/` | Connect flow, mapping, progress, completion |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Xero API changes break import | Low | High | Pin to API v2.0, wrap all calls in XeroClient. Integration tests with recorded responses. |
| Large imports timeout (5000+ invoices) | Medium | Medium | Queue-based, page-by-page processing. No memory buildup. Timeout at job level, not request level. |
| Account mapping accuracy < 95% | Low | Medium | 20+ type mappings + keyword fallback + AI. Test against real Xero export samples. |
| Direct DB writes bypass business rules | Medium | Medium | Only for imports — going-forward data uses normal aggregates. Add import_source tag for traceability. |
| Xero rate limit hit during large import | Low | Low | Only ~15-20 calls needed. 1-second delay between pages as safety. Auto-backoff on 429. |

## Testing Strategy

### Key Test Scenarios

1. **OAuth flow**: Connect → callback → token stored → status shows connected
2. **Account mapping**: Fetch Xero accounts → 95% auto-mapped → completion bar at 95%
3. **Full import pipeline**: Mock XeroClient with realistic data → all record types imported → correct counts → no duplicates on re-run
4. **Opening balance**: Trial balance fetched → single JE created → balance sheet balances
5. **Error handling**: Import with one bad invoice → skip and continue → error in report
6. **Idempotency**: Run import twice → second run skips all (matched by xero_id)
7. **Permission**: Bookkeeper attempts import → 403
8. **CSV fallback**: Upload Xero CSV → same mapping screen → same import pipeline

## Next Steps

1. `/speckit-tasks` — Generate implementation task list
2. Begin Phase 1: OAuth + foundation models
