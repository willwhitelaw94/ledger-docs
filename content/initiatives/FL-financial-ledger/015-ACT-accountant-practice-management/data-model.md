---
title: "Data Model: Accountant & Practice Management"
description: "Entity definitions, relationships, and state machines for 015-ACT."
---

# Data Model: Accountant & Practice Management

---

## New Tables

### `practice_clients`

Personal association between a user and a workspace. Not tenant-scoped — lives in the central schema. Deletion of the workspace or the user cascades.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `user_id` | bigint FK users | Cascade delete |
| `workspace_id` | bigint FK workspaces | Cascade delete |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Unique index**: `(user_id, workspace_id)`

**Model**: `App\Models\PracticeClient` (NOT in Tenant namespace)

**Relationships**:
- `belongsTo(User)`
- `belongsTo(Workspace)`
- `hasMany(PracticeNote)`

---

### `practice_notes`

Private notes written by a user against one of their practice clients. Never accessible to workspace members.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `practice_client_id` | bigint FK practice_clients | Cascade delete |
| `user_id` | bigint FK users | Cascade delete (notes deleted when author account deleted) |
| `body` | text | No enforced length limit |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Model**: `App\Models\PracticeNote` (NOT in Tenant namespace)

**Relationships**:
- `belongsTo(PracticeClient)`
- `belongsTo(User)`

---

### `ownership_transfers`

Pending or resolved requests to transfer workspace ownership.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint FK workspaces | |
| `from_user_id` | bigint FK users | |
| `to_user_id` | bigint FK users | |
| `post_transfer_role` | varchar nullable | `accountant`, `bookkeeper`, or NULL (remove) |
| `status` | varchar | Enum: `pending`, `accepted`, `declined`, `cancelled` |
| `initiated_at` | timestamp | |
| `resolved_at` | timestamp nullable | Set when accepted, declined, or cancelled |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Model**: `App\Models\Tenant\OwnershipTransfer`

**State Machine**:
