---
title: "Feature Specification: Transaction Coding Engine"
---

# Feature Specification: Transaction Coding Engine

**Feature Branch**: `105-TCE-transaction-coding-engine`
**Created**: 2026-04-25
**Status**: Draft
**Epic**: 105-TCE
**Initiative**: FL — Financial Ledger Platform
**Effort**: XL (5-6 sprints)
**Depends On**: 048-FPL (must ship first), 021-BRR (complete), 087-TXC (parallel), 002-CLE (complete), 044-TAX (consumer), 018-ITR (planned)

---

## Out of Scope

- **Bank feed connectivity itself** — covered by 048-FPL Feed Pipeline Infrastructure. This epic consumes a `FeedItem`; it doesn't fetch one.
- **ML model training and embeddings** — covered by 087-TXC. This epic *invokes* the model as Layer D in the cascade; it doesn't train it.
- **BAS/IAS lodgement workflow** — covered by 044-TAX. This epic produces BAS-ready data; it doesn't generate the BAS form.
- **Receipt OCR matching** — separate concern (019-AIX AI Document Inbox).
- **Real-time streaming ingestion** — v1 follows 048-FPL's scheduled-poll + webhook model.
- **Cross-tenant memorisation** — Layer B (memorisation) is per-workspace only. Cross-workspace anonymous learning is out of scope (deferred to 087-TXC P2).
- **Custom user-defined enrichment providers** — providers are internal PHP classes. External plugin SDK deferred.
- **Auto-posting JEs without human approval for amounts above a threshold** — auto-post is opt-in, threshold-gated, and the threshold is workspace-configurable in 021-BRR. This epic does not change that policy.
- **Industry template marketplace** — care, retail, professional services, tradie templates ship in this epic. A marketplace for community-contributed templates is deferred.

---

## Overview

WealthQuest Ledger needs an engine that takes a normalised `FeedItem` (from any feed type, any provider) and produces a fully-coded journal entry that is ready for tax-agent workflows: BAS labels mapped, FBT flagged, GST treatment recorded, private-use captured, provenance trailed.

Today we have the building blocks — rules (021-BRR), ML (087-TXC), the upcoming pipes (048-FPL) — but no orchestrator that runs them as a layered cascade. We also have a chart-of-accounts schema that is too thin for tax-agent work: it does not carry GST treatment, FBT applicability, BAS labels, or tax-return labels. Without those, every BAS reconciliation is a manual exercise.

This epic delivers four things in one coherent surface:

1. **A vendor-agnostic feed provider abstraction** — Basiq today, swappable to Yodlee, Frollo, or direct integrations tomorrow without domain-code changes.
2. **A layered Transaction Coding Engine** — deterministic rules → tenant memorisation → industry-template defaults → ML fallback → human review, with confidence-thresholded short-circuiting and full provenance.
3. **A GL schema upgrade** — `chart_accounts` and `tax_codes` carry GST treatment, FBT flag, default private-use percentage, BAS label, and tax-return label.
4. **A first-class care-sector template** — NDIS/SCHADS-aware CoA template, designed with Trilogy Care as anchor client, modelled separately from generic SMB templates.

The architectural posture is: **one pipeline, providers as interfaces, type-discriminated `FeedItem`, no per-source bespoke objects**. This explicitly resolves the "do we put each feed in its own object?" question — we do not.

---

## Architecture

### Layered Coding Cascade

Every `FeedItem` of type `bank_transaction` (and other coded types in scope) flows through:

```
FeedItem (normalised, from 048-FPL)
   │
   ├─► Enrichment Cascade
   │     ├─ Provider-native (Basiq → ANZSIC, ABN, AU merchant DB)
   │     ├─ Internal (BPAY biller code, ATO PRN/EFT, ABN match against contacts)
   │     └─ Specialist (Ntropy/Heron) — opt-in, threshold-gated
   │
   ▼
Transaction Coding Engine
   │
   ├─ Layer A: Deterministic Rules (021-BRR generalised)
   │           ▶ ABN match · regex · BPAY biller code · amount range
   │           ▶ Confidence: 1.0 if matched. First-match-wins.
   │
   ├─ Layer B: Tenant Memorisation
   │           ▶ Per-workspace, per-merchant learned mapping
   │           ▶ Confidence: derived from sample size + recency + consistency
   │
   ├─ Layer C: Industry Template Defaults
   │           ▶ ANZSIC → GL default for the workspace's CoA template
   │           ▶ Confidence: template-author-asserted, capped at 0.7
   │
   ├─ Layer D: ML Fallback (087-TXC)
   │           ▶ Embedding-based suggestion with model confidence
   │
   └─ Layer E: Human Review (Intray 018-ITR)
               ▶ Confidence below threshold → surface for manual coding
               ▶ Manual decision feeds back into Layer B
   │
   ▼
Coding Result
   ├─ chart_account_id
   ├─ tax_code_id
   ├─ contact_id (optional)
   ├─ description (cleaned)
   ├─ private_use_pct (if account has default)
   ├─ confidence
   ├─ coding_layer (A | B | C | D | E)
   ├─ coding_reason (rule_id | memo_id | template_default | model_version | human)
   └─ provenance (raw enrichment, layer trace)
   │
   ▼
Journal Entry (002-CLE event-sourced)
   ├─ Lines carry GL account → GL account carries GST treatment, FBT, BAS label, return label
   └─ JE tagged with feed_item_id and full provenance
```

### Vendor-Agnostic Provider Abstraction

Two distinct provider interfaces:

- **`FeedProvider`** (defined in 048-FPL) — connects to a source, syncs raw data, produces `FeedItem`s. Implementations: `BasiqProvider`, `ManualImportProvider` (CSV/OFX), `YodleeProvider` (future), `FrolloProvider` (future), `BfdProvider` (086-BFD direct bank).
- **`EnrichmentProvider`** (new in this epic) — takes a `FeedItem`, returns enriched metadata (cleaned merchant, ABN, ANZSIC, category, geolocation, recurring flag). Implementations: `BasiqEnrichmentProvider` (default — bundled with Basiq feeds), `InternalEnrichmentProvider` (BPAY/ATO/ABN matching), `NtropyProvider` (P2 opt-in), `HeronProvider` (P3 opt-in).

The Coding Engine talks to neither concrete vendor — it consumes the interfaces. Switching from Basiq to Yodlee is a provider swap; the engine code does not change.

### `FeedItem` Type Discrimination

A single canonical `FeedItem` table (defined in 048-FPL) with:

- `feed_type` — enum: `bank_transaction`, `asset_price`, `property_valuation`, `payroll_event`, `market_data`, `manual_entry` (extensible)
- `payload` — JSONB, type-discriminated shape
- `enrichment` — JSONB, accumulated across enrichment providers, immutable per provider run

The Coding Engine handles `bank_transaction` items in this epic. Other feed types (asset prices, property valuations) are handled by their own coding strategies in their respective epics — but they all share the `FeedItem` shape and the same provenance model.

### Provenance Model

Every coded JE records its full coding history immutably:

- The original raw payload (preserved by 048-FPL)
- Every enrichment provider that contributed (in order)
- The exact layer that produced the coding (A/B/C/D/E)
- The exact rule, memo, template default, model version, or user that made the decision
- The confidence score
- Timestamp

This is what tax agents and auditors need. It is also the training ground truth for improving the ML model in 087-TXC.

### Multi-Tenancy

All Coding Engine state is workspace-scoped:

- Memorisations are per-workspace (no cross-tenant leakage)
- Rules are per-workspace (021-BRR pattern continues)
- Industry template selection is per-workspace
- ML model invocation is per-workspace (per 087-TXC)
- Enrichment provider configuration (which specialists are enabled) is per-workspace

Central tables: `enrichment_providers` registry, `industry_templates` catalogue, `ml_model_versions` registry.

---

## User Scenarios & Testing

### User Story 1 — GL Schema Upgrade for Tax-Agent Workflows (Priority: P1)

A tax agent reviewing a workspace's chart of accounts wants every account to declare its GST treatment, FBT applicability, default private-use percentage, BAS label, and income-tax-return label so that BAS reconciliation and tax-return prep roll up automatically.

**Why this priority**: Without these fields on `chart_accounts`, every other layer of this epic produces accounting data that still requires manual tax mapping. The GL schema is the foundation; nothing else makes sense without it.

**Independent Test**: Migrate a workspace, edit a chart account, set its GST treatment to `gst_non_capital_g11`, FBT to true, BAS label to `G11`, and verify the values persist and surface in the API resource.

**Acceptance Scenarios**:

1. **Given** I am an accountant or owner viewing a chart account in workspace settings, **When** I open the account edit form, **Then** I see fields for: GST Treatment (dropdown: GST Capital G10 / GST Non-Capital G11 / GST-Free / Input-Taxed / Out of Scope / Not Set), FBT Applicable (toggle), Default Private-Use Percentage (number 0-100, optional), BAS Label (text/dropdown), Tax-Return Label (text/dropdown).

2. **Given** a workspace has been migrated from a pre-TCE schema, **When** I view its chart of accounts, **Then** every account has a sensible default GST treatment derived from its existing `tax_codes` linkage (e.g., accounts linked to `GST` tax code default to `gst_non_capital_g11`; accounts linked to `GST-FREE` default to `gst_free`; everything else defaults to `not_set`).

3. **Given** I am editing a chart account, **When** I set FBT Applicable to true, **Then** the account is flagged as FBT-relevant and surfaces in the FBT report in 085-FBT.

4. **Given** I am editing a chart account that represents a vehicle expense, **When** I set Default Private-Use Percentage to 25, **Then** future JEs coded to this account will pre-fill 25% as the private-use portion (which the accountant can override per JE).

5. **Given** I am viewing the BAS report (044-TAX), **When** the report is generated, **Then** every transaction rolls up under the BAS label declared on its GL account, with no manual mapping required.

6. **Given** I am viewing the tax-return preparation page, **When** I generate a profit-and-loss summary by tax-return label, **Then** every account contributes to its declared label and unlabelled accounts are flagged in a "Needs label" warning.

7. **Given** a CoA template is being seeded for a new workspace, **When** the seeding completes, **Then** every account in the template ships with GST treatment, FBT flag, and BAS label already set — no manual configuration required for the standard template accounts.

---

### User Story 2 — Vendor-Agnostic Aggregator Connection (Priority: P1)

A workspace owner wants to connect a bank feed today via Basiq, with the confidence that they could move to Yodlee, Frollo, or a direct bank integration tomorrow without losing transaction history, rules, memorisations, or coded JEs.

**Why this priority**: Vendor lock-in is the single largest commercial risk. If we can't swap providers, every Basiq pricing change or outage becomes an existential risk. The provider abstraction must be in place before any production traffic flows through Basiq.

**Independent Test**: Connect a Basiq sandbox source, sync a batch of transactions, verify they flow through the Coding Engine unchanged, then swap the provider class to a `MockProvider` returning equivalent payloads and verify identical engine output.

**Acceptance Scenarios**:

1. **Given** I am a workspace owner, **When** I navigate to Settings > Feeds and click "Connect Bank Feed", **Then** I see a list of available providers (Basiq is shown as the recommended default; Yodlee/Frollo/Direct are placeholders for future).

2. **Given** I select Basiq, **When** I complete the Basiq Consent Flow (CDR-compliant), **Then** the workspace creates a `FeedSource` row of type `bank_transaction` with provider `basiq`, and Basiq begins syncing transactions on the configured schedule.

3. **Given** an engineer needs to add a new aggregator (e.g., Yodlee), **When** they implement `YodleeProvider implements FeedProvider`, **Then** no Coding Engine code, no Banking domain code, and no migration is required — the new provider appears in the connection list and is fully functional after registering it in the providers registry.

4. **Given** a workspace has connected via Basiq and accumulated 10,000 transactions and 50 memorised mappings, **When** the workspace owner switches to a different provider for the same bank, **Then** historical transactions, rules, memorisations, and coded JEs are all preserved; only the connection method changes.

5. **Given** a provider is paused or disconnected, **When** the workspace owner views feed source detail, **Then** the source status, last successful sync, error count, and reconnect/resume actions are visible, regardless of which provider is in use.

6. **Given** the Coding Engine is being unit-tested, **When** the test seeds `FeedItem`s without invoking any real provider, **Then** the engine processes them identically — proving the engine is decoupled from provider implementations.

---

### User Story 3 — Layer A: Deterministic Rules (Priority: P1)

An accountant has rules in place from 021-BRR — "Stripe payouts → Sales Revenue", "ATO BPAY 75556 → PAYG Liability", "Anything containing 'Office Works' → Office Supplies". When a new transaction lands, the rules engine should fire first, before any other layer, and produce a coded JE deterministically.

**Why this priority**: Rules are the highest-confidence signal we have. They are user-authored, deterministic, and auditable. If rules don't fire reliably, every other layer is a band-aid.

**Independent Test**: Seed a workspace with three rules of varying types (regex, ABN match, BPAY biller code), inject feed items matching each, and verify exactly the rule that should fire does fire, with confidence 1.0 and the correct rule_id recorded in provenance.

**Acceptance Scenarios**:

1. **Given** a workspace has a rule "ABN 11 005 357 522 (Telstra) → Telecommunications Expense", **When** a feed item with ABN `11005357522` is enriched, **Then** Layer A matches on the ABN and the engine produces a coded JE to Telecommunications Expense with confidence 1.0 and `coding_reason: rule_id=...`.

2. **Given** a workspace has a rule "Description regex `(?i)woolworths` → Groceries", **When** a feed item with description "WOOLWORTHS NEUTRAL BAY" is processed, **Then** Layer A matches the regex and produces a coded JE to Groceries with confidence 1.0.

3. **Given** a workspace has a rule "BPAY biller code 75556 → ATO PAYG Liability", **When** a feed item with BPAY biller code 75556 is processed (extracted by InternalEnrichmentProvider), **Then** Layer A matches and produces a coded JE to ATO PAYG Liability.

4. **Given** a workspace has overlapping rules (regex matches "Stripe payout" but ABN match also matches), **When** Layer A runs, **Then** the rule with higher priority order fires and other rules do not — first-match-wins per existing 021-BRR semantics.

5. **Given** a rule is marked `auto_post: true` and matches, **When** the engine produces the JE, **Then** the JE is posted (not draft) without human review, regardless of confidence on later layers.

6. **Given** a rule is marked `auto_post: false` and matches, **When** the engine produces the JE, **Then** the JE is created in draft state for human review.

7. **Given** Layer A produces a match, **When** subsequent layers run, **Then** they do not run — first-match short-circuit.

---

### User Story 4 — Layer B: Tenant Memorisation (Priority: P1)

When a user manually codes a transaction (e.g., "AWS *Charges 12345" → IT Software Expense), the engine should remember that mapping for future transactions from the same merchant in the same workspace, surfacing it as a confident suggestion before any rule needs to be created.

**Why this priority**: Memorisation is the single highest-impact UX feature in modern accounting software — it's what makes Xero and MYOB feel intelligent. Users do not write rules for every recurring vendor; they expect the system to learn from their behaviour. Without Layer B, Layer A becomes a chore (write a rule per vendor) and Layer D (ML) becomes the only learning surface, which is wasteful for the simple case.

**Independent Test**: Manually code two transactions from the same merchant to the same account; inject a third matching transaction; verify Layer B fires with high confidence and the engine produces the same coding without invoking ML.

**Acceptance Scenarios**:

1. **Given** I have manually coded 1 transaction from "AWS" to IT Software Expense, **When** the next AWS transaction lands, **Then** Layer B surfaces a suggestion to IT Software Expense with low confidence (sample size = 1) — surfaced as a suggestion only, not auto-applied.

2. **Given** I have manually coded 5 of the last 5 transactions from "AWS" to IT Software Expense, **When** the next AWS transaction lands, **Then** Layer B fires with high confidence and the engine produces a coded JE to IT Software Expense without going through Layers C/D/E.

3. **Given** I have manually coded 9 of the last 10 transactions from "AWS" to IT Software Expense and 1 to Marketing Expense, **When** the next AWS transaction lands, **Then** Layer B fires with confidence reflecting the 90/10 split (high but not maximal), surfacing IT Software Expense as the suggestion with a "9 of last 10 — confirm or change" UI hint.

4. **Given** Layer A did not match, **When** the engine evaluates Layer B, **Then** memorisation is keyed off enriched merchant identity (in this priority order): ABN match > Basiq merchant_id > cleaned merchant name > description prefix.

5. **Given** a user accepts an ML-fallback suggestion (Layer D), **When** the JE is posted, **Then** Layer B records the merchant→account mapping so future transactions short-circuit at Layer B before reaching Layer D.

6. **Given** a user *changes* a Layer B suggestion before posting, **When** the JE is posted, **Then** Layer B updates its memorisation to weight the user's correction; old mappings remain in history but do not dominate future suggestions.

7. **Given** Layer B is being audited, **When** an auditor queries "why did this transaction get coded to X?", **Then** the response shows the historical mappings (count of past codings per account) that drove the decision, with timestamps.

---

### User Story 5 — Layer E: Human Review with Intray Hand-off (Priority: P1)

When confidence is below the workspace's auto-coding threshold, the transaction should land in the Intray (018-ITR) for human review with all suggestions ranked, and the user's decision should feed back into the engine to improve future coding.

**Why this priority**: Without a human-review surface, low-confidence items either get coded incorrectly (silent failures) or get dropped (data loss). Layer E is the safety net that makes the rest of the cascade safe to ship.

**Independent Test**: Set the workspace auto-code threshold to 0.9; inject a feed item that produces 0.5 confidence on every preceding layer; verify it lands in the Intray with all suggestions visible; verify the user's manual coding decision creates a Layer B memorisation.

**Acceptance Scenarios**:

1. **Given** the workspace auto-code threshold is 0.9, **When** a feed item is processed and the highest-confidence layer produces 0.5 confidence, **Then** the engine creates a draft JE, does not post it, and surfaces the item in the Intray with a "Needs review" status.

2. **Given** an item is in the Intray for review, **When** I open it, **Then** I see all layer suggestions ranked by confidence, the provenance trail per layer, the original raw payload, and the enrichment data used. I can accept any suggestion or override with a custom coding.

3. **Given** I accept a suggestion in the Intray, **When** the JE is posted, **Then** the engine records my acceptance as ground truth — Layer B memorises the merchant mapping, and 087-TXC training data flags the model's prediction as confirmed.

4. **Given** I override all suggestions and code manually, **When** the JE is posted, **Then** the engine records my override — Layer B memorises the new mapping, and 087-TXC training data flags the model's prediction as wrong (with my correction as the right answer).

5. **Given** I batch-review 50 items in the Intray, **When** I bulk-accept, **Then** all 50 JEs are posted in a single transaction; failure on any one item rolls back the batch and surfaces an error.

6. **Given** a workspace has auto-post enabled at confidence ≥ 0.95 and a feed item produces 0.97 confidence on Layer A, **When** the engine runs, **Then** the JE is auto-posted and does not appear in the Intray — Intray surfacing is reserved for items needing human review.

7. **Given** items have been in the Intray for more than 30 days uncoded, **When** the daily Intray digest runs, **Then** the workspace owner is notified of the backlog with a summary count.

---

### User Story 6 — Coding Provenance & Audit Trail (Priority: P1)

A tax agent or auditor reviewing a workspace wants to answer "why was this transaction coded to this account?" instantly for any JE — without spelunking through logs, without losing provenance to model retraining, without ambiguity.

**Why this priority**: Without provenance, the Coding Engine is a black box. Tax agents will not trust an automated coding system that can't show its work. Auditors will reject it. ML retraining will have no ground-truth signal. P1 because every other story produces data that needs to be auditable.

**Independent Test**: Run a feed item through the engine with all five layers active, post the JE, then query the JE detail view and verify the full provenance is visible and immutable.

**Acceptance Scenarios**:

1. **Given** any JE created by the Coding Engine, **When** I view it in the UI, **Then** I see a "How was this coded?" panel showing: source (`feed_provider`, `feed_item_id`), enrichment providers used (in order), the layer that fired (A/B/C/D/E), the specific decision-maker (rule_id, memo_id, template_default_id, model_version, user_id), the confidence score, and the timestamp.

2. **Given** a JE was produced by Layer A (rule), **When** the rule is later edited or deleted, **Then** the JE's provenance still resolves to the original rule version — provenance is immutable per JE.

3. **Given** a JE was produced by Layer D (ML), **When** I view the provenance, **Then** I see the model version that produced it, the input features, and the alternative suggestions ranked by confidence — so I can sanity-check the model's reasoning.

4. **Given** a JE was produced by Layer E (human), **When** I view the provenance, **Then** I see which user coded it, what the engine had suggested before they intervened, and whether their decision matched any of the engine's suggestions.

5. **Given** I am running a BAS audit, **When** I query "show me all JEs in the BAS period coded by Layer D with confidence below 0.85", **Then** I get a filterable list — the data is queryable.

6. **Given** a JE has been reclassified (015-ACT US-6), **When** I view the original JE's provenance, **Then** I see both the original engine coding AND the reclassification trail — provenance survives reclassification.

7. **Given** the Coding Engine's data is being used to retrain 087-TXC's ML model, **When** the training pipeline runs, **Then** it can isolate Layer E (human) decisions as ground truth and exclude self-reinforcing Layer D outputs from training.

---

### User Story 7 — Layer C: Industry Template Defaults (Priority: P2)

A new workspace selects the "Care Provider" template during onboarding. When transactions land that don't match any rule (Layer A), don't have memorisation history (Layer B), the engine should fall back to template-author-asserted ANZSIC → GL defaults — so a brand-new workspace gets sensible coding from the very first transaction.

**Why this priority**: Without Layer C, new workspaces have a cold-start problem — no rules, no memorisations, and the ML model has no per-workspace training data yet. Templates close the gap. P2 because Layers A and B handle the common case for established workspaces; templates earn their keep on Day 1.

**Independent Test**: Create a workspace using the "Care Provider" template with no rules and no transactions; inject a feed item with ANZSIC 8710 (Aged Care Residential Services); verify the engine codes it to "Aged Care Service Revenue" via Layer C.

**Acceptance Scenarios**:

1. **Given** a workspace uses the Care Provider template, **When** a transaction is enriched with ANZSIC 4511 (Cafes and Restaurants), **Then** Layer C maps it to the template's default for ANZSIC 4511 — typically "Meals & Entertainment Expense" — with a template-asserted confidence cap of 0.7.

2. **Given** a workspace uses the Tradie template, **When** a transaction is enriched with ANZSIC 4511, **Then** Layer C maps it to the Tradie template's default for that ANZSIC — different from the Care template, because the same merchant has different default treatment per industry.

3. **Given** a feed item has no ANZSIC enrichment available, **When** Layer C runs, **Then** it does not fire and the engine progresses to Layer D.

4. **Given** Layer C produces a suggestion at 0.7 confidence and the workspace auto-code threshold is 0.9, **When** the engine completes, **Then** the suggestion is *not* auto-applied — it surfaces in the Intray (Layer E).

5. **Given** I am editing my workspace's industry template configuration, **When** I open the ANZSIC → GL map, **Then** I can override the template's defaults for specific ANZSIC codes — overrides are workspace-scoped, do not affect the global template.

6. **Given** a template-author publishes an updated ANZSIC → GL map (e.g., adding new ANZSIC codes from a 2030 revision), **When** the platform deploys the update, **Then** workspaces using that template receive the new mappings for unmapped ANZSIC codes; existing user overrides are preserved.

7. **Given** Layer C fires and the user later corrects the coding, **When** the correction is saved, **Then** Layer B memorises the correction (so Layer B will pre-empt Layer C for that merchant in future) — the workspace teaches itself away from generic defaults toward specific ones.

---

### User Story 8 — Care Sector First-Class Template (Priority: P2)

A care provider (e.g., Trilogy Care) connects a feed and expects the chart of accounts, GST treatments, and ANZSIC defaults to model NDIS funding flows, SCHADS-driven payroll, and participant-vs-provider liability — not a generic SMB CoA with care concepts retrofitted on top.

**Why this priority**: Trilogy Care is an anchor client. The care sector has unique structures (NDIS-funded vs client-contribution income, SCHADS award rates, participant trust accounts) that are not present in any generic template. Building the care template as first-class proves the templating system is genuinely industry-aware, not a pretend layer.

**Independent Test**: Create a new workspace and select the Care Provider template; verify the seeded CoA contains NDIS revenue accounts, participant contribution accounts, SCHADS payroll accounts, and that GST treatments are pre-set correctly (most NDIS revenue is GST-free; client contributions vary).

**Acceptance Scenarios**:

1. **Given** I select the Care Provider template during workspace setup, **When** the workspace is created, **Then** the chart of accounts includes (at minimum): NDIS Plan-Managed Revenue, NDIS Self-Managed Revenue, NDIS Agency-Managed Revenue, Client Contribution Revenue, Government Subsidy Revenue, Participant Held Funds (liability), Worker Wages (SCHADS Level 1-8), Penalty Rates Expense, Public Holiday Expense, Allowances Expense, Workers Comp Insurance Expense, and Quality & Compliance Expense.

2. **Given** the Care Provider template is seeded, **When** I view the NDIS Plan-Managed Revenue account, **Then** its GST Treatment is pre-set to `gst_free` (NDIS revenue is GST-free per ATO ruling) and its BAS Label is `G3` (GST-free supplies).

3. **Given** the Care Provider template is seeded, **When** I view the SCHADS Penalty Rates Expense account, **Then** it is pre-set with FBT Applicable: false and BAS Label: `W1` (wages and salaries).

4. **Given** the Care Provider template includes ANZSIC defaults, **When** a transaction is enriched with ANZSIC 8710 (Aged Care Residential Services), **Then** Layer C maps it to "Aged Care Service Revenue" by default.

5. **Given** a care provider workspace receives a transaction enriched with ANZSIC 4511 (Cafes), **When** Layer C runs, **Then** the default mapping is "Staff Amenities Expense" (not "Meals & Entertainment") because care providers typically code cafe expenses to staff amenities — this is template-asserted differentiation from generic SMB templates.

6. **Given** I am the Care Provider template author, **When** the NDIS funding model changes (e.g., new participant types added in 2027 reforms), **Then** I can publish a new template version and existing workspaces are notified; opting into the upgrade preserves user customisations and adds new accounts/mappings.

7. **Given** the Care Provider template is being designed, **When** I review with Trilogy Care domain experts before launch, **Then** their feedback on account names, GST treatments, and participant accounts is captured in template revision history.

---

### User Story 9 — Internal Enrichment Provider (Priority: P2)

When a transaction includes a BPAY biller code, ATO payment reference number, or a description containing a registered ABN, the engine should extract and use that signal — because these are often more reliable than any external aggregator's enrichment.

**Why this priority**: BPAY biller codes resolve utilities, ATO, council rates, and super contributions to specific entities deterministically — no merchant-name matching required. ABN matching against the workspace's contacts table resolves vendors to existing relationships. These are free, reliable signals that any aggregator-only enrichment misses. P2 because the engine works without them but is materially weaker.

**Independent Test**: Inject a transaction with description "ATO PAYG 75556 12345678" and biller code 75556 in the Basiq payload; verify InternalEnrichmentProvider extracts the BPAY code; verify Layer A matches the rule "Biller 75556 → ATO PAYG Liability".

**Acceptance Scenarios**:

1. **Given** a feed item description contains a BPAY biller code (e.g., "BPAY 75556 REF 1234"), **When** InternalEnrichmentProvider runs, **Then** the biller code is extracted and added to enrichment as `bpay_biller_code: "75556"`.

2. **Given** a feed item description contains an 11-digit ABN with valid checksum, **When** InternalEnrichmentProvider runs, **Then** the ABN is extracted, validated, and matched against the workspace's contacts; if a contact matches, `contact_id` is added to enrichment.

3. **Given** a feed item description contains an ATO PRN/EFT code, **When** InternalEnrichmentProvider runs, **Then** the code is extracted and the system flags this as an ATO-related transaction (which Layer A's pre-seeded rules will then code to PAYG / GST / Income Tax liability accounts).

4. **Given** a feed item is enriched with both Basiq enrichment AND Internal enrichment, **When** the Coding Engine sees both, **Then** Internal enrichment takes priority for entity resolution (because a confirmed ABN match beats a fuzzy merchant-name match).

5. **Given** a feed item has no BPAY/ATO/ABN signal in its description, **When** InternalEnrichmentProvider runs, **Then** it returns no enrichment additions and does not error.

6. **Given** an ABN is extracted from a description but doesn't match any contact, **When** the user later creates a contact for that ABN, **Then** historical enrichment is *not* retroactively updated — but Layer B memorisation begins linking new transactions correctly.

---

### User Story 10 — Layer D: ML Fallback Wiring (Priority: P2)

When Layers A, B, and C all miss, the engine should invoke 087-TXC's ML model as the fourth-line suggestion, with confidence used to decide between auto-coding (high), surfacing in Intray (medium), or rejecting and going to Layer E manual (low).

**Why this priority**: Without Layer D, the cascade ends at Layer C, which leaves a long tail of unmapped transactions to manual review forever. With Layer D, the system genuinely improves over time as the model is retrained on Layer E ground truth. P2 because 087-TXC delivers the model itself — this story is the wiring.

**Independent Test**: With Layers A/B/C all missing for a given feed item, mock 087-TXC to return a suggestion at 0.85 confidence; verify the engine surfaces this as a suggestion in the Intray (assuming workspace auto-code threshold of 0.9); verify the suggestion is recorded in provenance.

**Acceptance Scenarios**:

1. **Given** Layers A, B, and C all return no match for a feed item, **When** Layer D runs, **Then** the engine invokes 087-TXC's classification endpoint with the enriched feature set (description, amount, direction, ANZSIC, ABN, recurring flag, tenant industry).

2. **Given** Layer D returns a suggestion with confidence ≥ workspace auto-post threshold, **When** the engine completes, **Then** the JE is auto-posted with provenance recording `coding_layer: D, model_version: <v>`.

3. **Given** Layer D returns a suggestion with confidence below auto-post but above the Intray-surface threshold, **When** the engine completes, **Then** the JE is created in draft and surfaces in the Intray with the Layer D suggestion ranked first.

4. **Given** Layer D returns a suggestion with confidence below the Intray-surface threshold, **When** the engine completes, **Then** the engine progresses to Layer E (manual coding) and Layer D's low-confidence suggestion is recorded but not surfaced as a recommendation.

5. **Given** 087-TXC is unavailable or times out (>500ms), **When** Layer D runs, **Then** the engine logs the failure, skips to Layer E, and the JE lands in the Intray for manual coding — Layer D failure must not block coding.

6. **Given** a Layer D coding is later corrected by a user, **When** the correction is saved, **Then** the correction is flagged for 087-TXC's training pipeline so the model can learn from it.

7. **Given** 087-TXC publishes a new model version, **When** the new version is rolled out for a workspace, **Then** future Layer D invocations use the new version; provenance on existing JEs continues to reference the version that produced them.

---

### User Story 11 — Specialist Enrichment Provider Integration (Priority: P3)

For workspaces with a high volume of business-specific transactions where Basiq's AU consumer-trained enrichment is weakest, the workspace owner can opt into a specialist enrichment provider (Ntropy or Heron). The engine layers the specialist on top of Basiq selectively — not on every transaction.

**Why this priority**: Specialist enrichment is genuinely better for B2B and long-tail merchants but is also expensive per call. Threshold-gated invocation (only when Basiq enrichment confidence is low or for known business-account workspaces) keeps cost manageable. P3 because Basiq enrichment alone is sufficient for v1; specialists are a refinement.

**Independent Test**: Enable Ntropy on a workspace; inject a feed item where Basiq returns no merchant match; verify the Coding Engine invokes NtropyProvider; verify the resulting enrichment is recorded alongside the Basiq enrichment (not overwriting it).

**Acceptance Scenarios**:

1. **Given** I am a workspace owner, **When** I navigate to Settings > Feeds > Enrichment, **Then** I see a list of enrichment providers (Basiq: enabled by default; Internal: enabled by default; Ntropy: opt-in; Heron: opt-in) with their pricing per call.

2. **Given** I enable Ntropy, **When** the next batch of feed items is enriched, **Then** NtropyProvider is invoked only on items where Basiq enrichment confidence is below the configured threshold (default 0.6) — not on every item.

3. **Given** Ntropy returns a higher-confidence merchant match than Basiq, **When** the Coding Engine runs, **Then** it uses Ntropy's enrichment for matching purposes, but both enrichments are preserved in provenance.

4. **Given** Ntropy is enabled and the API is unavailable, **When** a feed item is processed, **Then** the engine falls back to Basiq's enrichment alone — Ntropy availability must not block coding.

5. **Given** I want to evaluate the value of Ntropy on my workspace, **When** I view the Feeds > Enrichment page, **Then** I see usage statistics (calls per month, additional confidence delivered, additional auto-codings enabled, estimated cost) so I can decide whether to keep it on.

6. **Given** Ntropy is enabled but produces no additional value over Basiq for 30 days (e.g., Basiq alone reaches sufficient confidence), **When** the monthly review is generated, **Then** the system suggests disabling Ntropy to save cost.

---

### Edge Cases

- **Conflicting rules at the same priority**: When two rules have identical priority and both match a feed item, the rule with the most-specific match (longer regex match length, or more constrained amount range) wins. Tie-breaker: most recently updated rule.
- **Cleared memorisations after long inactivity**: A merchant with no transactions for 12+ months has its memorisation marked stale; suggestions are still surfaced but with reduced confidence.
- **Industry template change mid-life**: When a workspace switches from Care Provider to Tradie template, existing CoA and rules are preserved. Layer C defaults change for new transactions but historical JEs are not recoded.
- **ABN with multiple registered names**: When an ABN match returns multiple historical names (e.g., a business has rebranded), the most recent registered name is used for display; the ABN is the canonical identifier.
- **Foreign-currency transactions through Basiq**: Basiq returns native and AUD-converted amounts. The Coding Engine codes against AUD; multi-currency detail is preserved in provenance for 011-MCY.
- **Transactions with no description and no merchant match**: The engine bypasses Layers A/B/C/D and lands directly in Layer E with a "No identifying information" warning. The user must code manually.
- **Reclassification of a coded JE (015-ACT US-6)**: Reclassification creates new JEs but preserves the original's coding provenance. The reclassification itself is provenanced separately ("reclassified by user X on date Y").
- **High-volume payroll runs (one transaction per employee)**: The engine batches similar feed items by merchant signature and processes them in parallel; rules and memorisations apply identically per item.
- **Provider downgrades enrichment quality after launch**: If Basiq deprecates ANZSIC enrichment for example, workspaces relying on Layer C must be notified; Layer C defaults are configurable to fall back to category-string matching.

---

## Requirements

### Functional Requirements

#### GL Schema Upgrade

**FR-001**: The `chart_accounts` table MUST have a `gst_treatment` column (enum: `gst_capital_g10`, `gst_non_capital_g11`, `gst_free`, `input_taxed`, `out_of_scope`, `not_set`) defaulting to `not_set` for new accounts.

**FR-002**: The `chart_accounts` table MUST have a `fbt_applicable` boolean column defaulting to `false`.

**FR-003**: The `chart_accounts` table MUST have a `default_private_use_pct` decimal(5,2) nullable column with valid range 0-100.

**FR-004**: The `chart_accounts` table MUST have a `bas_label` varchar nullable column.

**FR-005**: The `chart_accounts` table MUST have a `tax_return_label` varchar nullable column.

**FR-006**: The migration adding these columns MUST backfill `gst_treatment` from the existing tax-code linkage where derivable; otherwise leave `not_set`. The migration MUST be reversible.

**FR-007**: The `tax_codes` table MUST gain `bas_label` and `tax_return_label` columns to support tax-code-driven label rollups when an account-level label is `not_set`.

**FR-008**: All seeded CoA templates (Generic SMB, Care Provider, Tradie, Professional Services, Retail) MUST ship with GST treatment, FBT flag, BAS label, and tax-return label populated for every standard account.

#### Vendor-Agnostic Feed Provider Abstraction

**FR-009**: A `FeedProvider` interface MUST exist with the methods: `connect(WorkspaceContext, ProviderConfig)`, `sync(FeedSource, since: timestamp)`, `webhook(FeedSource, payload)`, `disconnect(FeedSource)`. (Defined in 048-FPL; this epic asserts compliance.)

**FR-010**: A `BasiqProvider` MUST be implemented as the first concrete `FeedProvider` for `feed_type: bank_transaction`.

**FR-011**: A `ManualImportProvider` MUST be implemented for CSV/OFX uploads using the same `FeedProvider` interface — to prove vendor-swap is genuinely a provider swap, not a bespoke path.

**FR-012**: The Coding Engine MUST NOT depend on any specific provider class. The engine accepts `FeedItem` instances and is unaware of which provider produced them.

**FR-013**: A `MockProvider` MUST be available in the test suite to validate engine behaviour independently of any real provider.

**FR-014**: Adding a new provider (e.g., `YodleeProvider`) MUST NOT require changes to the Coding Engine, the GL schema, the rules engine, or any domain code outside the new provider class and its registration.

#### Enrichment Provider Abstraction

**FR-015**: An `EnrichmentProvider` interface MUST exist with method `enrich(FeedItem) → EnrichmentResult`. EnrichmentResult contains: cleaned merchant name, ABN (optional), ANZSIC (optional), category (optional), geolocation (optional), recurring flag (optional), confidence score, provider identifier.

**FR-016**: `BasiqEnrichmentProvider` MUST be implemented and is enabled by default for any workspace using Basiq feeds.

**FR-017**: `InternalEnrichmentProvider` MUST be implemented and is enabled by default for all workspaces; it extracts BPAY biller codes, ATO PRN/EFT codes, and ABN matches against the workspace's `contacts` table.

**FR-018**: `NtropyProvider` and `HeronProvider` MUST be implemented as opt-in P2/P3 features, configurable per workspace, with confidence-threshold gating to avoid invoking them on every transaction.

**FR-019**: Enrichment results from multiple providers MUST be stored independently on the `FeedItem` (one row per provider per item) — never overwriting each other. The Coding Engine consumes the union, prioritising by configured order.

**FR-020**: Enrichment provider invocation MUST be resilient to provider failure — if a provider errors or times out (>1s), the engine continues with available enrichments and logs the failure.

#### Layered Coding Engine

**FR-021**: A `TransactionCodingEngine` service MUST orchestrate the cascade: Layer A → B → C → D → E with first-match-wins short-circuiting at each layer.

**FR-022**: Each layer MUST return a `CodingSuggestion` containing: chart_account_id, tax_code_id (optional), contact_id (optional), description (cleaned), private_use_pct (optional), confidence score (0.0-1.0), layer identifier, decision-maker reference (rule_id, memo_id, template_default_id, model_version, or user_id).

**FR-023**: Layer A (Deterministic Rules) MUST consume the existing 021-BRR rules engine, generalised to feed-type-scoped rules (per 048-FPL). Match types supported: ABN exact match, BPAY biller code, regex on description, amount range, contact match. Layer A confidence is always 1.0 on match.

**FR-024**: Layer B (Tenant Memorisation) MUST maintain per-workspace, per-merchant learned mappings keyed off (in priority order): ABN > Basiq merchant_id > cleaned merchant name > description prefix.

**FR-025**: Layer B confidence MUST be derived from sample size, recency, and consistency of the historical mappings — single-sample mappings produce low confidence; consistent multi-sample mappings produce high confidence.

**FR-026**: Layer C (Industry Template Defaults) MUST consume an ANZSIC → GL mapping declared on the workspace's selected industry template, with a confidence cap of 0.7 (template defaults are general, not specific to this workspace).

**FR-027**: Layer D (ML Fallback) MUST invoke 087-TXC's classification endpoint with the enriched feature set, returning a confidence-scored suggestion. Latency budget: 500ms; on timeout, Layer D is skipped.

**FR-028**: Layer E (Human Review) MUST surface items via the Intray (018-ITR) when no preceding layer reaches the workspace's auto-code threshold. The Intray displays all layer suggestions ranked, the provenance trail, and allows accept/override.

**FR-029**: The cascade MUST short-circuit at the first layer producing a suggestion whose confidence ≥ the workspace's auto-code threshold. Subsequent layers are not invoked.

**FR-030**: When Layer A has `auto_post: true` flag on a matching rule, the JE MUST be posted (not draft), bypassing the auto-code threshold check — auto-post is rule-author-asserted intent.

#### Provenance & Audit Trail

**FR-031**: Every JE created by the Coding Engine MUST record provenance including: source (feed_provider, feed_item_id), enrichment providers used (ordered list), coding_layer (A/B/C/D/E), coding_reason (rule_id / memo_id / template_default_id / model_version / user_id), confidence, timestamp.

**FR-032**: Provenance MUST be immutable per JE — editing a rule, retraining a model, or updating a template MUST NOT alter the provenance of historical JEs.

**FR-033**: The JE detail view MUST display a "How was this coded?" panel showing the full provenance trail in human-readable form.

**FR-034**: Provenance data MUST be queryable for audit purposes — accountants and auditors can filter JEs by layer, by confidence range, by rule, by model version.

**FR-035**: When a JE is reclassified (per 015-ACT US-6), the original coding provenance MUST be preserved and the reclassification action recorded as a separate provenance entry.

#### Industry Templates & Care Sector

**FR-036**: At least five industry templates MUST be shipped: Generic SMB, Care Provider, Tradie, Professional Services, Retail. Each declares its CoA, GST treatments, FBT flags, BAS labels, tax-return labels, and ANZSIC → GL default map.

**FR-037**: The Care Provider template MUST include NDIS revenue accounts (Plan-Managed, Self-Managed, Agency-Managed), Client Contribution Revenue, Government Subsidy Revenue, Participant Held Funds liability, SCHADS payroll accounts, and care-sector-specific expense accounts.

**FR-038**: The Care Provider template MUST be reviewed and signed off by Trilogy Care domain experts (or equivalent care-sector SME) before being made available for new workspace selection.

**FR-039**: Workspaces MUST be able to override industry template ANZSIC → GL defaults at the workspace level; overrides are preserved across template version updates.

**FR-040**: Industry templates MUST be versioned. When a template author publishes a new version, existing workspaces are notified; opt-in upgrade preserves user customisations and merges new mappings.

#### Coding Engine Configuration

**FR-041**: Each workspace MUST be able to configure its auto-code confidence threshold (default 0.95) and Intray-surface threshold (default 0.6) — between these, the JE lands in Intray as a suggestion.

**FR-042**: Workspaces MUST be able to enable or disable individual enrichment providers (Internal cannot be disabled; Basiq is required for Basiq feeds; Ntropy/Heron are opt-in).

**FR-043**: Workspaces MUST be able to disable individual layers of the Coding Engine for diagnostic purposes (e.g., temporarily disable Layer D to isolate behaviour). Disabled layers are skipped in the cascade.

### Non-Functional Requirements

**NFR-001**: End-to-end latency from `FeedItem` ingestion to JE creation MUST be under 2 seconds per item at the 95th percentile, including all layers.

**NFR-002**: Layer A (rules) MUST complete in under 50ms per item.

**NFR-003**: Layer B (memorisation) MUST complete in under 30ms per item via indexed merchant lookup.

**NFR-004**: Layer D (ML) MUST be invoked asynchronously where possible; synchronous invocation has a 500ms timeout.

**NFR-005**: The Coding Engine MUST be horizontally scalable — multiple worker processes can process feed items in parallel without contention. Per-workspace memorisation reads are read-replica-friendly.

**NFR-006**: Provenance writes MUST be transactional with JE creation — no JE exists without its full provenance recorded.

**NFR-007**: All Coding Engine operations MUST respect workspace tenant isolation; a coding decision in workspace A MUST NOT leak any data to workspace B.

### Key Entities

- **Coding Engine Configuration**: Workspace-scoped configuration. Attributes: workspace, auto_code_threshold, intray_surface_threshold, enabled_layers (array), industry_template_id, enrichment_providers_config.
- **Enrichment Provider Registry**: Central catalogue of available providers. Attributes: provider_id, name, type (feed | enrichment), opt_in_required, default_enabled, configuration_schema.
- **Enrichment Result**: Per-feed-item per-provider enrichment output. Attributes: feed_item_id, provider_id, payload (cleaned merchant, ABN, ANZSIC, category, geolocation, recurring, confidence), created_at. Immutable.
- **Coding Memorisation**: Workspace-scoped, merchant-keyed mapping. Attributes: workspace_id, merchant_key (ABN / merchant_id / cleaned_name), chart_account_id, tax_code_id, contact_id, sample_count, last_seen_at, consistency_score.
- **Coding Provenance**: Per-JE coding history. Attributes: journal_entry_id, feed_item_id, feed_provider, enrichment_providers (array), coding_layer, coding_reason_type (rule | memo | template | model | human), coding_reason_id, confidence, created_at. Immutable.
- **Industry Template**: Published CoA template with ANZSIC defaults. Attributes: template_id, name, version, author, anzsic_to_gl_map, default_gst_treatments, default_bas_labels, published_at. Versioned.
- **Industry Template Override**: Workspace-level override of template defaults. Attributes: workspace_id, template_id, anzsic_code, override_chart_account_id, created_at.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 80% of bank transactions for a workspace with 6+ months of usage are coded by Layers A, B, or C — only 20% require ML or human input.
- **SC-002**: 95% of bank transactions for a workspace with 12+ months of usage are coded automatically (Layers A through D) at confidence ≥ workspace auto-code threshold.
- **SC-003**: For a Trilogy Care pilot workspace, the BAS report generated from coded JEs requires zero manual label corrections at the end of a quarter — every transaction rolls up under its declared BAS label.
- **SC-004**: 100% of JEs created by the Coding Engine have queryable, immutable provenance recording the layer, decision-maker, and confidence.
- **SC-005**: A swap from BasiqProvider to a hypothetical YodleeProvider on a test workspace requires zero changes to the Coding Engine, GL schema, rules engine, memorisation store, or industry templates — proven by an automated test that runs the engine against both `MockProvider` and `BasiqProvider` outputs and verifies identical coding results.
- **SC-006**: End-to-end coding latency (FeedItem → JE) is under 2 seconds at p95 across a workload of 10,000 daily transactions.
- **SC-007**: User-corrected codings (Layer E) feed back into Layer B memorisation within the same processing run — the next item from the same merchant uses the corrected mapping.
- **SC-008**: The Care Provider template is signed off by Trilogy Care domain experts before being made available, with revision history captured.

---

## Out of Scope (consolidated)

- Bank feed connectivity (covered by 048-FPL)
- ML model training (covered by 087-TXC)
- BAS lodgement workflow (covered by 044-TAX)
- Receipt OCR matching (covered by 019-AIX)
- Real-time streaming ingestion
- Cross-tenant memorisation
- External plugin SDK for third-party providers
- Auto-posting policy changes (managed by 021-BRR)
- Industry template marketplace

---

## Clarifications

The following 25 decisions resolve open questions identified during spec drafting. Each carries a *Decision*, a *Why*, and a *How to apply* note so engineering can implement without re-litigating.

### Foundations

**CL-001 — Auto-code confidence threshold**
*Decision*: Default 0.95 for established workspaces. New workspaces start at 0.85 for the first 90 days (or first 500 coded transactions, whichever comes first), then auto-promote to 0.95. Workspace-configurable in 0.05 increments between 0.70 and 0.99.
*Why*: Aggressive enough to be useful, conservative enough to be safe. Cold-start is the highest-error period — lower threshold during the period when memorisation is sparse keeps automation honest.
*How to apply*: Stored on `coding_engine_configurations.auto_code_threshold`. Cold-start logic in `TransactionCodingEngine::resolveThreshold()`. Promotion event recorded in workspace audit log.

**CL-002 — Memorisation confidence by sample size**
*Decision*: Layer B confidence is `min(0.95, 0.5 + 0.1 * consistent_samples_count)` capped at 0.95. "Consistent" = ≥80% of last 10 codings to the same account.
*Why*: Smooth ramp avoids cliff edges. The 80%/10 window forgives occasional miscodings without polluting the memo. Cap at 0.95 means memorisation alone never auto-posts above the default threshold without rule reinforcement — a deliberate safety guard.
*How to apply*: Stored on `coding_memorisations` as `consistency_score` and `sample_count`. Recomputed on every new coding for the merchant.

**CL-003 — Provenance retention**
*Decision*: Posted JEs retain provenance forever (immutable, append-only, cheap). Discarded/voided draft JEs and Intray dismissals retain provenance for 12 months for ML retraining, then purge. ML retraining ingests provenance from Layer E (human) decisions only — never self-reinforces from Layer D.
*Why*: Tax record-keeping in Australia is 5 years minimum. Cheaper to keep posted forever than build a retention scheduler. Self-reinforcement on Layer D would degrade model quality over time.
*How to apply*: `coding_provenance` table is append-only with a `retain_after` timestamp (NULL for posted, NOW + 12 months for drafts). Daily job purges expired draft provenance.

**CL-004 — Template author governance (v1)**
*Decision*: Platform engineering team only for v1. Care Provider template requires written sign-off from at least one Trilogy Care senior accountant captured in `industry_templates.author_signoff_metadata`. Templates cannot be published without sign-off metadata.
*Why*: Industry templates affect every workspace using them — wrong defaults create real client risk. Marketplace governance is a separate problem; defer to v2.
*How to apply*: `industry_templates.published_at` is NULL until sign-off metadata is present and non-empty. Template selector hides unpublished templates.

**CL-005 — Confidence calibration across layers**
*Decision*: Absolute thresholds, no per-layer normalisation. Layer A = 1.0 (rule-author intent). Layer B = derived per CL-002, capped at 0.95. Layer C = template-asserted, capped at 0.70. Layer D = model output, no cap. Layer E = N/A (human decision).
*Why*: Caps reflect reality — template defaults are general, memos are bounded by sample count, only rules and ML can claim full confidence. Absolute thresholds keep the cascade legible.
*How to apply*: Constants in `TransactionCodingEngine` constants. Caps applied at the layer boundary, not in storage — so we don't lose data.

**CL-006 — Specialist enrichment cost guard**
*Decision*: Per-workspace monthly call budget, hard cutoff at limit. Default budget = 0 (opt-in only). When enabled, default cap = 5,000 calls/month with 80% warning email. Workspace owner can raise the cap; admin override available for emergencies.
*Why*: Per-call pricing on Ntropy/Heron means an unbounded loop is a real cost risk. Hard cutoff is preferable to a soft warning that gets ignored at 3am.
*How to apply*: `enrichment_provider_quotas` table per workspace per provider. Middleware on enrichment dispatch checks remaining budget; cuts off cleanly with a logged "budget exhausted" event.

**CL-007 — Care template sign-off process**
*Decision*: Sign-off requires written approval (email or signed PDF) from at least one Trilogy Care senior accountant AND one care-sector compliance specialist (can be Trilogy Care if they have a compliance specialist on staff). Sign-off references the exact template version. Stored as `industry_templates.author_signoff_metadata` with reviewer name, role, organisation, date, and template version SHA.
*Why*: Care sector has compliance exposure (NDIS funding integrity, SCHADS award compliance). One signature isn't enough — accounting + compliance lenses are different.
*How to apply*: Template release checklist includes both signatures. `author_signoff_metadata` is JSONB array; release blocked until two entries present.

### Coding Engine Behaviour

**CL-008 — Canonical merchant key for Layer B**
*Decision*: Memorisation key derived in priority order: (1) ABN if extracted with valid checksum; (2) Basiq `merchant_id` if present; (3) cleaned merchant name (post-InternalEnrichment normalisation: uppercase, strip leading "PURCHASE/POS/EFTPOS/", strip trailing reference numbers and dates, collapse whitespace); (4) first 30 chars of raw description after stripping reference/date/amount tokens. Engine resolves to the highest-priority key available per item.
*Why*: ABN is canonical for entity. `merchant_id` is canonical within Basiq's namespace. Cleaned name handles cases where Basiq doesn't ID the merchant. Description prefix is the last-resort fallback. Layered keying maximises memorisation hit rate without false matches.
*How to apply*: `MerchantKeyResolver` service. Memorisation row stores `merchant_key_type` enum + `merchant_key_value` to allow audit and migration.

**CL-009 — Compound memorisation keys for context-sensitive merchants**
*Decision*: Layer B supports compound keys when bimodal distribution is detected. Compound key forms: `(merchant, amount_range)` (auto-binned at $100/$300/$1,000/$5,000/$50,000 thresholds) and `(merchant, frequency)` (recurring vs one-off, where recurring = ≥3 transactions at <60-day intervals). Compound keys auto-create when the engine detects ≥30% of historical codings for a merchant differ by amount-range or frequency.
*Why*: A Bunnings purchase under $300 is almost certainly Repairs; over $5,000 is almost certainly Capital Works. Forcing one memo per merchant loses this signal.
*How to apply*: `coding_memorisations.compound_key` JSONB column. `MerchantKeyResolver` returns ranked compound keys; engine tries most-specific first.

**CL-010 — Idempotency on re-processing**
*Decision*: Engine is idempotent on `feed_item_id`. Re-processing an already-coded item is a no-op. Explicit "re-code from raw" admin action voids the existing JE (per ledger immutability rules — voiding creates a reversal entry, never deletes), then creates a new coded JE with provenance pointing to the prior coding via `re_coded_from_provenance_id`.
*Why*: Late-arriving updates from providers (e.g., enrichment backfill) shouldn't double-code. Re-coding is rare and intentional — when it happens, full audit trail is non-negotiable.
*How to apply*: Unique constraint on `coding_provenance.feed_item_id` for active (non-voided) entries. Re-code action creates a reversal JE first, then proceeds through the engine normally.

**CL-011 — 087-TXC ML invocation contract**
*Decision*: Synchronous RPC with 500ms hard timeout. Request: feature bundle (`description_cleaned`, `amount_cents`, `direction`, `anzsic`, `abn`, `recurring_flag`, `tenant_industry_template`, `recent_codings_summary` — top 5 accounts from last 30 days). Response: ranked array of suggestions, each with `account_id`, `tax_code_id`, `contact_id`, `confidence`, plus model metadata (`model_version`, `model_inference_id`). On timeout or 5xx, Layer D is skipped; Layer E fires.
*Why*: Sync simplifies the cascade. 500ms is generous for an embedding lookup but bounded enough not to delay coding. Model never blocks coding.
*How to apply*: `MlCodingClient` service with strict timeout. Failures logged and surfaced in feed health dashboard; do not error the JE.

**CL-012 — Auto-post hard ceiling regardless of confidence**
*Decision*: Auto-post is capped at AUD 5,000 per JE by default. Workspace-configurable up to AUD 50,000. Above the cap, even Layer A (confidence 1.0) routes to Layer E for human review. Cap is per JE total amount, not per line.
*Why*: High-value coding errors are expensive to unwind. A wrong rule on a $50,000 transaction posted at midnight is a real risk; the cap is cheap insurance.
*How to apply*: `coding_engine_configurations.auto_post_ceiling_cents`. Engine checks cap before posting regardless of layer/confidence. Items hitting the cap surface in Intray with "auto-post ceiling" badge.

### Configuration & Permissions

**CL-013 — Who can edit Coding Engine configuration**
*Decision*: Only workspace `owner` can change thresholds, ceiling, and which enrichment providers are enabled. `accountant` role can author rules (existing 021-BRR pattern). Memorisations are written by the engine, not directly editable. Users can "forget this memorisation" via a UI affordance — this deletes the memo and feeds the deletion to Layer D as negative training signal.
*Why*: Threshold and ceiling are commercial-risk levers — owner-only matches the financial responsibility. Accountants need rules. Direct memorisation editing would let users teach the engine wrong patterns silently.
*How to apply*: Add `coding_engine.configure` permission (owner only) and `coding_engine.forget_memorisation` (owner + accountant). Permissions seeded in `RolesAndPermissionsSeeder`.

**CL-014 — Multi-currency feed items**
*Decision*: Defer FX conversion to 011-MCY. The Coding Engine consumes the AUD-converted amount for the auto-post ceiling check (CL-012) and for memorisation amount-range binning (CL-009). Original currency, FX rate, and FX timestamp are preserved in provenance. GST treatment applies to AUD amount.
*Why*: Coding decisions don't change between currencies; the auditing constraints do. Keeping FX out of the engine keeps it focused.
*How to apply*: `FeedItem` already carries `currency` and `aud_amount_cents` (per 011-MCY). Engine only reads `aud_amount_cents`.

**CL-015 — Enrichment vs memorisation conflict**
*Decision*: Memorisation wins. Layer B fires before Layer C/D, so contradictory enrichment data does not override an established memo. Enrichment is still stored and may inform Layer D's features for unmatched items, but Layer B is authoritative for memorised merchants.
*Why*: A workspace's own coding history is a stronger signal than a vendor's enrichment guess. If the user has consistently coded "BUNNINGS WAREHOUSE 123" to Repairs for 12 months, a Basiq enrichment update saying "Hardware Retail" doesn't change that.
*How to apply*: Cascade ordering enforces this. No code change needed beyond preserving Layer B priority.

**CL-016 — Reclassification interaction with provenance**
*Decision*: Original JE provenance is immutable. Reclassification (per 015-ACT US-6) creates new JEs with their own provenance pointing back to (a) the reclassification action and (b) the original JE provenance ID. Layer B does NOT memorise from a reclassification — that would teach the engine to keep mis-coding.
*Why*: Reclassifications are *corrections*, often retrospective. Memorising the corrected mapping would create a feedback loop where the engine "learns" the correction and then perpetuates it as a new default.
*How to apply*: `coding_provenance.source` enum includes `engine_initial`, `engine_recoded`, `human_reclassification`. Layer B explicitly filters out `human_reclassification` rows when computing memorisation.

**CL-017 — Queue and worker strategy**
*Decision*: Coding Engine runs as Laravel queue jobs on a dedicated `coding` queue with 4 parallel workers (configurable via env). Separate from `event-projector` queue, which remains single-worker for ledger ordering guarantees. Per-feed-item idempotency via `feed_item_id` advisory lock prevents double-coding under retry.
*Why*: Coding is per-item independent — parallelism is safe. Event projection is order-sensitive — must stay single-worker. Mixing them would block one or under-utilise the other.
*How to apply*: New queue `coding` registered in `config/queue.php`. `CodeFeedItemJob` dispatches per item. Advisory lock via PostgreSQL `pg_try_advisory_lock(feed_item_id)`.

**CL-018 — Feature flag and rollout**
*Decision*: `coding_engine_v2` Pennant flag, scoped per workspace. Existing workspaces continue using rule-only path until opt-in. Bulk-enable command for staged rollout. Old path remains intact until 90 days post-go-live, then deprecated and removed in a follow-up sprint.
*Why*: TCE replaces a critical existing path. Per-workspace flag allows pilot with Trilogy Care, then gradual expansion. 90-day grace period covers any rollback need.
*How to apply*: Standard Pennant pattern (`Feature::active('coding_engine_v2', $workspace)`). Middleware check at FeedItem dispatch routes to old or new engine.

### Operational Behaviour

**CL-019 — Late-arriving provider updates**
*Decision*: When a provider sends a webhook updating a previously-ingested feed item (e.g., Basiq backfills enrichment hours later), the engine re-runs enrichment but does NOT re-code posted JEs. For draft JEs still in Intray, the engine re-runs the cascade and updates the suggestion ranking. Workspace owner can manually trigger re-coding from Intray.
*Why*: Posted JEs must remain stable for accounting integrity. Drafts haven't been committed to the books yet, so refreshing suggestions is safe and useful.
*How to apply*: `FeedItemEnriched` event triggers `RefreshDraftCodingsListener` which re-runs cascade for matching draft JEs.

**CL-020 — PII handling**
*Decision*: Raw provider payloads are preserved by 048-FPL with at-rest encryption. Cleaned merchant names + geolocation may be PII-adjacent and live in `enrichment_results`. ABN matches link to `contacts` (potentially PII). Memorisations are merchant-keyed, not customer-keyed, so do not store individual transaction PII. Provenance references rule_id / memo_id / model_version / user_id, never raw description content.
*Why*: Australian Privacy Principles (APP) and CDR rules require minimal-necessary retention. Provenance must be auditable but not a parallel PII store.
*How to apply*: PII review of all new tables before migration. Memorisation table explicitly excludes raw description. CDR consent revocation triggers cascading purge of raw payloads, retaining anonymised codings for ledger integrity per CDR exemption for "tax records".

**CL-021 — Test coverage minimums for Gate 4**
*Decision*: 90%+ unit coverage on each layer (A through E). Integration tests covering all five-layer cascades plus mixed cascades (e.g., Layer A miss + Layer B hit). Vendor-swap test (`MockProvider` vs `BasiqProvider`) asserting identical engine output for identical input. Migration test on `chart_accounts` covering forward, rollback, and backfill paths. Browser test in Trilogy Care demo workspace covering one transaction through every layer to a posted JE.
*Why*: This is foundational infrastructure — a bug in the engine ripples to every workspace. High coverage is the cost of doing business.
*How to apply*: Pest test suite under `tests/Feature/Coding/` and `tests/Unit/Coding/`. Coverage threshold enforced in CI. Vendor-swap test runs on every PR.

**CL-022 — GL schema migration rollout**
*Decision*: Three-phase rollout. Phase 1 (week 1-2): add nullable columns to `chart_accounts` and `tax_codes`; backfill `gst_treatment` from existing tax-code linkages; deploy under `chart_account_tax_metadata` flag (off). Phase 2 (week 3-4): update CoA template seeders so new workspaces ship with values populated. Phase 3 (week 5-6): enable editing UI per workspace via flag opt-in; bulk-enable command for staged rollout. Total window: 6 weeks deploy to flag-default-on.
*Why*: GL schema changes affect every tax-aware report. Phased rollout means errors are caught on a small surface before reaching all workspaces.
*How to apply*: Three migrations in sequence (additive, never destructive). Backfill in a separate Artisan command, not in the migration itself, so it can be re-run safely.

**CL-023 — BAS label whitelist**
*Decision*: BAS labels are validated against a strict whitelist: `G1`, `G2`, `G3`, `G7`, `G10`, `G11`, `G14`, `G15`, `1A`, `1B`, `T1`, `T2`, `T7`, `W1`, `W2`, `W3`, `W4`. Tax-return labels validated against ATO Item codes (separate whitelist maintained in 044-TAX). Stored as varchar but validated at write time. Updates to ATO labels release a new whitelist version.
*Why*: A typo in a BAS label means a transaction silently won't roll up. Whitelist + validation is a one-time cost that prevents a category of silent failures forever.
*How to apply*: `BasLabel` and `TaxReturnLabel` enums in `app/Enums/`. Validation on `chart_accounts` write via Form Request. Migration to align existing data with whitelist.

**CL-024 — Handling accounts with `gst_treatment: not_set`**
*Decision*: Engine produces the JE normally. The account's missing GST treatment surfaces in a "GST Treatment Missing" report (under 044-TAX). At BAS preparation time, items linked to `not_set` accounts are flagged for review and bulk-fix. The Care Provider and other shipped templates pre-set every account, so this gap only appears for custom user-created accounts.
*Why*: Forcing GST treatment at account creation would block legitimate workflows (e.g., placeholder accounts during setup). Surfacing the gap at BAS time is the correct enforcement point.
*How to apply*: BAS report queries `chart_accounts` for `gst_treatment = 'not_set'` and flags. Workspace setup wizard prompts (but doesn't enforce) GST treatment for custom accounts.

**CL-025 — "Explain coding" UI**
*Decision*: Lives on every JE detail page as a collapsible "How was this coded?" panel, default collapsed. Shows: source (provider + sync timestamp), enrichment timeline (each provider, what they returned, in order), cascade trace (which layers fired, which short-circuited), final decision (layer + reason + confidence + decision-maker reference), and an "Override / re-code" action (gated by 015-ACT reclassification permissions). Available to all workspace roles with read access to JEs (auditor, accountant, owner). Bookkeeper and approver roles see the panel but not the override action.
*Why*: Auditors and accountants need to inspect coding without admin tools. Bookkeepers don't need to override (they create rules instead). Approvers explicitly should not override (separation of duties).
*How to apply*: New `CodingExplainPanel` Vue component on the JE detail page. Endpoint `GET /api/v1/journal-entries/{uuid}/coding-explain` returns the trace. Override action delegates to existing reclassification flow.

---

**Status**: Clarified — ready for `/trilogy-spec-handover` (Gate 1 / Business Gate). After handover, run `/speckit-plan` to produce the technical implementation plan, then `/speckit-tasks` to break into stories.
