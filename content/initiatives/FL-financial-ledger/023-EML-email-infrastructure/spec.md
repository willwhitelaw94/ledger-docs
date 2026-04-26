---
title: "Feature Specification: Email Infrastructure & Transactional Notifications"
---

# Feature Specification: Email Infrastructure & Transactional Notifications

**Feature Branch**: `023-EML-email-infrastructure`
**Created**: 2026-03-15
**Status**: Draft

---

## User Scenarios & Testing

### User Story 1 — Auth Emails Delivered (Priority: P1)

A new user registers for MoneyQuest. They receive a confirmation email within seconds, branded with the MoneyQuest logo and a teal call-to-action button. When they forget their password, a reset link arrives in their inbox — not silently discarded.

**Why this priority**: Auth emails are table-stakes for any SaaS product. Their absence breaks the registration and password-reset flows entirely, eroding user trust before the product is even used.

**Independent Test**: Create a new account and trigger a password reset. Both emails arrive in the inbox (or Mailpit in local dev) with correct branding and working links.

**Acceptance Scenarios**:

1. **Given** a user completes registration, **When** the registration is confirmed, **Then** a branded welcome/confirmation email is delivered to their address within 60 seconds.
2. **Given** a user requests a password reset, **When** they submit their email, **Then** a password reset email with a working reset link is delivered within 60 seconds.
3. **Given** the application is running in local development, **When** any email would be sent, **Then** it is captured by Mailpit and visible at `localhost:8025` — no real email is sent.

---

### User Story 2 — Workspace Invitation Email (Priority: P1)

An owner invites a bookkeeper to join their workspace. The bookkeeper receives a branded invitation email showing who invited them, the workspace name, and a clear "Accept Invitation" button. Clicking the link takes them to the registration or login page with the invitation pre-applied.

**Why this priority**: Workspace invitations currently create a database record but deliver nothing to the invitee. The entire multi-user workspace feature is non-functional without this email.

**Independent Test**: Invite a new email address to a workspace. The invitation email arrives with the sender's name, workspace name, and a working accept link.

**Acceptance Scenarios**:

1. **Given** an owner sends a workspace invitation, **When** the invitation is created, **Then** an invitation email is sent to the invitee containing the inviter's name, workspace name, and an acceptance link.
2. **Given** an invitation email is sent, **When** the acceptance link is clicked, **Then** the invitee is taken to registration (if new) or login (if existing) with the invitation context preserved.
3. **Given** an invitation has an expiry date set, **When** the invitee clicks an expired link, **Then** they see a clear message that the invitation has expired and can request a new one.
4. **Given** an invitation is revoked before it is accepted, **When** the invitee clicks the link, **Then** they see a message that the invitation is no longer valid.

---

### User Story 3 — Job Share Link Email (Priority: P1)

A builder generates a public share link for a client's job dashboard. Instead of copying and pasting the URL manually, they enter the client's email address and send it directly from MoneyQuest. The homeowner receives a branded email with a clear "View Your Project" button.

**Why this priority**: The 022-CPV viral growth loop depends entirely on clients receiving and clicking share links. Without email delivery, the link can only be shared manually — removing the frictionless client experience the feature was designed to create.

**Independent Test**: Generate a job share link, enter a recipient email, and send. The recipient receives a branded email with a working link to the public job dashboard.

**Acceptance Scenarios**:

1. **Given** a workspace member generates a job share link and enters a recipient email, **When** they send the link, **Then** the recipient receives a branded email with the job name, a description of what they can view, and a "View Your Project" button linking to the public dashboard.
2. **Given** the share link has a password set, **When** the recipient clicks through from the email, **Then** they are prompted for the password on the public dashboard.
3. **Given** the share link has an expiry date, **When** the recipient opens the email after the link has expired, **Then** the link resolves to an expired-link page.

---

### User Story 4 — Invoice Sent Email (Priority: P2)

When a bookkeeper marks an invoice as "sent", the client contact on the invoice automatically receives a copy of the invoice by email. The email includes the invoice number, amount due, due date, and an HTML line item summary in the email body. Workspace owners can customise the email body copy using a rich text (TipTap) editor in Settings — supporting personalised greetings, payment instructions, and bank details. Dynamic placeholders (e.g. `{{client_name}}`, `{{invoice_total}}`, `{{due_date}}`) are substituted at send time.

**Why this priority**: Delivering invoices via email removes a manual step currently handled outside the system. Most clients expect to receive invoices by email as a standard business practice.

**Independent Test**: Mark an invoice as sent for a contact with a valid email address. The contact receives an email with the invoice details and due date.

**Acceptance Scenarios**:

1. **Given** an invoice is marked as sent and the client contact has an email address, **When** the "sent" status is applied, **Then** the contact receives an email with the invoice number, total amount, due date, and line item summary.
2. **Given** an invoice is marked as sent but the client contact has no email address, **When** the "sent" status is applied, **Then** no email is attempted and a warning is shown to the user in the application.
3. **Given** a user has opted out of invoice-sent notifications, **When** an invoice is sent, **Then** no email is delivered for that notification category.

---

### User Story 5 — Overdue Invoice Reminder (Priority: P2)

When an invoice passes its due date without a recorded payment, the client contact receives an automated reminder email. The email clearly states the invoice number, the amount overdue, and the original due date.

**Why this priority**: Overdue reminders are a core accounts-receivable function. Automating them reduces manual follow-up work for bookkeepers.

**Independent Test**: Create an invoice with a past due date and no payment. Trigger the overdue check. The contact receives a reminder email.

**Acceptance Scenarios**:

1. **Given** an invoice is past its due date with no recorded payment, **When** the nightly overdue check runs, **Then** the client contact receives a reminder email with the overdue amount and a reference to the original invoice.
2. **Given** a client contact has opted out of overdue reminder emails, **When** the nightly check runs, **Then** no reminder is sent to that contact.
3. **Given** an invoice is paid after an overdue reminder has been sent, **When** a subsequent nightly check runs, **Then** no further reminders are sent.

---

### User Story 6 — Email Notification Preferences (Priority: P3)

A user can view and update their email notification preferences from their account settings. They can opt out of specific notification categories (e.g., overdue reminders, invoice sent) without affecting auth emails, which are always delivered.

**Why this priority**: Preferences prevent email fatigue and respect user autonomy. Auth emails (password reset, confirmation) are exempt and always sent.

**Independent Test**: Turn off "Invoice Sent" notifications in preferences. Mark an invoice as sent. No email is delivered.

**Acceptance Scenarios**:

1. **Given** a user is on the notification preferences page, **When** they toggle off a notification category, **Then** emails in that category are no longer sent to them.
2. **Given** a user has opted out of all notification categories, **When** they request a password reset, **Then** the password reset email is still delivered (auth emails are not subject to preferences).
3. **Given** a user updates their preferences, **When** they save, **Then** the change takes effect immediately for subsequent notifications.

---

### User Story 7 — Customisable Email Templates (Priority: P2)

A workspace owner opens Settings → Email Templates and sees a list of all notification email types. They select any template — invoice sent, overdue reminder, payment confirmation, job share link — and edit its body using a rich text editor. They add bank details, a personalised greeting, or custom payment terms. When the relevant event fires, the recipient receives the customised copy with dynamic placeholders substituted.

**Why this priority**: Generic email copy reduces trust. Workspace owners need to reflect their brand voice, include payment instructions, and personalise client communication.

**Independent Test**: Edit the invoice email template in Settings. Save. Mark an invoice as sent. The recipient receives the customised body with all placeholders correctly substituted.

**Acceptance Scenarios**:

1. **Given** a workspace owner opens Email Templates in Settings, **When** they view the invoice email template, **Then** they see a TipTap rich text editor pre-populated with the default template body.
2. **Given** a workspace owner edits and saves an email template, **When** an invoice is sent, **Then** the recipient receives the customised body with all dynamic placeholders (e.g. `{{client_name}}`, `{{invoice_total}}`, `{{due_date}}`) correctly substituted.
3. **Given** a workspace owner resets a template to default, **When** they confirm the reset, **Then** the template reverts to the system default copy.
4. **Given** a template contains an unrecognised placeholder, **When** the email is sent, **Then** the placeholder is removed gracefully rather than shown as raw text.

---

### User Story 9 — Payment Confirmation Email (Priority: P2)

When a payment is recorded against an invoice, the payer contact receives a confirmation email acknowledging the payment. The email states the amount received, the invoice it applies to, and the remaining balance if any.

**Why this priority**: Payment confirmations close the loop for clients — they know their payment was received without needing to call or log in. Reduces "did you get my payment?" support queries.

**Independent Test**: Record a payment against an invoice for a contact with a valid email. The contact receives a confirmation email with the payment amount and invoice reference.

**Acceptance Scenarios**:

1. **Given** a payment is recorded against an invoice and the contact has an email address, **When** the payment is saved, **Then** the contact receives a payment confirmation email with the amount paid, invoice number, and any remaining balance.
2. **Given** a payment fully settles the invoice, **When** the confirmation email is sent, **Then** the email states the invoice is now fully paid.
3. **Given** a contact has opted out of payment confirmation emails, **When** a payment is recorded, **Then** no email is sent.

---

### Edge Cases

- What happens when an email delivery fails (e.g., invalid address, Resend API error)? The failure is logged and the action continues — email failure must not block the primary business operation.
- What if a contact has no email address when a notification is triggered? The notification is silently skipped and a warning is surfaced in the application.
- What if the same invitation email is sent twice to the same address? Only one active invitation per workspace per email address is permitted; a second invitation replaces the first.
- What if an email template render fails? The failure is caught, logged, and the user is notified that the email could not be sent.

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST deliver transactional emails via a configured external email provider (Resend) in all non-local environments.
- **FR-002**: The system MUST capture all outgoing emails in a local mail inspection tool (Mailpit) in local development — no real email is sent in dev.
- **FR-003**: The system MUST deliver a branded welcome/confirmation email when a new user registers.
- **FR-004**: The system MUST deliver a branded password-reset email when a user requests a password reset.
- **FR-005**: The system MUST deliver a workspace invitation email when a workspace invitation is created, including inviter name, workspace name, and an acceptance link.
- **FR-006**: The system MUST deliver a job share link email when a workspace member sends a share link to a recipient email address (CPV feature).
- **FR-007**: The system MUST deliver an invoice-sent email to the client contact when an invoice is marked as sent, provided the contact has a valid email address.
- **FR-008**: The system MUST deliver an overdue invoice reminder email to the client contact when an invoice passes its due date without a recorded payment.
- **FR-009**: The system MUST NOT send notification emails (FR-006 through FR-008) to users or contacts who have opted out of that notification category.
- **FR-010**: The system MUST always deliver auth emails (registration, password reset) regardless of notification preferences.
- **FR-011**: Users MUST be able to view and update their email notification preferences per category from their account settings.
- **FR-012**: All email templates MUST use a consistent MoneyQuest brand design (teal/white, logo, clear CTA button).
- **FR-013**: Email delivery failures MUST be logged and MUST NOT prevent the primary business operation from completing.
- **FR-014**: The system MUST support a configurable sending domain (e.g., `mail.moneyquest.app`) with proper DNS authentication (SPF, DKIM).
- **FR-015**: The system MUST deliver a payment confirmation email to the client contact when a payment is recorded against an invoice, provided the contact has a valid email address.
- **FR-016**: Workspace owners MUST be able to edit any notification email template body (invoice sent, overdue reminder, payment confirmation, job share link) using a TipTap rich text editor in Settings → Email Templates. Auth email templates (registration, password reset) are system-only and not editable.
- **FR-017**: Email templates MUST support dynamic placeholders (e.g. `{{client_name}}`, `{{invoice_total}}`, `{{due_date}}`) that are substituted with live values at send time.
- **FR-018**: Workspace owners MUST be able to reset any customised email template back to the system default.
- **FR-019**: Invoice-sent emails MUST include an HTML line item summary in the email body — no PDF attachment required.

### Key Entities

- **EmailNotification**: A record of an email that was sent or attempted — recipient, type, status (delivered/failed), timestamp. Used for delivery audit and duplicate prevention.
- **NotificationPreference**: A per-user, global opt-out setting per notification category — applies across all workspaces the user belongs to. Categories: `invoice_sent`, `overdue_reminder`, `job_share_link`, `workspace_invitation`, `payment_confirmation` (preferences do not apply to auth emails).
- **NotificationCategory**: An enumerated list of notification types that users can opt in or out of.
- **EmailTemplate**: A per-workspace, per-type TipTap rich text document storing the customised email body. Falls back to the system default when not set.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of workspace invitations result in a delivered invitation email (vs 0% currently).
- **SC-002**: Auth emails (registration confirmation, password reset) are delivered within 60 seconds in all non-local environments.
- **SC-003**: Job share link emails are delivered within 60 seconds of the share action.
- **SC-004**: Email delivery failures do not cause errors visible to the end user — the primary action completes even if email fails.
- **SC-005**: All 8 email types (confirmation, password reset, invitation, job share, invoice sent, overdue reminder, payment confirmation, and custom template preview) are covered by branded templates.
- **SC-007**: Workspace owners can edit and save a custom invoice email template with placeholders substituted correctly in the delivered email.
- **SC-006**: Local development environments can inspect all outgoing emails without real delivery, with zero configuration beyond running `mailpit`.

---

## Clarifications

1. **Payment confirmation email**: In scope for this epic. ✅
2. **Invoice email format**: HTML line item summary in the email body — no PDF. TipTap WYSIWYG editor for workspace owners to customise the template with dynamic placeholders. ✅
3. **Notification preferences scope**: Global per-user — one setting applies across all workspaces. ✅
4. **Template editor scope**: All notification email types get TipTap editors. Auth emails (registration, password reset) are system-only and not editable. ✅
