---
title: "Data Model: Bank Account Setup & Feed Connection"
---

# Data Model: Bank Account Setup & Feed Connection

No new tables or migrations required. All columns exist in the current schema.

## `bank_accounts` table (existing, no changes)

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint FK | tenant-scoped |
| `chart_account_id` | bigint FK | links to `chart_accounts` |
| `account_name` | varchar(255) | display name |
| `account_number_masked` | varchar(10) nullable | last 4 digits only |
| `bsb` | varchar(7) nullable | AU accounts only |
| `institution` | varchar(255) nullable | Basiq institution code (e.g. "AU00000") |
| `currency` | char(3) | default 'AUD' |
| `current_balance` | bigint | cents, set to opening_balance on create |
| `provider` | varchar nullable | 'manual' or 'basiq' |
| `provider_account_id` | varchar nullable | Basiq account UUID |
| `provider_meta` | json nullable | Basiq consent_id etc. |
| `last_synced_at` | timestamp nullable | last successful feed sync |
| `is_active` | boolean | default true |

**Uniqueness constraints (existing):**
- `UNIQUE(workspace_id, provider, provider_account_id)` — prevents double-connecting the same Basiq account
- **New application-level constraint (via `StoreBankAccountRequest` after() hook):** BSB + account_number_masked must be unique per workspace

## `journal_entries` + `journal_entry_lines` (existing, used for opening balance)

Opening balance JE created by `CreateBankAccount` action when `opening_balance` provided:

| Field | Value |
|-------|-------|
| `description` | `"Opening balance — {account_name}"` |
| `status` | `'posted'` |
| `entry_date` | `opening_balance_date` (defaults to today) |
| Line 1 | Debit `chart_account_id` for `opening_balance` cents |
| Line 2 | Credit "Opening Balances" equity account for `opening_balance` cents |

## `feed_status` computed field (added to `BankAccountResource`)

| `provider` | `provider_account_id` | `feed_status` |
|------------|----------------------|---------------|
| null or 'manual' | any | `'manual'` |
| 'basiq' | not null | `'live'` |
| 'basiq' | null | `'disconnected'` |

## `BankAccount` TypeScript type (updated)

```typescript
export interface BankAccount {
  id: number;
  chart_account_id: number;
  account_name: string;
  account_number_masked: string | null;
  bsb: string | null;
  institution: string | null;
  currency: string;
  current_balance: number; // cents
  provider: string | null;
  feed_status: 'live' | 'manual' | 'disconnected' | null;
  is_active: boolean;
  last_synced_at: string | null;
  unmatched_count?: number;
  created_at?: string;
}
```
