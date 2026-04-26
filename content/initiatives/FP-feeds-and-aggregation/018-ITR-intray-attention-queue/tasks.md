# 018+020 Combined Epic — Tasks

## Phase 1: Backend

- [X] T001 — Create IntrayItemData DTO (`app/Data/IntrayItemData.php`)
- [X] T002 — Create GetIntrayItems Action (`app/Actions/Intray/GetIntrayItems.php`) — 3 source methods: inbox items, draft bills, overdue invoices
- [X] T003 — Create GetIntrayCounts Action (`app/Actions/Intray/GetIntrayCounts.php`) — parallel COUNT queries
- [X] T004 — Create IntrayController (`app/Http/Controllers/Api/IntrayController.php`) — index, counts, badge endpoints
- [X] T005 — Add intray API routes to `routes/api.php`
- [X] T006 — Write feature tests (`tests/Feature/Intray/IntrayApiTest.php`) — items, counts, badge, scoping, auth
- [X] T007 — Run tests and verify Phase 1 passes

## Phase 2: Frontend — Intray Page

- [X] T008 — Create intray types (`frontend/src/types/intray.ts`)
- [X] T009 — Create useIntray hook (`frontend/src/hooks/use-intray.ts`) — items, counts, badge queries
- [X] T010 — Create Intray page (`frontend/src/app/(dashboard)/intray/page.tsx`) — StatusTabs, DataTable, urgency badges, row actions
- [X] T011 — Verify page loads and displays data correctly

## Phase 3: Navigation + Dashboard + AI

- [X] T012 — Add intray nav item with badge to sidebar (`frontend/src/components/layout/app-sidebar.tsx`)
- [X] T013 — Add `G then T` keyboard shortcut (`frontend/src/hooks/use-keyboard-shortcuts.ts`, `frontend/src/lib/navigation.ts`, keyboard overlay)
- [X] T014 — Create IntrayWidget for dashboard (`frontend/src/app/(dashboard)/dashboard/page.tsx`) — category counts card
- [X] T015 — Add `get_intray_items` chat tool (`frontend/src/app/api/chat/route.ts`)

## Phase 4: Tests + Polish

- [X] T016 — Write browser tests (`tests/Browser/IntrayTest.php`)
- [X] T017 — Run full test suite, fix any failures
- [X] T018 — Run `vendor/bin/pint --dirty` for PHP formatting
