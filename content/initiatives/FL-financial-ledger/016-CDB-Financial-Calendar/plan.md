---
title: "Implementation Plan: Financial Calendar & Meetings"
---

# Implementation Plan: Financial Calendar & Meetings

**Spec**: [spec.md](spec.md) | **Created**: 2026-03-19 | **Status**: Draft
**Epic**: 016-CDB (sub-feature — Financial Calendar)

---

## Summary

Build a Financial Calendar page (`/calendar`) that aggregates financial events (invoice/bill due dates, recurring entries, accounting periods) into a colour-coded month/week view, plus a full Meeting entity with CRUD, attendees with email invites, recurring schedules, notes, attachments, and a standalone index page. The calendar is a read-only lens for financial data and a scheduling tool for meetings.

---

## Technical Context

**Backend**: Laravel 12, PHP 8.4, SQLite (local), Spatie Permission (teams mode), Lorisleiva Actions
**Frontend**: Next.js 16 (React 19, TypeScript), TanStack Query v5, Zustand v5, shadcn/ui, Tailwind CSS
**Auth**: Sanctum cookie-based SPA, `SetWorkspaceContext` middleware
**Email**: Laravel Mailables (023-EML infrastructure — already built)
**Testing**: Pest v4 (Feature + Browser/Playwright)
**Existing infra reused**: `HasNotes`, `HasAttachments`, `RecurringTemplate`, polymorphic morph map, `RolesAndPermissionsSeeder`

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| 003-AUT Auth & Multi-tenancy | Complete | Workspace context, roles |
| 005-IAR Invoicing & AR/AP | Complete | Invoice/bill due dates |
| 006-CCM Contacts & Client Mgmt | Complete | Meeting-to-contact linking |
| 007-FRC Financial Reporting | Complete | Accounting period dates |
| 023-EML Email Infrastructure | Complete | Meeting invitation emails |
| 024-RPT Repeating Entries | Complete | RecurringTemplate infrastructure |

### Constraints

- Calendar API response < 200ms for typical workspace data
- Meeting CRUD < 500ms including attendee notification dispatch
- Tenant isolation on all queries (workspace_id scoping)
- No event sourcing for meetings — simple CRUD entity (like contacts, jobs)
- Multi-day meetings not supported in v1
- Timezone: UTC storage, browser-local timezone for display (no workspace timezone column exists — defer workspace-level TZ config to future epic)

---

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Aggregation endpoint for financial events + standard CRUD for meetings |
| Existing patterns leveraged | PASS | Follows Contact/Job controller pattern, reuses HasNotes/HasAttachments/RecurringTemplate |
| No impossible requirements | PASS | All spec items buildable with existing stack |
| Performance considered | PASS | Indexed queries on due_date/starts_at/workspace_id, pre-fetch buffering |
| Security considered | PASS | Workspace scoping, permission-based access, Sanctum auth |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | Meeting + MeetingAttendee models, 3 new enums |
| API contracts clear | PASS | CalendarController (events, upcoming) + MeetingController (CRUD + counts + complete) + MeetingAttendeeController |
| Dependencies identified | PASS | All 6 dependencies complete |
| Integration points mapped | PASS | Morph map, RecurringTemplateType extension, email mailables |
| DTO persistence explicit | PASS | Form Request validated() for simple fields, no toArray() into create() |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See Implementation Phases below |
| Risk areas noted | PASS | Calendar aggregation query performance, email delivery for external attendees |
| Testing approach defined | PASS | Feature tests for API, browser tests for calendar UI |
| Rollback possible | PASS | Standard migration rollback, no event sourcing |

### 4. Resource & Scope

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | 64 FRs, all addressed in phases |
| Effort reasonable | PASS | 4 phases, follows well-established patterns |
| Skills available | PASS | All patterns exist in codebase |

### 5. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded business logic | PASS | All rules in Actions, frontend renders API data |
| Cross-platform reusability | PASS | API-first, no frontend-only logic |
| Model route binding | PASS | Controllers use Model instances via Form Request pre-loading |
| Use Lorisleiva Actions | PASS | CreateMeeting, UpdateMeeting, MarkMeetingComplete, CancelMeeting |
| Migrations schema-only | PASS | No data operations in migrations |
| Granular model policies | PASS | MeetingPolicy with 4 permissions |
| Feature flags dual-gated | N/A | No feature flag needed — new page, not behind toggle |

### 6. Frontend Standards (Next.js/React — CLAUDE.md overrides)

| Check | Status | Notes |
|-------|--------|-------|
| All components use TypeScript | PASS | Every .tsx with strict types |
| Props typed with interfaces/types | PASS | All components use `type Props = {}` |
| No `any` types | PASS | API response types in `types/` |
| TanStack Query for server state | PASS | useMeetings, useCalendarEvents, useMeetingCounts hooks |
| Zustand for client state | PASS | Calendar view state (month/week, filters) |
| Forms use React Hook Form + Zod | PASS | Meeting creation/edit form |
| Server/client components explicit | PASS | Pages are client components (interactive calendar) |

---

## Data Model

### New Models

#### Meeting (`app/Models/Tenant/Meeting.php`)

```
meetings
├── id (bigint, PK)
├── uuid (uuid, unique)
├── workspace_id (bigint, FK → workspaces)
├── title (string, max 255, required)
├── type (enum: MeetingType)
├── starts_at (datetime, required, stored UTC)
├── ends_at (datetime, required, stored UTC, same calendar date as starts_at)
├── contact_id (bigint, nullable, FK → contacts, SET NULL on delete)
├── location (string, nullable, max 500)
├── description (text, nullable)
├── status (enum: MeetingStatus, default: scheduled)
├── created_by (bigint, FK → users)
├── recurring_template_id (bigint, nullable, FK → recurring_templates)
├── completed_at (datetime, nullable)
├── cancelled_at (datetime, nullable)
├── created_at / updated_at (timestamps)
└── deleted_at (softDeletes)

Traits: HasAttachments, HasNotes, SoftDeletes
Indexes: (workspace_id, starts_at), (workspace_id, status), (contact_id), (recurring_template_id)
```

#### MeetingAttendee (`app/Models/Tenant/MeetingAttendee.php`)

```
meeting_attendees
├── id (bigint, PK)
├── meeting_id (bigint, FK → meetings, CASCADE)
├── user_id (bigint, nullable, FK → users)
├── email (string, nullable, required when user_id is null)
├── name (string, nullable — display name for external invites)
├── rsvp_status (enum: AttendeeRsvpStatus, default: pending)
├── is_organiser (boolean, default: false)
├── invited_at (datetime)
├── responded_at (datetime, nullable)
├── created_at / updated_at (timestamps)

Unique constraints: (meeting_id, user_id), (meeting_id, email)
```

### New Enums (`app/Enums/`)

```php
enum MeetingType: string {
    case Review = 'review';
    case Advisory = 'advisory';
    case TaxPlanning = 'tax_planning';
    case Onboarding = 'onboarding';
    case General = 'general';
}

enum MeetingStatus: string {
    case Scheduled = 'scheduled';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}

enum AttendeeRsvpStatus: string {
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Declined = 'declined';
}
```

### Existing Model Changes

- `RecurringTemplateType` enum → add `Meeting = 'meeting'` case
- `AppServiceProvider` morph map → add `'meeting' => Meeting::class`
- `RolesAndPermissionsSeeder` → add `meeting.view`, `meeting.create`, `meeting.update`, `meeting.delete` permissions with role assignments

---

## API Contracts

### Calendar Endpoints (`CalendarController`)

```
GET  /api/v1/calendar/events?start_date=2026-03-01&end_date=2026-03-31
     → CalendarEventResource::collection (aggregated from invoices, bills, recurring templates, periods, meetings)

GET  /api/v1/calendar/upcoming
     → CalendarEventResource::collection (next 14 days, chronological)
```

**CalendarEventResource shape:**
```json
{
  "type": "invoice-due|invoice-overdue|bill-due|bill-overdue|recurring-entry|period-open|period-close|period-lock|meeting",
  "date": "2026-03-19",
  "starts_at": "2026-03-19T10:00:00Z",
  "ends_at": "2026-03-19T11:00:00Z",
  "label": "Invoice #1042 — Acme Corp",
  "amount": 150000,
  "contact_name": "Acme Corp",
  "source_type": "invoice",
  "source_uuid": "abc-123",
  "colour": "green"
}
```

### Meeting Endpoints (`MeetingController`)

```
GET    /api/v1/meetings                    → MeetingResource::collection (paginated, filterable)
GET    /api/v1/meetings/counts             → { scheduled: N, completed: N, cancelled: N }
POST   /api/v1/meetings                    → MeetingResource (create)
GET    /api/v1/meetings/{uuid}             → MeetingResource (with attendees, notes, attachments)
PATCH  /api/v1/meetings/{uuid}             → MeetingResource (update)
DELETE /api/v1/meetings/{uuid}             → { message: 'Meeting cancelled' }
POST   /api/v1/meetings/{uuid}/complete    → MeetingResource (mark complete, trigger recurring)
```

### Meeting Attendee Endpoints (`MeetingAttendeeController`)

```
GET    /api/v1/meetings/{uuid}/attendees           → MeetingAttendeeResource::collection
POST   /api/v1/meetings/{uuid}/attendees           → MeetingAttendeeResource (add attendee)
DELETE /api/v1/meetings/{uuid}/attendees/{id}       → { message: 'Attendee removed' }
POST   /api/v1/meetings/{uuid}/attendees/{id}/rsvp  → MeetingAttendeeResource (accept/decline — public route for email links)
```

### Existing Endpoint Modifications

None — calendar aggregates existing data via read queries, no modifications to invoice/bill/period APIs.

---

## Backend File Plan

### New Files

| File | Purpose |
|------|---------|
| `app/Enums/MeetingType.php` | Meeting type enum with label() |
| `app/Enums/MeetingStatus.php` | Meeting status enum with label() |
| `app/Enums/AttendeeRsvpStatus.php` | RSVP status enum with label() |
| `app/Models/Tenant/Meeting.php` | Meeting model with HasNotes, HasAttachments, SoftDeletes |
| `app/Models/Tenant/MeetingAttendee.php` | Attendee pivot model |
| `app/Http/Controllers/Api/CalendarController.php` | Calendar aggregation (events, upcoming) |
| `app/Http/Controllers/Api/MeetingController.php` | Meeting CRUD + counts + complete |
| `app/Http/Controllers/Api/MeetingAttendeeController.php` | Attendee management |
| `app/Http/Resources/CalendarEventResource.php` | Calendar event display DTO |
| `app/Http/Resources/MeetingResource.php` | Meeting API resource |
| `app/Http/Resources/MeetingAttendeeResource.php` | Attendee API resource |
| `app/Http/Requests/Meeting/StoreMeetingRequest.php` | Create validation + auth |
| `app/Http/Requests/Meeting/UpdateMeetingRequest.php` | Update validation + pre-load |
| `app/Http/Requests/Meeting/CompleteMeetingRequest.php` | Mark complete auth |
| `app/Http/Requests/MeetingAttendee/StoreAttendeeRequest.php` | Add attendee validation |
| `app/Policies/MeetingPolicy.php` | Permission-based auth (4 methods) |
| `app/Actions/Meeting/CreateMeeting.php` | Create meeting + auto-add organiser attendee |
| `app/Actions/Meeting/UpdateMeeting.php` | Update meeting + notify attendees if rescheduled |
| `app/Actions/Meeting/MarkMeetingComplete.php` | Complete + trigger recurring next occurrence |
| `app/Actions/Meeting/CancelMeeting.php` | Cancel + notify attendees |
| `app/Actions/Meeting/AddMeetingAttendee.php` | Add attendee + send invitation email |
| `app/Mail/MeetingInvitationMail.php` | Invitation email with accept/decline links |
| `app/Mail/MeetingRescheduledMail.php` | Reschedule notification email |
| `app/Mail/MeetingCancelledMail.php` | Cancellation notification email |
| `database/migrations/xxxx_create_meetings_table.php` | Meetings schema |
| `database/migrations/xxxx_create_meeting_attendees_table.php` | Attendees schema |
| `resources/views/mail/meeting-invitation.blade.php` | Invitation email template |
| `resources/views/mail/meeting-rescheduled.blade.php` | Reschedule email template |
| `resources/views/mail/meeting-cancelled.blade.php` | Cancellation email template |
| `tests/Feature/Api/CalendarTest.php` | Calendar endpoint tests |
| `tests/Feature/Api/MeetingTest.php` | Meeting CRUD tests |
| `tests/Feature/Api/MeetingAttendeeTest.php` | Attendee management tests |

### Modified Files

| File | Change |
|------|--------|
| `app/Enums/RecurringTemplateType.php` | Add `Meeting = 'meeting'` case |
| `app/Providers/AppServiceProvider.php` | Add `'meeting'` to morph map, register MeetingPolicy |
| `database/seeders/RolesAndPermissionsSeeder.php` | Add 4 meeting permissions with role assignments |
| `routes/api.php` | Add calendar + meeting + attendee routes; add `meetings` to polymorphic attachment/note `parentType` regex |
| `app/Actions/Recurring/ProcessRecurringTemplate.php` | Handle meeting template type; update return type to `Invoice\|JournalEntry\|Meeting` |

---

## Frontend File Plan

### New Files

| File | Purpose |
|------|---------|
| **Types** | |
| `frontend/src/types/calendar.ts` | CalendarEvent, CalendarEventType types |
| `frontend/src/types/meeting.ts` | Meeting, MeetingAttendee, MeetingType, MeetingStatus types |
| **Hooks** | |
| `frontend/src/hooks/use-calendar.ts` | useCalendarEvents, useUpcomingEvents hooks |
| `frontend/src/hooks/use-meetings.ts` | useMeetings, useMeetingCounts, useCreateMeeting, useUpdateMeeting, etc. |
| **Pages** | |
| `frontend/src/app/(dashboard)/calendar/page.tsx` | Calendar page with month/week views |
| `frontend/src/app/(dashboard)/meetings/page.tsx` | Meetings index with StatusTabs |
| `frontend/src/app/(dashboard)/meetings/new/page.tsx` | Create meeting form |
| `frontend/src/app/(dashboard)/meetings/[id]/page.tsx` | Meeting detail page |
| `frontend/src/app/(dashboard)/meetings/[id]/edit/page.tsx` | Edit meeting form |
| **Calendar Components** | |
| `frontend/src/components/calendar/CalendarView.tsx` | Main calendar container (month/week toggle) |
| `frontend/src/components/calendar/MonthView.tsx` | Month grid with event dots |
| `frontend/src/components/calendar/WeekView.tsx` | Week columns with time-positioned pills |
| `frontend/src/components/calendar/DayCell.tsx` | Individual day cell with event indicators |
| `frontend/src/components/calendar/EventIndicator.tsx` | Colour-coded event dot/pill |
| `frontend/src/components/calendar/EventPopover.tsx` | Click-to-view event details |
| `frontend/src/components/calendar/CalendarNav.tsx` | Month/week navigation + Today button |
| `frontend/src/components/calendar/EventFilters.tsx` | Event type filter chips |
| `frontend/src/components/calendar/UpcomingSidebar.tsx` | 14-day upcoming events panel |
| `frontend/src/components/calendar/DayDetailPanel.tsx` | Full event list for overflow days |
| **Meeting Components** | |
| `frontend/src/components/meetings/MeetingForm.tsx` | Create/edit form (React Hook Form + Zod) |
| `frontend/src/components/meetings/AttendeeList.tsx` | Attendee list with RSVP badges |
| `frontend/src/components/meetings/AddAttendeeForm.tsx` | Add workspace user or external email |
| `frontend/src/components/meetings/MeetingStatusBadge.tsx` | Status badge component |
| **Stores** | |
| `frontend/src/stores/calendar-store.ts` | Calendar UI state (view mode, filters, selected date) |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/components/layout/sidebar.tsx` | Add Calendar and Meetings nav items with shortcuts |
| `frontend/src/lib/navigation.ts` | Add `/calendar` (`G then Y`) and `/meetings` (`G then E`) routes + `urlToModule` entries |
| `frontend/src/stores/shortcuts-store.ts` | Add `G then Y` (calendar) and `G then E` (meetings) shortcuts |

---

## Implementation Phases

### Phase 1: Foundation — Models, Migrations, Enums, Permissions (Backend)

**Goal**: Database schema, models, enums, permissions, and morph map — everything needed before any API endpoints.

1. Create migrations: `meetings` table, `meeting_attendees` table
2. Create enums: `MeetingType`, `MeetingStatus`, `AttendeeRsvpStatus`
3. Create models: `Meeting` (with HasNotes, HasAttachments, SoftDeletes), `MeetingAttendee`
4. Update `RecurringTemplateType` enum — add `Meeting` case
5. Update `AppServiceProvider` — add `'meeting'` to morph map, register `MeetingPolicy`
6. Create `MeetingPolicy` (4 methods delegating to Spatie Permission)
7. Update `RolesAndPermissionsSeeder` — add `meeting.view/create/update/delete` permissions with role assignments:
   - **owner, accountant**: all 4 permissions
   - **bookkeeper**: `meeting.view`, `meeting.create`, `meeting.update`
   - **approver**: `meeting.view` only
   - **auditor**: `meeting.view` only
   - **client**: `meeting.view` only
8. Write unit tests for model relationships, enum labels, policy authorization

### Phase 2: Meeting CRUD — Actions, Controllers, Routes (Backend)

**Goal**: Full meeting lifecycle API — create, read, update, cancel, mark complete.

1. Create Form Requests: `StoreMeetingRequest`, `UpdateMeetingRequest`, `CompleteMeetingRequest`
2. Create Actions: `CreateMeeting`, `UpdateMeeting`, `MarkMeetingComplete`, `CancelMeeting`
3. Create API Resources: `MeetingResource`, `MeetingAttendeeResource`
4. Create `MeetingController` (index, counts, store, show, update, destroy, complete)
5. Register routes in `api.php`
6. Write feature tests: CRUD endpoints, permission checks, tenant isolation, status transitions

### Phase 3: Attendees & Email — Invitations, RSVP (Backend)

**Goal**: Multi-attendee support with email invitations and RSVP.

1. Create `AddMeetingAttendee` action
2. Create `MeetingAttendeeController` (index, store, destroy, rsvp)
3. Create mailables: `MeetingInvitationMail`, `MeetingRescheduledMail`, `MeetingCancelledMail`
4. Create email templates (Blade views)
5. Create public RSVP route using `URL::signedRoute('meeting.rsvp', ['attendee' => $id, 'response' => 'accepted|declined'])` — Laravel validates the signature automatically, tamper-proof, no auth required
6. Update `UpdateMeeting` action — detect reschedule and notify attendees
7. Update `CancelMeeting` action — notify attendees
8. Write feature tests: attendee CRUD, email dispatch, RSVP flow, reschedule notifications

### Phase 4: Calendar Aggregation API (Backend)

**Goal**: Single endpoint that queries invoices, bills, recurring templates, periods, and meetings.

1. Create `CalendarEventResource` (display DTO)
2. Create `CalendarController` with `events()` and `upcoming()` methods
3. Implement aggregation via **separate Eloquent queries merged in PHP** (not UNION ALL):
   - `$invoiceEvents = Invoice::where(...)->get()->map(fn => CalendarEventData)`
   - `$billEvents = Bill::where(...)->get()->map(fn => CalendarEventData)`
   - `$recurringEvents = RecurringTemplate::where(...)->get()->map(fn => CalendarEventData)`
   - `$periodEvents = AccountingPeriod::where(...)->get()->map(fn => CalendarEventData)`
   - `$meetingEvents = Meeting::where(...)->get()->map(fn => CalendarEventData)`
   - `$all = collect()->merge(...)->sortBy('date')->values()`
   Each query is simple, independently optimisable, and easy to extend with new event types.
4. Register calendar routes
5. Extend `ProcessRecurringTemplate` to handle meeting template type
6. Write feature tests: aggregation correctness, date range filtering, overdue detection, performance

### Phase 5: Frontend — Calendar Page (Frontend)

**Goal**: Calendar UI with month/week views, event rendering, navigation, filters.

1. Create TypeScript types: `CalendarEvent`, `CalendarEventType`, `Meeting`, `MeetingAttendee`
2. Create TanStack Query hooks: `useCalendarEvents`, `useUpcomingEvents`
3. Create Zustand store: `calendar-store` (view mode, filters, selected date)
4. Build calendar components:
   - `CalendarView` → container with `MonthView` / `WeekView` toggle
   - `MonthView` → 6-week grid with `DayCell` components
   - `WeekView` → 7 day columns with time-positioned pills
   - `DayCell` → event indicators with "+N more" overflow
   - `EventIndicator` → colour-coded dot/pill
   - `EventPopover` → shadcn Popover with record details + "View" link
   - `CalendarNav` → prev/next/today + month/week toggle
   - `EventFilters` → toggleable chips per event type
   - `UpcomingSidebar` → chronological 14-day list
   - `DayDetailPanel` → full event list for overflow days
5. Create `/calendar` page route
6. Add Calendar nav item to sidebar with `G then Y` shortcut (note: `G then F` is taken by Feed)

### Phase 6: Frontend — Meetings Pages (Frontend)

**Goal**: Meetings index, detail, create, edit pages.

1. Create TanStack Query hooks: `useMeetings`, `useMeetingCounts`, `useCreateMeeting`, `useUpdateMeeting`, `useMarkComplete`, `useCancelMeeting`
2. Build meeting components:
   - `MeetingForm` → React Hook Form + Zod (title, type, dates, contact, location, description, attendees)
   - `AttendeeList` → attendee list with RSVP status badges
   - `AddAttendeeForm` → workspace user dropdown + external email input
   - `MeetingStatusBadge` → colour-coded status badge
3. Create pages:
   - `/meetings` → index with StatusTabs (scheduled/completed/cancelled), DataTable, search
   - `/meetings/new` → create form
   - `/meetings/[id]` → detail page with notes, attachments, attendees
   - `/meetings/[id]/edit` → edit form
4. Add Meetings nav item to sidebar with `G then E` shortcut
5. Wire "Mark Complete" and "Cancel" actions on detail page
6. Add meeting popover actions (Edit, Cancel, Mark Complete) to calendar EventPopover

---

## Testing Strategy

### Phase 1 Tests (Foundation)
- Unit: Model relationships, enum label methods, casting
- Feature: Permission seeding, policy authorization per role

### Phase 2 Tests (Meeting CRUD)
- Feature: Create/read/update/cancel/complete endpoints
- Feature: Permission checks (owner can CRUD, client can only view, etc.)
- Feature: Tenant isolation (workspace A can't see workspace B meetings)
- Feature: Status transitions (scheduled → completed, scheduled → cancelled)

### Phase 3 Tests (Attendees & Email)
- Feature: Add/remove attendees, RSVP accept/decline
- Feature: Email dispatch verification (Mail::fake())
- Feature: Public RSVP route (token-based, no auth)
- Feature: Reschedule triggers updated email to all attendees

### Phase 4 Tests (Calendar Aggregation)
- Feature: Correct events per date range (invoices, bills, recurring, periods, meetings)
- Feature: Overdue detection (past due_date + still open = red)
- Feature: Excluded records (paid invoices, cancelled meetings, paused templates)
- Feature: Date range filtering with buffer
- Feature: Performance (< 200ms with realistic data volume)

### Phase 5-6 Tests (Frontend — Browser)
- Browser: Calendar page loads with events on correct dates
- Browser: Month/week toggle, navigation, today button
- Browser: Event popover shows correct details
- Browser: Meeting create form submission
- Browser: Meetings index with StatusTabs
- Browser: Meeting detail page with notes and attachments

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Calendar aggregation query slow | Medium | High | Index on (workspace_id, due_date/starts_at), pre-fetch buffer, TanStack Query caching |
| Email delivery failures for external attendees | Low | Medium | Queue emails via Mail::queue(), attendee stays "pending", organiser follows up manually. Retries handled by queue worker. |
| RecurringTemplate extension breaks existing templates | Low | High | Add Meeting case to enum without modifying existing cases, test existing template processing |
| Calendar UI rendering performance with many events | Low | Medium | Aggregate same-type events per day in month view, virtual scrolling in week view |
| Timezone display inconsistencies | Low | Low | All UTC storage, browser-local timezone for display via date-fns `formatInTimeZone`. No workspace-level TZ config exists — not needed for v1, users see their own local time. |

---

## Development Clarifications

### Session 2026-03-19
- Q: How should the calendar aggregation endpoint combine data from 5 tables? → A: Separate Eloquent queries merged in PHP via Collection::merge() + sortBy(). Each query is simple, independently optimisable, easy to add/remove event types. No raw SQL UNION ALL — stays within Eloquent patterns. Caching not needed for < 200ms target on indexed queries.
- Q: How should external RSVP tokens work? → A: Laravel's built-in `URL::signedRoute()`. Tamper-proof, expirable, zero new infrastructure. Email links use `URL::signedRoute('meeting.rsvp', ['attendee' => $id, 'response' => 'accepted'])`. Laravel validates the signature automatically via `->middleware('signed')` on the route.
- Q: Should attendee notification emails be queued or sent synchronously? → A: Queued via `Mail::queue()`. Doesn't block the HTTP response, handles multiple attendees gracefully, retries on failure. All meeting actions (create, reschedule, cancel) dispatch emails to the queue rather than sending in-request.
- Q: Should the calendar use a library or be custom-built? → A: Custom-built with shadcn/ui primitives + CSS Grid + date-fns. The spec requires specific behaviour (colour-coded dots, time-positioned pills, custom popovers, event filters) that would fight library defaults. Keeps bundle small, full control over Xero-like styling. No FullCalendar or react-big-calendar dependency.
- Q: Which date library for the calendar frontend? → A: date-fns — already used in the codebase, tree-shakeable, pure functions. `startOfMonth`, `eachDayOfInterval`, `addMonths`, `format`, `isSameDay`, `isAfter` cover all calendar grid needs. No second date library.
- Q: Keyboard shortcut conflict — `G then F` is already taken by "Feed". What shortcuts for Calendar and Meetings? → A: Calendar uses `G then Y` (calend**Y**r mnemonic, all closer letters taken). Meetings uses `G then E` (m**E**etings, available). Updated plan and `chordShortcuts` map accordingly.
- Q: How should the CalendarController be authorized? It reads from 5 different tables each with their own permissions. → A: CalendarController uses a union of view permissions — the user sees events only for domains they can access. Each sub-query is conditionally included: invoices only if `$user->can('viewAny', Invoice::class)`, bills only if `$user->can('viewAny', Invoice::class)` (bills use InvoicePolicy), periods only if `period.view`, meetings only if `meeting.view`, recurring templates only if the user can view any of invoice/bill/JE. No new `calendar.view` permission — the calendar is a lens, not a resource.
- Q: Should DELETE on meetings actually cancel (status change) or soft delete? → A: DELETE sets `status=cancelled`, `cancelled_at=now()`, and fires `MeetingCancelledMail` to attendees. Follows soft-delete pattern (SoftDeletes trait on model) so the record is retained for history. The controller's `destroy()` calls `CancelMeeting` action which sets the status and then calls `$meeting->delete()` for the soft delete. Matches the invoice void pattern — status change + soft delete.
- Q: How should polymorphic notes and attachments work for meetings? → A: Add `'meeting'` to the morph map in `AppServiceProvider`. Add `meetings` to the `parentType` regex constraint on polymorphic attachment and note routes in `api.php`. Meeting model already has `HasNotes` and `HasAttachments` traits — no new code needed beyond the route constraint update.
- Q: What shape does `template_data` take for recurring meeting templates? → A: `{ title, type, duration_minutes, contact_id, location, description, attendee_user_ids: int[], attendee_emails: string[] }`. The `ProcessRecurringTemplate` meeting handler creates the meeting via `CreateMeeting` action, which auto-adds attendees. `starts_at` is derived from `next_due_date` + a configurable `time_of_day` field (e.g. "10:00") stored in `template_data`.
- Q: How should the ProcessRecurringTemplate return type change for Meeting? → A: Update return type from `Invoice|JournalEntry` to `Invoice|JournalEntry|Meeting`. Add a `processMeeting()` private method following the same pattern as `processInvoice()`. The meeting document linkage (`recurring_template_id`) is set in the action, same as invoices.
- Q: How should overdue detection work in the calendar aggregation? → A: Invoices/bills are "overdue" when `due_date < today()` AND status is not `paid`/`voided`/`draft`. The CalendarController checks this in the map closure: if `due_date->isPast()` and status is `approved`/`sent`/`partial`, event type becomes `invoice-overdue` or `bill-overdue` with red colour. No separate overdue query — determined at map time.
- Q: What is the pre-fetch buffer strategy for adjacent months? → A: Frontend fetches `start_date - 7 days` to `end_date + 7 days` to cover partial weeks visible in the grid. TanStack Query caches by date range key. No server-side pre-fetch — the client requests what it needs, and the 7-day buffer ensures visible edge days have data. `staleTime: 5 * 60 * 1000` (5 minutes) prevents excessive refetches.
- Q: How should timezone display work given no workspace timezone column exists? → A: Use browser-local timezone via date-fns `format()` which defaults to local timezone. All `starts_at`/`ends_at` stored as UTC in the database. Frontend formats for display using the user's browser timezone. No workspace-level timezone config in v1 — defer to a future "Workspace Settings" enhancement. This is consistent with how all other datetime fields are displayed in the app today.
- Q: How should the RSVP public route be structured? → A: Place the signed RSVP route outside the `auth:sanctum` middleware group, alongside other public routes (job share, invitations). Route: `GET /api/v1/meetings/rsvp` with `->middleware('signed')->name('meeting.rsvp')`. The controller reads `attendee` and `response` from query params, validates the signed URL, updates the `MeetingAttendee` record, and returns a simple JSON response (or redirects to a "Thanks" page on the frontend).
- Q: What browser test seeding strategy should be used for meetings? → A: Add meetings to `DemoPersonasSeeder` — create 3-4 sample meetings across different statuses (scheduled, completed, cancelled) with attendees. This follows the existing pattern where demo seed data covers all entity types. Browser tests use `browserLogin()` which relies on seeded data being present.
- Q: Should the `upcoming` endpoint be a separate route or a query param on `events`? → A: Separate route (`GET /api/v1/calendar/upcoming`) as planned. It returns a flat chronological list for the next 14 days, optimised for the sidebar widget. Different response shape from the calendar grid (no grouping by date cells). Follows the pattern of `recurring-templates/upcoming` which is also a separate dedicated endpoint.

---

## Next Steps

1. Run `/speckit-tasks` to generate tasks.md
2. Run `/trilogy-clarify-dev` to refine technical approach
3. Run `/trilogy-db-visualiser` to visualise the data model
