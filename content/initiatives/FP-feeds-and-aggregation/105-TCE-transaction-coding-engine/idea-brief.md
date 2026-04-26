---
title: "Idea Brief: Transaction Coding Engine"
---

# Idea Brief: Transaction Coding Engine

**Epic**: 105-TCE
**Created**: 2026-04-25
**Initiative**: FL — Financial Ledger Platform
**Author**: William Whitelaw

---

## Problem Statement (What)

Once a normalised feed item lands in our pipeline (048-FPL), there is no sophisticated, multi-layered system for turning it into a *properly coded* GL entry that is fit for tax-agent workflows. Today the path is "rule match or manual code". This is what we're missing:

- **No vendor-agnostic ingestion contract.** We're about to integrate Basiq, but coupling our domain logic to Basiq's payload shape locks us in. Tomorrow we may want Yodlee (for super/investment data), Frollo (for a strict CDR-only posture), or direct bank integrations (086-BFD). Each switch should be a provider swap, not a rewrite.
- **No layered coding engine.** Rules (021-BRR) and ML (087-TXC) exist as separate bodies of work — there is no orchestrator that runs the layered cascade we actually need: deterministic rules → tenant memorisation → industry-template defaults → ML fallback → human review. Without orchestration, each layer fires independently and step on each other.
- **GL schema is too thin for tax-agent work.** A `chart_account` today carries a code, name, and type. It does not carry: GST treatment (G10 capital / G11 non-capital / GST-free / input-taxed), FBT flag, private-use percentage, or a BAS/income-tax-return label mapping. Tax agents do not care about our GL; they care that it rolls cleanly into BAS labels and tax-return labels. We are designing this backwards if we don't fix the GL first.
- **Enrichment is treated as a single-vendor concern.** Basiq gives us 90%+ AU merchant recognition, ABN, and ANZSIC classification — genuinely good for AU. But aggregator enrichment underperforms specialists (Ntropy, Heron) on long-tail and business-specific transactions. Without an enrichment provider abstraction, we can't layer specialists in selectively where they earn their keep.
- **ANZSIC is being mistaken for the coding key.** ANZSIC classifies the *seller*. GL accounts classify the *buyer's purpose*. A cafe (ANZSIC 4511) could be Meals & Entertainment, Staff Amenities, Client Entertainment (FBT), or personal drawings. ANZSIC is a *feature input* to the coding engine, not the engine itself.
- **Industry templates are flat.** CoA templates exist (`database/seeders/Templates/`) but don't carry ANZSIC→GL default mappings, GST treatments, or industry-specific accounts. The care sector (NDIS, SCHADS, participant vs provider liability) deserves a first-class template, not a retrofit.

**Current State**: 048-FPL specs the universal feed pipeline (pipes). 021-BRR specs the rules engine. 087-TXC specs the ML layer. 044-TAX specs BAS reporting. **What's missing is the engine that turns a normalised `FeedItem` into a fully-coded, BAS-ready, FBT-aware GL entry — with vendor-agnostic ingestion and pluggable enrichment.**

---

## Architectural Answer (the questions you asked)

> *"We might use Basiq today, but switch it out in future. Other feeds aren't just banking. Do we put each in its own object?"*

**No — one pipeline, providers as interfaces, vendor-agnostic from day one.** This brief locks that posture in:

```
                                   ┌─────────────────────┐
  External Source                  │  Provider Interface │
  ─────────────────                │  (vendor-agnostic)  │
  Basiq (banking)        ────►     │                     │
  Yodlee (super/wealth)  ────►     │  FeedProvider       │
  Frollo (CDR-only)      ────►     │  AssetPriceProvider │
  Redbook (vehicles)     ────►     │  PropertyProvider   │
  Sharesight (investments)         │  PayrollProvider    │
  Direct bank API (086-BFD)        │  ...                │
                                   └─────────┬───────────┘
                                             │
                                   ┌─────────▼───────────┐
                                   │   FeedItem          │
                                   │ (canonical shape,   │
                                   │  type-discriminated │
                                   │  payload)           │
                                   └─────────┬───────────┘
                                             │
       ┌─────────────────────────────────────┼─────────────────────────────────────┐
       │                                     │                                     │
       │           ▼ Transaction Coding Engine (this epic) ▼                       │
       │                                                                           │
       │  1. Enrichment cascade                                                    │
       │     ├─ Provider-native (Basiq ANZSIC + ABN)                               │
       │     ├─ Specialist (Ntropy/Heron) — opt-in, threshold-gated                │
       │     └─ Internal (BPAY biller codes, ATO refs, learned merchant aliases)   │
       │                                                                           │
       │  2. Coding cascade (highest priority first, first match wins)             │
       │     ├─ a) Deterministic rules (021-BRR — ABN match, regex, biller code)   │
       │     ├─ b) Tenant memorisation (per-workspace, per-merchant learned)       │
       │     ├─ c) Industry-template defaults (ANZSIC → GL via template)           │
       │     ├─ d) ML fallback (087-TXC — confidence-scored)                       │
       │     └─ e) Human review (Intray 018-ITR)                                   │
       │                                                                           │
       │  3. Tax-aware coding output                                               │
       │     ├─ GL account (with GST treatment, FBT flag, private-use %)           │
       │     ├─ BAS label mapping (G1, G10, G11, 1A, 1B, W1, W2, ...)              │
       │     ├─ Tax-return label mapping                                           │
       │     └─ Provenance trail (source, raw payload, layer that fired, why)      │
       └───────────────────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
                                   Journal Entry (002-CLE)
```

**Key decisions baked in:**

1. **One `FeedItem`, type-discriminated payload.** Not separate `BankTransaction`, `AssetPrice`, `PayrollEvent` tables. A single canonical shape with a `feed_type` column and a typed `payload` JSON column. This is what 048-FPL already proposes — we lock it in.
2. **Vendor swap is a provider class swap.** Domain logic talks to `FeedProvider`, never to Basiq directly. Day one we have `BasiqProvider`. Tomorrow we add `YodleeProvider` next to it. No domain code changes.
3. **Enrichment is a separate provider abstraction.** `EnrichmentProvider` interface — implemented by `BasiqEnrichmentProvider` (free with the feed), `NtropyProvider` (specialist, opt-in), `HeronProvider` (specialist, opt-in). The coding engine asks for enrichment at the right confidence threshold, not blindly per transaction.
4. **The coding engine is layered, not monolithic.** Each layer is independently testable, swappable, and observable. We can run `a → e` or short-circuit at any layer based on confidence.
5. **GL schema carries tax treatment.** Migration adds `gst_treatment`, `fbt_applicable`, `default_private_use_pct`, `bas_label`, `tax_return_label` to `chart_accounts`. This unlocks every downstream tax-agent workflow.

---

## Possible Solution (How)

### 1. Vendor-Agnostic Aggregator Abstraction

- Define `FeedProvider` interface (already in 048-FPL spec) with a strict contract: `connect()`, `sync(since: timestamp)`, `webhook(payload)`, `disconnect()`.
- First implementation: `BasiqProvider` (CDR + screen-scraping fallback, ~120 AU institutions, best DX).
- Adapter for the existing CSV/OFX import as a `ManualImportProvider` — same interface, different ingest mechanism.
- Document the path to add `YodleeProvider`, `FrolloProvider`, direct-bank `BfdProvider` (086-BFD) without modifying the engine.

### 2. Enrichment Provider Abstraction

- New `EnrichmentProvider` interface — `enrich(FeedItem) → EnrichmentResult`.
- `BasiqEnrichmentProvider` — uses Basiq's native enrichment (ABN, ANZSIC 4-level, AU merchant DB). This is our default.
- `NtropyProvider` (P2, opt-in) — specialist, layered on items where Basiq confidence is below threshold or for business categorisation.
- `HeronProvider` (P3, opt-in) — alternative specialist for SMB/lending workflows.
- `InternalEnrichmentProvider` — extracts BPAY biller codes, ATO PRN/EFT codes, ABN matches against our contacts table. These are often more reliable than any external enrichment for utilities, ATO, super, council rates.
- Enrichment results are stored alongside the `FeedItem`, never overwritten — so we can re-run the engine on improved data.

### 3. Layered Coding Engine

A new `TransactionCodingEngine` service that runs the cascade:

- **Layer A — Deterministic Rules (021-BRR generalised).** Match by ABN where possible; regex on description; BPAY biller code; amount range; auto-post or auto-suggest. ABN match is the strongest signal — beats ANZSIC because it resolves the entity, not the category.
- **Layer B — Tenant Memorisation.** Per-workspace, per-merchant learned mappings. "User coded 9 of last 10 transactions from this merchant to account X." This is the single biggest UX win in accounting software (it's what makes Xero/MYOB feel intelligent). Not the same as 087-TXC ML — this is a deterministic memo lookup, not a model.
- **Layer C — Industry Template Defaults.** Within each CoA template (care, retail, professional services, tradie), an ANZSIC → default GL map. ANZSIC earns its keep here, as a template-aware default for unseen merchants.
- **Layer D — ML Fallback (087-TXC).** Embedding-based suggestion with confidence score. Only fires if A/B/C all miss.
- **Layer E — Human Review (Intray 018-ITR).** Confidence below threshold → surface to user. User correction feeds back into Layer B (memorisation).

**First-match semantics**, with confidence required to advance. Provenance is recorded per item so we can answer "why was this coded as X?" in the audit trail.

### 4. GL Schema Upgrade for Tax-Agent Workflows

Migration on `chart_accounts`:

- `gst_treatment` enum — `gst_capital_g10`, `gst_non_capital_g11`, `gst_free`, `input_taxed`, `out_of_scope`, `not_set`
- `fbt_applicable` boolean
- `default_private_use_pct` decimal — for accounts where private use is common (vehicle, phone, internet)
- `bas_label` varchar — explicit mapping to BAS labels (G1, G10, G11, 1A, 1B, W1, W2, etc.)
- `tax_return_label` varchar — explicit mapping to income-tax-return labels

`tax_codes` is already keyed off `rate_basis_points` — we extend with the same BAS/return-label fields so tax codes can roll up correctly when an account doesn't have a label set.

### 5. Industry-Specific Templates (Care Sector First-Class)

The care template is built as a first-class CoA template, not a retrofit, because Trilogy Care is an anchor client:

- NDIS-funded vs client-contribution income streams (separate revenue accounts)
- Participant vs provider liability accounts
- SCHADS-driven payroll splits (penalty rates, overtime, allowances, leave loadings)
- Income type mapping for BAS (most NDIS income is GST-free; client contributions vary)

Templates ship with their ANZSIC → GL default map and their GST treatment baked in. Adding the next industry template (tradie, professional services, retail) is a config exercise, not engineering.

### 6. Provenance & Auditability

Every coded JE carries:

- `source_type: feed`, `feed_item_id`, `feed_provider` (e.g., `basiq`)
- `enrichment_providers_used` — array of providers that contributed enrichment
- `coding_layer` — which layer (A/B/C/D/E) produced the coding
- `coding_rule_id` or `coding_model_version` — exact rule or model used
- `coding_confidence` — score
- Original raw enrichment payload preserved (immutable)

This is the audit trail tax agents want and the data we need to retrain the ML model on real-world ground truth.

### Before / After

```
// Before
Bank txn → BasiqProvider → BankTransaction → BankFeedRule → manual code → JE
                                                  ↓
                                         (no memorisation, no template
                                          defaults, no ML, no GST/FBT
                                          metadata, locked to Basiq)

// After
Any feed item → FeedProvider (vendor-agnostic)
              → FeedItem (canonical)
              → EnrichmentProvider cascade (Basiq → optional Ntropy → internal)
              → TransactionCodingEngine (rules → memo → template → ML → human)
              → JE with full tax-agent metadata (GST, FBT, BAS, return label, provenance)
```

---

## Benefits (Why)

**For Tax Agents & Bookkeepers**
- BAS prep collapses from "open every transaction and pick a label" to "review the few items the engine couldn't auto-code"
- FBT-relevant transactions are flagged automatically (entertainment, vehicle, phone)
- Audit trail for every coded transaction — a tax agent can answer "why was this coded this way?" instantly

**For Business Owners & Care Providers**
- Zero-touch bookkeeping for the long tail of recurring transactions
- Care-sector chart of accounts that actually models NDIS/SCHADS reality
- Faster month-end close as memorisation matures

**Platform Value**
- Vendor-agnostic from day one — Basiq today, Yodlee/Frollo/direct tomorrow without rework
- Multi-feed-type support without per-source duplication (resolves the "do we put each in its own object?" question definitively)
- Specialist enrichment is opt-in and threshold-gated — we pay for Ntropy/Heron only on transactions that need it
- Provenance data becomes the training set for future ML improvements
- Industry templates as a productisation surface — each new vertical is a config artefact, not a code change

**ROI**
- Foundation for the entire tax module (044-TAX) — without proper GST/FBT/BAS metadata, BAS reporting is a manual reconciliation exercise
- Foundation for anomaly detection (040-AND) — provenance + confidence give us the signals to flag anomalies meaningfully
- Vendor lock-in avoided — switching aggregators is a sprint, not a year

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | Trilogy Care (anchor client for care template) |
| **I** | Tax-agent customers, bookkeeper customers |

---

## Assumptions & Dependencies, Risks

**Assumptions**
- 048-FPL ships first and provides `FeedSource` / `FeedItem` / `FeedProvider` abstractions. This epic builds on top.
- 021-BRR rules engine is generalised by 048-FPL to feed-type-scoped rules. Layer A reuses that work.
- 087-TXC ML model can be invoked synchronously with sub-100ms latency (per its SC-3) — this is what makes Layer D viable in the cascade.
- Basiq sandbox access is available for development (license credential already in hand — needs to be moved to `.env`, not committed).

**Dependencies**
- **048-FPL** Feed Pipeline Infrastructure (pipes — must ship first)
- **021-BRR** Bank Reconciliation Rules (Layer A — must be generalised by 048-FPL)
- **087-TXC** Transaction Categorisation ML (Layer D — runs in parallel)
- **044-TAX** BAS / Tax Module (consumes the GST/FBT/BAS metadata this epic adds)
- **002-CLE** Core Ledger Engine (JE generation flows through existing event-sourced pipeline)
- **018-ITR** Intray (Layer E — surfaces low-confidence items)

**Risks**
- **Migration risk on `chart_accounts`** (HIGH) — adding GST/FBT/BAS columns affects every CoA template, every existing workspace, every tax-aware report. Mitigation: nullable columns; defaults from existing `tax_codes` linkage; backfill task in a separate sprint with rollback plan.
- **Layer interaction complexity** (HIGH) — cascade with five layers can be hard to reason about and debug. Mitigation: provenance trail on every coding decision; layer-by-layer feature flags; "explain coding" UI showing which layer fired and why.
- **Enrichment vendor sprawl** (MEDIUM) — easy to over-integrate (Basiq + Ntropy + Heron + Spade). Mitigation: only Basiq enrichment is P1; specialists are P2/P3, opt-in, threshold-gated.
- **Care template compliance accuracy** (MEDIUM) — NDIS/SCHADS rules change; getting the template wrong creates real client risk. Mitigation: template versioned; care-sector domain expert reviews before any client uses it.
- **Vendor swap test coverage** (MEDIUM) — claiming "vendor-agnostic" without proving it. Mitigation: include a `MockProvider` and a second real provider (even if just CSV import as `ManualImportProvider`) in the test suite from day one.

---

## Estimated Effort

**XL (Extra Large) — 5-6 sprints**, approximately 60-75 story points

| Sprint | Work |
|--------|------|
| **1** | GL schema upgrade — migrations for GST treatment / FBT / BAS labels on `chart_accounts` and `tax_codes`; backfill defaults; update CoA template seeders |
| **2** | `EnrichmentProvider` interface + `BasiqEnrichmentProvider` + `InternalEnrichmentProvider` (BPAY/ATO/ABN matching); enrichment storage on `FeedItem` |
| **3** | `TransactionCodingEngine` orchestrator — Layer A (rules), Layer B (memorisation), Layer E (Intray hand-off); provenance recording |
| **4** | Layer C (industry template defaults — ANZSIC→GL maps); first-class care template build with NDIS/SCHADS structure |
| **5** | Layer D wiring (087-TXC ML invocation) + confidence-threshold logic; "explain coding" UI |
| **6** | Specialist enrichment (Ntropy/Heron) as opt-in P2; vendor swap test (MockProvider + second real provider); polish, docs, monitoring |

---

## Proceed to Spec?

**YES** — but only after **048-FPL ships**. The pipes need to exist before we build the engine on top.

While 048-FPL is in flight, this epic can run two preparatory streams in parallel:

1. **GL schema upgrade** (Sprint 1 work) — independent of FPL; can start now
2. **Care template design** (Sprint 4 work) — independent of FPL; needs Trilogy Care SME input anyway

---

## Decision

- [ ] **Approved** — Proceed to spec
- [ ] **Needs More Information** — [What's needed?]
- [ ] **Declined** — [Reason]

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] Confirm 048-FPL is on the near-term roadmap (this epic depends on it)
2. [ ] Move the Basiq sandbox credential into `.env` (not committed); rotate if it's a live key
3. [ ] Coverage bake-off: 5,000 anonymised Trilogy Care txns through Basiq vs Yodlee vs Ntropy — measure merchant match rate, ANZSIC accuracy, business-vs-personal split accuracy
4. [ ] Run `/speckit-specify` to break this brief into implementation-ready stories
5. [ ] Run `/speckit-plan` to create technical implementation plan with the migration strategy for `chart_accounts`
6. [ ] Begin Sprint 1: GL schema upgrade (can start before FPL ships)
