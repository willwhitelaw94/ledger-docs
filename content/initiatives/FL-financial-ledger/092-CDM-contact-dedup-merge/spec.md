---
title: "Feature Specification: Contact Deduplication & Merge"
---

# Feature Specification: Contact Deduplication & Merge

**Epic**: 092-CDM | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 006-CCM (Contacts & Client Management)

---

## Problem Statement

Contacts are created from multiple sources (manual entry, invoice creation, bank feed matching, CSV import). Duplicate contacts accumulate over time, fragmenting customer/supplier history across multiple records. No duplicate detection or merge capability exists.

## Scope

### In Scope (P1)
- Duplicate detection engine: fuzzy match on name, email, phone, ABN
- Duplicate candidates list: show potential duplicates with confidence score
- Merge wizard: select master record, preview combined data, confirm merge
- Merge execution: re-link all invoices, bills, payments, journal entries, bank transactions, notes, attachments to master contact
- Soft-delete merged duplicate (audit trail preserved)
- Prevent future duplicates: warn on contact creation when similar contact exists

### In Scope (P2)
- Bulk duplicate scan (run across all contacts, group into clusters)
- Auto-merge for high-confidence matches (99%+ score, configurable)
- Merge history log (who merged what, when, with undo within 30 days)
- ABN lookup integration (validate and deduplicate against ABR)
- Contact bulk import with deduplication (match against existing contacts during CSV import)

### Out of Scope
- CRM-level contact enrichment (LinkedIn, Clearbit)
- Contact scoring or segmentation

## Key Entities
- `DuplicateCandidate` — contact_a_id, contact_b_id, confidence_score, match_fields (JSON), status (pending|merged|dismissed)
- `MergeLog` — master_contact_id, merged_contact_id, merged_by, merged_at, affected_records (JSON), undone_at

## Success Criteria
- Duplicate detection identifies 95%+ of true duplicates
- False positive rate < 10% (dismissed duplicates)
- Merge completes in < 5 seconds regardless of linked record count
- Zero orphaned records after merge
