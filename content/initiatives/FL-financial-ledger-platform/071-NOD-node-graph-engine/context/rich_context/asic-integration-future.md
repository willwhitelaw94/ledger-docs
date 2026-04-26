---
title: "Future: ASIC Entity Lookup & Auto-Relationship"
---

# Future Epic: ASIC Entity Lookup & Auto-Relationship

**Status**: Idea (deferred from 071-NOD MVP)
**Dependency**: 071-NOD entity_relationships table must exist first

## Concept

Auto-populate entity relationships by looking up ABN/ACN on ASIC (Australian Securities & Investments Commission). When an accountant creates a company entity and enters its ABN, the system could:

1. Look up the company on ASIC
2. Return: directors, secretaries, shareholders, parent companies, subsidiary relationships
3. Auto-suggest entity_relationships: "Create relationship: John Smith → director_of → Smith Holdings?"
4. User confirms or dismisses each suggestion

## What ASIC Can Provide

| Data | Available | Notes |
|------|-----------|-------|
| Company directors | Yes | Names, appointment dates, cessation dates |
| Company secretaries | Yes | Names, appointment dates |
| Shareholders | Yes | Names, share classes, number of shares |
| Parent company | Yes | If holding company structure registered |
| ABN/ACN lookup | Yes | Via ABR (Australian Business Register) |
| Trust beneficiaries | **No** | Trusts are private documents, not registered |
| Trust trustees | **Partial** | Corporate trustee is a company (searchable), individual trustees are not |
| Trust appointors | **No** | Private document |
| Partnership details | **Partial** | ABN registration shows partners |

## Limitations

- **Trusts are private** — beneficiary, appointor, and individual trustee relationships must be manually entered or extracted from uploaded trust deeds (potential AI document extraction epic)
- **ASIC data costs money** — API access via data brokers (e.g., ABR API is free for ABN lookup, but detailed company extracts require paid ASIC access)
- **Stale data** — ASIC records may lag behind actual changes (annual returns)
- **International entities** — ASIC only covers Australian entities

## Implementation Notes

- ABR (Australian Business Register) has a free XML API for ABN lookup
- Detailed company data requires ASIC Connect API or data broker (InfoTrack, ASIC Direct)
- Could also integrate with state-level registries for business name lookups
- Time slider would benefit from ASIC appointment/cessation dates (historical structure)

## Relationship to 071-NOD

This is NOT part of NODE MVP. NODE MVP requires manual relationship creation (drag-to-connect in the graph). ASIC integration is an enhancement that auto-suggests relationships to reduce manual data entry.
