---
title: "Implementation Tasks: Xero Migration — One-Click Import"
---

# Implementation Tasks: Xero Migration

**Mode**: AI Agent
**Plan**: [plan.md](/initiatives/FL-financial-ledger/035-XRO-xero-integration/plan)
**Spec**: [spec.md](/initiatives/FL-financial-ledger/035-XRO-xero-integration/spec)

---

## Phase 1: Foundation — Enums, Migrations, Models, Config, XeroClient

- [ ] T001 [P] Enum: `XeroConnectionStatus` — cases: Connected, Disconnected, Expired. Each with `label(): string`. File: `app/Enums/Xero/XeroConnectionStatus.php`
- [ ] T002 [P] Enum: `ImportSource` — cases: XeroApi, Csv. File: `app/Enums/Xero/ImportSource.php`
- [ ] T003 [P] Enum: `ImportJobStatus` — cases: Pending, Mapping, Importing, Completed, CompletedWithErrors, Failed, Cancelled. Each with `label(): string`. File: `app/Enums/Xero/ImportJobStatus.php`
- [ ] T004 Migration: `create_xero_connections_table` — columns: id, workspace_id (FK unique), xero_tenant_id (string), xero_org_name (string), access_token (text), refresh_token (text), token_expires_at (datetime), status (string default 'connected'), last_imported_at (datetime nullable), timestamps. Index on workspace_id. File: `database/migrations/2026_03_19_300001_create_xero_connections_table.php`
- [ ] T005 Migration: `create_import_jobs_table` — columns: id, workspace_id (FK), xero_connection_id (nullable FK xero_connections), source (string), status (string default 'pending'), data_types (json), progress (json nullable), account_mappings (json nullable), error_log (json nullable), settings (json nullable), started_at (datetime nullable), completed_at (datetime nullable), timestamps. Index on (workspace_id, status). File: `database/migrations/2026_03_19_300002_create_import_jobs_table.php`
- [ ] T006 Migration: `create_import_record_maps_table` — columns: id, workspace_id (FK), import_job_id (FK), xero_id (string), record_type (string), local_model_type (string), local_model_id (bigint unsigned), timestamps. Unique on (workspace_id, xero_id, record_type). File: `database/migrations/2026_03_19_300003_create_import_record_maps_table.php`
- [ ] T007 Migration: `add_import_fields_to_core_tables` — add `import_source` (string nullable) and `external_id` (string nullable) to: contacts, invoices, chart_accounts, journal_entries. Index on (workspace_id, external_id) for each table. File: `database/migrations/2026_03_19_300004_add_import_fields_to_core_tables.php`
- [ ] T008 Model: `XeroConnection` — $fillable: all except id/timestamps. Casts: access_token → 'encrypted', refresh_token → 'encrypted', token_expires_at → 'datetime', status → XeroConnectionStatus, last_imported_at → 'datetime'. Relationships: workspace() BelongsTo Workspace, importJobs() HasMany ImportJob. Method: `isTokenExpired(): bool`. File: `app/Models/Tenant/XeroConnection.php`
- [ ] T009 Model: `ImportJob` — $fillable: all except id/timestamps. Casts: source → ImportSource, status → ImportJobStatus, data_types → 'array', progress → 'array', account_mappings → 'array', error_log → 'array', settings → 'array', started_at → 'datetime', completed_at → 'datetime'. Relationships: workspace() BelongsTo Workspace, xeroConnection() BelongsTo XeroConnection, recordMaps() HasMany ImportRecordMap. Methods: `addError(string $type, string $xeroId, string $ref, string $msg): void` (appends to error_log), `incrementProgress(string $type, string $field): void` (increments progress.{type}.{field}). File: `app/Models/Tenant/ImportJob.php`
- [ ] T010 Model: `ImportRecordMap` — $fillable: all except id/timestamps. Relationships: workspace() BelongsTo Workspace, importJob() BelongsTo ImportJob. Scope: `scopeForType(q, string $type)`. File: `app/Models/Tenant/ImportRecordMap.php`
- [ ] T011 Config: `config/xero.php` — return array with client_id (env XERO_CLIENT_ID), client_secret (env XERO_CLIENT_SECRET), redirect_uri (env XERO_REDIRECT_URI). Add keys to `.env.example`. File: `config/xero.php`
- [ ] T012 Service: `XeroClient` — constructor takes XeroConnection. Methods: `get(string $endpoint, array $params = []): array` (calls Xero API with bearer token, throws on error), `post(string $endpoint, array $data): array`, `refreshIfExpired(): void` (check token_expires_at, use refresh_token to get new access_token, update XeroConnection), `paginate(string $endpoint, array $params = [], int $perPage = 100): Generator` (yields pages, handles Xero pagination). Base URL: `https://api.xro/2.0/`. All requests include `xero-tenant-id` header from connection. File: `app/Services/Xero/XeroClient.php`
- [ ] T013 Add `integration.manage` permission — add to permissions array in RolesAndPermissionsSeeder. Assign to: owner (all), accountant (yes). NOT assigned to: bookkeeper, approver, auditor, client. File: `database/seeders/RolesAndPermissionsSeeder.php`
- [ ] T014 Add `import_source` and `external_id` to $fillable on Contact, Invoice, ChartAccount, JournalEntry models. No cast needed (plain strings). File: `app/Models/Tenant/Contact.php`, `app/Models/Tenant/Invoice.php`, `app/Models/Tenant/ChartAccount.php`, `app/Models/Tenant/JournalEntry.php`
- [ ] T015 Run migrations — `php artisan migrate`. Verify all new tables + altered columns. File: (verification only)

---

## Phase 2: OAuth Flow — Connect, Callback, Disconnect

- [ ] T016 Action: `InitiateXeroOAuth` — AsAction. `handle(int $workspaceId): string`. Builds OAuth authorization URL with client_id, redirect_uri, scope ('openid profile email accounting.transactions accounting.contacts accounting.settings accounting.reports.read'), state (encrypted workspace_id). Returns redirect URL. File: `app/Actions/Xero/InitiateXeroOAuth.php`
- [ ] T017 Action: `CompleteXeroOAuth` — AsAction. `handle(string $code, string $state): XeroConnection`. Decrypt state to get workspace_id. Exchange code for access_token + refresh_token via POST to `https://identity.xero.com/connect/token`. Fetch org details via GET /Organisation. Create/update XeroConnection with tokens + org metadata. Return connection. File: `app/Actions/Xero/CompleteXeroOAuth.php`
- [ ] T018 Action: `DisconnectXero` — AsAction. `handle(XeroConnection $connection): void`. Revoke token at Xero. Update status to Disconnected. File: `app/Actions/Xero/DisconnectXero.php`
- [ ] T019 Controller: `XeroOAuthController` — methods: connect (initiate OAuth, return redirect URL), callback (handle redirect, exchange code), connection (GET current connection status), disconnect (DELETE connection). All gated by `integration.manage` permission. File: `app/Http/Controllers/Api/XeroOAuthController.php`
- [ ] T020 Routes: Register OAuth routes in `routes/api.php` under workspace middleware: POST /xero/connect, GET /xero/callback, GET /xero/connection, DELETE /xero/connection. File: `routes/api.php`
- [ ] T021 Test: `XeroOAuthTest` — mock HTTP responses for token exchange and org fetch. Assert: connection created, tokens encrypted, org name stored, disconnect clears connection. File: `tests/Feature/Xero/XeroOAuthTest.php`

---

## Phase 3: Account Mapping — Fetch, Suggest, Confirm

- [ ] T022 Service: `AccountMappingSuggester` — 3-tier suggestion engine. (1) `mapByType(string $xeroType): ?string` — hardcoded map of 20+ Xero types to MoneyQuest AccountSubType values (BANK→bank, CURRENT→current_asset, FIXED→fixed_asset, CURRLIAB→current_liability, TERMLIAB→non_current_liability, EQUITY→equity, REVENUE→revenue, DIRECTCOSTS→cost_of_sales, EXPENSE→expense, OVERHEADS→overhead, OTHERINCOME→other_income, OTHEREXPENSE→other_expense, DEPRECIATN→depreciation, INVENTORY→inventory, NONCURRENT→non_current_asset, PREPAYMENT→prepayment, LIABILITY→current_liability, PAYGLIABILITY→payg_liability, SUPERANNUATIONEXPENSE→superannuation, SUPERANNUATIONLIABILITY→super_payable, WAGESEXPENSE→wages). (2) `mapByKeyword(string $name): ?string` — keyword matching (suspense→equity, clearing→current_asset, drawings→equity, loan→current_liability, retained→equity). (3) `suggestWithAi(string $name, ?string $description): ?string` — single AI API call for ambiguous names. Method: `suggest(string $xeroType, string $name, ?string $description): SuggestionResult` returning {suggested_type, confidence, source: 'type_map'|'keyword'|'ai'}. File: `app/Services/Xero/AccountMappingSuggester.php`
- [ ] T023 Action: `FetchXeroAccountsForMapping` — AsAction. `handle(XeroConnection $connection, int $workspaceId): array`. Creates ImportJob (status=mapping). Fetches GET /Accounts from Xero. For each account: run AccountMappingSuggester. Separate into: system_accounts (auto-locked: AR, AP, GST, Retained Earnings, Bank) and user_accounts (need mapping). Return {import_job_id, system_accounts: [...], user_accounts: [{xero_code, xero_name, xero_type, suggested_mq_type, confidence, is_mapped}], total, mapped_count, unmapped_count}. File: `app/Actions/Xero/FetchXeroAccountsForMapping.php`
- [ ] T024 Action: `SaveAccountMappings` — AsAction. `handle(ImportJob $job, array $mappings): ImportJob`. Saves user-confirmed mappings (xero_account_code → moneyquest_account_sub_type) to ImportJob.account_mappings. Validates all accounts are mapped (completion bar at 100%). File: `app/Actions/Xero/SaveAccountMappings.php`
- [ ] T025 Controller: `XeroImportController` — methods: start (FetchXeroAccountsForMapping, return mapping preview), saveMappings (PATCH mappings), suggestMappings (GET AI suggestions for unmapped accounts). File: `app/Http/Controllers/Api/XeroImportController.php`
- [ ] T026 Routes: POST /xero/import/start, PATCH /xero/import/{id}/mappings, GET /xero/import/{id}/suggest-mappings. File: `routes/api.php`
- [ ] T027 Test: `XeroMappingTest` — mock Xero accounts response with 45 accounts (mix of types). Assert: 42 auto-mapped (system + type_map), 3 unmapped. Assert mappings save correctly. File: `tests/Feature/Xero/XeroMappingTest.php`

---

## Phase 4: Import Pipeline — The Engine

- [ ] T028 Action: `ImportXeroAccounts` — AsAction. `handle(ImportJob $job, XeroClient $client): int`. Fetch paginated accounts. For each: check ImportRecordMap (skip if exists). Use account_mappings to determine MoneyQuest type. Create ChartAccount directly (not via action — skip CoA seeding logic). Set import_source='xero', external_id=xero_account_id. Create ImportRecordMap entry. Update progress. Skip system accounts (already exist from workspace creation). Return imported count. File: `app/Actions/Xero/ImportXeroAccounts.php`
- [ ] T029 Action: `ImportXeroContacts` — AsAction. `handle(ImportJob $job, XeroClient $client): int`. Paginate GET /Contacts. For each: check ImportRecordMap. Map fields: Name, EmailAddress, FirstName, LastName, Phones, Addresses, IsCustomer, IsSupplier, TaxNumber (ABN). Create Contact directly. Set import_source='xero', external_id=xero_contact_id. Create ImportRecordMap. Update progress. On error: log to error_log, skip, continue. File: `app/Actions/Xero/ImportXeroContacts.php`
- [ ] T030 Action: `ImportXeroInvoices` — AsAction. `handle(ImportJob $job, XeroClient $client): int`. Paginate GET /Invoices?where=Date>=FiscalYearStart. For each: check ImportRecordMap. Resolve contact via ImportRecordMap (xero ContactID → local contact_id). Resolve line item accounts via account_mappings + ImportRecordMap. Create Invoice directly (bypass InvoiceAggregate — no events, no notifications). Create InvoiceLines. Import payments from invoice.Payments array as InvoicePayment records. Set correct status (Draft/Approved/Sent/Paid/Voided). Set import_source='xero', external_id. Handle both ACCREC (sales invoices) and ACCPAY (bills). On error: log, skip, continue. File: `app/Actions/Xero/ImportXeroInvoices.php`
- [ ] T031 Action: `ImportXeroJournalEntries` — AsAction. `handle(ImportJob $job, XeroClient $client): int`. Paginate GET /ManualJournals?where=Date>=FiscalYearStart. For each: check ImportRecordMap. Create JournalEntry + JournalEntryLine records directly (bypass aggregate). Resolve account codes via ImportRecordMap. Set status=posted, import_source='xero', external_id. On error: log, skip. File: `app/Actions/Xero/ImportXeroJournalEntries.php`
- [ ] T032 Action: `ImportXeroTrackingCategories` — AsAction. `handle(ImportJob $job, XeroClient $client): int`. Fetch GET /TrackingCategories. For each category: create TrackingCategory. For each option: create TrackingOption. Also create corresponding Job records with prefix ("Region: NSW", "Dept: Sales") for flat job tagging compatibility. File: `app/Actions/Xero/ImportXeroTrackingCategories.php`
- [ ] T033 Action: `GenerateOpeningBalance` — AsAction. `handle(ImportJob $job, XeroClient $client, int $createdBy): JournalEntry`. Fetch GET /Reports/TrialBalance?date={fiscalYearStart}. For each account with non-zero balance: create a JE line. Create offsetting "Opening Balance Equity" line. Use JournalEntryAggregate (this one entry DOES use event sourcing). Auto-post the entry. Set entry_date to fiscal year start. File: `app/Actions/Xero/GenerateOpeningBalance.php`
- [ ] T034 Action: `ImportXeroBankTransactions` — AsAction. `handle(ImportJob $job, XeroClient $client): int`. P3 — paginate GET /BankTransactions?where=Date>=FiscalYearStart. Create BankTransaction records. Set reconciliation_status=Reconciled (already coded in Xero). File: `app/Actions/Xero/ImportXeroBankTransactions.php`
- [ ] T035 Action: `AutoMapXeroTaxCodes` — AsAction. `handle(ImportJob $job, XeroClient $client): array`. Fetch GET /TaxRates. Build map of Xero tax code → MoneyQuest tax_code string. Standard AU codes auto-map: OUTPUT→GST, INPUT→GST, EXEMPTOUTPUT→BAS Excluded, EXEMPTINPUT→BAS Excluded, GSTONIMPORTS→GST on Imports, BASEXCLUDED→BAS Excluded, NONE→No Tax. Return mapping. File: `app/Actions/Xero/AutoMapXeroTaxCodes.php`
- [ ] T036 Job: `RunXeroImportJob` — Queue job. Constructor takes ImportJob + int $createdBy. `handle()`: set workspace context. Update job status=importing, started_at=now(). Create XeroClient from connection. Run in order: (1) ImportXeroAccounts, (2) ImportXeroContacts, (3) AutoMapXeroTaxCodes, (4) ImportXeroTrackingCategories, (5) ImportXeroInvoices, (6) ImportXeroJournalEntries, (7) GenerateOpeningBalance, (8) optionally ImportXeroBankTransactions. Update job status=completed (or completed_with_errors if error_log non-empty), completed_at=now(). Retries: 0 (no retry — errors are data issues, not transient). File: `app/Jobs/RunXeroImportJob.php`
- [ ] T037 Controller: Add `confirm` method to `XeroImportController` — POST /xero/import/{id}/confirm. Validates all accounts mapped. Dispatches RunXeroImportJob. Returns 202 Accepted. File: `app/Http/Controllers/Api/XeroImportController.php`
- [ ] T038 Controller: Add `progress` method to `XeroImportController` — GET /xero/import/{id}/progress. Returns ImportJob.progress + status. File: `app/Http/Controllers/Api/XeroImportController.php`
- [ ] T039 Controller: Add `report` method — GET /xero/import/{id}/report. Returns full ImportJob with error_log. File: `app/Http/Controllers/Api/XeroImportController.php`
- [ ] T040 Controller: Add `history` method — GET /xero/import/history. Returns past ImportJobs for workspace. File: `app/Http/Controllers/Api/XeroImportController.php`
- [ ] T041 Routes: POST /xero/import/{id}/confirm, GET /xero/import/{id}/progress, GET /xero/import/{id}/report, GET /xero/import/history. File: `routes/api.php`
- [ ] T042 Test: `XeroImportPipelineTest` — create mock XeroClient returning realistic data (10 accounts, 5 contacts, 10 invoices with lines + payments, 3 JEs, 2 tracking categories). Run full pipeline. Assert: all records created, correct counts in progress, no duplicates on re-run, opening balance JE balances, error_log captures failures gracefully. File: `tests/Feature/Xero/XeroImportPipelineTest.php`

---

## Phase 5: Frontend — Import Wizard UI

- [ ] T043 [P] Types: `xero.ts` — XeroConnection (xero_org_name, status, last_imported_at), ImportJob (id, source, status, progress, error_log, account_mappings), MappingPreview (system_accounts, user_accounts, total, mapped_count), AccountMapping (xero_code, xero_name, xero_type, suggested_mq_type, confidence, is_mapped, user_selected_type), ImportProgress (per-type: {total, imported, skipped, errors}). File: `frontend/src/types/xero.ts`
- [ ] T044 [P] Hook: `useXero` — useXeroConnection() fetches GET /xero/connection. useInitiateXeroOAuth() mutation POST /xero/connect. useDisconnectXero() mutation DELETE /xero/connection. useStartImport() mutation POST /xero/import/start. useSaveMappings(jobId) mutation PATCH /xero/import/{id}/mappings. useConfirmImport(jobId) mutation POST /xero/import/{id}/confirm. useImportProgress(jobId) query GET /xero/import/{id}/progress (polls every 2s when status=importing). useImportReport(jobId) query GET /xero/import/{id}/report. useImportHistory() query GET /xero/import/history. File: `frontend/src/hooks/use-xero.ts`
- [ ] T045 Component: `XeroConnectButton` — shows "Connect Xero" or connected status (org name + last imported). Click initiates OAuth. Shows disconnect option. File: `frontend/src/components/xero/xero-connect-button.tsx`
- [ ] T046 Component: `AccountMappingScreen` — completion bar (mapped_count / total). List of user_accounts with: Xero name + code on left, dropdown for MQ type on right. Auto-mapped items show ✅. Unmapped show ⚠️ with AI suggestion tooltip. System accounts section (greyed out, locked). "Confirm & Import Everything" button (enabled when bar=100%). File: `frontend/src/components/xero/account-mapping-screen.tsx`
- [ ] T047 Component: `ImportProgressTicker` — per data type row: icon + name + status indicator (✅ done, ⏳ importing with counter, ⬚ waiting). Overall progress bar. Uses useImportProgress hook with 2s polling. File: `frontend/src/components/xero/import-progress-ticker.tsx`
- [ ] T048 Component: `ImportSummaryCard` — shows total counts per type. Error count with expandable detail. "Go to Dashboard" + "View Full Report" buttons. Celebration animation on success (confetti or checkmark). File: `frontend/src/components/xero/import-summary-card.tsx`
- [ ] T049 Page: Xero Import Wizard — at `/(dashboard)/settings/integrations/xero-import/page.tsx`. Multi-step: Step 1 (connect), Step 2 (select org if multiple), Step 3 (account mapping), Step 4 (progress), Step 5 (summary). State managed by the ImportJob status. File: `frontend/src/app/(dashboard)/settings/integrations/xero-import/page.tsx`
- [ ] T050 Page: Settings > Integrations — at `/(dashboard)/settings/integrations/page.tsx`. Shows XeroConnectButton + import history. Link to Xero Import Wizard. File: `frontend/src/app/(dashboard)/settings/integrations/page.tsx`
- [ ] T051 Add "Integrations" to settings nav — add sub-item to settingsNav in navigation.ts: { title: "Integrations", url: "/settings/integrations" }. File: `frontend/src/lib/navigation.ts`

---

## Phase 6: CSV Fallback

- [ ] T052 Service: `XeroCsvParser` — methods: parseAccounts(UploadedFile): array, parseContacts(UploadedFile): array, parseInvoices(UploadedFile): array. Handles BOM stripping, header detection (with and without * prefix), UTF-8 encoding. Returns normalised arrays matching the same shape as XeroClient responses. File: `app/Services/Xero/XeroCsvParser.php`
- [ ] T053 Controller: Add `csvUpload` method to XeroImportController — POST /xero/import/csv. Accepts file uploads (accounts.csv, contacts.csv, invoices.csv). Parses via XeroCsvParser. Creates ImportJob (source=csv). Returns same mapping preview as OAuth flow. File: `app/Http/Controllers/Api/XeroImportController.php`
- [ ] T054 Route: POST /xero/import/csv. File: `routes/api.php`

---

## Phase 7: Tests + Final Verification

- [ ] T055 Test: `XeroAccountMappingTest` — unit test for AccountMappingSuggester. Assert: all 20+ Xero types map correctly. Assert: keyword matching works for ambiguous names. Assert: unknown types return null (flagged for AI). File: `tests/Feature/Xero/XeroAccountMappingTest.php`
- [ ] T056 Test: `XeroIdempotencyTest` — run import twice with same mock data. Assert ImportRecordMap prevents duplicates. Assert second run: imported=0, skipped=N. File: `tests/Feature/Xero/XeroIdempotencyTest.php`
- [ ] T057 Test: `XeroPermissionTest` — assert bookkeeper gets 403 on POST /xero/connect. Assert owner and accountant succeed. File: `tests/Feature/Xero/XeroPermissionTest.php`
- [ ] T058 Test: `XeroErrorHandlingTest` — mock one invoice that fails (missing contact). Assert: import continues, error logged, status=completed_with_errors, error_log contains the specific record. File: `tests/Feature/Xero/XeroErrorHandlingTest.php`
- [ ] T059 Run Pint — `vendor/bin/pint --dirty`. File: (formatting only)
- [ ] T060 Run full test suite — `php artisan test --compact`. All existing tests must pass. All new Xero tests must pass. File: (verification only)
- [ ] T061 Verify existing tests unchanged — `php artisan test --filter=BankFeed --filter=Feed --filter=Gamification`. File: (verification only)
