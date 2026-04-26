---
title: "Idea Brief: Will & Estate Planning"
---

# Idea Brief: Will & Estate Planning

**Created**: 2026-03-22
**Author**: William Whitelaw

---

## Problem Statement (What)

- No Australian platform combines will creation with live financial data. Users must manually re-enter asset details into standalone will builders (Safewill, Willed, Bare) that have zero visibility into the person's actual financial position.
- Families with multiple entities (personal, trust, SMSF, company) have fragmented estate plans. The will governs personal assets, the BDBN governs super, the trust deed governs trust succession, and the POA governs incapacity -- but nothing ties them together.
- SMSF trustees risk lapsed Binding Death Benefit Nominations (BDBNs expire every 3 years) because no platform tracks expiry or prompts renewal. A lapsed BDBN means superannuation may go to unintended recipients.
- Advisors and accountants have no way to see which clients have wills, which are outdated, or which are missing critical documents (POA, BDBN). Gap analysis is manual spreadsheet work.
- Once a will is created, it becomes stale. Asset purchases, disposals, new beneficiaries, and entity changes go undetected. There is no "will needs updating" trigger anywhere in the market.

**Current State**: MoneyQuest already tracks contacts (beneficiaries, executors), personal assets, fixed assets, debts, bank accounts, SMSF entities, and family groups. Document signing (059-DGS) provides PDF signing with audit trails. File explorer (056-FEX) provides secure document storage. All the building blocks exist -- but there is no estate planning layer connecting them.

---

## Possible Solution (How)

### 1. Guided Will Builder Wizard
- 10-step wizard: will type, testator details, executors, guardians, specific bequests, residuary estate, testamentary trusts, funeral wishes, review, generate & sign
- Beneficiaries and executors pulled from existing contacts (006-CCM)
- Asset schedule auto-populated from PersonalAsset, Asset, BankAccount models
- State-specific PDF generation (HTML-to-PDF, matching existing invoice pattern)

### 2. BDBN Management (SMSF Workspaces)
- Create and track Binding Death Benefit Nominations for SMSF members
- Expiry alerts at 90, 30, and 7 days before lapse
- One-click renewal via 059-DGS signing flow
- Entity-type gated: only appears for SMSF workspaces

### 3. Power of Attorney
- Financial and medical POA creation with state-specific requirements
- Signing via 059-DGS, storage via 056-FEX
- Status tracking on estate dashboard

### 4. Estate Dashboard & Change Detection
- Overview page: active will status, BDBN status, POA status
- "Needs updating" alerts when assets are added/removed/revalued, contacts change, or entities are created
- Family group integration: estate plan coverage across all entities in a WorkspaceGroup

### 5. Practice Advisor View
- Gap analysis: which clients have wills, expired BDBNs, missing POAs
- "Estate Health" indicator in practice dashboard
- Task creation for estate planning reviews

```
// Before
1. Client creates will on Safewill -- manually re-types all assets
2. BDBN done on paper -- filed in a drawer, expires unnoticed
3. Accountant has no idea which clients have estate plans
4. Client buys investment property -- will is now outdated but nobody knows
5. SMSF member dies -- BDBN lapsed 6 months ago, trustee has discretion

// After
1. Client opens will builder -- assets auto-populated from ledger, contacts as beneficiaries
2. BDBN created in-platform -- 059-DGS signing, automatic expiry tracking
3. Practice dashboard shows estate health across all clients
4. Investment property added -- "Will needs updating" alert fires immediately
5. SMSF member's BDBN renewed 60 days before expiry via automated reminder
```

---

## Benefits (Why)

**User/Client Experience**:
- Will creation in 15-25 minutes with pre-populated data (vs 20-30 minutes of manual entry elsewhere)
- Single source of truth: will, BDBN, POA, and trust succession in one platform
- Proactive alerts when estate plan becomes stale

**Operational Efficiency**:
- BDBN expiry tracking eliminates the #1 risk for SMSF estate planning
- Advisors can identify and address estate planning gaps across entire client books
- Annual review workflows reduce manual follow-up

**Business Value**:
- No competitor offers ledger-integrated will creation (key differentiator)
- Replaces $160-300/will in standalone platform fees (included in subscription)
- BDBN management is a high-value SMSF feature with no consumer alternative
- Deepens platform stickiness: estate planning data creates long-term retention

**ROI**: Replaces standalone will platform costs. Prevents BDBN lapses (potential six-figure consequences for SMSF members). Enables practice upsell of estate planning advisory services.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | -- |
| **C** | -- |
| **I** | -- |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- Wills generated by the platform require physical signing and witnessing (printable PDF, not e-signed) in all states except VIC
- Users understand the platform provides document preparation tools, not legal advice
- The existing Contact model is sufficient for beneficiary/executor/guardian roles without structural changes
- BDBN signing can reuse the 059-DGS flow (two witnesses required, similar to existing signatory model)

**Dependencies**:
- 059-DGS (Document Governance & Signing) -- complete, provides BDBN/POA signing workflow
- 056-FEX (File Explorer) -- complete, provides will PDF storage
- 006-CCM (Contacts) -- complete, provides beneficiary/executor contact data
- 030-PLG (Personal Ledger) -- complete, provides personal asset/debt data
- 033-FAR (Fixed Asset Register) -- complete, provides fixed asset data

**Risks**:
- Legal liability for will content (MEDIUM) -> Mitigation: prominent disclaimers at every step; recommend professional review; no lawyer-client relationship
- State-specific complexity (MEDIUM) -> Mitigation: v1 focuses on signing instructions per state, not state-specific will content (will structure is largely uniform across Australian states)
- Template maintenance (LOW) -> Mitigation: will text is generated from structured data, not freeform templates; legal review of generated output periodically

---

## Estimated Effort

**XL (Extra Large) -- 4-5 sprints**

- **Sprint 1**: Will model + wizard steps 1-4 (testator, executors, guardians) + estate dashboard
- **Sprint 2**: Wizard steps 5-8 (bequests, residuary estate, trusts, funeral) + PDF generation
- **Sprint 3**: Will versioning + review/sign flow + 059-DGS integration + 056-FEX storage
- **Sprint 4**: BDBN model + BDBN management UI + expiry notifications + POA model
- **Sprint 5**: Practice advisor estate view + gap analysis + change detection alerts + polish

---

## Proceed to PRD?

**YES** -- Unique market position: no Australian platform combines will creation with live financial data. Builds on 5 existing modules. BDBN management alone justifies the feature for SMSF-heavy practices.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: --

---

## Next Steps

**If Approved**:
1. [ ] `/trilogy-idea-handover` -- Gate 0 validation + create Linear epic
2. [ ] `/speckit-specify` -- Generate full specification
3. [ ] `/trilogy-clarify` -- Refine requirements across lenses

**If Declined**:
- Evaluate lighter alternative: estate planning checklist + document upload only (no will builder)
