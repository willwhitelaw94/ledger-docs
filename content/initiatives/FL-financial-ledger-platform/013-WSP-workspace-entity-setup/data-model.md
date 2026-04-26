---
title: "Data Model: 013-WSP Workspace Entity Setup"
---

# Data Model: 013-WSP Workspace Entity Setup

**Epic**: 013-WSP | **Created**: 2026-03-14

---

## Entity Relationship Overview

```
Organisation (central)
    └── Workspace (tenant) ← adds: entity_type, abn, legal_name, questionnaire_snapshot
            └── ChartAccount ← sub_type references AccountSubType enum

CoaBaseTemplate ──── CoaBaseTemplateAccount
CoaOverlayModule ─── CoaOverlayAccount

EntityType enum (new)
AccountSubType enum (expanded: 15 → ~70)
```

---

## Workspaces (additions)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `entity_type` | enum(EntityType) | yes | Set at wizard Stage 1 |
| `abn` | varchar(11) | yes | Digits only, validated by check-digit |
| `legal_name` | varchar(255) | yes | Registered name, may differ from `name` |
| `questionnaire_snapshot` | json | yes | Read-only audit of flags at creation |

---

## coa_base_templates

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `name` | varchar(255) | e.g. "Sole Trader — Trades" |
| `entity_type` | varchar(50) | matches EntityType values |
| `industry` | varchar(50) | trades, professional_services, retail, hospitality, agriculture, healthcare, property, other |
| `description` | text | nullable |
| `priority` | int default 0 | tie-breaking |
| `is_active` | bool | deactivated templates not selectable |

---

## coa_base_template_accounts

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `template_id` | FK → coa_base_templates | cascade delete |
| `code` | varchar(20) | |
| `name` | varchar(255) | |
| `type` | enum(asset,liability,equity,revenue,expense) | |
| `parent_code` | varchar(20) | nullable — resolved at seeding |
| `default_tax_code` | varchar(20) | nullable |
| `sub_type` | AccountSubType enum | required |
| `is_system` | bool default false | system accounts locked in workspace |
| `reasoning` | varchar(500) | nullable — displayed on Stage 3 review |
| `sort_order` | int default 0 | |

---

## coa_overlay_modules

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `name` | varchar(255) | e.g. "Employees & Payroll" |
| `flag_key` | varchar(50) | has_employees, has_vehicles, has_inventory, has_property, gst_registered, invoices_clients, buys_on_credit, has_loans, has_subcontractors |
| `description` | text | nullable |
| `is_active` | bool | |

---

## coa_overlay_accounts

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `overlay_id` | FK → coa_overlay_modules | cascade delete |
| `code` | varchar(20) | |
| `name` | varchar(255) | |
| `type` | enum | |
| `parent_code` | varchar(20) | nullable |
| `default_tax_code` | varchar(20) | nullable |
| `sub_type` | AccountSubType enum | required |
| `is_system` | bool default false | |
| `reasoning` | varchar(500) | nullable |
| `sort_order` | int default 0 | |

---

## State Transitions

### Wizard flow (transient — no DB state until Stage 3 finalised)

```
Start → [Stage 1: entity + ABN] → [Stage 2: flags] → [Stage 3: review] → Workspace created
                                                                         ↑
                                   Close at any stage → discard (no DB write)
```

### Template account → Workspace chart account

```
CoaBaseTemplateAccount  ──┐
                           ├─ AssembleCoaPreview ─→ merged list ─→ SeedChartOfAccounts ─→ ChartAccount (workspace)
CoaOverlayAccount       ──┘
```

---

## Indexes

```sql
-- Template lookup
CREATE INDEX idx_coa_base_templates_entity_industry ON coa_base_templates(entity_type, industry, is_active);
CREATE INDEX idx_coa_overlay_modules_flag ON coa_overlay_modules(flag_key, is_active);

-- Workspace
CREATE INDEX idx_workspaces_entity_type ON workspaces(entity_type);
```
