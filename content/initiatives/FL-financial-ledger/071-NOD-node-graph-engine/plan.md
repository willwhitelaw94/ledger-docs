---
title: "Implementation Plan: NODE Graph Engine"
---

# Implementation Plan: NODE Graph Engine

**Branch**: `feature/071-NOD-node-graph-engine` | **Date**: 2026-03-22 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/071-NOD-node-graph-engine/spec)

## Summary

Interactive force-directed graph visualisation of entity structures. Workspaces are nodes (shaped/coloured by entity type, sized by net worth). Relationships are directed edges stored in a new `entity_relationships` table with versioned history. WorkspaceGroups render as visual containers. Users explore via click-to-detail panels, create/edit relationships by drag-to-connect, and travel through time via a slider that filters by `created_at` and reconstructs historical net worth from journal entries. Desktop/tablet only for MVP; mobile shows a flat list.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12), TypeScript (Next.js 16, React 19)
**Primary Dependencies**: react-force-graph-2d (Canvas, d3-force), TanStack Query v5, Zustand v5, React Hook Form + Zod, react-hotkeys-hook, html-to-image + jsPDF (export)
**Storage**: PostgreSQL, single-database multi-tenancy -- `entity_relationships` is a central table (cross-workspace), not workspace-scoped
**Testing**: Pest v4 (feature tests), Playwright browser tests
**Target Platform**: Web SPA (Next.js frontend + Laravel API), desktop/tablet only for graph canvas
**Constraints**: Max 200 entity nodes at 60fps, no real-time sync, no multi-select, no bulk import, no mobile graph canvas

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Central `entity_relationships` table, cross-workspace auth-only routes (matches `ConsolidatedReportController` pattern) |
| Existing patterns leveraged | PASS | Lorisleiva Actions, Form Requests, API Resources, TanStack Query hooks, Zustand stores |
| No impossible requirements | PASS | react-force-graph-2d handles all graph rendering requirements; PostgreSQL sufficient for relationship queries |
| Performance considered | PASS | Canvas rendering (not SVG/DOM) scales to 200+ nodes at 60fps; single API call loads full graph |
| Security considered | PASS | Users see only workspaces they have access to; relationship mutations gated by owner/accountant role |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 2 new tables: `entity_relationships`, `entity_relationship_versions`. 1 new table: `graph_node_positions` |
| API contracts clear | PASS | 9 endpoints across 2 controllers (`EntityRelationshipController`, `GraphController`) |
| Dependencies identified | PASS | 013-WSP (Workspace model), 027-PMV (WorkspaceGroup), 028-CFT (ConsolidationEngine for net worth) |
| Integration points mapped | PASS | ConsolidationEngine for net worth, WorkspaceGroup for containers, Workspace for nodes |
| DTO persistence explicit | PASS | Form Request validated() to Action params, no toArray() into create() |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See File Manifest |
| Risk areas noted | PASS | Canvas performance at scale, group container rendering (convex hull), time slider net worth queries |
| Testing approach defined | PASS | Feature tests for CRUD + access control, browser tests for graph interaction |
| Rollback possible | PASS | All new tables are additive, no existing tables modified (only seeder update for permissions) |

### 4. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | 5 actions under `app/Actions/Graph/` |
| Form Requests for validation | PASS | Every mutation endpoint has a Form Request |
| API Resources for responses | PASS | `EntityRelationshipResource`, `GraphNodeResource` |
| Model route binding | PASS | ID-based route binding for entity_relationships |
| Sanctum cookie auth | PASS | All routes under `auth:sanctum` middleware (no workspace context -- cross-workspace) |
| Migrations schema-only | PASS | Permissions seeded via `RolesAndPermissionsSeeder` update |

### 5. Next.js/React Standards

| Check | Status | Notes |
|-------|--------|-------|
| All components TypeScript | PASS | Every `.tsx` file uses strict TypeScript |
| Props typed with interfaces | PASS | Types defined in `types/graph.ts` |
| No `any` types | PASS | All API response types defined; react-force-graph-2d types via `@types/react-force-graph-2d` or inline |
| TanStack Query for server state | PASS | Hooks in `use-graph.ts` |
| React Hook Form + Zod | PASS | Relationship create/edit form |
| Existing components reused | PASS | Sheet (detail panel), DropdownMenu (context menu), Slider (time slider) |

### Overall: PASS -- No red flags

---

## Architecture Overview

### System Integration

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Frontend                                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ GraphCanvas  │  │ DetailPanel  │  │ TimeSlider       │  │
│  │ (react-force │  │ (Sheet)      │  │ (shadcn Slider)  │  │
│  │  -graph-2d)  │  │              │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────▼─────────────────▼────────────────────▼─────────┐  │
│  │  useGraphStore (Zustand) — nodes, edges, positions,   │  │
│  │  selected node, filters, time slider state, undo      │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼────────────────────────────────┐  │
│  │  useGraphData / useEntityRelationships (TanStack Q)   │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │ HTTP                              │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│  Laravel API (auth:sanctum, no workspace context)           │
│                                                             │
│  GraphController           EntityRelationshipController     │
│  - GET  /graph/data        - POST   /entity-relationships   │
│  - GET  /graph/node/{id}   - PATCH  /entity-relationships/  │
│  - POST /graph/positions   - DELETE /entity-relationships/  │
│                            - GET    /entity-relationships/  │
│                              history                        │
│                                                             │
│  Actions:                                                   │
│  - GetGraphData            - CreateEntityRelationship       │
│  - GetNodeDetail           - UpdateEntityRelationship       │
│  - SaveNodePositions       - DeleteEntityRelationship       │
│  - GetHistoricalNetWorth                                    │
│                                                             │
│  Models:                                                    │
│  - EntityRelationship (Central)                             │
│  - EntityRelationshipVersion (Central)                      │
│  - GraphNodePosition (Central)                              │
└─────────────────────────────────────────────────────────────┘
```

### Why Central (Not Workspace-Scoped)

Entity relationships are inherently cross-workspace -- they link workspace A to workspace B. Like `InterEntityElimination` and `WorkspaceGroup`, the `entity_relationships` table lives outside workspace scoping. Access control is handled by filtering to workspaces the authenticated user can access, not by `workspace_id` middleware.

This matches the existing pattern used by:
- `ConsolidatedReportController` -- `auth:sanctum` only, no `SetWorkspaceContext`
- `WorkspaceGroupController` -- practice-scoped, no workspace middleware
- `MyNetWorthController` -- user-scoped, cross-workspace

### Graph Data Loading Strategy

A single `GET /api/v1/graph/data` endpoint returns everything the frontend needs to render:

1. **Nodes**: All workspaces the user has access to, with `id`, `name`, `entity_type`, `slug`, `base_currency`, `net_worth` (computed), `created_at`, `group_ids`
2. **Edges**: All `entity_relationships` where both source and target are in the user's accessible workspace set
3. **Groups**: All `WorkspaceGroup` records containing any of the user's workspaces, with member workspace IDs
4. **Ghost nodes**: Workspaces outside the user's access set that have relationships to accessible workspaces -- returned with limited data (`id`, `name`, `entity_type`, `is_ghost: true`)

This avoids N+1 loading and gives the frontend a complete snapshot to render.

### Relationship Lifecycle

```
  CREATE ──► entity_relationships row inserted
             + entity_relationship_versions row (snapshot of initial state)

  UPDATE ──► entity_relationships row updated
             + entity_relationship_versions row (snapshot of new state)

  DELETE ──► entity_relationships row soft-deleted (deleted_at)
             + entity_relationship_versions row (type: 'deleted')

  UNDO   ──► reverses the last operation per user session
             (re-insert if deleted, revert if updated, delete if created)
```

---

## Data Model

### New Tables

#### `entity_relationships` (central -- cross-workspace)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | Auto-increment |
| source_workspace_id | bigint FK (workspaces) | The "from" entity. cascadeOnDelete |
| target_workspace_id | bigint FK (workspaces) | The "to" entity. cascadeOnDelete |
| relationship_type | varchar(30) | Enum: owns, holds_shares, beneficiary_of, trustee_of, director_of, subsidiary_of, partner_in, controls |
| percentage | integer nullable | Basis points (10000 = 100%). Null for non-ownership types like director_of |
| label | varchar(255) nullable | Optional freeform label (e.g., "Class A shares") |
| created_by_user_id | bigint FK (users) nullable | nullOnDelete |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp nullable | Soft delete |

Indexes: `(source_workspace_id, target_workspace_id)`, `(target_workspace_id)`, `(relationship_type)`

Constraints:
- CHECK: `source_workspace_id != target_workspace_id` (FR-031: no self-referential)
- No unique constraint -- duplicate types between same pair are allowed (FR-024)

#### `entity_relationship_versions` (central -- audit trail)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| entity_relationship_id | bigint FK | cascadeOnDelete |
| relationship_type | varchar(30) | Snapshot of type at this version |
| percentage | integer nullable | Snapshot of percentage at this version |
| label | varchar(255) nullable | Snapshot of label at this version |
| change_type | varchar(10) | created, updated, deleted |
| changed_by_user_id | bigint FK (users) nullable | nullOnDelete |
| changed_at | timestamp | When this version was recorded |

Indexes: `(entity_relationship_id, changed_at)`

This table enables the time slider to show historical relationship states (FR-025). Each mutation creates a version snapshot.

#### `graph_node_positions` (central -- user preferences)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| user_id | bigint FK (users) | cascadeOnDelete |
| workspace_id | bigint FK (workspaces) | cascadeOnDelete |
| x | float | Canvas X coordinate |
| y | float | Canvas Y coordinate |
| updated_at | timestamp | |

Indexes: `(user_id, workspace_id)` UNIQUE

This table stores per-user node positions (FR-028). Saved on drag-end and loaded on page open.

### Modified Tables

#### `RolesAndPermissionsSeeder` (update only)

New permissions added to the `allPermissions()` method:

```php
// Entity Relationships (071-NOD)
'entity-relationship.view',
'entity-relationship.create',
'entity-relationship.update',
'entity-relationship.delete',
```

Role assignments:
- **owner**: all 4 permissions
- **accountant**: all 4 permissions
- **bookkeeper**: `entity-relationship.view` only
- **approver**: `entity-relationship.view` only
- **auditor**: `entity-relationship.view` only
- **client**: `entity-relationship.view` only

### Enum: RelationshipType

```php
// app/Enums/RelationshipType.php
enum RelationshipType: string
{
    case OWNS = 'owns';
    case HOLDS_SHARES = 'holds_shares';
    case BENEFICIARY_OF = 'beneficiary_of';
    case TRUSTEE_OF = 'trustee_of';
    case DIRECTOR_OF = 'director_of';
    case SUBSIDIARY_OF = 'subsidiary_of';
    case PARTNER_IN = 'partner_in';
    case CONTROLS = 'controls';

    public function label(): string { /* human-readable */ }

    public function inverseLabel(): string
    {
        return match ($this) {
            self::OWNS => 'owned by',
            self::HOLDS_SHARES => 'shares held by',
            self::BENEFICIARY_OF => 'has beneficiary',
            self::TRUSTEE_OF => 'has trustee',
            self::DIRECTOR_OF => 'has director',
            self::SUBSIDIARY_OF => 'parent of',
            self::PARTNER_IN => 'has partner',
            self::CONTROLS => 'controlled by',
        };
    }

    public function supportsPercentage(): bool
    {
        return in_array($this, [self::OWNS, self::HOLDS_SHARES, self::PARTNER_IN]);
    }
}
```

---

## Backend Implementation

### Models

#### `app/Models/Central/EntityRelationship.php`

```php
class EntityRelationship extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'source_workspace_id', 'target_workspace_id',
        'relationship_type', 'percentage', 'label',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'relationship_type' => RelationshipType::class,
        ];
    }

    public function sourceWorkspace(): BelongsTo { ... }
    public function targetWorkspace(): BelongsTo { ... }
    public function createdBy(): BelongsTo { ... }
    public function versions(): HasMany { ... }
}
```

#### `app/Models/Central/EntityRelationshipVersion.php`

```php
class EntityRelationshipVersion extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'entity_relationship_id', 'relationship_type',
        'percentage', 'label', 'change_type',
        'changed_by_user_id', 'changed_at',
    ];

    protected function casts(): array
    {
        return [
            'relationship_type' => RelationshipType::class,
            'changed_at' => 'datetime',
        ];
    }

    public function entityRelationship(): BelongsTo { ... }
}
```

#### `app/Models/Central/GraphNodePosition.php`

```php
class GraphNodePosition extends Model
{
    public $timestamps = false;
    const UPDATED_AT = 'updated_at';

    protected $fillable = ['user_id', 'workspace_id', 'x', 'y', 'updated_at'];
}
```

### Actions (`app/Actions/Graph/`)

#### `GetGraphData.php`

Loads all data needed to render the graph in a single call.

```php
class GetGraphData
{
    use AsAction;

    public function handle(User $user, ?int $groupId = null): array
    {
        // 1. Get all workspace IDs the user has access to
        $accessibleIds = $user->workspaces()->pluck('workspaces.id');

        // 2. If groupId provided, filter to group members
        // 3. Load workspaces with entity_type, name, slug, base_currency, created_at
        // 4. Calculate net worth per workspace (from AccountBalance projector)
        // 5. Load entity_relationships where both endpoints are in accessible set
        // 6. Load ghost nodes (target/source outside accessible set)
        // 7. Load WorkspaceGroups containing any accessible workspace
        // 8. Load user's node positions

        return [
            'nodes' => $nodes,
            'edges' => $edges,
            'groups' => $groups,
            'positions' => $positions,
        ];
    }
}
```

Net worth per workspace is computed from `AccountBalance` (the projector read model), summing asset balances minus liability balances. This avoids scanning `journal_entry_lines`.

#### `GetNodeDetail.php`

Returns the detail panel data for a single node click (FR-010).

```php
class GetNodeDetail
{
    use AsAction;

    public function handle(User $user, Workspace $workspace): array
    {
        // 1. Entity name, type, base_currency
        // 2. Net position (total_assets - total_liabilities) from AccountBalance
        // 3. Count of contacts, open invoices, active jobs
        // 4. Health score (if available, from HealthScoreController pattern)
        // 5. All relationships (outbound + inbound, with inverse labels for inbound)
        // 6. Recent activity count

        return [ ... ];
    }
}
```

#### `CreateEntityRelationship.php`

```php
class CreateEntityRelationship
{
    use AsAction;

    public function handle(
        int $sourceWorkspaceId,
        int $targetWorkspaceId,
        RelationshipType $type,
        ?int $percentage,
        ?string $label,
        User $user,
    ): EntityRelationship {
        // 1. Create entity_relationships row
        // 2. Create entity_relationship_versions row (change_type: 'created')
        // 3. Warn (not block) if ownership percentages > 10000 for target

        return $relationship;
    }
}
```

#### `UpdateEntityRelationship.php`

```php
class UpdateEntityRelationship
{
    use AsAction;

    public function handle(
        EntityRelationship $relationship,
        RelationshipType $type,
        ?int $percentage,
        ?string $label,
        User $user,
    ): EntityRelationship {
        // 1. Update entity_relationships row
        // 2. Create entity_relationship_versions row (change_type: 'updated')

        return $relationship;
    }
}
```

#### `DeleteEntityRelationship.php`

```php
class DeleteEntityRelationship
{
    use AsAction;

    public function handle(EntityRelationship $relationship, User $user): void
    {
        // 1. Soft-delete entity_relationships row
        // 2. Create entity_relationship_versions row (change_type: 'deleted')
    }
}
```

#### `SaveNodePositions.php`

```php
class SaveNodePositions
{
    use AsAction;

    public function handle(User $user, array $positions): void
    {
        // Upsert graph_node_positions rows
        // $positions = [['workspace_id' => 1, 'x' => 100.5, 'y' => 200.3], ...]
    }
}
```

#### `GetHistoricalNetWorth.php`

```php
class GetHistoricalNetWorth
{
    use AsAction;

    public function handle(array $workspaceIds, Carbon $asOfDate): array
    {
        // Sum journal_entry_lines (via JournalEntry with entry_date <= $asOfDate)
        // grouped by workspace_id and account type (asset vs liability)
        // Returns ['workspace_id' => net_worth_cents, ...]
    }
}
```

### Controller

#### `app/Http/Controllers/Api/EntityRelationshipController.php`

```php
class EntityRelationshipController extends Controller
{
    public function store(StoreEntityRelationshipRequest $request): JsonResponse
    {
        $relationship = CreateEntityRelationship::run(
            sourceWorkspaceId: $request->validated('source_workspace_id'),
            targetWorkspaceId: $request->validated('target_workspace_id'),
            type: RelationshipType::from($request->validated('relationship_type')),
            percentage: $request->validated('percentage'),
            label: $request->validated('label'),
            user: $request->user(),
        );

        // Check if total ownership percentage > 100% for target, include warning
        $warning = $this->checkOwnershipWarning($relationship);

        return response()->json([
            'data' => new EntityRelationshipResource($relationship),
            'warning' => $warning,
        ], 201);
    }

    public function update(UpdateEntityRelationshipRequest $request, EntityRelationship $entityRelationship): JsonResponse { ... }

    public function destroy(DeleteEntityRelationshipRequest $request, EntityRelationship $entityRelationship): JsonResponse { ... }

    public function history(Request $request, EntityRelationship $entityRelationship): JsonResponse
    {
        // FR-025: version history for a specific relationship
        Gate::authorize('view', $entityRelationship);
        $versions = $entityRelationship->versions()->orderBy('changed_at', 'desc')->get();
        return response()->json(['data' => $versions]);
    }
}
```

#### `app/Http/Controllers/Api/GraphController.php`

```php
class GraphController extends Controller
{
    public function data(Request $request): JsonResponse
    {
        $groupId = $request->query('group_id');
        $data = GetGraphData::run($request->user(), $groupId);
        return response()->json(['data' => $data]);
    }

    public function nodeDetail(Request $request, Workspace $workspace): JsonResponse
    {
        // Verify user has access to this workspace
        abort_unless(
            $request->user()->workspaces()->where('workspaces.id', $workspace->id)->exists(),
            403
        );
        $detail = GetNodeDetail::run($request->user(), $workspace);
        return response()->json(['data' => $detail]);
    }

    public function savePositions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'positions' => 'required|array',
            'positions.*.workspace_id' => 'required|integer|exists:workspaces,id',
            'positions.*.x' => 'required|numeric',
            'positions.*.y' => 'required|numeric',
        ]);
        SaveNodePositions::run($request->user(), $validated['positions']);
        return response()->json(null, 204);
    }

    public function historicalNetWorth(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workspace_ids' => 'required|array',
            'workspace_ids.*' => 'integer',
            'as_of_date' => 'required|date',
        ]);
        $netWorths = GetHistoricalNetWorth::run(
            $validated['workspace_ids'],
            Carbon::parse($validated['as_of_date']),
        );
        return response()->json(['data' => $netWorths]);
    }
}
```

### Form Requests (`app/Http/Requests/Graph/`)

#### `StoreEntityRelationshipRequest.php`

```php
class StoreEntityRelationshipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('entity-relationship.create');
    }

    public function rules(): array
    {
        return [
            'source_workspace_id' => 'required|integer|exists:workspaces,id',
            'target_workspace_id' => 'required|integer|exists:workspaces,id|different:source_workspace_id',
            'relationship_type' => ['required', 'string', Rule::in(RelationshipType::values())],
            'percentage' => 'nullable|integer|min:0|max:10000',
            'label' => 'nullable|string|max:255',
        ];
    }

    public function after(): array
    {
        return [
            function (\Illuminate\Validation\Validator $validator) {
                // Verify user has access to both workspaces
                $user = $this->user();
                $sourceAccess = $user->workspaces()->where('workspaces.id', $this->source_workspace_id)->exists();
                $targetAccess = $user->workspaces()->where('workspaces.id', $this->target_workspace_id)->exists();
                if (!$sourceAccess || !$targetAccess) {
                    $validator->errors()->add('source_workspace_id', 'You must have access to both entities.');
                }
            },
        ];
    }
}
```

#### `UpdateEntityRelationshipRequest.php`

```php
class UpdateEntityRelationshipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('entity-relationship.update');
    }

    public function rules(): array
    {
        return [
            'relationship_type' => ['sometimes', 'required', 'string', Rule::in(RelationshipType::values())],
            'percentage' => 'nullable|integer|min:0|max:10000',
            'label' => 'nullable|string|max:255',
        ];
    }
}
```

#### `DeleteEntityRelationshipRequest.php`

```php
class DeleteEntityRelationshipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('entity-relationship.delete');
    }

    public function rules(): array
    {
        return [];
    }
}
```

### Policy

#### `app/Policies/EntityRelationshipPolicy.php`

```php
class EntityRelationshipPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('entity-relationship.view');
    }

    public function view(User $user, EntityRelationship $relationship): bool
    {
        // User must have access to at least one of the two workspaces
        return $user->hasPermissionTo('entity-relationship.view')
            && ($user->workspaces()->where('workspaces.id', $relationship->source_workspace_id)->exists()
                || $user->workspaces()->where('workspaces.id', $relationship->target_workspace_id)->exists());
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('entity-relationship.create');
    }

    public function update(User $user, EntityRelationship $relationship): bool
    {
        return $user->hasPermissionTo('entity-relationship.update');
    }

    public function delete(User $user, EntityRelationship $relationship): bool
    {
        return $user->hasPermissionTo('entity-relationship.delete');
    }
}
```

Register in `AppServiceProvider::boot()`:
```php
Gate::policy(EntityRelationship::class, EntityRelationshipPolicy::class);
```

### API Resources

#### `app/Http/Resources/EntityRelationshipResource.php`

```php
class EntityRelationshipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source_workspace_id' => $this->source_workspace_id,
            'target_workspace_id' => $this->target_workspace_id,
            'relationship_type' => $this->relationship_type->value,
            'relationship_label' => $this->relationship_type->label(),
            'inverse_label' => $this->relationship_type->inverseLabel(),
            'percentage' => $this->percentage,
            'percentage_display' => $this->percentage !== null ? ($this->percentage / 100) . '%' : null,
            'label' => $this->label,
            'created_by_user_id' => $this->created_by_user_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
```

### API Routes

All graph routes are auth-only, no workspace context (cross-workspace). Added to `routes/api.php` in the existing `auth:sanctum` group alongside consolidated reports and my-net-worth:

```php
// Entity Graph (071-NOD) — cross-workspace, no workspace context
Route::get('graph/data', [GraphController::class, 'data']);
Route::get('graph/node/{workspace}', [GraphController::class, 'nodeDetail']);
Route::post('graph/positions', [GraphController::class, 'savePositions']);
Route::get('graph/historical-net-worth', [GraphController::class, 'historicalNetWorth']);

Route::post('entity-relationships', [EntityRelationshipController::class, 'store']);
Route::patch('entity-relationships/{entityRelationship}', [EntityRelationshipController::class, 'update']);
Route::delete('entity-relationships/{entityRelationship}', [EntityRelationshipController::class, 'destroy']);
Route::get('entity-relationships/{entityRelationship}/history', [EntityRelationshipController::class, 'history']);
```

---

## Frontend Implementation

### New Package

```bash
cd frontend && npm install react-force-graph-2d
```

`react-force-graph-2d` is a React wrapper around `force-graph` (Canvas-based, d3-force layout). It handles:
- Force-directed layout with configurable forces
- Canvas rendering (60fps at 200+ nodes)
- Zoom, pan, node drag
- Node/edge click, hover, right-click events
- Programmatic zoom-to-fit and center-on-node

No additional d3 packages needed -- react-force-graph-2d bundles d3-force internally.

For export: `html-to-image` (Canvas to PNG) + `jsPDF` (PNG to PDF).

### TypeScript Types (`frontend/src/types/graph.ts`)

```typescript
export type EntityType = 'pty_ltd' | 'trust' | 'sole_trader' | 'partnership' | 'smsf' | 'not_for_profit' | 'personal';

export type RelationshipType =
  | 'owns' | 'holds_shares' | 'beneficiary_of' | 'trustee_of'
  | 'director_of' | 'subsidiary_of' | 'partner_in' | 'controls';

export interface GraphNode {
  id: number;
  name: string;
  entity_type: EntityType;
  slug: string;
  base_currency: string;
  net_worth: number;          // cents
  created_at: string;         // ISO date
  group_ids: number[];
  is_ghost?: boolean;         // true for nodes outside user's access
  // Position (from saved or force layout)
  x?: number;
  y?: number;
  fx?: number;                // fixed x (after drag)
  fy?: number;                // fixed y (after drag)
}

export interface GraphEdge {
  id: number;
  source: number;             // source_workspace_id
  target: number;             // target_workspace_id
  relationship_type: RelationshipType;
  relationship_label: string;
  inverse_label: string;
  percentage: number | null;
  percentage_display: string | null;
  label: string | null;
  created_at: string;
}

export interface GraphGroup {
  id: number;
  name: string;
  workspace_ids: number[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
  positions: Record<number, { x: number; y: number }>;
}

export interface NodeDetail {
  id: number;
  name: string;
  entity_type: EntityType;
  base_currency: string;
  slug: string;
  net_position: number;       // cents (assets - liabilities)
  total_assets: number;
  total_liabilities: number;
  contact_count: number;
  open_invoice_count: number;
  active_job_count: number;
  health_score: number | null;
  relationships: NodeRelationship[];
  recent_activity_count: number;
}

export interface NodeRelationship {
  id: number;
  related_workspace_id: number;
  related_workspace_name: string;
  relationship_type: RelationshipType;
  display_label: string;       // "owns 60%" or "owned by John 60%"
  direction: 'outbound' | 'inbound';
  percentage_display: string | null;
}

export interface RelationshipFormData {
  source_workspace_id: number;
  target_workspace_id: number;
  relationship_type: RelationshipType;
  percentage: number | null;   // basis points
  label: string | null;
}
```

### Zustand Store (`frontend/src/stores/graph.ts`)

```typescript
interface GraphState {
  // Data
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];

  // Selection
  selectedNodeId: number | null;
  focusedNodeId: number | null;    // keyboard navigation
  hoveredEdgeId: number | null;

  // Filters
  searchQuery: string;
  entityTypeFilter: EntityType[];
  statusFilter: 'active' | 'archived' | null;
  timeSliderDate: Date | null;     // null = present

  // Undo
  lastAction: UndoAction | null;

  // UI
  detailPanelOpen: boolean;
  contextMenu: { x: number; y: number; nodeId?: number; edgeId?: number } | null;
  relationshipFormOpen: boolean;
  relationshipFormDefaults: Partial<RelationshipFormData> | null;

  // Actions
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  selectNode: (id: number | null) => void;
  setSearchQuery: (q: string) => void;
  setTimeSliderDate: (d: Date | null) => void;
  pushUndo: (action: UndoAction) => void;
  popUndo: () => UndoAction | null;
  // ...
}
```

### TanStack Query Hooks (`frontend/src/hooks/use-graph.ts`)

```typescript
// Load full graph data
export function useGraphData(groupId?: number) {
  return useQuery({
    queryKey: ['graph', 'data', groupId],
    queryFn: () => api.get('/graph/data', { params: { group_id: groupId } }),
  });
}

// Load node detail (on click)
export function useNodeDetail(workspaceId: number | null) {
  return useQuery({
    queryKey: ['graph', 'node', workspaceId],
    queryFn: () => api.get(`/graph/node/${workspaceId}`),
    enabled: workspaceId !== null,
  });
}

// Create relationship
export function useCreateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RelationshipFormData) => api.post('/entity-relationships', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['graph'] }),
  });
}

// Update relationship
export function useUpdateRelationship() { ... }

// Delete relationship
export function useDeleteRelationship() { ... }

// Save positions (debounced)
export function useSavePositions() {
  return useMutation({
    mutationFn: (positions: { workspace_id: number; x: number; y: number }[]) =>
      api.post('/graph/positions', { positions }),
  });
}

// Historical net worth (for time slider)
export function useHistoricalNetWorth(workspaceIds: number[], asOfDate: string | null) {
  return useQuery({
    queryKey: ['graph', 'historical-net-worth', asOfDate],
    queryFn: () => api.get('/graph/historical-net-worth', {
      params: { workspace_ids: workspaceIds, as_of_date: asOfDate },
    }),
    enabled: asOfDate !== null,
  });
}
```

### Component Tree

```
frontend/src/app/w/[slug]/(dashboard)/structure/page.tsx    ← Route page
  └── frontend/src/components/graph/
      ├── GraphPage.tsx                 ← Main layout: toolbar + canvas + detail panel
      ├── GraphCanvas.tsx               ← react-force-graph-2d wrapper
      ├── GraphToolbar.tsx              ← Search, filters, export, zoom controls
      ├── GraphDetailPanel.tsx          ← Sheet slide-out for node details
      ├── GraphContextMenu.tsx          ← Right-click menu (node or canvas)
      ├── GraphTimeSlider.tsx           ← Time slider + play button
      ├── GraphMobileList.tsx           ← Simplified list for mobile (FR-036)
      ├── RelationshipForm.tsx          ← Create/edit relationship dialog
      ├── EntityQuickCreateForm.tsx     ← Quick entity creation from canvas
      └── graph-utils.ts               ← Node shape drawing, colour map, size calc
```

### Key Component: `GraphCanvas.tsx`

This is the core rendering component wrapping `react-force-graph-2d`.

```typescript
// Pseudocode for key rendering logic

const nodeCanvasObject = (node: GraphNode, ctx: CanvasRenderingContext2D) => {
  const size = calculateNodeSize(node.net_worth);  // min 8, max 40, log scale
  const color = getNodeColor(node.entity_type);

  // Draw shape per entity type (FR-026)
  switch (node.entity_type) {
    case 'personal':  drawCircle(ctx, node, size, color); break;
    case 'pty_ltd':   drawSquare(ctx, node, size, color); break;
    case 'trust':     drawTriangle(ctx, node, size, color); break;
    case 'partnership': drawDiamond(ctx, node, size, color); break;
    case 'sole_trader': drawPentagon(ctx, node, size, color); break;
    default:          drawCircle(ctx, node, size, color); break;
  }

  // Draw label below shape
  ctx.fillText(node.name, node.x, node.y + size + 10);

  // Ghost nodes: reduced opacity (FR-011)
  if (node.is_ghost) ctx.globalAlpha = 0.3;
};
```

Group containers (FR-005) are rendered via the `nodeCanvasObjectMode` callback, drawing convex hull boundaries around grouped nodes with the group name as a label.

### Node Shape Drawing (`graph-utils.ts`)

Shape functions for each entity type, matching FR-026:

| Entity Type | Shape | Colour |
|-------------|-------|--------|
| personal | Circle | Blue |
| pty_ltd | Square | Green |
| trust | Triangle | Purple |
| partnership | Diamond | Orange |
| sole_trader | Pentagon | Teal |
| smsf | Circle (outlined) | Indigo |
| not_for_profit | Circle (outlined) | Rose |

Node size is logarithmically scaled from net worth (cents), clamped between 8px and 40px radius. Zero net worth defaults to 12px.

### Edge Rendering

- Default: clean lines with directional arrow, no label (FR-027)
- On hover: tooltip with relationship type + percentage (FR-017)
- Multiple edges between same pair: rendered with slight curve offset to avoid overlap (FR-024)

### Keyboard Navigation

Added to `frontend/src/lib/navigation.ts`:

```typescript
// New chord shortcut
n: "/structure",   // G then N → Go to Graph (NODE) page
```

Graph-specific shortcuts (registered via `useHotkeys` in `GraphPage.tsx`):

| Shortcut | Action | FR |
|----------|--------|----|
| `G then N` | Navigate to graph page | FR-033 |
| `Tab` / `Shift+Tab` | Cycle node focus | FR-015 |
| `Enter` | Open detail panel for focused node | FR-015 |
| `Escape` | Close detail panel / clear search / close context menu | FR-015 |
| `/` | Focus search input | FR-013 |
| `+` / `-` | Zoom in / out | FR-015 |
| `0` | Reset zoom to fit all nodes | FR-015 |
| `N` | New entity (quick create) | FR-015 |
| `R` | New relationship from focused node | FR-015 |
| `Ctrl+Z` / `Cmd+Z` | Undo last relationship change | FR-030 |

### Navigation Entry Point

Add "Structure" to the sidebar navigation as a top-level item (FR-033). This item appears in `primaryNav` in `frontend/src/lib/navigation.ts`:

```typescript
{
  title: "Structure",
  url: "/structure",
  icon: Network,    // from lucide-react
  shortcut: "G then N",
},
```

### Detail Panel (`GraphDetailPanel.tsx`)

Uses the existing shadcn `Sheet` component for the slide-out panel (FR-010). Content sections:

1. **Header**: Entity name, type badge, base currency
2. **Financial Summary**: Net position (formatted via `formatMoney()`), total assets, total liabilities
3. **Statistics**: Contact count, open invoice count, active job count, health score
4. **Relationships**: List of all connected entities with display labels (outbound shows "owns 60%", inbound shows "owned by John 60%" per FR-023)
5. **Footer**: "Go to entity" button linking to `/w/{slug}/dashboard` (FR-016)

### Time Slider (`GraphTimeSlider.tsx`)

Uses shadcn `Slider` component with a date range from earliest `created_at` to today (FR-012).

- Slider position maps to a date
- Changing the date triggers `useHistoricalNetWorth` query
- Nodes are filtered: hide any with `created_at` > slider date
- Edges are filtered: hide any with `created_at` > slider date
- Node sizes update to reflect historical net worth
- Play button: `setInterval` advancing the slider by 1 month per 500ms

### Export (`GraphToolbar.tsx`)

Export button with dropdown: PNG or PDF (FR-029).

- **PNG**: Use `html-to-image`'s `toPng()` on the canvas container, then trigger download
- **PDF**: Generate PNG first, then embed in jsPDF A4 landscape document

### Context Menu (`GraphContextMenu.tsx`)

Right-click on canvas background:
- "New entity" -- opens `EntityQuickCreateForm` (FR-003, scenario 6)

Right-click on a node:
- "Add relationship" -- opens `RelationshipForm` with source pre-filled (FR-007)
- "Add related entity" -- opens `EntityQuickCreateForm` + relationship in one step (FR-003, scenario 7)
- "View details" -- opens detail panel (FR-010)

Right-click on an edge:
- "Edit relationship" -- opens `RelationshipForm` in edit mode (FR-008)
- "Remove relationship" -- confirmation dialog, then delete (FR-009)

### Mobile List View (`GraphMobileList.tsx`)

On mobile (`useIsMobile()` hook), render a flat list instead of the interactive graph (FR-036, FR-018):

- Grouped by entity type
- Each item shows entity name, type, and relationship count
- Tap to see relationships list (accordion expand)
- Tap "Go to entity" to navigate

### Ownership Warning (FR-019)

When creating/updating an ownership relationship, the API returns a `warning` field if total ownership percentage for the target entity exceeds 100%. The frontend displays this as a non-blocking toast notification.

### Undo (FR-030)

The Zustand store tracks the last relationship mutation. `Ctrl+Z` pops the undo stack and reverses the operation:

- **Created**: delete the relationship
- **Updated**: PATCH back to previous values
- **Deleted**: POST to re-create with same values

Only single undo (no redo, no multi-step undo for MVP).

---

## Phase Breakdown

### Phase 1: Data Layer & CRUD (Backend) -- ~3 days

**Goal**: Entity relationships table, CRUD actions, controller, tests.

Files created:
- `database/migrations/2026_03_22_710001_create_entity_relationships_table.php`
- `database/migrations/2026_03_22_710002_create_entity_relationship_versions_table.php`
- `database/migrations/2026_03_22_710003_create_graph_node_positions_table.php`
- `app/Enums/RelationshipType.php`
- `app/Models/Central/EntityRelationship.php`
- `app/Models/Central/EntityRelationshipVersion.php`
- `app/Models/Central/GraphNodePosition.php`
- `app/Actions/Graph/CreateEntityRelationship.php`
- `app/Actions/Graph/UpdateEntityRelationship.php`
- `app/Actions/Graph/DeleteEntityRelationship.php`
- `app/Actions/Graph/SaveNodePositions.php`
- `app/Http/Controllers/Api/EntityRelationshipController.php`
- `app/Http/Requests/Graph/StoreEntityRelationshipRequest.php`
- `app/Http/Requests/Graph/UpdateEntityRelationshipRequest.php`
- `app/Http/Requests/Graph/DeleteEntityRelationshipRequest.php`
- `app/Http/Resources/EntityRelationshipResource.php`
- `app/Policies/EntityRelationshipPolicy.php`

Files modified:
- `database/seeders/RolesAndPermissionsSeeder.php` -- add 4 new permissions
- `app/Providers/AppServiceProvider.php` -- register policy
- `routes/api.php` -- add 8 new routes

Tests:
- `tests/Feature/Api/EntityRelationshipTest.php` -- CRUD, validation, self-referential block, access control, soft delete, version creation

**FR coverage**: FR-001, FR-002, FR-007, FR-008, FR-009, FR-011, FR-019, FR-020, FR-022, FR-023, FR-024, FR-025, FR-031

### Phase 2: Graph Data Endpoint & Node Detail (Backend) -- ~2 days

**Goal**: Single endpoint returns full graph data; node detail endpoint for click-to-explore.

Files created:
- `app/Actions/Graph/GetGraphData.php`
- `app/Actions/Graph/GetNodeDetail.php`
- `app/Actions/Graph/GetHistoricalNetWorth.php`
- `app/Http/Controllers/Api/GraphController.php`

Files modified:
- `routes/api.php` -- add 4 graph data routes

Tests:
- `tests/Feature/Api/GraphDataTest.php` -- data loading, ghost nodes, group filtering, access scoping, node detail

**FR coverage**: FR-003, FR-005, FR-006, FR-010, FR-012 (backend), FR-021, FR-034

### Phase 3: Graph Canvas & Core Interaction (Frontend) -- ~5 days

**Goal**: Interactive force-directed graph with nodes, edges, groups, click-to-detail, drag-to-rearrange.

Files created:
- `frontend/src/types/graph.ts`
- `frontend/src/hooks/use-graph.ts`
- `frontend/src/stores/graph.ts`
- `frontend/src/components/graph/GraphPage.tsx`
- `frontend/src/components/graph/GraphCanvas.tsx`
- `frontend/src/components/graph/GraphToolbar.tsx`
- `frontend/src/components/graph/GraphDetailPanel.tsx`
- `frontend/src/components/graph/GraphMobileList.tsx`
- `frontend/src/components/graph/graph-utils.ts`
- `frontend/src/app/w/[slug]/(dashboard)/structure/page.tsx`

Files modified:
- `frontend/src/lib/navigation.ts` -- add "Structure" nav item + chord shortcut
- `frontend/package.json` -- add react-force-graph-2d

**FR coverage**: FR-003, FR-004, FR-005, FR-006, FR-010, FR-014, FR-016, FR-017, FR-018, FR-026, FR-027, FR-032, FR-033, FR-034, FR-035, FR-036

### Phase 4: Relationship CRUD UI (Frontend) -- ~3 days

**Goal**: Create/edit/delete relationships via drag-to-connect, context menus, and forms.

Files created:
- `frontend/src/components/graph/RelationshipForm.tsx`
- `frontend/src/components/graph/GraphContextMenu.tsx`
- `frontend/src/components/graph/EntityQuickCreateForm.tsx`

**FR coverage**: FR-007, FR-008, FR-009, FR-019, FR-023, FR-024, FR-030, FR-031

### Phase 5: Search, Filter, Time Slider (Frontend) -- ~3 days

**Goal**: Search bar, entity type filters, time slider with historical net worth and play animation.

Files modified:
- `frontend/src/components/graph/GraphToolbar.tsx` -- search + filters
- `frontend/src/components/graph/GraphCanvas.tsx` -- filter application

Files created:
- `frontend/src/components/graph/GraphTimeSlider.tsx`

**FR coverage**: FR-012, FR-013, FR-025 (frontend)

### Phase 6: Keyboard Navigation & Export -- ~2 days

**Goal**: Full keyboard navigation, shortcut help overlay integration, PNG/PDF export.

Files modified:
- `frontend/src/components/graph/GraphPage.tsx` -- keyboard handlers
- `frontend/src/components/graph/GraphToolbar.tsx` -- export button
- Keyboard shortcuts overlay -- add graph shortcuts

Files created:
- (none -- integrated into existing components)

**FR coverage**: FR-015, FR-028, FR-029

### Phase 7: Polish & Browser Tests -- ~2 days

**Goal**: Browser tests, edge case handling, performance validation.

Files created:
- `tests/Browser/GraphTest.php` -- navigation, node click, relationship creation, keyboard shortcuts

Tests cover:
- Navigate to graph page from sidebar
- Nodes render with correct count
- Click node opens detail panel
- Detail panel "Go to entity" navigates correctly
- Keyboard shortcut `G then N` navigates to graph
- Mobile shows list view

**Total estimated effort**: ~20 days

---

## Testing Strategy

### Feature Tests (`tests/Feature/Api/`)

#### `EntityRelationshipTest.php` (~20 tests)

```php
it('creates a relationship between two workspaces', function () { ... });
it('validates relationship_type enum', function () { ... });
it('blocks self-referential relationships', function () { ... });
it('allows duplicate relationship types between same pair', function () { ... });
it('soft-deletes relationships', function () { ... });
it('creates version record on create', function () { ... });
it('creates version record on update', function () { ... });
it('creates version record on delete', function () { ... });
it('returns warning when ownership exceeds 100%', function () { ... });
it('denies bookkeeper from creating relationships', function () { ... });
it('allows bookkeeper to view relationships', function () { ... });
it('denies access to relationships on inaccessible workspaces', function () { ... });
it('validates percentage is basis points (0-10000)', function () { ... });
it('allows null percentage for non-ownership types', function () { ... });
it('returns relationship history ordered by date', function () { ... });
```

#### `GraphDataTest.php` (~12 tests)

```php
it('returns all accessible workspaces as nodes', function () { ... });
it('returns only relationships where both endpoints are accessible', function () { ... });
it('includes ghost nodes for external relationships', function () { ... });
it('includes workspace groups as graph groups', function () { ... });
it('filters by group_id when provided', function () { ... });
it('returns node detail with financial summary', function () { ... });
it('returns node detail with inbound relationships using inverse labels', function () { ... });
it('returns historical net worth at a given date', function () { ... });
it('saves and loads node positions per user', function () { ... });
it('denies node detail for inaccessible workspace', function () { ... });
```

#### Test Setup Pattern

```php
beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->user = User::factory()->create();
    $this->org = Organisation::factory()->create();
    $this->workspaceA = Workspace::factory()->create([
        'organisation_id' => $this->org->id,
        'entity_type' => 'pty_ltd',
        'name' => 'Smith Holdings',
    ]);
    $this->workspaceB = Workspace::factory()->create([
        'organisation_id' => $this->org->id,
        'entity_type' => 'personal',
        'name' => 'John Smith',
    ]);

    foreach ([$this->workspaceA, $this->workspaceB] as $ws) {
        $ws->users()->attach($this->user->id, ['role' => 'owner']);
        setPermissionsTeamId($ws->id);
        $this->user->assignRole('owner');
    }
});
```

### Browser Tests (`tests/Browser/GraphTest.php`)

```php
it('navigates to structure page from sidebar', function () { ... });
it('renders entity nodes on the graph page', function () { ... });
it('opens detail panel on node click', function () { ... });
it('navigates to entity from detail panel', function () { ... });
```

---

## Migration Plan

### Database Migrations

All three migrations are additive -- no existing tables are modified.

#### Migration 1: `create_entity_relationships_table`

```php
Schema::create('entity_relationships', function (Blueprint $table) {
    $table->id();
    $table->foreignId('source_workspace_id')->constrained('workspaces')->cascadeOnDelete();
    $table->foreignId('target_workspace_id')->constrained('workspaces')->cascadeOnDelete();
    $table->string('relationship_type', 30);
    $table->integer('percentage')->nullable();
    $table->string('label', 255)->nullable();
    $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['source_workspace_id', 'target_workspace_id']);
    $table->index('target_workspace_id');
    $table->index('relationship_type');
});

// Add CHECK constraint for self-referential prevention
DB::statement('ALTER TABLE entity_relationships ADD CONSTRAINT chk_no_self_reference CHECK (source_workspace_id != target_workspace_id)');
```

#### Migration 2: `create_entity_relationship_versions_table`

```php
Schema::create('entity_relationship_versions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('entity_relationship_id')->constrained('entity_relationships')->cascadeOnDelete();
    $table->string('relationship_type', 30);
    $table->integer('percentage')->nullable();
    $table->string('label', 255)->nullable();
    $table->string('change_type', 10); // created, updated, deleted
    $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('changed_at');

    $table->index(['entity_relationship_id', 'changed_at']);
});
```

#### Migration 3: `create_graph_node_positions_table`

```php
Schema::create('graph_node_positions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
    $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
    $table->float('x');
    $table->float('y');
    $table->timestamp('updated_at');

    $table->unique(['user_id', 'workspace_id']);
});
```

### Seeder Update

`RolesAndPermissionsSeeder` -- add 4 new permissions to `allPermissions()` and grant `entity-relationship.view` to all roles, full CRUD to owner and accountant only.

### Demo Data

`DemoPersonasSeeder` -- add sample entity relationships between demo workspaces so the graph is populated on first load:

- "Mike Chen" (personal) owns 100% of "Chen Enterprises" (pty_ltd)
- "Mike Chen" (personal) is beneficiary of "Chen Family Trust" (trust)
- "Chen Enterprises" is trustee of "Chen Family Trust"
- etc.

### Rollback

All migrations are additive. Rolling back requires dropping the three new tables. No existing data is affected.

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Canvas performance at 200 nodes with group containers | Janky interaction, fails SC-006 | Profile early with synthetic 200-node dataset. Group containers use convex hull algorithm with throttled recalculation. If needed, disable group containers at high node counts |
| Time slider net worth queries are slow | Slider interaction feels laggy | Cache historical net worth at monthly intervals. Pre-compute on first slider interaction. Debounce slider changes by 300ms |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Multiple edges between same pair overlap visually | Edges unreadable | Use curved edges with index-based offset. react-force-graph-2d supports `linkCurvature` per edge |
| Ghost nodes create visual noise in large graphs | Cluttered graph | Limit ghost nodes to immediate neighbours only. Cap at 10 ghost nodes. Fade opacity to 30% |
| Group container convex hull rendering conflicts with force layout | Group boundaries jitter during drag | Debounce container re-draw. Draw containers on a separate canvas layer below nodes |
| react-force-graph-2d TypeScript types incomplete | Type errors during development | Create local `.d.ts` augmentation file if needed. Library is actively maintained |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Position save frequency too high (every drag) | Excessive API calls | Debounce position saves by 2 seconds after last drag-end event |
| Undo across page refresh | Lost undo state | Undo is session-only (Zustand, not persisted). Documented as MVP limitation |
| PDF export quality at large zoom levels | Blurry exports | Render at 2x resolution for export |

---

## File Manifest

### New Files (Backend: 18, Frontend: 13)

**Backend**:
- `database/migrations/2026_03_22_710001_create_entity_relationships_table.php`
- `database/migrations/2026_03_22_710002_create_entity_relationship_versions_table.php`
- `database/migrations/2026_03_22_710003_create_graph_node_positions_table.php`
- `app/Enums/RelationshipType.php`
- `app/Models/Central/EntityRelationship.php`
- `app/Models/Central/EntityRelationshipVersion.php`
- `app/Models/Central/GraphNodePosition.php`
- `app/Actions/Graph/GetGraphData.php`
- `app/Actions/Graph/GetNodeDetail.php`
- `app/Actions/Graph/GetHistoricalNetWorth.php`
- `app/Actions/Graph/CreateEntityRelationship.php`
- `app/Actions/Graph/UpdateEntityRelationship.php`
- `app/Actions/Graph/DeleteEntityRelationship.php`
- `app/Actions/Graph/SaveNodePositions.php`
- `app/Http/Controllers/Api/EntityRelationshipController.php`
- `app/Http/Controllers/Api/GraphController.php`
- `app/Http/Requests/Graph/StoreEntityRelationshipRequest.php`
- `app/Http/Requests/Graph/UpdateEntityRelationshipRequest.php`
- `app/Http/Requests/Graph/DeleteEntityRelationshipRequest.php`
- `app/Http/Resources/EntityRelationshipResource.php`
- `app/Policies/EntityRelationshipPolicy.php`
- `tests/Feature/Api/EntityRelationshipTest.php`
- `tests/Feature/Api/GraphDataTest.php`
- `tests/Browser/GraphTest.php`

**Frontend**:
- `frontend/src/types/graph.ts`
- `frontend/src/hooks/use-graph.ts`
- `frontend/src/stores/graph.ts`
- `frontend/src/components/graph/GraphPage.tsx`
- `frontend/src/components/graph/GraphCanvas.tsx`
- `frontend/src/components/graph/GraphToolbar.tsx`
- `frontend/src/components/graph/GraphDetailPanel.tsx`
- `frontend/src/components/graph/GraphContextMenu.tsx`
- `frontend/src/components/graph/GraphTimeSlider.tsx`
- `frontend/src/components/graph/GraphMobileList.tsx`
- `frontend/src/components/graph/RelationshipForm.tsx`
- `frontend/src/components/graph/EntityQuickCreateForm.tsx`
- `frontend/src/components/graph/graph-utils.ts`
- `frontend/src/app/w/[slug]/(dashboard)/structure/page.tsx`

### Modified Files (4)

- `database/seeders/RolesAndPermissionsSeeder.php` -- add 4 permissions
- `app/Providers/AppServiceProvider.php` -- register EntityRelationshipPolicy
- `routes/api.php` -- add 12 routes
- `frontend/src/lib/navigation.ts` -- add "Structure" nav item + `n` chord shortcut

---

## FR Traceability Matrix

| FR | Description | Phase | Implementation |
|----|-------------|-------|----------------|
| FR-001 | entity_relationships table with required columns | P1 | Migration + EntityRelationship model |
| FR-002 | 8 relationship types | P1 | RelationshipType enum |
| FR-003 | Interactive force-directed graph | P3 | GraphCanvas (react-force-graph-2d) |
| FR-004 | Labelled edges with type and percentage | P3 | Edge rendering in GraphCanvas |
| FR-005 | WorkspaceGroups as visual containers | P3 | Convex hull overlay in GraphCanvas |
| FR-006 | Personal entities represent people | P3 | Circle shape, type-based rendering |
| FR-007 | Owner/accountant create via drag or context menu | P4 | GraphContextMenu + RelationshipForm |
| FR-008 | Owner/accountant edit by clicking edge label | P4 | Edge click handler + RelationshipForm |
| FR-009 | Owner/accountant remove via context menu + confirmation | P4 | GraphContextMenu + confirm dialog |
| FR-010 | Click-to-detail panel | P3 | GraphDetailPanel (Sheet) |
| FR-011 | Workspace access permissions respected | P2 | GetGraphData filters by user access |
| FR-012 | Time slider with historical filtering | P5 | GraphTimeSlider + GetHistoricalNetWorth |
| FR-013 | Search and filter | P5 | GraphToolbar search + type filter chips |
| FR-014 | 200 nodes at 60fps | P3 | Canvas rendering via react-force-graph-2d |
| FR-015 | Keyboard navigation | P6 | useHotkeys in GraphPage |
| FR-016 | Navigate from detail panel to workspace dashboard | P3 | "Go to entity" link in GraphDetailPanel |
| FR-017 | Edge tooltips on hover | P3 | onLinkHover callback |
| FR-018 | Mobile simplified list view | P3 | GraphMobileList |
| FR-019 | Ownership > 100% warning | P4 | API returns warning; frontend toast |
| FR-020 | Soft-delete relationships with entity | P1 | cascadeOnDelete + SoftDeletes |
| FR-021 | Auto-infer group membership on first load | P2 | GetGraphData includes WorkspaceGroup data |
| FR-022 | View all, edit owner/accountant only | P1 | Policy + Form Request authorize() |
| FR-023 | Directed relationships with inverse labels | P1+P3 | RelationshipType::inverseLabel() + detail panel |
| FR-024 | Multiple same-type edges between same pair | P1+P3 | No unique constraint + curved edge rendering |
| FR-025 | Versioned relationship history | P1+P5 | entity_relationship_versions + time slider |
| FR-026 | Node shapes by entity type | P3 | Shape drawing functions in graph-utils.ts |
| FR-027 | Edge labels on hover only | P3 | onLinkHover shows tooltip |
| FR-028 | Persist node positions per user | P6 | graph_node_positions table + SaveNodePositions |
| FR-029 | PNG/PDF export | P6 | html-to-image + jsPDF |
| FR-030 | Single undo (Ctrl+Z) | P4 | Zustand undo stack |
| FR-031 | Block self-referential relationships | P1 | DB CHECK + Form Request different: rule |
| FR-032 | Orphan entities in ungrouped area | P3 | Nodes without group_ids rendered outside containers |
| FR-033 | Top-level sidebar nav item | P3 | navigation.ts update |
| FR-034 | Centre on current workspace on load | P3 | centerAt() on initial render |
| FR-035 | Flat groups only (no nesting) | P3 | Top-level groups only in visual rendering |
| FR-036 | Desktop/tablet only, mobile list fallback | P3 | useIsMobile() conditional rendering |
