---
title: "Data Model: Practice Management v2"
---

# Data Model: Practice Management v2

## Entity Relationship Diagram

```
Practice (existing)
├── practice_member_assignments ──→ User + Workspace (role, is_primary)
├── workspace_groups
│   └── workspace_group_members ──→ Workspace
├── practice_tasks ──→ Workspace (nullable), User (assignee)
│   ├── practice_task_comments ──→ User
│   └── practice_task_status_log ──→ User
├── practice_task_templates
│   └── practice_task_template_workspaces ──→ Workspace
├── workbooks ──→ Workspace
│   └── workbook_items ──→ User (completed_by)
│       └── attachments (polymorphic, existing)
└── workbook_templates
```

## Table Summary

| Table | Scope | FK to Practice | FK to Workspace | Notes |
|-------|-------|----------------|-----------------|-------|
| practice_member_assignments | Central | Yes | Yes | Per-member per-workspace access |
| workspace_groups | Central | Yes | No | Practice-side grouping |
| workspace_group_members | Central | No (via group) | Yes | Join table |
| practice_tasks | Central | Yes | Yes (nullable) | Can exist without workspace |
| practice_task_comments | Central | No (via task) | No | |
| practice_task_status_log | Central | No (via task) | No | Append-only audit |
| practice_task_templates | Central | Yes | No | |
| practice_task_template_workspaces | Central | No (via template) | Yes | Join table |
| workbooks | Central | Yes | Yes | |
| workbook_items | Central | No (via workbook) | No | |
| workbook_templates | Central | Yes | No | |

All tables are **central** (not workspace-scoped) — they span the practice↔workspace boundary.

## State Transitions

### Practice Task Status
```
to_do → in_progress → done
  ↓         ↓
blocked → in_progress → done
```

All transitions are valid (no restrictions). Each transition logged in `practice_task_status_log`.

### Practice Task Template Lifecycle
```
active → archived (soft delete)
archived → active (restore)
```
