---
title: "Feature Specification: Financial Calendar"
---

# Feature Specification: Financial Calendar

**Epic**: 016-CDB (sub-feature — Financial Calendar)
**Feature Branch**: `016-CDB-customizable-dashboard`
**Created**: 2026-03-14
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 4 (Post-Core)

---

## Context

MoneyQuest Ledger hosts the full accounting cycle for a workspace — invoices with due dates, bills with payment deadlines, recurring journal entries that fire on a schedule, and accounting periods that open, close, and lock on predictable dates. All of this information exists in the system, but it is scattered across separate screens. There is no single view that answers: "What does my financial week look like?"

The Financial Calendar is a month/week view calendar embedded in the dashboard. It aggregates financial events from across the ledger into a single time-based view — colour-coded by event type, clickable to jump to the relevant record, and designed to communicate accounting obligations between accountants and business owners.

The calendar serves two purposes: (1) a **read-only lens** over existing financial data — invoices, bills, recurring entries, and accounting periods are aggregated and displayed automatically; and (2) a **meeting scheduler** — users can create, edit, and manage meetings directly on the calendar. Financial events cannot be created or modified from the calendar itself, but meetings can.

The value is visibility and collaboration: a business owner can see at a glance that three invoices are due this week, two bills need paying Friday, a BAS period closes end of month, and there's a client review meeting on Thursday. An accountant can schedule advisory sessions, tax planning meetings, and review calls — all visible alongside financial obligations in a single unified view. During a meeting, the accountant can walk through upcoming obligations without navigating between five different screens.

### Financial Event Types

| Event Type | Colour Code | Description |
|------------|-------------|-------------|
| Invoice due | Green | An open sales invoice has its due date on this day |
| Invoice overdue | Red | An open sales invoice whose due date has passed |
| Bill due | Orange | An open bill (AP) has its due date on this day |
| Bill overdue | Red | An open bill whose due date has passed |
| Recurring journal entry | Purple | A recurring journal entry template is scheduled to generate on this day |
| Period open | Blue | An accounting period starts on this day |
| Period close | Blue | An accounting period ends on this day |
| Period lock | Grey | An accounting period becomes locked on this day (no further entries) |
| Meeting | Teal | A user-created meeting is scheduled on this day |

Overdue events use the same red colour regardless of type to create a consistent visual signal for urgency.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 003-AUT Auth & Multi-tenancy | Workspace context and user roles |
| **Depends on** | 005-IAR Invoicing & AR/AP | Invoice and bill due dates |
| **Depends on** | 007-FRC Financial Reporting & Compliance | Accounting period open/close/lock dates |
| **Depends on** | 006-CCM Contacts & Client Mgmt | Meeting-to-contact linking |
| **Depends on** | 023-EML Email Infrastructure | Meeting invitation emails |
| **Builds alongside** | 016-CDB Customizable Dashboard | Delivered as a calendar widget within the dashboard ecosystem |

---

## User Scenarios & Testing

### User Story 1 — View the Financial Calendar in Month View (Priority: P1)

A business owner wants to understand what financial obligations are coming up this month. They navigate to the Financial Calendar and see a standard month grid. Each day that has a financial event shows a small coloured dot or pill. They can immediately see that this Friday has two invoice due dates (green) and one bill due date (orange), and that next Wednesday shows a recurring journal entry (purple). They understand at a glance which days require attention.

**Why this priority**: The month view is the fundamental calendar surface. Without it, there is no feature. It establishes the core pattern of event display, colour coding, and navigation that all other stories build on.

**Independent Test**: Can be fully tested with demo data by verifying that invoice due dates, bill due dates, recurring entry dates, and accounting period dates each appear on the correct calendar days with the correct colour coding.

**Acceptance Scenarios**:

1. **Given** a logged-in user navigates to the Financial Calendar, **When** the page loads, **Then** a month view grid is displayed for the current calendar month, with today's date highlighted.
2. **Given** a workspace has open invoices with due dates in the current month, **When** the user views the month calendar, **Then** each due date shows a green event indicator on the correct day.
3. **Given** an invoice due date has already passed and the invoice is still open (unpaid), **When** the user views that date on the calendar, **Then** the event indicator is shown in red, not green, to signal overdue status.
4. **Given** a workspace has open bills with due dates in the current month, **When** the user views the month calendar, **Then** each bill due date shows an orange event indicator on the correct day.
5. **Given** a workspace has recurring journal entry templates with next-occurrence dates in the current month, **When** the user views the month calendar, **Then** each scheduled occurrence shows a purple event indicator on the correct day.
6. **Given** a workspace has accounting period boundaries in the current month, **When** the user views the month calendar, **Then** period open dates, period close dates, and period lock dates each show a blue or grey indicator on the correct day.
7. **Given** a day has events of multiple types, **When** the user views that day, **Then** multiple coloured indicators are shown — one per event type present — up to a maximum of four visible, with a "+N more" label if there are more.

---

### User Story 2 — Navigate Between Months and Weeks (Priority: P1)

An accountant preparing for a month-end close wants to scan the next two months of obligations. They click the forward arrow to advance to next month, confirm that the period close date appears at the end of the month, then switch to week view to zoom into the final week and see the exact day-by-day breakdown of what needs to happen before the period locks.

**Why this priority**: Calendar navigation is table-stakes. A calendar that is pinned to the current month is not useful for forward planning, which is the primary use case for an accountant reviewing upcoming obligations.

**Independent Test**: Can be tested by navigating forward two months and verifying that events in those months appear correctly, then switching to week view and verifying that the same events appear in day columns.

**Acceptance Scenarios**:

1. **Given** the user is viewing the month calendar, **When** they click the forward navigation arrow, **Then** the calendar advances to the next calendar month and displays that month's financial events.
2. **Given** the user is viewing the month calendar, **When** they click the back navigation arrow, **Then** the calendar moves to the previous calendar month.
3. **Given** the user is viewing any month, **When** they click a "Today" button, **Then** the calendar returns to the current month with today highlighted.
4. **Given** the user is in month view, **When** they click a "Week" view toggle, **Then** the calendar switches to a 7-day week view showing each day as a column, with the current week displayed.
5. **Given** the user is in week view, **When** they use the forward and back arrows, **Then** the calendar advances or retreats by one week at a time.
6. **Given** the user is in week view, **When** the calendar is displayed, **Then** events are shown as labelled pills within each day column, not just as dots — the event name is partially visible.

---

### User Story 3 — Click an Event to Jump to the Record (Priority: P1)

A bookkeeper sees on the calendar that a bill was due two days ago and is now overdue. They click the red event indicator on that day. A small popover appears showing the bill amount, vendor name, and due date with a "View bill" link. They click "View bill" and are taken directly to the bill detail page.

**Why this priority**: Click-through to the source record is what makes the calendar actionable rather than decorative. Without it, the user still has to navigate away and search for the record manually.

**Independent Test**: Can be tested by clicking any financial event on the calendar and verifying the popover shows correct record details, and that the "View" link navigates to the correct detail page for that record.

**Acceptance Scenarios**:

1. **Given** the user clicks an invoice event on the calendar, **When** the popover opens, **Then** it shows the invoice number, contact name, total amount, and due date, with a "View invoice" link.
2. **Given** the user clicks a bill event on the calendar, **When** the popover opens, **Then** it shows the bill reference, supplier name, total amount, and due date, with a "View bill" link.
3. **Given** the user clicks a recurring journal entry event on the calendar, **When** the popover opens, **Then** it shows the template name, the scheduled occurrence date, and a "View template" link.
4. **Given** the user clicks an accounting period event on the calendar, **When** the popover opens, **Then** it shows the period name, the event type (opens / closes / locks), the date, and a "View periods" link.
5. **Given** a day has multiple events of the same type (e.g., three invoices due), **When** the user clicks the event indicator for that type, **Then** the popover lists all records of that type due on that day, each with its own "View" link.
6. **Given** the user has clicked an event and the popover is open, **When** they click the "View" link, **Then** they are navigated to the relevant record detail page and the popover closes.

---

### User Story 4 — Filter the Calendar by Event Type (Priority: P2)

A business owner is reviewing the calendar with their accountant and wants to focus the conversation on accounts receivable only. They use the event type filter to show only "Invoice due" and "Invoice overdue" events. All other event types disappear from the calendar, making it easier to discuss AR obligations without visual noise from period dates and recurring entries.

**Why this priority**: Filtering is a significant usability enhancement that makes the calendar useful in multi-stakeholder contexts. It is P2 because the unfiltered calendar is already functional; filters improve clarity for specific use cases.

**Independent Test**: Can be tested by toggling each event type filter individually and verifying that only events of the selected types appear on the calendar.

**Acceptance Scenarios**:

1. **Given** the user is viewing the Financial Calendar, **When** they view the filter controls, **Then** a set of toggleable chips or checkboxes is shown — one for each event type (Invoice due, Invoice overdue, Bill due, Bill overdue, Recurring entry, Period open, Period close, Period lock).
2. **Given** all event types are shown (default state), **When** the user deselects "Recurring entry", **Then** all recurring journal entry events disappear from the calendar immediately.
3. **Given** the user has deselected some event types, **When** they navigate to the next month, **Then** the same filter selection is still applied — filters persist during a session.
4. **Given** only one event type is selected, **When** the user deselects it, **Then** all events are shown (the filter resets to "all visible" rather than "none visible").
5. **Given** the user has applied filters, **When** they click a "Clear filters" control, **Then** all event types are toggled back on and the full calendar is shown.

---

### User Story 5 — View a Day's Full Event List (Priority: P2)

An accountant is in month view and sees a particularly busy day — the 31st has four visible event dots and a "+3 more" label. They click directly on that date cell. A day detail panel or modal opens showing the complete list of all seven financial events for that day, each with its type badge, record name, and amount where relevant.

**Why this priority**: The "+N more" overflow is necessary for busy days in month view. Without a way to expand and see all events, the calendar is incomplete. This is P2 because it is only needed when a day exceeds the visible indicator limit.

**Independent Test**: Can be tested by creating a demo workspace with more than four financial events on the same day and verifying the day detail panel lists all of them correctly.

**Acceptance Scenarios**:

1. **Given** a day has more events than the maximum visible indicators (four), **When** the user views that day in month view, **Then** a "+N more" label is shown where N is the count of hidden events.
2. **Given** a day shows a "+N more" label, **When** the user clicks on that day cell, **Then** a day detail panel opens listing all events for that day in full.
3. **Given** the day detail panel is open, **When** the user clicks an event in the list, **Then** the event popover opens (same as clicking directly on the calendar) with the record details and "View" link.
4. **Given** the user is in week view, **When** a day column has many events, **Then** events are shown as scrollable pills within the column — no "+N more" truncation in week view.

---

### User Story 6 — See Upcoming Obligations in a Sidebar Summary (Priority: P3)

A business owner opens the Financial Calendar and wants a quick text-based summary of what is coming up in the next 14 days without visually scanning the grid. A sidebar panel on the right lists events in chronological order — today's events, then tomorrow's, then grouped by date for the next 14 days. Each entry shows the event type badge, record name, and amount.

**Why this priority**: The sidebar summary is a convenience enhancement. The calendar grid already communicates upcoming events visually. The sidebar is useful for users who prefer a list over a grid, or for a quick verbal read-out during a client meeting.

**Independent Test**: Can be tested by verifying that the sidebar lists events in the correct chronological order, and that events beyond 14 days are excluded.

**Acceptance Scenarios**:

1. **Given** the user is viewing the Financial Calendar, **When** the page is shown, **Then** a sidebar panel is visible (or collapsible) on the right showing upcoming events in chronological order for the next 14 days.
2. **Given** the sidebar is shown, **When** the user views it, **Then** events are grouped by date, with the date shown as a heading (e.g., "Today", "Tomorrow", "Fri 20 Mar").
3. **Given** the sidebar is shown, **When** the user views an event entry, **Then** each entry shows the event type badge (colour-coded), the record name or reference, and the amount where relevant (invoices and bills).
4. **Given** the user clicks an event in the sidebar, **When** the click is registered, **Then** the same popover opens as when clicking a calendar event directly.
5. **Given** no events exist in the next 14 days, **When** the user views the sidebar, **Then** an empty state message is shown: "No upcoming financial events in the next 14 days."

---

### User Story 7 — Create and Manage Meetings (Priority: P1)

An accountant wants to schedule a quarterly review meeting with a client. They click on a date in the calendar (or use a "New Meeting" button) and a creation form appears. They enter a title ("Q1 Review — Acme Corp"), select a meeting type (Review), link it to a contact (Acme Corp), set the start and end time, add a location (Zoom link), and optionally write agenda notes. The meeting appears on the calendar as a teal event. Later, they can click the meeting to edit details, reschedule it by changing the date/time, or cancel it.

**Why this priority**: Meetings are the first user-created calendar entity and transform the calendar from a passive display into an active planning tool. For accounting practices, scheduling client meetings is a core workflow — without this, the calendar is only half the product.

**Independent Test**: Can be tested by creating a meeting, verifying it appears on the correct calendar date with the correct colour, editing it, and cancelling it.

**Acceptance Scenarios**:

1. **Given** a user with appropriate permissions views the Financial Calendar, **When** they click on a date cell or a "New Meeting" button, **Then** a meeting creation form is presented with fields for: title (required), type (required), starts_at (required), ends_at (required), contact (optional), location (optional), and description/agenda (optional).
2. **Given** a user fills in the meeting creation form with valid data, **When** they submit the form, **Then** the meeting is created and immediately appears on the calendar on the correct date as a teal event indicator.
3. **Given** a meeting exists on the calendar, **When** the user clicks the meeting event, **Then** a popover appears showing the meeting title, type, time, contact name (if linked), location, and options to "Edit" or "Cancel" the meeting.
4. **Given** the user clicks "Edit" on a meeting popover, **When** the edit form appears, **Then** all fields are pre-filled with the current values and the user can modify any field including the date/time.
5. **Given** the user changes the date or time of a meeting and saves, **When** the calendar refreshes, **Then** the meeting moves to the new date/time on the calendar.
6. **Given** the user clicks "Cancel" on a meeting popover, **When** they confirm the cancellation, **Then** the meeting status changes to cancelled and it no longer appears on the calendar.
7. **Given** a meeting is linked to a contact, **When** the user views that contact's detail page, **Then** the meeting appears in the contact's activity or timeline.

---

### User Story 8 — Filter and View Meetings Alongside Financial Events (Priority: P2)

A practice manager wants to see only their meetings for the week to plan their schedule. They use the event type filter to show only "Meeting" events. Alternatively, they want to see everything — meetings and financial obligations together — to understand the full picture of a busy week. The meeting filter integrates seamlessly with the existing financial event filters.

**Why this priority**: Meeting filtering is P2 because it extends the existing filter system (Story 4) rather than introducing new interaction patterns. The calendar is functional for meetings without filtering; this adds refinement.

**Independent Test**: Can be tested by toggling the "Meeting" filter on and off and verifying that only meeting events respond to the toggle.

**Acceptance Scenarios**:

1. **Given** the event type filter controls are shown, **When** the user views them, **Then** a "Meeting" toggle is included alongside the financial event type toggles.
2. **Given** the user deselects all event types except "Meeting", **When** the calendar is displayed, **Then** only meeting events (teal) are shown on the calendar.
3. **Given** the user has meetings and financial events on the same day, **When** they view that day in month view, **Then** both meeting (teal) and financial event indicators are shown together.
4. **Given** meetings exist in the next 14 days, **When** the user views the upcoming events sidebar, **Then** meetings appear in chronological order alongside financial events, with the teal meeting badge and meeting title.

---

### User Story 9 — Invite Attendees to a Meeting (Priority: P2)

An accountant is scheduling a quarterly review with a client. They create the meeting, then add attendees: their bookkeeper colleague (a workspace user selected from a dropdown), and the client's CFO (an external email invite — sarah@acmecorp.com). Both receive email invitations with the meeting details, date/time, location, and an accept/decline link. The accountant can see attendee RSVP status on the meeting detail.

**Why this priority**: Attendee management transforms meetings from a personal calendar note into a collaboration tool. For accounting practices managing multiple clients, knowing who is attending (and who has confirmed) is essential for meeting prep. P2 because the base meeting CRUD (Story 7) must work first.

**Independent Test**: Can be tested by creating a meeting, adding a workspace user and an external email as attendees, verifying both receive email invitations, and confirming that RSVP responses update the attendee status.

**Acceptance Scenarios**:

1. **Given** a user is creating or editing a meeting, **When** they view the meeting form, **Then** an "Attendees" section allows adding workspace users (searchable dropdown) and external email addresses.
2. **Given** the user adds a workspace user as an attendee, **When** the meeting is saved, **Then** the workspace user receives an in-app notification and an email invitation with meeting details.
3. **Given** the user adds an external email address as an attendee, **When** the meeting is saved, **Then** an email invitation is sent to that address with meeting title, date/time, location, and accept/decline links.
4. **Given** an attendee (workspace user or external) clicks "Accept" or "Decline" in the invitation, **When** the response is recorded, **Then** the meeting detail shows the updated RSVP status for that attendee.
5. **Given** the meeting organiser views the meeting popover or detail page, **When** attendees have been invited, **Then** an attendee list is shown with each person's name, RSVP status (pending/accepted/declined), and an indicator of whether they are a workspace user or external invite.
6. **Given** a meeting is rescheduled (date/time changed), **When** the update is saved, **Then** all attendees receive an updated email notification with the new date/time.
7. **Given** a meeting is cancelled, **When** the cancellation is confirmed, **Then** all attendees receive a cancellation email notification.

---

### Edge Cases

- What happens when a workspace has no financial events in the current month? The calendar grid is shown with no indicators — an empty state message is shown below the grid: "No financial events this month."
- What happens when an invoice or bill is marked as paid after appearing on the calendar? The event is removed from the calendar on the next data refresh. Paid invoices and bills are not shown.
- What happens when a recurring journal entry is paused or archived? Paused or archived templates no longer generate next-occurrence dates and their events are removed from the calendar.
- What happens when an accounting period has no lock date set? Only the open and close events are shown for that period; no lock event appears.
- What happens when a bank holiday falls on the same day as a financial event? Financial Calendar does not display bank holidays — it is a financial events calendar only. No public holiday awareness is built in.
- What about Google Calendar / Outlook / iCal sync? Explicitly out of scope for this epic. External calendar sync (iCal feed export, Google Calendar integration, Outlook sync) is a future enhancement. The calendar is self-contained within MoneyQuest for v1.
- What happens when the user is on a workspace where they have the "client" role with read-only access? The calendar displays all event types they have permission to view (invoices, bills, period dates). Clients can view meetings they are linked to (as the contact) but cannot create or edit meetings.
- What happens when the workspace has hundreds of invoices due on the same day (e.g., mass-generated invoices)? The calendar event indicator aggregates all same-type events per day into a single indicator. The popover and day detail panel list them all with pagination if the count exceeds 20.
- What happens when a meeting is created without a contact link? The meeting still appears on the calendar as a standalone event. The contact field is optional — internal team meetings or general planning sessions may not relate to a specific contact.
- What happens when a linked contact is deleted? The meeting remains on the calendar but the contact reference is cleared (set to null). The meeting title and other details are preserved.
- What happens when multiple meetings overlap in time on the same day? In month view, each meeting counts as a separate event towards the day's indicator limit. In week view, overlapping meetings are shown as stacked or side-by-side pills within the day column.
- Who can create meetings? Users with the `meeting.create` permission — available to owner, accountant, bookkeeper, and approver roles. Auditor and client roles cannot create meetings.
- What happens when an external attendee's email bounces? The attendee remains in the list with `pending` status. No retry is attempted — the organiser can see the attendee hasn't responded and follow up manually.
- What happens when a workspace user who was an attendee is removed from the workspace? Their attendee record remains for historical purposes but is marked as inactive. They no longer receive notifications for the meeting.
- Can the same external email be invited to multiple meetings? Yes — each invitation is per-meeting. There is no external user account; each invite is standalone.
- What if the meeting creator leaves the workspace? The meeting persists. Any workspace user with `meeting.update` permission can edit or cancel it.
- What happens when a meeting spans multiple days (e.g., overnight or multi-day offsite)? Multi-day meetings are not supported in v1. The `starts_at` and `ends_at` must be on the same calendar date. The creation form validates this. Future enhancement could support multi-day events.
- What happens when a voided invoice or bill has a due date on the calendar? Voided invoices and bills are not shown — only open (unpaid) records appear. The same rule as paid: if status is not open/approved/overdue, it is excluded.
- What is the calendar API date range window? The API fetches events for the visible range plus one month buffer in each direction (3 months total for month view, current week +/- 4 weeks for week view). This enables instant navigation without re-fetching. TanStack Query caches results per date range.
- What happens when a recurring meeting template is paused? Same as recurring JE templates — paused meeting templates stop generating new occurrences. Existing scheduled meetings from the template remain on the calendar.
- What happens if a meeting's ends_at is before starts_at? Server-side validation rejects the request. The form also validates client-side that end time is after start time.
- Can completed or cancelled meetings be restored? No — completed meetings are final (notes and minutes have been captured). Cancelled meetings cannot be uncancelled. Users can create a new meeting if needed.
- What permissions does a user need to view meetings on the calendar? `meeting.view` — granted to all roles including client. Clients see all workspace meetings (read-only). Create/update/delete are separate permissions.
- What happens when the calendar page is navigated to a month/week with no events at all? The empty grid is shown with a helpful message: "No events this [month/week]." The upcoming sidebar still shows its own 14-day window independently.
- How does the calendar handle timezone display? All times display in the workspace's configured timezone (set during workspace setup). No per-user timezone override in v1. UTC stored in database, converted for display.

---

## Requirements

### Functional Requirements

- **FR-001**: The Financial Calendar MUST be accessible from the main navigation as a dedicated page within the dashboard section.
- **FR-002**: The calendar MUST display a month view by default, showing the current calendar month on first load.
- **FR-003**: The calendar MUST display a week view option, showing 7 day columns for the current week.
- **FR-004**: The calendar MUST provide forward and back navigation controls to move between months (in month view) or weeks (in week view).
- **FR-005**: The calendar MUST provide a "Today" button that returns the view to the current month or week with today's date highlighted.
- **FR-006**: The calendar MUST display open sales invoices (AR) on their due dates using green event indicators.
- **FR-007**: The calendar MUST display open invoices whose due date has passed (overdue) using red event indicators.
- **FR-008**: The calendar MUST display open bills (AP) on their due dates using orange event indicators.
- **FR-009**: The calendar MUST display open bills whose due date has passed (overdue) using red event indicators.
- **FR-010**: The calendar MUST display recurring journal entry next-occurrence dates using purple event indicators.
- **FR-011**: The calendar MUST display accounting period open dates using blue event indicators.
- **FR-012**: The calendar MUST display accounting period close dates using blue event indicators.
- **FR-013**: The calendar MUST display accounting period lock dates using grey event indicators.
- **FR-014**: In month view, each day cell MUST show a maximum of four event indicators. When more exist, a "+N more" label MUST be shown where N is the count of additional events.
- **FR-015**: Clicking a "+N more" label or a day cell with overflow events MUST open a day detail panel listing all events for that day.
- **FR-016**: Clicking any event indicator on the calendar MUST open a popover showing a summary of the financial record(s) associated with that event.
- **FR-017**: Each event popover MUST contain a link that navigates the user to the relevant record detail page (invoice detail, bill detail, recurring template, accounting periods).
- **FR-018**: When a day has multiple events of the same type, the popover for that type MUST list all records of that type due on that day.
- **FR-019**: In week view, events MUST be displayed as labelled pills within each day column, showing at minimum the event type and record name. Meeting pills MUST additionally show the start time (e.g., "10:00am — Q1 Review") and be positioned vertically according to their time within the day column. Financial events (which are date-only) appear at the top of the day column.
- **FR-020**: The calendar MUST provide per-event-type filter controls allowing users to show or hide each event type (including meetings) independently.
- **FR-021**: Filter selections MUST persist during a browsing session but need not persist across page reloads.
- **FR-022**: When only one active filter is deselected and would result in zero visible event types, the calendar MUST reset to showing all event types rather than showing a blank calendar.
- **FR-023**: The calendar MUST display events for the workspace the user is currently in — events are scoped to the active workspace.
- **FR-024**: Paid invoices and paid bills MUST NOT appear on the calendar — only open (unpaid) records with due dates are shown.
- **FR-025**: Paused or archived recurring journal entry templates MUST NOT generate calendar events.
- **FR-026**: The calendar MUST aggregate multiple same-type events per day into a single indicator in month view — clicking that indicator opens a list of all records.
- **FR-027**: An upcoming events sidebar MUST be available showing financial events for the next 14 days in chronological order, grouped by date.
- **FR-028**: The upcoming events sidebar MUST display an empty state message when no events exist in the next 14 days.
- **FR-029**: All roles with access to the dashboard MUST be able to view the Financial Calendar — financial events are read-only for all roles. Meeting visibility and edit permissions are role-dependent.
- **FR-030**: The calendar MUST display today's date as visually distinct from other dates in both month and week views.
- **FR-031**: Users with the `meeting.create` permission MUST be able to create meetings from the calendar by clicking a date cell or a "New Meeting" button.
- **FR-032**: A Meeting MUST have a title (required), type (required), starts_at (required), and ends_at (required). Contact, location, and description are optional.
- **FR-033**: Meeting types MUST include at minimum: review, advisory, tax_planning, onboarding, and general.
- **FR-034**: Meetings MUST support linking to a Contact — the linked contact's name is shown in the meeting popover and the meeting appears on the contact's detail page.
- **FR-035**: Meetings MUST display on the calendar using teal event indicators.
- **FR-036**: Users with the `meeting.update` permission MUST be able to edit meeting details including rescheduling (changing date/time).
- **FR-037**: Users with the `meeting.delete` permission MUST be able to cancel a meeting. Cancelled meetings MUST NOT appear on the calendar.
- **FR-038**: Meetings MUST be workspace-scoped — a meeting belongs to the active workspace and is visible to all workspace members with calendar access.
- **FR-039**: The meeting creation form MUST be accessible by clicking on a calendar date cell (pre-filling the date) or via a standalone "New Meeting" button.
- **FR-039a**: Meetings MUST have a dedicated detail page accessible at `/meetings/{uuid}`. The detail page MUST show: title, type, date/time, location, description/agenda, status, linked contact, attendee list with RSVP status, notes (TipTap), and attachments. The calendar popover serves as a quick summary with a "View Meeting" link to the full detail page — following the same pattern as invoices and bills.
- **FR-039b**: Meetings MUST have a standalone index page at `/meetings` with StatusTabs (scheduled/completed/cancelled), search, and filtering. Accessible from the main navigation with keyboard shortcut `G then E` (E for engagements — `G then M` is taken by Practice). Consistent with other entity index pages (invoices, bills, contacts, jobs).
- **FR-040**: Meetings MUST appear in the upcoming events sidebar alongside financial events, ordered chronologically.
- **FR-041**: Meetings MUST support recurring schedules via the existing RecurringTemplate infrastructure. Supported frequencies: weekly, fortnightly, monthly, quarterly. Recurring meetings generate the next occurrence as a `scheduled` meeting when the current occurrence is marked complete.
- **FR-042**: Users MUST be able to create a meeting as recurring by selecting a frequency during creation. A "Save as Repeating" option MUST be available on the meeting creation form.
- **FR-043**: Recurring meeting templates MUST support pause and resume — paused templates stop generating new occurrences until resumed.
- **FR-044**: Meetings MUST support the `HasAttachments` trait for polymorphic file attachments (agendas, minutes, reference documents).
- **FR-045**: Meetings MUST support multiple attendees — both workspace users (selected from a dropdown) and external email addresses.
- **FR-046**: When a meeting is created or updated with attendees, email invitations MUST be sent to all attendees with meeting details (title, date/time, location, description).
- **FR-047**: Email invitations MUST include accept/decline links that update the attendee's RSVP status.
- **FR-048**: When a meeting is rescheduled, all attendees MUST receive an updated email notification with the new date/time.
- **FR-049**: When a meeting is cancelled, all attendees MUST receive a cancellation email notification.
- **FR-050**: The meeting popover and detail page MUST show the attendee list with RSVP status (pending/accepted/declined) for each attendee.
- **FR-051**: The meeting creator MUST be automatically added as an attendee with `accepted` status.
- **FR-052**: Meeting permissions MUST follow existing Spatie Permission conventions using singular entity name: `meeting.view`, `meeting.create`, `meeting.update`, `meeting.delete`. Role assignments: owner and accountant get all four; bookkeeper gets view + create + update; approver gets view only; auditor gets view only; client gets view only.
- **FR-053**: The Meeting model MUST be added to the morph map in `AppServiceProvider` as `'meeting' => Meeting::class` — required for HasNotes and HasAttachments polymorphic relations.
- **FR-054**: The `RecurringTemplateType` enum MUST be extended with a `Meeting` case (`'meeting'`). The `ProcessDueTemplates` command MUST handle meeting template processing alongside invoice, bill, and JE templates.
- **FR-055**: Multi-day meetings (where `starts_at` and `ends_at` are on different calendar dates) are NOT supported in v1. Server-side validation MUST enforce that both timestamps fall on the same calendar date.
- **FR-056**: The calendar API MUST accept `start_date` and `end_date` query parameters to define the date range for event fetching. The frontend MUST pre-fetch adjacent months/weeks for instant navigation.
- **FR-057**: The calendar API endpoint MUST return all event types in a single aggregated response, combining queries across invoices, bills, recurring templates, accounting periods, and meetings. The response MUST be structured by date for efficient frontend rendering.
- **FR-058**: The Financial Calendar page MUST be accessible at `/calendar` in the frontend routing. The calendar navigation item MUST use the `Calendar` Lucide icon.
- **FR-059**: The meetings index page `/meetings` MUST include a `counts` endpoint returning `{ scheduled: N, completed: N, cancelled: N }` for StatusTabs — consistent with all other index pages.
- **FR-060**: Meeting search on the index page MUST search across title, contact name, and location fields.
- **FR-061**: All meeting datetimes MUST be stored in UTC in the database and displayed in the workspace's configured timezone.
- **FR-062**: The MeetingAttendee MUST have a unique constraint on `(meeting_id, user_id)` for workspace users and `(meeting_id, email)` for external invites — preventing duplicate attendee entries.
- **FR-063**: Completed meetings MUST remain visible on the calendar as teal indicators (not removed like paid invoices). Only cancelled meetings are hidden from the calendar view.
- **FR-064**: The meeting detail page MUST include a "Mark Complete" button for users with `meeting.update` permission. Marking complete transitions status from `scheduled` to `completed` and, for recurring meetings, triggers generation of the next occurrence.

### Key Entities

- **CalendarEvent**: A structured display record derived from a source financial document. Attributes: event type (invoice-due, invoice-overdue, bill-due, bill-overdue, recurring-entry, period-open, period-close, period-lock), date, source record reference (invoice UUID, bill UUID, template UUID, period ID), display label, amount (where applicable), contact or supplier name (where applicable).
- **CalendarEventFeed**: The aggregated collection of CalendarEvents for a workspace over a date range. Sourced by combining invoice due dates, bill due dates, recurring entry schedules, and accounting period boundaries.
- **Meeting**: A user-created calendar entity representing a scheduled meeting. Attributes: uuid, workspace_id, title (string, required, max 255), type (MeetingType enum: review, advisory, tax_planning, onboarding, general), starts_at (datetime, required, stored UTC), ends_at (datetime, required, stored UTC, must be same calendar date as starts_at), contact_id (nullable FK to contacts — primary contact for the meeting, set null on contact delete), location (nullable string, max 500 — address, Zoom link, or phone number), description (nullable text — agenda/notes), status (MeetingStatus enum: scheduled, completed, cancelled), created_by (user_id FK), recurring_template_id (nullable FK to recurring_templates — set when created from a recurring template), completed_at (nullable datetime — set when marked complete), cancelled_at (nullable datetime — set when cancelled). Uses `HasNotes` trait (polymorphic TipTap rich text notes — same as invoices, JEs, contacts, jobs) and `HasAttachments` trait (polymorphic file attachments — agendas, minutes, reference documents). Add `meeting` to the morph map. Meetings are the only calendar entity that users create directly — all other calendar events are derived from existing financial records. Scoped by `workspace_id` with global scope (standard tenant model).
- **MeetingAttendee**: A pivot entity linking workspace users and external email addresses to a meeting. Attributes: id, meeting_id (FK), user_id (nullable FK — for workspace users), email (nullable string — for external invites, required when user_id is null), name (nullable string — display name for external invites), rsvp_status (AttendeeRsvpStatus enum: pending, accepted, declined), invited_at (datetime), responded_at (nullable datetime), is_organiser (boolean, default false — true for the creator). Unique constraints: `(meeting_id, user_id)` when user_id is not null; `(meeting_id, email)` when email is not null. A meeting has many attendees. The creator is automatically added as an attendee with `accepted` status and `is_organiser = true`.
- **EventPopover**: The on-screen summary displayed when a user clicks a calendar event. Contains record-level details and a navigable link to the source record. For meetings, also contains "Edit" and "Cancel" action buttons.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All financial events (invoices, bills, recurring entries, accounting period dates) appear on the correct calendar day with 100% accuracy, verified against known test data.
- **SC-002**: Clicking any calendar event opens the correct popover with the correct record details — zero cases of a popover showing mismatched or missing data in functional testing.
- **SC-003**: Navigation between months and weeks is instantaneous (under 300ms) — the calendar does not show a loading state when navigating within already-fetched date ranges.
- **SC-004**: The event type filter correctly shows and hides events of each type — zero cases of a filtered-out event type remaining visible after the filter is applied.
- **SC-005**: The calendar correctly distinguishes overdue events (red) from upcoming events (green/orange) for all invoices and bills, verified against known due dates in test data.
- **SC-006**: Business owners and accountants in a shared workspace see identical calendar event data for the same workspace — calendar data is workspace-scoped, not user-scoped.
- **SC-007**: The upcoming events sidebar lists events in correct chronological order for the next 14 days — zero out-of-order entries in functional testing.
- **SC-008**: A meeting can be created, edited, rescheduled, and cancelled — each action reflects immediately on the calendar without a page reload.
- **SC-009**: Meetings linked to a contact appear on the contact's detail page — verified by creating a meeting with a contact link and confirming it shows on both the calendar and the contact page.
- **SC-010**: Calendar API response time is under 200ms for a workspace with up to 500 open invoices/bills, 50 recurring templates, 12 accounting periods, and 100 meetings in the queried date range.
- **SC-011**: Meeting CRUD operations (create, update, mark complete, cancel) each complete in under 500ms including attendee notification dispatch.
- **SC-012**: Tenant isolation is verified — a user in Workspace A cannot see meetings or calendar events from Workspace B. Tests confirm workspace_id scoping on all queries.
- **SC-013**: Recurring meeting templates generate the next occurrence correctly when the current meeting is marked complete — verified for weekly, fortnightly, monthly, and quarterly frequencies.

---

## Clarifications

### Session 2026-03-14

- Q: Is the Financial Calendar a separate page or a widget on the Customizable Dashboard? -> A: A dedicated page within the dashboard section, accessible from navigation. It may also be referenced as a widget in future, but the primary delivery is as a standalone calendar page.
- Q: Should users be able to create events (e.g., reminders) directly on the calendar? -> A: Financial events (invoices, bills, recurring entries, periods) remain read-only — they are derived from existing records. However, Meetings are a new user-created entity that can be created, edited, and cancelled directly from the calendar. The calendar is a lens for financial data and a scheduling tool for meetings.
- Q: Should overdue invoices and overdue bills both use red, even though they are different types? -> A: Yes — red is the universal overdue signal. The popover clarifies the type. Colour consistency for urgency is more important than type distinction for overdue events.
- Q: Does filter state need to persist across page reloads or browser sessions? -> A: Filter state persists only for the current browsing session. No server-side persistence of filter preferences is required.
- Q: Can the client role see the Financial Calendar? -> A: Yes — the calendar is read-only for financial events and shows the same data types the client role already has access to. Clients can see meetings they are linked to (as the contact) but cannot create or edit meetings.

### Session 2026-03-19

- Q: Should meetings be a polymorphic "calendarable" model or a standalone entity? -> A: Standalone. Meetings have their own unique fields (attendees, location, duration, agenda) and are not "attached to" another entity. They may reference a contact via a simple FK, but they are their own thing. No polymorphic calendar package is needed — financial events are derived from existing tables via query aggregation, and meetings are a first-class model.
- Q: How should a meeting be marked as completed? -> A: Manual — user clicks "Mark Complete" after the meeting happens. No auto-completion based on time. This is intentional: accountants often add post-meeting notes at the point of marking complete. Future enhancement: transcripts and action items will extend from meetings (important for family office advisory use cases where meetings produce deliverables).
- Q: Should meetings support notes in the initial build? -> A: Yes — reuse the existing polymorphic Notes system via `HasNotes` trait. Meeting gets TipTap rich text notes for free (same as invoices, JEs, contacts, jobs). No dedicated `meeting_notes` field needed. Add `meeting` to the morph map.
- Q: Should meetings support recurring schedules (e.g., "weekly review every Tuesday")? -> A: Yes — reuse the existing RecurringTemplate pattern. Accountants schedule recurring meetings constantly (weekly bookkeeping check-ins, monthly BAS reviews, quarterly advisory). The RecurringTemplate infrastructure already handles frequency, next_due_date calculation, and pause/resume. Meetings created from recurring templates are generated as `scheduled` status (same pattern as invoices/bills created as `draft`).
- Q: Should meetings be visible to the linked contact via the future client portal (022-CPV)? -> A: TBD — to be clarified. This is a cross-epic decision.
- Q: Should the spec include external calendar sync (Google/Outlook/iCal)? -> A: Explicitly out of scope. Acknowledged as a future enhancement. The calendar is self-contained within MoneyQuest for v1.
- Q: What is the meeting visibility model? -> A: All workspace members see all meetings — matches how financial events work (workspace-scoped, everyone sees the same data). An accountant's "Q1 Review — Acme Corp" is visible to the whole team. Edit/cancel permissions are role-based via `meeting.update` and `meeting.delete`, not ownership-based.
- Q: How should meeting times display on the calendar? -> A: Show time in week view (time-positioned pills like "10:00am — Q1 Review"), date-only teal dot in month view. Time is visible in the popover for both views. Financial events remain date-only and appear at the top of day columns in week view.
- Q: Should meetings have a dedicated detail page? -> A: Yes — with notes, attachments, attendees, and RSVP tracking, meetings have too much content for a popover. Dedicated page at `/meetings/{uuid}` following the invoice/bill pattern. Popover remains as quick summary with "View Meeting" link.
- Q: Should meetings have a standalone index page? -> A: Yes — `/meetings` with StatusTabs (scheduled/completed/cancelled), search, and filtering. Consistent with every other entity. Navigation shortcut: `G then E` (corrected — `G then M` is already taken by Practice nav).
- Q: Should meetings support multiple attendees? -> A: Yes — full attendees with external email invites. Workspace users selected from a dropdown, external attendees via email address. Email invitations sent with accept/decline links. RSVP status tracked per attendee (pending/accepted/declined). Reschedule and cancellation trigger notification emails. Creator auto-added as accepted attendee. Depends on 023-EML email infrastructure (already built).

#### Autonomous clarifications (spec gap analysis)

- Q: `G then M` keyboard shortcut is already used by Practice navigation — what shortcut should meetings use? -> A: `G then E` (E for engagements). All single-letter shortcuts G+D/A/B/I/P/C/J/L/X/Q/M/H/S are taken. "E" is free and semantically close (meetings are client engagements in the accounting practice context).
- Q: What meeting permissions are needed and which roles get them? -> A: Four permissions following existing convention: `meeting.view`, `meeting.create`, `meeting.update`, `meeting.delete`. Owner and accountant get all four. Bookkeeper gets view, create, update (can schedule and manage meetings, consistent with their data-entry role). Approver gets view only (meetings are not an approval workflow). Auditor gets view only. Client gets view only. This matches the existing pattern where bookkeepers have create/update but not delete, and approver/auditor/client are read-only.
- Q: What new enums are needed for meetings? -> A: Three enums: (1) `MeetingType` — review, advisory, tax_planning, onboarding, general; (2) `MeetingStatus` — scheduled, completed, cancelled; (3) `AttendeeRsvpStatus` — pending, accepted, declined. All follow existing enum patterns in `app/Enums/`.
- Q: Does RecurringTemplateType need a new case for meetings? -> A: Yes — add `Meeting = 'meeting'` to the existing enum. The `ProcessDueTemplates` command already loops through template types, so it needs to handle meeting generation alongside invoice/bill/JE.
- Q: Should multi-day meetings be supported? -> A: No — v1 enforces same-day meetings. Server validation rejects starts_at/ends_at on different calendar dates. This keeps the calendar display logic simple (one dot per day, no spanning indicators). Multi-day support is a future enhancement.
- Q: What is the calendar API structure — one endpoint or many? -> A: Single aggregated endpoint at `GET /api/v1/calendar/events` accepting `start_date` and `end_date` query parameters. Returns all event types in a unified response grouped by date. This avoids N+1 API calls from the frontend. A separate `GET /api/v1/calendar/upcoming` endpoint serves the sidebar (next 14 days, simpler format).
- Q: What is the frontend route for the calendar page? -> A: `/calendar` — a dedicated page in the dashboard section. Not embedded in `/dashboard` itself. Uses the `Calendar` Lucide icon in navigation.
- Q: How does the calendar handle timezones? -> A: All datetimes stored as UTC in the database. Displayed in the workspace's configured timezone (from workspace settings). No per-user timezone override in v1. This is consistent with how invoice/bill dates work — workspace-level configuration.
- Q: Should completed meetings remain visible on the calendar? -> A: Yes — completed meetings remain as teal indicators on their original date. Unlike paid invoices (which are obligations fulfilled and thus removed), completed meetings are historical records that provide context (e.g., "we had a review last Tuesday"). Only cancelled meetings are hidden from the calendar. The meetings index page shows all statuses via StatusTabs.
- Q: What attributes are missing from the Meeting entity? -> A: Added: `recurring_template_id` (nullable FK, links to RecurringTemplate when created from a recurring schedule), `completed_at` (nullable datetime, set when marked complete), `cancelled_at` (nullable datetime, set when cancelled), title max length (255), location max length (500). Also clarified: `contact_id` is set to null on contact deletion (not cascade delete — meeting persists).
- Q: What attributes are missing from the MeetingAttendee entity? -> A: Added: `id` (primary key), `is_organiser` (boolean, marks the creator), unique constraints on `(meeting_id, user_id)` and `(meeting_id, email)` to prevent duplicate invites. Renamed `status` to `rsvp_status` to avoid ambiguity with the meeting's own `status` field.
- Q: What performance targets should the calendar API meet? -> A: Under 200ms response time for the aggregated calendar endpoint with typical workspace data (up to 500 open invoices/bills, 50 recurring templates, 12 periods, 100 meetings). The query combines 5 data sources via UNION or separate queries merged in PHP — needs efficient indexing on `due_date`, `next_due_date`, `starts_at`, and `workspace_id`.
- Q: Does the calendar need any Actions (Lorisleiva)? -> A: Yes — following existing patterns: `CreateMeeting`, `UpdateMeeting`, `MarkMeetingComplete`, `CancelMeeting`. These are thin Actions that handle validation, state transition, attendee notification dispatch, and recurring template next-occurrence generation. No event sourcing for meetings — they are a simple CRUD entity like contacts and jobs, not a financial instrument.
- Q: What API controllers are needed? -> A: Two controllers: (1) `CalendarController` with `events()` (aggregated feed) and `upcoming()` (sidebar feed) methods; (2) `MeetingController` with standard REST methods (index, show, store, update, destroy) plus `complete()` for mark-complete and `counts()` for StatusTabs. Plus `MeetingAttendeeController` for managing attendees on a meeting.
- Q: Should the calendar feed include credit notes? -> A: No — credit notes do not have "due dates" in the same sense as invoices/bills. They are allocations against existing documents. Keeping the calendar focused on obligation dates (when money is due in or out) maintains clarity. Credit notes are excluded from the calendar.
