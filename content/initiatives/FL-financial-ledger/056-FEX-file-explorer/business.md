---
title: "Business: Workspace File Explorer"
---

# Business: Workspace File Explorer

## Executive Summary

The Workspace File Explorer addresses a fundamental gap in MoneyQuest's document management: users cannot store, browse, or organise general workspace documents. Every file must be attached to a specific record (invoice, journal entry, contact, etc.), forcing workarounds for contracts, compliance certificates, tax returns, and reference materials. This feature delivers competitive parity with Xero's "Files" section, increases platform stickiness through stored assets, and creates a natural monetisation lever via storage quotas tied to billing tiers.

## Business Problem

### Current State
- Files can only exist as attachments on specific records (invoices, JEs, contacts, jobs, bank transactions)
- No way to upload a standalone document to a workspace
- No centralised view to browse all workspace files in one place
- Users resort to external tools (Google Drive, Dropbox, desktop folders) to store general business documents

### Pain Points
- **Document hunting**: Bookkeepers and accountants waste time opening individual records to find attached files — there's no single search across all workspace documents
- **Orphaned documents**: Contracts, trust deeds, compliance certificates, and insurance policies have no natural "home" in the system because they don't relate to a single transaction
- **Context switching**: Users leave MoneyQuest to find documents stored in external tools, breaking their workflow
- **Practice management friction**: Accountants managing multiple client workspaces have no quick way to locate client documents across entities

### Opportunity
- Fill a feature gap that every major competitor (Xero, MYOB, QuickBooks) addresses in some form
- Increase platform stickiness — users with stored files are significantly less likely to churn
- Monetise storage through billing tier quotas (Trial: 500 MB → Enterprise: 50 GB)
- Lay the foundation for future capabilities: AI Document Inbox (019-AIX) integration, external sharing, and document workflows

## Business Objectives

### Primary Goals
1. **Eliminate document hunting** — users can find any workspace document within 15 seconds via search or folder navigation
2. **Enable standalone document storage** — users can upload files independently of any record, removing the #1 workaround that drives them to external tools
3. **Competitive parity** — match Xero's "Files" functionality to remove a switching objection for prospects evaluating MoneyQuest

### Secondary Goals
4. **Increase platform stickiness** — stored documents create switching costs that reduce churn
5. **Monetise storage** — tiered quotas create a natural upgrade path from Trial to Enterprise
6. **Foundation for AI Inbox** — provide the document layer that 019-AIX confirmed documents will surface into

### Non-Goals
- Becoming a full cloud storage product (no version history, no real-time collaboration, no content search)
- Replacing external document management systems for large enterprises
- External document sharing or client portal access (future epic)
- Full-text content search within documents (filename search only in V1)

## Success Metrics & KPIs

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Files page adoption | 0% (new feature) | 40% of active workspaces upload at least one file within 90 days of launch | Analytics: unique workspaces with ≥1 File record |
| Document retrieval time | N/A (no central view exists) | Users find target document within 15 seconds | User testing sessions |
| Standalone file uploads | 0 (not possible today) | Average of 5+ standalone files per active workspace within 6 months | Database: File records with no linked Attachment |
| Storage revenue uplift | $0 | 5% of Trial/Starter workspaces upgrade tier citing storage limits | Billing events + upgrade reason tracking |
| Support ticket reduction | Baseline: "can't find my document" tickets | 30% reduction in document-related support tickets within 6 months | Support ticket categorisation |
| User retention impact | Current monthly churn rate | Workspaces with >10 stored files show 15% lower churn than those without | Cohort analysis: files vs no-files workspaces |

### Leading Indicators
- Weekly file upload volume (trending up = adoption)
- /files page visits per workspace (engagement)
- Folder creation rate (organisation adoption)
- File-to-record linking rate (integration with existing workflows)

### Lagging Indicators
- Churn reduction in file-storing workspaces (3-6 month lag)
- Storage tier upgrades (revenue impact)
- Support ticket reduction (operational savings)

## Stakeholder Analysis

| Stakeholder | Role | Interest | RACI |
|-------------|------|----------|------|
| Business owners | Primary user — store and access business documents | High — removes workarounds for general documents | Responsible (upload, organise) |
| Bookkeepers | Power user — find documents during reconciliation and data entry | High — central search saves significant daily time | Responsible (upload, link, organise) |
| Accountants | Power user — manage client documentation, tax returns, compliance | High — one place to find all client workspace files | Responsible (upload, link, organise) |
| Practice managers | Oversight — review client workspace documents | Medium — read-only access to client files | Consulted |
| Auditors | Compliance — verify document trail | Medium — read-only access for audit purposes | Informed |
| Product (William) | Feature owner — defines scope and priorities | High — competitive positioning and monetisation | Accountable |

## Business Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Storage costs scale with adoption** | Medium — cloud storage costs increase linearly with file volume | High | Tiered quotas cap storage per workspace. Monitor cost per workspace. Enterprise pricing covers costs. |
| **Users expect full Drive/Dropbox functionality** | Medium — feature requests for version history, real-time collab, content search | Medium | Clear positioning as "accounting document area" not cloud storage. Explicit non-goals in marketing. |
| **Low adoption — users already have external tools** | High — feature underused, investment wasted | Low | Frictionless upload (drag-drop), integration with existing attachment system, AI Inbox surfaces files automatically. |
| **File search expectations** | Low — users expect content search, V1 only has filename search | Medium | Clear labelling ("Search by filename"). Content search as future enhancement. |
| **Compliance/data residency** | High — financial documents may have data residency requirements | Low | Storage region configurable per workspace (existing infrastructure). AU/NZ data stays in AU/NZ. |

## ROI Analysis

### Investment
- **Development effort**: ~2-3 sprint epic (new File model, folder system, API endpoints, frontend /files page, file preview)
- **Infrastructure**: Marginal — storage uses existing disk/S3 infrastructure with tiered quotas
- **Ongoing**: Storage costs scale linearly but are offset by quota enforcement and tier pricing

### Expected Returns
- **Revenue**: Storage quota upgrades from Trial/Starter → Professional/Enterprise
- **Retention**: Reduced churn from platform stickiness (stored documents = switching cost)
- **Competitive**: Removes "no file management" objection from Xero switchers
- **Efficiency**: Reduced support tickets for "where's my document" queries
- **Foundation**: Enables 019-AIX (AI Document Inbox) to surface confirmed documents

### Payback Period
- Expected within 6 months through a combination of reduced churn and storage tier upgrades
- Break-even point: when storage revenue exceeds incremental infrastructure costs

## Market Context

### Target Users
1. **Small business owners** (sole traders, partnerships) — store ABN registrations, insurance certificates, contracts, and compliance documents alongside their books
2. **Bookkeepers** — centralise supporting documents for bank reconciliation, BAS preparation, and year-end close
3. **Accountants and practice managers** — manage and access client documentation across multiple workspaces without leaving MoneyQuest

### Competitive Landscape
| Competitor | Document Feature | MoneyQuest Advantage |
|-----------|-----------------|---------------------|
| **Xero** | Files section — upload, organise by inbox/folder, link to transactions | Parity. MoneyQuest adds billing-tier quotas and practice advisor access. |
| **MYOB** | In Tray — document capture and processing (more like our 019-AIX) | MoneyQuest separates concerns: File Explorer for organisation, AI Inbox for processing. |
| **QuickBooks** | Attachments only — no standalone file area | MoneyQuest advantage: standalone uploads + central browsing. |
| **FreshBooks** | Basic receipt/document capture | MoneyQuest advantage: full folder organisation + record linking. |

### Timing Considerations
- File Explorer should ship before 019-AIX (AI Document Inbox) to establish the document layer that AIX confirmed items will surface into
- No external market deadline — this is a product gap fill, not a regulatory requirement
- Shipping before the next billing tier pricing review allows storage quotas to be included in tier value propositions

## Business Clarifications

### Session 2026-03-20

- Q: Primary business driver — competitive parity, retention, or revenue? → A: All three, but retention (stickiness through stored assets) is the strongest driver. Users with stored files have significantly higher switching costs.
- Q: Should storage quota limits be hard blocks or soft warnings? → A: Hard blocks with clear upgrade prompts. Soft warnings at 80% usage. This drives upgrade conversions.
- Q: Is this feature gated behind a billing tier or available to all plans? → A: Available to all plans including Trial. Storage quota varies by tier but the feature itself is not gated. Even Trial users with 500 MB can store essential documents.
- Q: Priority relative to AI Document Inbox (019-AIX)? → A: File Explorer ships first. It establishes the document layer that AIX will surface confirmed items into. AIX without a file explorer means processed documents have nowhere to live beyond their linked records.
- Q: How does this interact with the universal ledger vision (assets beyond business accounting)? → A: The File Explorer is entity-agnostic — it works for any workspace type (business, personal, family). As MoneyQuest expands beyond business accounting, the file area naturally extends to store personal financial documents (wills, insurance policies, property titles).

### Session 2026-03-20 (Extended)

- Q: What is the expected impact on new customer acquisition? Does "we have file management" appear in competitive win/loss analysis? → A: Moderate impact. File management is a table-stakes feature, not a differentiator. It appears in win/loss analysis as a "switching objection" — prospects coming from Xero expect it. Its absence is a reason NOT to switch, rather than a reason TO switch. Removing this objection smooths the sales pipeline for Xero-to-MoneyQuest migrations.

- Q: Is the file explorer a feature that would be demoed during sales calls? If so, which persona does it resonate with most? → A: Yes, but briefly — it is a "and we also have..." feature, not a headline demo. It resonates most with bookkeepers and accountants who manage documentation daily. Business owners care less about the file explorer itself and more about the fact that "everything is in one place."

- Q: What percentage of support tickets today relate to "where is my document" or "how do I store this file"? → A: Estimated at 5-10% of support tickets based on early beta feedback. The more common pattern is users not even trying — they default to Google Drive/Dropbox without asking. The real metric is the silent workaround, not the support ticket. Post-launch, we target a 30% reduction in document-related tickets.

- Q: Does the file explorer contribute to the $1T AUM vision, or is it a hygiene feature? → A: Primarily a hygiene feature, but it has strategic value for the universal ledger vision. As MoneyQuest expands into personal finance (wills, property titles, insurance policies, share certificates), the file explorer becomes the document vault for ALL assets under management — not just business documents. At scale, the file explorer is the "proof layer" that sits alongside the ledger layer.

- Q: What is the minimum viable adoption rate to justify the infrastructure investment? (Break-even threshold) → A: The infrastructure investment is marginal — storage uses existing S3/disk infrastructure with tiered quotas. Break-even is effectively immediate since storage costs are near-zero until scale. The real threshold is adoption: if fewer than 20% of active workspaces upload a file within 6 months, the feature has failed to deliver its retention promise. Target is 40% within 90 days.

- Q: Should we track "files per workspace" as a health metric alongside the entity health score (051-EHS)? → A: Yes. "Has uploaded files" should be a binary health indicator in entity health scoring. Workspaces with zero files after 30 days of activity are missing a stickiness lever. This is not a heavily weighted factor — more of an engagement signal. Include it as a secondary health dimension, not a primary one.

- Q: What is the acceptable latency for file upload and search? SLA targets? → A: Upload: under 10 seconds for a typical 2 MB file (already in SC-002). Search: filename search results must appear within 500ms of typing (real-time filtering on the client using the already-loaded page data, with server-side search for paginated results). File preview (PDF/image rendering): under 3 seconds. These are UX targets, not contractual SLAs.

- Q: How do we measure whether users are replacing external tools (Drive/Dropbox) with the file explorer? → A: Indirect measurement only. Track standalone file uploads per workspace (files uploaded without linking to a record — these are the documents that previously lived in external tools). If the average workspace accumulates 5+ standalone files within 6 months, users are using MoneyQuest as a document home. Direct replacement measurement would require user surveys at the 3-month mark post-launch.

- Q: Does the file explorer need sign-off from any compliance/legal team before launch? (Financial document storage has regulatory implications in AU/NZ) → A: No formal legal sign-off required for launch. MoneyQuest already stores financial documents via the attachment system — the file explorer extends the same storage infrastructure. Data residency is handled at the infrastructure level (AU/NZ data stays in AU/NZ regions). The existing privacy policy and terms of service cover document storage. Review with legal counsel before marketing the feature as "secure document storage" to avoid implying certifications we do not hold (e.g., ISO 27001).

- Q: Should the accountant practice portal (015-ACT) have a dedicated "Client Files" view aggregating files across all managed workspaces? → A: Not in V1. Practice advisors can view files within each client workspace individually (read-only access per FR-020). A cross-workspace aggregated "Client Files" view is a compelling future feature for 027-PMV (Practice Management V2) but adds significant complexity (cross-tenant querying, permission aggregation). Defer to a future iteration once file explorer adoption is proven.

- Q: Who owns the storage cost budget? Is it product margin or infrastructure? → A: Infrastructure cost, offset by billing tier revenue. Storage costs are included in the per-workspace cost model. The tiered quotas (500 MB to 50 GB) are designed so that storage revenue from Professional and Enterprise tiers subsidises storage costs across all tiers. Product margin is not impacted — storage is a line item in infrastructure budget with a clear revenue offset.

- Q: What is the data residency requirement? Must files be stored in AU/NZ for AU/NZ workspaces? → A: Yes. AU/NZ workspace files must be stored in Australian data centres. This is already the default for the existing attachment storage infrastructure (S3 ap-southeast-2 Sydney region). No new infrastructure configuration is needed for V1. Future international expansion may require per-region storage configuration, but that is out of scope.

- Q: What is the backup/disaster recovery requirement for stored files? RPO/RTO targets? → A: Match existing attachment infrastructure: RPO of 24 hours (daily backups), RTO of 4 hours. S3 provides 99.999999999% durability by default. No additional backup infrastructure is needed for V1. The file metadata (File and Folder database records) is covered by the existing database backup strategy.

- Q: Is there a risk of the file explorer being used for non-financial document storage (e.g. photos, music)? Should we actively prevent this? → A: Low risk, and we should not actively prevent it in V1. The supported file types (FR-008) already exclude video and audio formats, which mitigates the largest abuse vectors. Photos are explicitly supported (receipts, property photos for asset tracking). Storage quotas naturally limit abuse — a workspace cannot store unlimited files. If abuse becomes a pattern post-launch, add file type restrictions or content-type validation in a future iteration. Do not over-engineer this upfront.

- Q: What is the maximum number of files per workspace we should design for? 100? 1,000? 10,000? → A: Design for 10,000 files per workspace. Most workspaces will have 50-500 files, but power users (accountants managing complex entities with years of documents) could reach thousands. Server-side pagination (FR-023) and indexed queries handle this scale. The 50 GB Enterprise quota at an average of 2 MB per file supports ~25,000 files, so 10,000 is a reasonable design target without over-engineering.

- Q: Do any existing beta customers or prospects specifically request file management? Any direct feedback? → A: No direct feature requests from beta users to date — the file explorer is a proactive product decision based on competitive analysis and the observed workaround pattern (users storing documents externally). Feedback from accountant prospects during sales demos consistently flags "where do I put general documents?" as a friction point when evaluating MoneyQuest against Xero. This is implicit demand, not explicit requests.

- Q: Is there a risk of cannibalising the AI Document Inbox (019-AIX) by providing a simpler manual upload path? → A: No. The two features serve fundamentally different purposes. The file explorer is manual storage and organisation — the user decides where the file goes. AIX is automated processing — the AI reads the document, extracts data, and creates records. A user uploading a supplier invoice to the file explorer is storing it. A user sending the same invoice to AIX is asking the system to process it into a bill. The file explorer is the destination, AIX is the intake pipeline. They are complementary, not competing.

- Q: Should the file explorer support mobile upload (camera capture for receipts/documents)? → A: Yes, but only via the standard mobile browser file picker — no custom camera integration in V1. On mobile devices, the file upload button and drag-drop zone should trigger the OS file picker, which on iOS and Android includes the camera option natively. A dedicated camera capture UX (crop, enhance, multi-page scan) is better suited to 019-AIX (AI Document Inbox) and deferred to that epic.

- Q: How does this feature interact with the gamification system (036-GMF)? Any badges for uploading/organising files? → A: Yes, light integration. Two badge candidates: "First Upload" (upload your first file to the workspace — onboarding milestone) and "Organised" (create your first folder — engagement signal). These are low-effort badges that encourage feature discovery. Do not add badges for volume milestones (e.g., "uploaded 100 files") as that incentivises quantity over quality. Badge implementation deferred to when 036-GMF is built — file explorer ships without gamification dependency.

- Q: What is the pricing strategy for storage overages? Hard block only, or offer pay-per-GB overage pricing? → A: Hard block only in V1. When a workspace exceeds its storage quota, uploads are blocked with a clear message showing current usage, the plan limit, and a prompt to upgrade to a higher tier. No pay-per-GB overage pricing — this adds billing complexity and reduces the upgrade incentive. Re-evaluate overage pricing when Enterprise customers consistently hit the 50 GB ceiling, which is unlikely in the near term.

## Approval

- [ ] Business objectives approved
- [ ] Success metrics defined and baselines established
- [ ] Stakeholders aligned on scope and non-goals
- [ ] Storage quota tiers confirmed with billing/pricing team
- [ ] Data residency requirements reviewed for file storage
