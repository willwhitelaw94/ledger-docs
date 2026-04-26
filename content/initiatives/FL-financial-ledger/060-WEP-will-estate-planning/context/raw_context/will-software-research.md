# 060-WEP Will & Estate Planning Module — Research Document

**Date:** 2026-03-21
**Status:** Research Complete
**Platform:** MoneyQuest Ledger (Australian-focused family office / wealth management)

---

## Table of Contents

1. [Will Structure & Components (Australian Law)](#1-will-structure--components-australian-law)
2. [Existing Will Software (Competitive Research)](#2-existing-will-software-competitive-research)
3. [Estate Planning Beyond Wills](#3-estate-planning-beyond-wills)
4. [Family Office / Wealth Context](#4-family-office--wealth-context)
5. [Document Generation](#5-document-generation)
6. [Integration Points with MoneyQuest](#6-integration-points-with-moneyquest)
7. [UX Patterns for Will Builders](#7-ux-patterns-for-will-builders)
8. [Feature List with Priorities](#8-feature-list-with-priorities)
9. [Competitive Comparison Table](#9-competitive-comparison-table)
10. [Recommended Phasing](#10-recommended-phasing)
11. [Integration Map with Existing Modules](#11-integration-map-with-existing-modules)
12. [Key Legal Considerations & Disclaimers](#12-key-legal-considerations--disclaimers)

---

## 1. Will Structure & Components (Australian Law)

### 1.1 Legal Components of a Valid Will in Australia

A legally valid will in Australia requires:

1. **Testamentary capacity** — the will-maker (testator) must be at least 18 years old and of sound mind
2. **Written document** — the will must be in writing (handwritten or printed)
3. **Voluntary execution** — the testator must sign the will of their own free will, without undue influence
4. **Proper witnessing** — two independent adult witnesses must be present simultaneously
5. **Intention** — the document must clearly demonstrate testamentary intention

### 1.2 Key Sections of a Will

| Section | Description | Required? |
|---------|-------------|-----------|
| **Identification & Revocation** | Full legal name, address, declaration revoking all previous wills and codicils | Yes |
| **Executor Appointment** | Named executor(s) and substitute executors who will administer the estate | Yes |
| **Guardianship (Minors)** | Appointment of guardians for children under 18 | If applicable |
| **Specific Bequests** | Named gifts of specific items, property, or monetary amounts to named beneficiaries | Optional |
| **Pecuniary Legacies** | Fixed cash amounts to named beneficiaries | Optional |
| **Residuary Estate** | Distribution of everything remaining after specific bequests and debts are paid | Yes |
| **Beneficiary Designations** | Named beneficiaries with conditions (age, events) | Yes |
| **Testamentary Trusts** | Trusts created within the will that activate on death | Optional |
| **Funeral Wishes** | Burial/cremation preferences, ceremony instructions | Optional |
| **Pet Guardianship** | Named carer for pets and associated pet fund (non-binding) | Optional |
| **Digital Assets** | Instructions for digital accounts, passwords, cryptocurrency | Optional |
| **Executor Powers** | Specific powers granted to executors beyond statutory defaults | Recommended |
| **Attestation Clause** | Witnessing declaration confirming proper execution | Yes |

### 1.3 Types of Wills

#### Simple Will
- Straightforward distribution of assets to named beneficiaries
- Suitable for individuals with uncomplicated estates
- No trust structures
- Typically $150-$300 (online) or $300-$600 (lawyer)

#### Testamentary Trust Will
- Creates one or more discretionary trusts that activate upon death
- Assets pass into trusts controlled by nominated trustees, not directly to beneficiaries
- **Key benefits for Australian context:**
  - **Tax advantages** — income distributed to minor beneficiaries from testamentary trusts can be taxed at adult rates (not penalty rates)
  - **Asset protection** — trust assets protected from beneficiaries' creditors, bankruptcy, and family law claims
  - **Vulnerable beneficiary protection** — can provide for beneficiaries with disabilities without affecting government benefit eligibility (e.g., NDIS)
  - **Generational planning** — trusts can exist for up to 80 years under Australian law
- Suitable for high-net-worth individuals, blended families, and families with minor children
- Typically $1,000-$3,500+ (lawyer-drafted)

#### Mutual Wills
- Made by two people (usually spouses) with a mutual agreement not to revoke or alter the wills
- Creates a binding contractual obligation between the parties
- Less common due to inflexibility; typically replaced by testamentary trust wills

#### Mirror Wills
- Two wills (usually spouses) that "mirror" each other — each leaves their estate to the other
- Simpler than mutual wills and non-binding — either party can change theirs
- Common for married couples with straightforward estates

### 1.4 State-by-State Witnessing Requirements

| State/Territory | Witnesses Required | Key Rules |
|----------------|-------------------|-----------|
| **NSW** | 2+ adults | Both witnesses present simultaneously; will-maker signs or acknowledges signature in their presence; witnesses sign in will-maker's presence |
| **VIC** | 2+ adults | Supports remote execution via audio-visual link (unique in Australia); witnesses can sign remotely |
| **QLD** | 2+ adults | Both must be present at the same time; witnesses cannot be beneficiaries |
| **SA** | 2+ adults | Must use the same pen as testator; sign under testator's signature at the end of the will |
| **WA** | 2+ adults | Standard simultaneous witnessing; no special rules |
| **TAS** | 2+ adults | Standard simultaneous witnessing |
| **ACT** | 2+ adults | Standard simultaneous witnessing |
| **NT** | 2+ adults | Standard simultaneous witnessing |

**Universal rules across all states:**
- Witnesses must be 18+ and of sound mind
- Witnesses cannot be blind (must visually confirm signing)
- Beneficiaries cannot be witnesses (Witness Beneficiary Rule — voids their share)
- Physical pen signatures required (no digital signatures, except VIC remote witnessing)
- Both witnesses must be present at the same time as the testator signs

### 1.5 Digital Wills — Current Legal Status in Australia

| State | Digital Will Status | Notes |
|-------|-------------------|-------|
| **VIC** | Formally recognised | Wills Act 1997 includes "remote execution procedure" — wills can be signed and witnessed electronically over audio-visual link |
| **NSW** | Partial | Electronic Transactions Act allows some e-signatures, but Wills Act isn't comprehensive; courts have accepted iPhone notes as valid wills in exceptional circumstances (Wheatley v Peak [2025] NSWCA 265) |
| **Other states** | Not recognised | Law is either silent or specifically excludes wills from electronic transactions legislation |

**Key takeaway for MoneyQuest:** The platform should generate the will as a printable PDF for physical signing and witnessing. Digital/electronic execution should be treated as a future capability, with VIC as the only current exception. The platform should clearly guide users through state-specific signing instructions.

---

## 2. Existing Will Software (Competitive Research)

### 2.1 Safewill (Australia)

**Website:** [safewill.com](https://safewill.com)
**Founded:** 2017
**Users:** 100,000+ Australians

**How their builder works:**
- Guided questionnaire format — asks simple questions prepared by Australian lawyers
- Completion time: 20-30 minutes
- Available on desktop and mobile
- "Pause and resume" — start on one device, continue later
- Six main sections covering executors, guardians, beneficiaries, bequests, funeral wishes, and estate distribution
- Legal review by affiliated law firm (Safewill Legal) within 10-15 business days
- Military-grade encryption for personal data

**Features:**
- Executor appointment (primary and substitute)
- Guardian appointment for children
- Pet guardianship with pet fund
- Specific bequests (items, collections, monetary amounts)
- Residuary estate distribution (percentage-based)
- Funeral instructions (burial/cremation preferences)
- Charitable giving integration
- Comprehensive asset lists for executor reference
- Power of Attorney (separate product, $99)
- Will Registry integration

**Pricing (2026):**
- Individual will: ~$160 (promotional free periods via charity partnerships)
- Couples wills: ~$250
- Power of Attorney: $99
- Annual subscription for unlimited updates: $15/year (first 12 months free)
- Afterpay available (4 payments)

**Strengths:** Strong brand recognition, legal review included, charity partnerships drive adoption
**Weaknesses:** No testamentary trust support, no asset integration, limited to will creation

### 2.2 Willed (Australia)

**Website:** [willed.com.au](https://www.willed.com.au)
**Users:** 150,000+ Australians

**Features:**
- "Digital estate plan" concept — goes beyond the will document
- Completion time: under 20 minutes
- Legally valid across all Australian states and territories
- Checked by Australian lawyers
- Instant PDF download after completion
- Connections to legal professionals for complex situations
- Ongoing reminders about keeping estate plan current
- Educational resources about estate planning
- Independent executor service (for those without a suitable executor)

**Additional services:**
- Power of Attorney
- Probate services
- Letters of Administration
- Direct Cremations / Funeral Services / Prepaid Funeral Plans

**Pricing (2026):**
- Individual will: $159
- Couples wills: $238
- Annual subscription: $15/year (first year free)
- Support: online chat, email, phone (1300 945 533) — 8:30am-7pm EST, 7 days

**Strengths:** Broadest product range (wills + probate + funerals), "digital estate plan" positioning
**Weaknesses:** No asset integration, no testamentary trusts, no advisor/practice management

### 2.3 Bare (Australia)

**Website:** [bare.com.au](https://bare.com.au)
**Origin:** Started as Bare Cremation, expanded into end-of-life planning

**Features:**
- Emphasises simplicity — avoids legal jargon
- Guided questionnaire adapts to specific situation
- Completion time: 10-15 minutes (fastest in market)
- Free basic will kit available (8-step process)
- Premium will product includes legal review
- Instant PDF download
- State-specific guides (WA, SA, etc.)
- Cremation service integration (unique cross-sell)

**Pricing (2026):**
- Free basic will kit (no legal review)
- Premium will: quote-based (includes legal review)
- Annual updates: $15/year (first 12 months free)

**Strengths:** Fastest completion time, free tier drives adoption, cremation integration unique
**Weaknesses:** Less established as will platform, limited features vs Safewill/Willed

### 2.4 Gathered Here (Australia)

**Website:** [gatheredhere.com.au](https://info.gatheredhere.com.au)
**Origin:** Started as funeral comparison website

**Features:**
- Six-section will creation (10-15 minutes)
- Up to 3 executors
- Charitable giving — choose from featured organisations or search
- Specific gifts (dollar amounts, specific items, or collections)
- Funeral planning integration — request quotes from local funeral directors
- Download, print, and execute workflow
- End-of-life services marketplace

**Pricing (2026):**
- Free basic will (via Citro partnership)
- Pro review: ~$39
- Lifetime free updates (unique — no subscription model)
- Express service available

**Strengths:** Free tier, lifetime updates, funeral marketplace integration
**Weaknesses:** Less polished UX, limited estate planning features

### 2.5 LegalZoom (US — UX Reference)

**Website:** [legalzoom.com](https://www.legalzoom.com)

**UX Patterns worth noting:**
- Step-by-step questionnaire with plain-language prompts
- Fills in legal forms based on user answers (users never see raw legal text)
- Customizable templates
- Attorney review available as add-on
- Accessible to non-legal users of all ages
- Embedded legal services flow — partners can white-label the will creation experience
- Trust creation alongside wills (revocable living trusts)

**Relevance for MoneyQuest:** LegalZoom's "embedded legal services flow" is the closest parallel to what MoneyQuest could offer — a will builder embedded within a broader financial platform, rather than a standalone will product.

### 2.6 Family Office / Wealth Platforms

#### Masttro — Legacy Distribution Manager
- Heir assignment with percentage allocations
- Asset-to-entity-to-beneficiary mapping across complex structures
- Interactive visualization (not static charts)
- Role-based access (family members, advisors, legal counsel)
- Secure document storage for instructions and legal documentation
- Inheritance scenario simulation
- Global Wealth Map integration showing entities, trusts, assets, liabilities, and beneficiaries

#### Vanilla (justvanilla.com) — AI-Powered Estate Planning
- AI reads and interprets entire sets of estate planning documents
- Auto-fills family members, fiduciary roles, distributions, and trust structures
- Plan Snapshot shows asset distribution at death of either spouse
- Estate tax estimates and future wealth modelling (Waterfall diagram)
- Family tree visualization
- V/AI Copilot — chat interface for advisors to ask questions about estate plans
- Custom Prompt Extender for firm-specific analysis templates

#### Wealth.com — Tax & Estate Planning
- AI-powered continuous tax analysis
- Integrates with CRMs (Salesforce, Wealthbox, Redtail)
- Asset linking via Carta (equity), Coinbase (crypto), Zillow (real estate)
- Coordinated estate strategies across advisory teams

### 2.7 Pricing Comparison: Lawyer vs Online

| Channel | Cost Range | Turnaround | Complexity Support |
|---------|-----------|------------|-------------------|
| **DIY Will Kit** | $30-$80 | Immediate | Low (template only) |
| **Online Will Builder** | $100-$300 | Same day + 10-15 day review | Low-Medium |
| **Public Trustee** | Free-$200 | 2-4 weeks | Medium (if you're 60+ or pensioner, often free) |
| **Solicitor (Simple)** | $300-$600 | 1-2 weeks | Medium |
| **Solicitor (Complex)** | $1,000-$3,500+ | 2-4 weeks | High (trusts, businesses, blended families) |
| **Specialist Estate Lawyer** | $3,000-$10,000+ | 4-8 weeks | Very High (testamentary trusts, SMSF, multi-entity) |

---

## 3. Estate Planning Beyond Wills

### 3.1 Powers of Attorney (POA)

#### Types by State

| Type | Description | States |
|------|-------------|--------|
| **General POA** | Financial decisions while you have capacity; ends on loss of capacity | All states |
| **Enduring POA (Financial)** | Financial decisions; continues after loss of capacity | All states (naming varies) |
| **Enduring POA (Medical/Personal)** | Health and personal/lifestyle decisions | QLD, VIC (combined), SA, TAS, WA |
| **Medical Power of Attorney** | Specifically for medical treatment decisions | NSW, ACT |
| **Enduring Guardianship** | Personal/lifestyle decisions (not medical) | NSW |

**Key point:** Each state uses different terminology and forms. MoneyQuest must generate state-specific documents.

| State | Financial Decisions | Medical/Personal Decisions | Form |
|-------|-------------------|--------------------------|------|
| **NSW** | Enduring Power of Attorney | Enduring Guardianship + Advance Care Directive | Separate documents |
| **VIC** | Enduring Power of Attorney | Enduring Power of Attorney (Medical Treatment) | Can be combined |
| **QLD** | Enduring Power of Attorney (Financial) | Enduring Power of Attorney (Personal/Health) | Single form covers both |
| **SA** | Enduring Power of Attorney | Advance Care Directive | Separate documents |
| **WA** | Enduring Power of Attorney | Enduring Power of Guardianship | Separate documents |
| **TAS** | Enduring Power of Attorney | Enduring Guardian | Separate documents |
| **ACT** | Enduring Power of Attorney | Health Direction | Separate documents |
| **NT** | General/Enduring Power of Attorney | Advance Personal Plan | Separate documents |

### 3.2 Advance Health Directives

- Allows you to give directions about future healthcare when you cannot communicate
- Covers: life-sustaining treatment, pain management, artificial nutrition/hydration, organ donation
- Legally binding on health professionals in most states
- Different naming by state: Advance Health Directive (QLD), Advance Care Directive (SA, VIC), Advance Personal Plan (NT)
- Must be reviewed and updated regularly

### 3.3 Binding Death Benefit Nominations (BDBNs) — SMSF Critical

**This is a key differentiator for MoneyQuest given its SMSF entity type support.**

| Aspect | Details |
|--------|---------|
| **What it does** | Legally obligates the SMSF trustee to pay death benefits to nominated beneficiaries |
| **Eligible nominees** | Dependants (spouse, children, financial dependants) and/or Legal Personal Representative |
| **Witnessing** | Two adult witnesses who are NOT beneficiaries |
| **Lapsing vs Non-lapsing** | Lapsing BDBNs expire every 3 years and must be renewed; Non-lapsing BDBNs remain valid indefinitely (if SMSF deed allows) |
| **Reversionary pensions** | Alternative to BDBN — pension automatically continues to nominated beneficiary (only one reversionary nominee allowed) |
| **Estate coordination** | BDBN must be consistent with will; if super goes to estate via LPR, it can be caught up in estate claims; direct nomination to individuals avoids this |
| **Corporate trustee advantage** | Companies have infinite lifespan — fund continues on member death without administrative burden |

**Non-lapsing BDBN vs Lapsing BDBN:**
- Non-lapsing: remains valid until changed or revoked (requires SMSF deed to support this)
- Lapsing: expires after 3 years, must be renewed (default under SIS Act)
- **Risk:** If lapsing BDBN expires and member loses capacity, super may go to unintended recipients

**Types of super death benefit nominations:**
1. **Binding (lapsing)** — trustee must follow; expires in 3 years
2. **Binding (non-lapsing)** — trustee must follow; no expiry
3. **Non-binding** — trustee considers but has discretion
4. **Reversionary pension** — pension auto-continues to nominee; takes precedence over BDBN

### 3.4 Superannuation Nominations (Non-SMSF)

- Most retail/industry super funds offer binding and non-binding nominations
- Process varies by fund but generally simpler than SMSF BDBNs
- MoneyQuest can track which funds have nominations in place and their expiry dates

### 3.5 Trust Deeds and Documentation

For family trust workspaces, estate planning involves:
- **Trust deed review** — ensuring succession provisions are adequate
- **Appointor/Guardian succession** — who controls the trust after death (not governed by will)
- **Memorandum of Wishes** — non-binding guidance to trustees about how assets should be managed/distributed
- **Trust vesting** — trusts must vest within 80 years; planning for vesting date

### 3.6 Memorandum of Wishes / Statement of Wishes

- **Non-binding** document providing guidance to executors and trustees
- **Has "moral sway"** — courts consider it even though it's not legally binding
- Can be updated without changing the will
- Common uses:
  - Guidance to executors about asset distribution priorities
  - Guidance to guardians about child-rearing preferences
  - Explanation of why certain beneficiaries are excluded or receive less
  - Guidance to trustees of testamentary trusts and family discretionary trusts
  - Investment preferences and distribution philosophy

### 3.7 Family Agreements

- Binding financial agreements (prenuptial/postnuptial)
- Loan agreements between family members
- Shareholder agreements for family companies
- Partnership agreements
- Buy-sell agreements for business succession

---

## 4. Family Office / Wealth Context

### 4.1 Will and Entity Structure Relationship

MoneyQuest's entity types create a natural framework for estate planning:

| Entity Type | Estate Planning Relevance | Will Interaction |
|-------------|--------------------------|------------------|
| **Personal** | Primary will workspace — personal assets, bank accounts, investments | Direct — will governs these assets |
| **Trust** | Trust deed governs succession, NOT the will. Appointor/Guardian succession critical | Indirect — will should reference but cannot override trust deed |
| **SMSF** | BDBNs and reversionary pensions govern super distribution | Parallel — BDBN must coordinate with will but is a separate document |
| **Pty Ltd** | Shares in the company are personal assets governed by the will. Shareholder agreement may also apply | Direct — shares pass via will; company itself continues |
| **Sole Trader** | Business assets are personal assets | Direct — all assets governed by will |
| **Partnership** | Partnership agreement governs what happens to the partnership share | Mixed — partnership agreement takes precedence, but remaining assets via will |
| **Not-for-Profit** | N/A for most NFPs (no owners) | Minimal |

### 4.2 Asset Register Integration

MoneyQuest already tracks assets across multiple models that can feed into will/estate planning:

| Asset Source | Model | Data Available | Will Relevance |
|-------------|-------|----------------|----------------|
| **Fixed Assets** | `Asset` | Name, category, cost, net book value, location, serial number | Specific bequests, asset schedule for executor |
| **Personal Assets** | `PersonalAsset` | Name, category, current value, purchase date | Personal property distribution |
| **Personal Debts** | `PersonalDebt` | Name, category, balance, interest rate, lender | Liabilities that reduce estate value |
| **Bank Accounts** | `BankAccount` | Account name, institution, BSB, account number | Financial asset schedule |
| **Investments** | Via chart accounts / asset feed links | Holdings, current values | Investment distribution |
| **Property** | `PersonalAsset` (real estate category) or `Asset` | Address, value | Real property bequests |
| **Invoices Receivable** | `Invoice` | Outstanding amounts | Estate debts owed to deceased |

**Key opportunity:** MoneyQuest can auto-populate the will's asset schedule from existing ledger data, with the user confirming and adding non-tracked assets (e.g., jewellery, art, personal effects). This is a significant differentiator vs standalone will builders.

### 4.3 Beneficiary Management

MoneyQuest's `Contact` model already stores:
- Full name, email, phone, mobile
- Address (line 1, line 2, city, state, postcode, country)
- ABN (for organisational beneficiaries like charities)
- Relationship data via contact type

**Extension needed:** A `beneficiary_role` concept linking contacts to estate planning roles:
- Beneficiary (with allocation percentage or specific bequest)
- Executor (primary, substitute)
- Guardian (for minors)
- Trustee (of testamentary trusts)
- Attorney (POA — financial, medical)
- Witness (tracked but not stored as beneficiary — Witness Beneficiary Rule check)

### 4.4 Multi-Entity Considerations

A typical MoneyQuest family office user might have:
- **Personal workspace** — personal assets, bank accounts
- **Family Trust workspace** — investment properties, share portfolio
- **SMSF workspace** — superannuation assets
- **Company workspace** — business assets, shares

Estate planning must consider ALL entities holistically:
1. Personal will governs personal assets + shares in company + units in trust
2. SMSF BDBN governs super death benefits
3. Trust deed appointor succession governs who controls the family trust
4. Shareholder agreement (if any) governs company shares on death
5. Memorandum of wishes guides family trust trustees

**MoneyQuest advantage:** The platform already has `WorkspaceGroup` for grouping related entities. Estate planning can use this to show a holistic view across all family entities.

### 4.5 Advisor / Practice Management

How accountants and advisors interact with estate planning:
1. **Gap analysis** — identify which clients have wills, which don't, which are outdated
2. **Will creation** — guide clients through will builder or refer to solicitor
3. **BDBN management** — create and track BDBNs for SMSF clients
4. **Annual review** — prompt clients to review wills when circumstances change
5. **Document storage** — store signed copies securely in client file system
6. **Coordination** — ensure will, BDBNs, trust deeds, and POAs are consistent
7. **Task management** — practice tasks for estate planning reviews

This maps directly to MoneyQuest's existing Practice module:
- `PracticeTask` for tracking estate planning tasks
- `PracticeWorkspace` for advisor access to client workspaces
- `WorkspaceGroup` for grouping family entities
- `SigningDocument` for BDBNs and POAs that need signatures

---

## 5. Document Generation

### 5.1 How Will Builders Generate Documents

Current market approaches:

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **Template PDF with merge fields** | Pre-designed PDF templates with placeholder fields filled from user data | Clean output, consistent formatting | Rigid layout, hard to handle variable-length sections |
| **DOCX generation** | Server-side Word document generation (e.g., PHPWord, docx-templates) | Flexible formatting, user can edit | Formatting inconsistencies, requires Word to view |
| **HTML-to-PDF** | Generate HTML from templates, convert to PDF (e.g., Puppeteer, wkhtmltopdf, Laravel DomPDF) | Full control over layout, dynamic sections | CSS-to-PDF rendering can be inconsistent |
| **LaTeX-to-PDF** | Generate LaTeX markup, compile to PDF | Professional legal document quality | Complex setup, overkill for most use cases |

**Recommended for MoneyQuest:** HTML-to-PDF using Laravel DomPDF or Puppeteer. This aligns with the existing invoice PDF generation pattern and allows:
- Dynamic sections (testamentary trusts only if selected)
- Variable-length beneficiary lists
- State-specific clauses injected based on user's state
- Consistent branding

### 5.2 Merge Fields from MoneyQuest

| Field Category | Source | Fields |
|---------------|--------|--------|
| **Testator** | User profile + Workspace | Full legal name, address, date of birth, occupation |
| **Executor(s)** | Contact | Name, address, relationship |
| **Guardian(s)** | Contact | Name, address, relationship |
| **Beneficiaries** | Contact + Will config | Name, address, relationship, allocation (% or specific item) |
| **Specific Bequests** | Will config + Asset/PersonalAsset | Item description, value, beneficiary |
| **Residuary Estate** | Will config | Beneficiary names, percentages |
| **Assets Schedule** | Asset, PersonalAsset, BankAccount | Full asset inventory with current values |
| **Liabilities** | PersonalDebt, Loan | Outstanding debts affecting estate |
| **Entity References** | Workspace (trust, company, SMSF) | Entity name, ABN, trustee details |
| **Super/SMSF** | SMSF workspace | Fund name, member details, BDBN status |

### 5.3 Versioning

Will documents require robust versioning:
- Each save creates a new version (draft versions)
- "Finalise" action locks a version and generates the PDF
- Signed copy uploaded as attachment (photo/scan of signed document)
- Version history shows all changes with timestamps
- "Codicil" support — amendments to existing wills without full rewrite
- "Revoke and replace" — new will explicitly revokes previous versions

### 5.4 Storage

| Document | Storage Location | Security |
|----------|-----------------|----------|
| Draft will data | Database (JSON payload on Will model) | Workspace-scoped, encrypted at rest |
| Generated PDF | File system (056-FEX) / Vercel Blob | Workspace-scoped, access-controlled |
| Signed copy (uploaded) | File system (056-FEX) / Vercel Blob | Workspace-scoped, access-controlled |
| BDBN documents | SigningDocument (059-DGS) | Practice + workspace scoped |
| POA documents | File system (056-FEX) | Workspace-scoped |

---

## 6. Integration Points with MoneyQuest

### 6.1 Module Integration Map

```
060-WEP Will & Estate Planning
├── 059-DGS Document Signing
│   ├── BDBN execution (witness signatures)
│   ├── POA execution
│   └── Will witnessing instructions (note: physical signing required in most states)
│
├── 056-FEX File Explorer
│   ├── Generated will PDF stored per entity
│   ├── Signed copy upload and storage
│   ├── POA documents
│   ├── BDBN copies
│   └── Supporting documents (trust deeds, memorandum of wishes)
│
├── 006-CCM Contacts
│   ├── Beneficiaries are contacts with estate planning roles
│   ├── Executors are contacts
│   ├── Guardians are contacts
│   ├── Trustees (testamentary trust) are contacts
│   └── Attorneys (POA) are contacts
│
├── 012-ATT Fixed Assets + PersonalAsset + PersonalDebt
│   ├── Asset register feeds will's asset schedule
│   ├── Net worth calculation informs estate value
│   ├── Debt register informs estate liabilities
│   └── Asset changes trigger "will needs updating" alerts
│
├── 015-ACT / 027-PMV Practice Management
│   ├── Advisor manages will creation for clients
│   ├── Practice tasks for estate planning reviews
│   ├── Gap analysis: which clients have/don't have wills
│   ├── BDBN expiry tracking and renewal tasks
│   └── Annual estate plan review workflow
│
├── 019-YEA / Groups
│   ├── Family group shows estate planning status per entity
│   ├── Holistic view: will + BDBN + trust deed + POA status
│   ├── Cross-entity beneficiary mapping
│   └── Net worth dashboard integration
│
├── 017-BAS Bank Accounts
│   ├── Bank account details for asset schedule
│   └── Signatory information
│
├── 021-AIQ AI Chatbot
│   ├── Estate planning questions ("Do I need a testamentary trust?")
│   ├── Will completeness check
│   └── BDBN expiry reminders
│
├── 024-NTF Notifications
│   ├── "Will needs review" alerts on asset changes
│   ├── BDBN expiry warnings (90/60/30 days)
│   ├── Annual estate plan review reminders
│   └── Life event prompts (marriage, divorce, birth, property purchase)
│
└── 036-GMF Gamification
    ├── "Estate Plan Complete" badge
    ├── "BDBN Up to Date" badge
    └── Estate planning health score component
```

### 6.2 Contact Model Extension

The existing `Contact` model needs a many-to-many relationship with estate planning documents:

```
contact_estate_roles (pivot table)
├── contact_id
├── estate_document_id (will_id or bdbn_id or poa_id)
├── estate_document_type (will, bdbn, poa)
├── role (beneficiary, executor, guardian, trustee, attorney, witness)
├── allocation_percentage (nullable — for residuary estate)
├── allocation_description (nullable — for specific bequests)
└── priority (1=primary, 2=substitute)
```

### 6.3 Asset Change Detection

When assets change in the system, the will module should flag:
- New asset added (property, investment, bank account)
- Asset disposed or sold
- Significant value change (>20% of estate value)
- New debt added
- Contact/beneficiary archived or deleted
- Entity type changed
- New workspace created in the group

---

## 7. UX Patterns for Will Builders

### 7.1 Step-by-Step Wizard (Recommended for MVP)

All successful will builders use a wizard pattern. Based on competitive analysis:

**Recommended Steps:**

| Step | Title | Content |
|------|-------|---------|
| 1 | **About You** | Legal name, DOB, address, state (determines legal requirements), marital status, children |
| 2 | **Your Executors** | Appoint primary executor, substitute executor; explain role; select from contacts or add new |
| 3 | **Guardianship** | If children under 18: appoint guardian(s); pet guardianship; explain role |
| 4 | **Your Assets** | Auto-populated from ledger (assets, bank accounts, investments); add missing items; confirm values |
| 5 | **Specific Gifts** | Named gifts of specific items/amounts to specific people; charitable bequests |
| 6 | **Residuary Estate** | Everything else — percentage split between beneficiaries |
| 7 | **Testamentary Trusts** | Optional: create trust(s) for asset protection, minor children, vulnerable beneficiaries |
| 8 | **Funeral Wishes** | Burial/cremation/donation, ceremony preferences, location |
| 9 | **Review & Confirm** | Full summary of all sections; edit any section; generate document |
| 10 | **Download & Sign** | State-specific signing instructions; PDF download; upload signed copy |

### 7.2 Handling Complex Scenarios

| Scenario | UX Approach |
|----------|-------------|
| **Blended families** | Step 1 asks about previous relationships and children from each; Step 6 shows clear allocation across all children |
| **Business succession** | Detects company/partnership workspaces; prompts for shareholder agreement and business succession plan |
| **Testamentary trusts** | Optional Step 7 — only shown if user selects "Yes" to "Do you want to protect assets in a trust?"; explains benefits in plain language |
| **SMSF coordination** | Detects SMSF workspace; prompts to review/create BDBN; warns if BDBN contradicts will |
| **Multi-entity families** | Shows entity map from WorkspaceGroup; highlights what's governed by will vs trust deed vs BDBN |
| **International assets** | Flag that international assets may require a separate will in that jurisdiction |

### 7.3 Review & Summary Page

Before generating the document:
- Full visual summary of all choices
- Each section expandable/collapsible
- "Edit" button per section returns to that wizard step
- Asset schedule with current values from ledger
- Beneficiary distribution visualization (pie chart or bar chart)
- Warnings/alerts (e.g., "No substitute executor appointed", "Beneficiary is also a witness")
- Legal disclaimer prominently displayed

### 7.4 "Needs Updating" Alerts

Trigger alerts when:
- Asset added/removed/disposed (Asset, PersonalAsset models)
- Property purchased or sold
- Marriage, divorce, or new child (user profile changes)
- Beneficiary contact deleted or archived
- Executor contact deleted or archived
- BDBN expired or approaching expiry
- More than 12 months since last review
- Significant net worth change (>20%)
- New entity created in the family group

Alert should appear:
- On the estate planning dashboard
- In the notification centre (024-NTF)
- In the practice advisor's task list (if advisor-managed)
- As a feed item in the attention queue

---

## 8. Feature List with Priorities

### Must-Have (MVP)

| # | Feature | Justification |
|---|---------|---------------|
| 1 | **Simple will wizard** (10-step flow) | Core product — covers 80% of users |
| 2 | **Executor appointment** (primary + substitute) | Legal requirement |
| 3 | **Beneficiary designation** (contacts integration) | Core will component |
| 4 | **Specific bequests** | Common will component |
| 5 | **Residuary estate allocation** (percentage-based) | Required — covers everything not specifically bequeathed |
| 6 | **Guardian appointment** (minors) | Critical for parents |
| 7 | **Asset schedule** (auto-populated from ledger) | Key differentiator vs competitors |
| 8 | **PDF generation** (state-specific) | Output format — printable for signing |
| 9 | **State-specific signing instructions** | Legal compliance |
| 10 | **Will versioning** | Track changes over time |
| 11 | **Signed copy upload** | Proof of execution |
| 12 | **File storage integration** (056-FEX) | Secure document storage |
| 13 | **"Will needs review" alerts** | Triggered by asset/contact changes |
| 14 | **Legal disclaimers** | Risk mitigation — "not legal advice" |
| 15 | **Estate planning dashboard** | Status overview: will, POA, BDBN |

### Should-Have (v1.1)

| # | Feature | Justification |
|---|---------|---------------|
| 16 | **Power of Attorney wizard** (financial + medical) | Second most important estate planning document |
| 17 | **BDBN creation and tracking** (SMSF workspaces) | Critical for SMSF users |
| 18 | **BDBN expiry notifications** | Prevents lapsed BDBNs |
| 19 | **Testamentary trust option** in will wizard | High-value feature for wealthy families |
| 20 | **Practice advisor estate planning view** | Advisors need to manage clients' estate plans |
| 21 | **Gap analysis dashboard** (practice) | Which clients have/don't have wills, POAs, BDBNs |
| 22 | **Funeral wishes section** | Common request |
| 23 | **Pet guardianship** | Increasingly common |
| 24 | **Document signing integration** (059-DGS) for BDBNs | BDBNs need witnessed signatures |
| 25 | **Contact role tagging** (beneficiary, executor, guardian, etc.) | Clarity on who plays what role |

### Nice-to-Have (v2)

| # | Feature | Justification |
|---|---------|---------------|
| 26 | **Memorandum of Wishes wizard** | Supplements will and trust deeds |
| 27 | **Advance Health Directive wizard** | Completes estate planning suite |
| 28 | **Multi-entity estate map visualization** | Shows which assets flow via will, BDBN, trust deed |
| 29 | **Inheritance scenario simulator** | "What if" modelling for estate distribution |
| 30 | **Beneficiary distribution visualization** (pie charts, flow diagrams) | Visual clarity |
| 31 | **Annual review workflow** (automated) | Scheduled reviews with practice tasks |
| 32 | **Codicil support** | Will amendments without full rewrite |
| 33 | **Digital assets section** | Cryptocurrency, online accounts, social media |
| 34 | **AI-powered will review** | AI checks for common issues (similar to Vanilla V/AI) |
| 35 | **Mirror/mutual will support** (couples) | Couples-specific workflow |
| 36 | **Family agreement templates** | Loan agreements, buy-sell, shareholder agreements |
| 37 | **Estate administration workflow** (post-death) | Probate task tracking, asset distribution tracking |
| 38 | **Superannuation nomination tracker** (non-SMSF) | Track nominations across all super funds |
| 39 | **Trust deed succession planning** | Appointor/guardian succession documentation |
| 40 | **International asset flagging** | Warn about assets requiring foreign wills |

---

## 9. Competitive Comparison Table

| Feature | Safewill | Willed | Bare | Gathered Here | LegalZoom | MoneyQuest (Proposed) |
|---------|----------|--------|------|--------------|-----------|----------------------|
| **Pricing** | ~$160 | $159 | Free-Quote | Free-$39 | ~$99 USD | Included in platform |
| **Completion Time** | 20-30 min | 15-20 min | 10-15 min | 10-15 min | 20-30 min | 15-25 min |
| **Legal Review** | Included | Premium add-on | Premium | Included | Add-on | Advisor review (practice) |
| **Simple Will** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Testamentary Trust** | No | No | No | No | Trusts (US) | Yes (v1.1) |
| **POA** | Separate ($99) | Separate | No | No | Separate | Integrated (v1.1) |
| **BDBN (SMSF)** | No | No | No | No | No | Yes (v1.1) |
| **Asset Integration** | Manual entry | Manual entry | Manual entry | Manual entry | Manual entry | **Auto-populated from ledger** |
| **Contact Integration** | None | None | None | None | None | **Contacts as beneficiaries** |
| **Multi-Entity View** | No | No | No | No | No | **Yes (WorkspaceGroup)** |
| **Advisor/Practice Portal** | No | No | No | No | No | **Yes (Practice module)** |
| **Document Signing** | No | No | No | No | No | **Yes (059-DGS)** |
| **File Storage** | Basic | Basic | Download only | Download only | Basic | **Full file system (056-FEX)** |
| **Needs Updating Alerts** | No | Reminders | No | No | No | **Yes (asset/contact change detection)** |
| **Couples/Mirror Wills** | Yes | Yes | No | No | Yes | v2 |
| **Funeral Planning** | Basic | Integrated | Integrated | Integrated | No | Basic |
| **Charity Integration** | No | No | No | Yes | No | Via contacts |
| **Version History** | Basic | Basic | No | No | Basic | Full audit trail |
| **Annual Subscription** | $15/yr | $15/yr | $15/yr | Free lifetime | Varies | Included in platform |
| **AI Features** | No | No | No | No | No | **AI chatbot (021-AIQ)** |
| **Mobile** | Yes | Yes | Yes | Yes | Yes | Yes (responsive) |

**MoneyQuest's Key Differentiators:**
1. **Asset integration** — auto-populated from ledger data (no manual entry)
2. **Multi-entity awareness** — understands trusts, SMSFs, companies, and personal assets
3. **BDBN management** — no consumer will platform handles this
4. **Advisor portal** — practice management integration for accountants/advisors
5. **Change detection** — alerts when assets change and will needs review
6. **Holistic view** — will + BDBN + POA + trust succession in one platform
7. **No additional cost** — included in platform subscription

---

## 10. Recommended Phasing

### Phase 1: MVP — Simple Will Builder (4-6 weeks)

**Goal:** Launch a simple will builder that leverages existing MoneyQuest data.

**Scope:**
- 10-step will creation wizard
- Simple will only (no testamentary trusts)
- Executor and guardian appointment
- Beneficiaries from contacts
- Asset schedule auto-populated from ledger
- Specific bequests and residuary estate allocation
- State-specific PDF generation
- Signed copy upload to file system
- Will versioning (draft/finalised)
- "Will needs review" notifications
- Estate planning dashboard (per workspace)
- Legal disclaimers throughout

**Backend:**
- `Will` model (workspace-scoped)
- `WillVersion` model (tracks each version)
- `WillBeneficiary` pivot (contact + role + allocation)
- `WillBequest` model (specific gifts)
- `WillAsset` model (snapshot of assets at will creation time)
- Will PDF generation action (HTML-to-PDF, state-specific templates)
- Estate planning status API endpoints
- Asset change detection listener

**Frontend:**
- Will creation wizard (React Hook Form + Zod per step)
- Estate planning dashboard page
- Will detail/review page
- PDF preview (DocumentSplitView reuse)

### Phase 2: POA + BDBN + Advisor (4-6 weeks)

**Goal:** Complete the estate planning suite with POA, BDBN, and advisor tools.

**Scope:**
- Power of Attorney wizard (financial + medical, state-specific)
- BDBN creation and tracking for SMSF workspaces
- BDBN expiry notifications and renewal workflow
- Testamentary trust option in will wizard
- Practice advisor estate planning view
- Gap analysis dashboard (practice-level)
- Document signing integration (059-DGS) for BDBNs
- Contact role tagging (beneficiary, executor, guardian, attorney)
- Pet guardianship and funeral wishes

**Backend:**
- `PowerOfAttorney` model
- `BindingDeathBenefitNomination` model (workspace-scoped to SMSF)
- `EstatePlanningRole` pivot (contact + document + role)
- POA PDF generation (state-specific templates)
- BDBN PDF generation
- Practice estate planning API endpoints
- BDBN expiry scheduler (console command)

### Phase 3: Advanced Features (6-8 weeks)

**Goal:** Differentiate with visualisation, AI, and advanced planning tools.

**Scope:**
- Multi-entity estate map visualization
- Inheritance scenario simulator
- Memorandum of Wishes wizard
- Advance Health Directive wizard
- AI-powered will review (021-AIQ integration)
- Annual review workflow with automated practice tasks
- Codicil support
- Mirror/mutual will support (couples)
- Digital assets section
- Family agreement templates
- Trust deed succession planning tools
- Superannuation nomination tracker (non-SMSF)

---

## 11. Integration Map with Existing Modules

```
                    ┌─────────────────────────────────────────────────┐
                    │           060-WEP Estate Planning               │
                    │  ┌─────────┐ ┌──────┐ ┌──────┐ ┌───────────┐  │
                    │  │  Will   │ │ POA  │ │ BDBN │ │ Memo of   │  │
                    │  │ Builder │ │Wizard│ │Mgmt  │ │ Wishes    │  │
                    │  └────┬────┘ └──┬───┘ └──┬───┘ └─────┬─────┘  │
                    └───────┼─────────┼────────┼───────────┼────────┘
                            │         │        │           │
         ┌──────────────────┼─────────┼────────┼───────────┼──────────────────┐
         │                  │         │        │           │                  │
    ┌────▼────┐       ┌─────▼───┐ ┌───▼───┐ ┌─▼──────┐ ┌──▼─────┐    ┌──────▼──────┐
    │006-CCM  │       │056-FEX  │ │059-DGS│ │Entity  │ │012-ATT │    │015/027-PMV  │
    │Contacts │       │Files    │ │Signing│ │Types   │ │Assets  │    │Practice Mgmt│
    │         │       │         │ │       │ │        │ │        │    │             │
    │Benefic- │       │Will PDF │ │BDBN   │ │Personal│ │Asset   │    │Gap Analysis │
    │iaries,  │       │POA PDF  │ │signing│ │Trust   │ │Schedule│    │Task Tracking│
    │Executors│       │BDBN doc │ │POA    │ │SMSF    │ │Net     │    │Client       │
    │Guardians│       │Signed   │ │signing│ │Pty Ltd │ │Worth   │    │Review       │
    │Attorneys│       │copies   │ │       │ │Sole Tr │ │Debts   │    │Workflow     │
    └─────────┘       └─────────┘ └───────┘ └────────┘ └────────┘    └─────────────┘
         │                                       │          │               │
    ┌────▼────────────────────────────────────────▼──────────▼───────────────▼────┐
    │                        Cross-Cutting Integrations                          │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
    │  │024-NTF   │  │021-AIQ   │  │036-GMF   │  │019-YEA   │  │017-BAS   │    │
    │  │Notific-  │  │AI Chat   │  │Gamific-  │  │Groups &  │  │Bank      │    │
    │  │ations    │  │          │  │ation     │  │Net Worth │  │Accounts  │    │
    │  │          │  │Estate    │  │          │  │          │  │          │    │
    │  │Review    │  │planning  │  │Estate    │  │Family    │  │Account   │    │
    │  │alerts,   │  │questions,│  │plan      │  │entity    │  │details   │    │
    │  │BDBN      │  │will      │  │badges,   │  │estate    │  │for asset │    │
    │  │expiry    │  │complete- │  │health    │  │plan      │  │schedule  │    │
    │  │warnings  │  │ness      │  │score     │  │overview  │  │          │    │
    │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
    └──────────────────────────────────────────────────────────────────────────────┘
```

### Existing Code Touchpoints

| Module | Model/File | Integration Type |
|--------|-----------|-----------------|
| Contacts | `app/Models/Tenant/Contact.php` | Beneficiaries, executors, guardians, attorneys |
| Assets | `app/Models/Tenant/Asset.php` | Fixed asset register for will schedule |
| Personal Assets | `app/Models/Tenant/PersonalAsset.php` | Personal property for will |
| Personal Debts | `app/Models/Tenant/PersonalDebt.php` | Estate liabilities |
| Bank Accounts | `app/Models/Tenant/BankAccount.php` | Financial asset details |
| Workspace | `app/Models/Tenant/Workspace.php` | Entity type detection (SMSF, trust, etc.) |
| Entity Types | `app/Enums/EntityType.php` | Determines estate planning requirements per entity |
| File Storage | `app/Models/Tenant/File.php` + `FileFolder.php` | Will PDF and signed copy storage |
| Document Signing | `app/Models/Central/SigningDocument.php` | BDBN and POA signing workflow |
| Signing Templates | `app/Enums/Signing/DocumentTemplateCategory.php` | Needs new category: "Estate Planning" |
| Practice | `app/Models/Central/Practice.php` | Advisor access to estate planning |
| Practice Tasks | `app/Models/Central/PracticeTask.php` | Estate planning review tasks |
| Groups | `app/Models/Central/WorkspaceGroup.php` | Family entity grouping for holistic view |
| Notifications | `app/Models/Tenant/Notification.php` | Review alerts, BDBN expiry |
| Gamification | `app/Models/Tenant/Badge.php` | Estate planning badges |

---

## 12. Key Legal Considerations & Disclaimers

### 12.1 Mandatory Disclaimers

The platform MUST prominently display these disclaimers:

1. **"Not Legal Advice"** — "MoneyQuest provides tools to help you create estate planning documents. This is not legal advice. We recommend consulting a qualified solicitor, especially for complex estates."

2. **"No Lawyer-Client Relationship"** — "Using MoneyQuest's estate planning tools does not create a lawyer-client relationship."

3. **"State-Specific Requirements"** — "Will requirements vary by state and territory. Ensure you follow the signing and witnessing instructions for your specific state."

4. **"Professional Review Recommended"** — "We strongly recommend having your will reviewed by a qualified solicitor before signing, particularly if you have: a blended family, business interests, assets over $1M, an SMSF, international assets, or a testamentary trust."

5. **"Will Only Covers Personal Assets"** — "Your will governs your personal assets. Trust assets, superannuation, and jointly-owned assets may be distributed differently. Ensure your estate plan is coordinated across all your entities."

6. **"BDBN Disclaimer"** — "Binding Death Benefit Nominations must comply with your SMSF trust deed and superannuation legislation. We recommend having your BDBN reviewed by an SMSF specialist or solicitor."

### 12.2 Legal Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Invalid will** | Clear state-specific signing instructions; validation checks (beneficiary not a witness); recommended legal review |
| **Outdated will** | Change detection alerts; annual review reminders; BDBN expiry tracking |
| **Conflicting documents** | Cross-reference will vs BDBN vs trust deed; warnings when potential conflicts detected |
| **Testamentary capacity** | Not a software problem, but include educational content about capacity requirements |
| **Undue influence** | Include statement that will was created voluntarily; privacy of will creation process |
| **Platform liability** | Terms of service with clear liability limitations; indemnification clause; professional review recommendation |
| **Data security** | Encryption at rest and in transit; workspace-scoped access; audit logging; GDPR/Privacy Act compliance |
| **Regulatory compliance** | Each state's Wills Act compliance; succession legislation monitoring; regular legal review of templates |

### 12.3 Regulatory Framework

| Legislation | State | Relevance |
|------------|-------|-----------|
| Succession Act 2006 | NSW | Will validity, intestacy, family provision |
| Wills Act 1997 | VIC | Will validity, electronic wills |
| Succession Act 1981 | QLD | Will validity, intestacy |
| Wills Act 1936 | SA | Will validity |
| Wills Act 1970 | WA | Will validity |
| Wills Act 2008 | TAS | Will validity |
| Wills Act 1968 | ACT | Will validity |
| Wills Act 2000 | NT | Will validity |
| SIS Act 1993 | Federal | SMSF BDBN requirements |
| Powers of Attorney Act | Varies by state | POA validity and requirements |
| Guardianship Act | Varies by state | Enduring guardianship |

### 12.4 Professional Indemnity

MoneyQuest should consider:
- Professional indemnity insurance covering estate planning tools
- Clear terms of service limiting liability
- Mandatory "I understand this is not legal advice" acknowledgment before will generation
- Recommendation to seek independent legal advice displayed at multiple points
- Option for users to connect with a solicitor through a referral network

---

## Sources

### Australian Will Software
- [Safewill — Write Your Australian Will Online](https://safewill.com)
- [Safewill Pricing](https://safewill.com/pricing)
- [Willed — Online Wills Australia](https://www.willed.com.au/)
- [Willed Pricing](https://www.willed.com.au/pricing)
- [Bare — Your Personalised Will Kit](https://bare.com.au/wills)
- [Gathered Here — How the online wills platform works](https://info.gatheredhere.com.au/knowledge/how-the-online-wills-platform-works)
- [Legasy — Compare Online Will Services](https://legasy.com.au/wills/platforms/)
- [Legasy — Willed vs SafeWill](https://legasy.com.au/willed-vs-safewill-online-will-platforms-australia/)
- [Will Hero — Best Online Will Services 2026](https://www.willhero.com.au/blog/best-online-will-services-australia-2026/)

### Australian Legal Requirements
- [Victoria Legal Aid — Making a Valid Will](https://www.legalaid.vic.gov.au/making-valid-will)
- [NSW State Library — Making a Valid Will](https://www.sl.nsw.gov.au/find-legal-answers/books-online/rest-assured-legal-guide-wills-estates-planning-ahead-and-funerals/making-a-valid-will)
- [SA Law Handbook — Signing and Witnessing a Will](https://www.lawhandbook.sa.gov.au/ch36s01s03.php)
- [Will Hero — How to Make a Legally Valid Will](https://www.willhero.com.au/blog/how-to-make-a-legally-valid-will-in-australia/)
- [Will Hero — Sign and Witness Your Will State-by-State](https://www.willhero.com.au/blog/how-to-sign-and-witness-your-will-correctly/)

### Digital/Electronic Wills
- [Law Society Journal — Exploring Electronic Wills](https://lsj.com.au/articles/exploring-the-legal-implications-of-electronic-wills/)
- [Law Society SA — Electronic Will Signing Legislative Landscape](https://bulletin.lawsocietysa.asn.au/Bulletin/Bulletin/Content/Articles/2024/May/Electronic_will_signing.aspx)
- [Willed — Is a Digital Will Legal?](https://www.willed.com.au/guides/is-a-digital-will-legal)
- [KD & Co Lawyers — Electronic Wills in Australia](https://www.kdandcolawyers.com/post/electronic-wills-australia-future-estate-planning)

### Estate Planning
- [ATO — Estate Planning](https://www.ato.gov.au/businesses-and-organisations/corporate-tax-measures-and-assurance/privately-owned-and-wealthy-groups/tax-governance/tax-governance-guide-for-privately-owned-groups/estate-planning)
- [DBA Lawyers — Binding Death Benefit Nomination](https://www.dbalawyers.com.au/binding-death-benefit-nomination/)
- [DBA Lawyers — Binding v Non-binding BDBN](https://www.dbalawyers.com.au/smsf-strategy/binding-v-non-binding-death-benefit-nominations/)
- [ATO — Superannuation Death Benefits](https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/superannuation-death-benefits)
- [SMSF Australia — Binding Death Benefit](https://smsfaustralia.com.au/binding-death-benefit/)
- [Crystal Lawyers — BDBN Checklist](https://www.crystallawyers.com.au/post/a-checklist-for-creating-a-binding-death-benefit-nomination-for-your-smsf)
- [Superguide — Reversionary Pensions](https://www.superguide.com.au/in-retirement/reversionary-pensions)
- [Moneysmart — Who Gets Your Super If You Die](https://moneysmart.gov.au/media-centre/who-gets-your-super-if-you-die)
- [Estate First Lawyers — Family Trust, SMSF & Business Estate Planning](https://estatefirst.com.au/estate-planning/family-trust-business-structures)
- [BOA & CO — SMSF Estate Planning](https://boanco.com.au/2026/02/11/estate-planning-and-wealth-transition-for-smsf-trustees-and-families/)

### Powers of Attorney & Advance Directives
- [QLD Government — Advance Health Directive](https://www.qld.gov.au/law/legal-mediation-and-justice-of-the-peace/power-of-attorney-and-making-decisions-for-others/advance-health-directive)
- [QLD Government — POA & AHD Forms](https://www.publications.qld.gov.au/dataset/power-of-attorney-and-advance-health-directive-forms)
- [Quick Laws — POA vs Health Directive](https://www.quicklaws.com.au/news/what-is-the-difference-between-a-power-of-attorney-and-a-health-directive)

### Testamentary Trusts
- [FGD — Testamentary Trusts](https://www.fgd.com.au/estates/testamentary-trusts)
- [D Davis — Simple Wills vs Testamentary Trust Wills](https://www.ddavis.com.au/blog/2024/december/simple-will-v-testamentary-trust/)
- [Campus Lawyers — Ultimate Guide to Testamentary Trust Wills](https://campuslawyers.com.au/testamentary-trust/)
- [BlueRock — Benefits of Testamentary Trusts](https://www.bluerock.com.au/resources/the-benefits-of-testamentary-trusts/)

### Memorandum of Wishes
- [Coleman Greig — Statement of Wishes](https://colemangreig.com.au/insights/publications/statement-of-wishes/)
- [Carroll & O'Dea — Letters of Wishes](https://www.codea.com.au/sub-publication/letters-wishes-role-estate-planning/)
- [RS Law — Letter of Wishes](https://rslaw.com.au/wills-estate-planning/letter-of-wishes/)

### Family Office / Wealth Platforms
- [Masttro — Family Office Estate Planning Software](https://masttro.com/insights/family-office-estate-planning-software)
- [Vanilla — AI-Powered Estate Visualizations](https://www.justvanilla.com/ai-powered-estate-visualizations)
- [Vanilla — AI-Powered Estate Planning Innovations](https://www.justvanilla.com/blog/vanilla-announces-new-ai-powered-estate-planning-innovations)
- [Wealth.com — Estate Planning Software](https://www.wealth.com/)
- [Asset-Map — Estate Planning Software](https://www.asset-map.com/estate-planning-software)

### Will Pricing
- [Canstar — How Much Does a Will Cost?](https://www.canstar.com.au/life-insurance/will-cost/)
- [Willed — How Much Does a Will Cost?](https://www.willed.com.au/guides/how-much-does-a-will-cost)
- [McDonnell Schroder — Cost of Making a Will](https://mcdonnellschroder.com.au/how-much-does-a-will-cost-to-prepare-in-australia/)

### UX Patterns
- [Eleken — Wizard UI Pattern](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [UX Planet — Wizard Design Pattern](https://uxplanet.org/wizard-design-pattern-8c86e14f2a38)
- [Succession Wills — Will Builder Guide](https://web.successionwills.com/will-builder-guide/)
