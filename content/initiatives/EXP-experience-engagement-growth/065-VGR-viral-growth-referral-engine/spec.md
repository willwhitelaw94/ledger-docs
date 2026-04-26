---
title: "Feature Specification: Viral Growth & Referral Engine"
---

# Feature Specification: Viral Growth & Referral Engine

**Feature Branch**: `065-VGR-viral-growth-referral-engine`
**Created**: 2026-03-22
**Status**: Draft

---

## User Scenarios & Testing

### User Story 1 — Referral Attribution on Registration (Priority: P1)

When a new user signs up via any referral pathway — a job share link CTA, a personal referral link, or a direct invitation — MoneyQuest records who referred them, how they arrived, and which link they used. This attribution is permanent and forms the foundation for all growth analytics, referral rewards, and conversion tracking.

**Why this priority**: Without attribution, nothing else in this epic can function. Every downstream feature — rewards, analytics, free tier optimisation — depends on knowing which registrations came from referrals and which were organic. This is the invisible plumbing that makes the growth engine measurable.

**Independent Test**: Can be fully tested by registering via a referral link and verifying the new user's account is linked to the referrer with the correct source type recorded.

**Acceptance Scenarios**:

1. **Given** a visitor arrives at the registration page via a job share link CTA (URL contains `?ref=MQ-XXXXXXXX`), **When** they complete registration, **Then** their account is permanently linked to the user who created the share token, with the source recorded as "job_share".
2. **Given** a visitor arrives via a personal referral link (URL contains `?ref=MQ-XXXXXXXX`), **When** they complete registration, **Then** their account is linked to the referring user, with the source recorded as "personal_referral".
3. **Given** a visitor registers without any referral parameter, **When** their account is created, **Then** no referral attribution is recorded and they are counted as an organic signup.
4. **Given** a visitor arrives via a referral link but navigates away and returns later to register directly, **When** they complete registration within 30 days, **Then** the referral attribution is still captured (the referral code is persisted in the browser between sessions via localStorage).
5. **Given** a referral code in the URL does not match any existing user or share token, **When** the visitor completes registration, **Then** the account is created successfully with no referral attribution — the invalid code is silently ignored.
6. **Given** a user has already registered, **When** they visit a referral link, **Then** no new attribution is created — first-touch attribution only.
7. **Given** a visitor arrives via a referral link, **When** they register using a social login (Google or Microsoft), **Then** the referral attribution is captured identically to email-based registration — the referral code is sent from the browser regardless of auth method.

---

### User Story 2 — Personal Referral Links (Priority: P1)

Any registered MoneyQuest user can generate a personal referral link from their settings or profile page. This link is unique to them — not tied to a specific job or workspace — and can be shared via email, social media, or word of mouth. When someone registers using this link, the referrer is credited.

**Why this priority**: Job share links only reach people who are already connected to a business using MoneyQuest. Personal referral links open the growth channel to everyone — an accountant can share with colleagues, a sole trader can share with their business partner, a bookkeeper can share with other firms. This dramatically widens the top of the funnel.

**Independent Test**: Can be tested by a user generating their referral link, sharing it, and verifying a new registration via that link is attributed to them.

**Acceptance Scenarios**:

1. **Given** a registered user navigates to their profile or referral settings, **When** the page loads, **Then** they see their unique personal referral link and referral code, with a one-click copy button.
2. **Given** a user's personal referral link is visited by a prospective user, **When** they click through to the registration page, **Then** the referral code is pre-filled and persisted through the registration flow.
3. **Given** a user has generated their referral link, **When** they share it and someone registers, **Then** the new user appears in the referrer's referral list within the referral dashboard.
4. **Given** a user wants to share their referral link, **When** they click "Share", **Then** they see options to copy the link, share via email (pre-filled subject and body), or generate a QR code.
5. **Given** a user's referral code is `MQ-ABC123XY`, **When** a prospective user visits the registration page directly and enters the code manually in the "Have a referral code?" field, **Then** the attribution is captured identically to clicking the link.
6. **Given** a user on the Free plan views their referral settings, **When** they see their referral link, **Then** the page also shows a prompt: "Refer friends and earn credits towards your first paid month."

---

### User Story 3 — Conversion Funnel Tracking (Priority: P2)

The system tracks every meaningful step in the growth funnel — from link creation through to paid upgrade — as discrete, auditable events. Business users and platform administrators can see how their share links and referral links are performing at each stage of the funnel.

**Why this priority**: Attribution (S1) records the start and end of the funnel. This story fills in the middle — how many people viewed the link, how many clicked the CTA, how many started registration, how many completed it, how many imported a job, how many upgraded. Without this, we can count referrals but can't identify where the funnel leaks.

**Independent Test**: Can be tested by walking through the full funnel (share link → view → CTA click → register → import → upgrade) and verifying each step is recorded and visible in the analytics view.

**Acceptance Scenarios**:

1. **Given** a job share link is visited by an anonymous viewer, **When** the dashboard page loads, **Then** a "link_viewed" event is recorded with the share token ID and a session identifier (no PII).
2. **Given** a viewer on a job dashboard clicks the registration CTA, **When** the click occurs, **Then** a "cta_clicked" event is recorded linked to the same session.
3. **Given** a new user completes registration with a referral code, **When** the account is created, **Then** a "registration_completed" event is recorded with the referral source and referrer ID.
4. **Given** a registered user imports a shared job into their workspace, **When** the import completes, **Then** an "import_completed" event is recorded linking the share token to the user.
5. **Given** a referred user upgrades from the free plan to a paid plan, **When** the upgrade is confirmed, **Then** an "upgrade_completed" event is recorded and the referrer is notified.
6. **Given** a business user views their job's share analytics, **When** the analytics panel loads, **Then** they see a funnel summary: views → CTA clicks → registrations → imports — with counts and conversion rates between each step.
7. **Given** a free plan user activates a Professional trial, **When** the trial is activated, **Then** a "trial_activated" event is recorded as a distinct funnel step (separate from "plan_upgraded" which requires a paid subscription).

---

### User Story 4 — Free Tier with Contextual Onboarding (Priority: P2)

All new users start on a permanent Free plan. The Free tier provides enough value to be useful on its own. Users can activate a one-time 14-day Trial of Professional features at any time as a "test drive." If they came from a job share, the onboarding acknowledges the job they viewed and offers to import it. If they came from a personal referral, the onboarding names the referrer and guides them to set up their workspace.

**Why this priority**: The current registration flow creates a 14-day trial with full features, then cuts off abruptly. By making Free the permanent default for all users and Trial a one-time upgrade preview, we create a sustainable base that retains users while offering natural moments to discover paid features.

**Independent Test**: Can be tested by registering via a job share CTA and verifying the onboarding mentions the job, offers import, and provisions a free workspace. Can also test trial activation by clicking "Try Professional Free" and verifying 14-day access is granted.

**Acceptance Scenarios**:

1. **Given** a user registers via a job share link CTA, **When** they reach the onboarding screen, **Then** they see: "Welcome! You were viewing [Job Name] from [Business Name]. Want to track it in your own books?" with an "Import this job" button.
2. **Given** a user registers via a personal referral link, **When** they reach the onboarding screen, **Then** they see: "Welcome! [Referrer Name] invited you to MoneyQuest." followed by a choice: "I want to track personal finances" or "I run a business."
3. **Given** any user completes registration (referral or organic), **When** their organisation is created, **Then** it is provisioned on the Free plan with: 1 workspace, basic chart of accounts, journal entries (50 per month), P&L and balance sheet reports.
4. **Given** a Free plan user wants to try premium features, **When** they click "Try Professional Free for 14 Days" from the upgrade page or a feature gate prompt, **Then** their plan is temporarily elevated to Professional for 14 days. This trial can only be activated once per organisation.
5. **Given** a user's 14-day Professional trial expires, **When** the trial period ends, **Then** their plan reverts to Free. Any data created during the trial is preserved but gated features become inaccessible until they subscribe.
6. **Given** a Free plan user reaches their monthly transaction limit (50 journal entries), **When** they attempt to create another entry, **Then** they see a clear message: "You've reached your free plan limit this month. Upgrade to continue — plans start at $29/month." with a direct upgrade button.
7. **Given** a Free plan user has been active for 7 days and has not yet used their trial, **When** they log in, **Then** they see a non-intrusive banner: "Ready for more? Try Professional free for 14 days — no credit card required." — dismissible, shown only once per week.
8. **Given** a user registered via job share CTA clicks "Import this job" during onboarding, **When** the import completes, **Then** the job is imported into their new workspace as a bill or asset (their choice), and the onboarding marks that step complete.

---

### User Story 5 — Refer-a-Friend Rewards (Priority: P3)

When a referred user upgrades to a paid plan (subscribes to Starter, Professional, or Enterprise), both the referrer and the new user receive a reward. The referrer earns credit towards their next billing cycle. The referred user receives an extended trial or discount on their first paid month. Rewards are tracked, visible, and redeemable.

**Why this priority**: Attribution (S1) and personal links (S2) create the referral channel. This story adds the incentive that motivates users to actively refer — turning passive sharing into deliberate growth behaviour. It's P3 because the funnel works without rewards; rewards amplify it.

**Independent Test**: Can be tested by referring a user, having them upgrade, and verifying both parties receive and can see their rewards.

**Acceptance Scenarios**:

1. **Given** a referred user upgrades from Free to a paid plan, **When** the upgrade is confirmed, **Then** the referrer receives a credit of one month's subscription value applied to their next billing cycle.
2. **Given** a referred user upgrades from Free to a paid plan, **When** the upgrade is confirmed, **Then** the referred user receives a 30-day extension on their first billing cycle (effectively a free first month).
3. **Given** a referrer has earned credits from multiple referrals, **When** they view their referral dashboard, **Then** they see: total credits earned, credits applied, credits remaining, and a list of each referral with status (registered / active / upgraded).
4. **Given** a referrer has accumulated credits exceeding one month's subscription, **When** their next billing cycle processes, **Then** the credit is applied automatically — they pay the difference (or nothing if credit covers the full amount).
5. **Given** a referred user registers but never upgrades, **When** the referrer views their dashboard, **Then** that referral shows status "registered" with no reward — rewards are only earned on paid upgrade.
6. **Given** a referrer's account is on the Free plan (they haven't upgraded themselves), **When** they earn referral credits, **Then** the credits are banked and will apply when they upgrade — credits do not expire for 12 months from the date earned.
7. **Given** a user attempts to game the system by creating multiple accounts with the same referral code, **When** the second account uses the same email domain and similar name, **Then** the referral is flagged and held pending admin review — the referred user's account is created normally, but the referrer's reward is not issued until an admin approves the referral.
8. **Given** a referred user activates their one-time Professional trial (not a paid upgrade), **When** the trial begins, **Then** no referral reward is issued — rewards require a paid subscription, not a free trial activation.
9. **Given** a referrer has earned 5 or more rewards and all have been confirmed legitimate, **When** the next referral upgrade occurs, **Then** the reward is auto-approved without manual review (trusted referrer status).

---

### User Story 6 — Referral & Growth Dashboard (Priority: P3)

Business users can see how their job share links are performing — views, registrations, and imports per link. All users can see their personal referral stats. Practice managers see a leaderboard of which advisors in their firm drive the most client registrations.

**Why this priority**: Analytics close the feedback loop. Without visibility into what's working, users can't optimise their sharing behaviour and the platform team can't identify which channels drive the most conversions. It's P3 because the growth engine functions without a dashboard — but the dashboard makes it intentional.

**Independent Test**: Can be tested by creating share links, driving traffic through them, and verifying the dashboard displays accurate funnel metrics.

**Acceptance Scenarios**:

1. **Given** a business user navigates to Settings > Referrals, **When** the page loads, **Then** they see a summary card: total referrals, total registrations from referrals, total upgrades, and total credits earned.
2. **Given** a business user has active job share links, **When** they view the "Share Links" tab, **Then** they see a table of all share links with columns: Job Name, Created Date, Views, Registrations, Imports, Status (active/expired/revoked).
3. **Given** a user clicks on a specific share link row, **When** the detail panel opens, **Then** they see the full funnel for that link: views → CTA clicks → registrations → imports → upgrades, with conversion rates between steps.
4. **Given** a practice manager navigates to Practice > Growth, **When** the page loads, **Then** they see a leaderboard: each advisor in the practice ranked by number of client registrations attributed to their share links and referral codes.
5. **Given** no referral activity has occurred yet, **When** a user views the referral dashboard, **Then** they see an empty state with a clear call to action: "Share your referral link to start earning rewards" with their link prominently displayed and a copy button.
6. **Given** a platform administrator accesses the admin dashboard, **When** they view the growth section, **Then** they see platform-wide metrics: total referral signups this month, conversion rate by source (job share vs personal referral), top referring users, and MRR attributed to referrals.

---

### User Story 7 — Workspace Sharing Controls (Priority: P4)

Workspace owners can control whether job sharing is enabled for their workspace, set default policies for new share links (require password, default expiry), and bulk-manage existing tokens. This gives businesses confidence and control over their external data exposure.

**Why this priority**: The sharing infrastructure from 022-CPV works, but there are no workspace-level controls. A business that wants to pause all external sharing must revoke tokens one by one. This story adds the governance layer. It's P4 because most businesses will use the defaults — but enterprise and compliance-conscious customers will require these controls.

**Independent Test**: Can be tested by a workspace owner toggling sharing off and verifying all active share links become inaccessible, then toggling back on and verifying they resume.

**Acceptance Scenarios**:

1. **Given** a workspace owner navigates to Settings > Sharing, **When** the page loads, **Then** they see a master toggle: "Enable job sharing for this workspace" (on by default).
2. **Given** a workspace owner turns off the sharing toggle, **When** any visitor opens an existing job share link for that workspace, **Then** they see a "sharing is currently paused" message — the link is not revoked, just suspended.
3. **Given** sharing is paused, **When** a workspace member attempts to generate a new share link, **Then** the "Share with Client" button is disabled with a tooltip: "Sharing is paused by your workspace admin."
4. **Given** a workspace owner turns sharing back on, **When** visitors open previously suspended links, **Then** the links resume working (assuming they haven't expired or been individually revoked).
5. **Given** a workspace owner sets a default share policy of "password required" and "expires after 90 days", **When** any member generates a new share link, **Then** the password field is mandatory and the expiry is pre-filled to 90 days from today (both can be overridden per link).
6. **Given** a workspace owner clicks "Revoke All Share Links", **When** they confirm the action, **Then** all active share links for the workspace are permanently revoked — this cannot be undone and a confirmation dialog warns them.

---

### User Story 8 — Upgrade Prompts at Natural Friction Points (Priority: P4)

Free plan users encounter upgrade prompts at the moments they need more — when they hit transaction limits, try to use a gated feature, or have been active long enough to demonstrate engagement. Prompts are contextual, not nagging — they explain what the user gains by upgrading, not what they're missing.

**Why this priority**: This is the monetisation bridge between free referral signups and paid revenue. Without well-placed upgrade prompts, free users stay free. It's P4 because the free tier (S4) must exist first, and early growth metrics (S3) will inform where the highest-conversion prompts should appear.

**Independent Test**: Can be tested by a free plan user hitting each limit and verifying the correct prompt appears with accurate messaging and a working upgrade path.

**Acceptance Scenarios**:

1. **Given** a Free plan user attempts to enable bank feeds, **When** they click "Connect Bank Account", **Then** they see: "Bank feeds are available on Starter plans and above. Upgrade to connect your accounts automatically." with an "Upgrade Now" button and a "Try Professional Free" button if they haven't used their trial.
2. **Given** a Free plan user attempts to create a recurring template, **When** they click "Save as Repeating", **Then** they see: "Recurring entries are available on Starter plans and above. Upgrade to automate your bookkeeping." with an "Upgrade Now" button.
3. **Given** a Free plan user has created 50 journal entries this month, **When** they try to create the 51st, **Then** they see: "You've used all 50 entries for this month. Upgrade for unlimited entries — or wait until [next month date]." with "Upgrade" and "Remind Me Later" buttons.
4. **Given** a Free plan user clicks "Upgrade Now" from any prompt, **When** the billing page loads, **Then** they see the plan comparison with their current usage highlighted and the recommended plan pre-selected.
5. **Given** a Free plan user has a referral credit banked, **When** they view the upgrade prompt, **Then** the prompt shows: "You have [X] in referral credits — your first month could be free!" alongside the standard upgrade messaging.
6. **Given** a Free plan user dismisses an upgrade prompt, **When** they encounter the same limit again, **Then** the prompt reappears — but no more than once per session for the same trigger.
7. **Given** a Free plan user who has already exhausted their one-time trial hits a feature gate, **When** the prompt appears, **Then** it shows only "Upgrade Now" (not "Try Professional Free") since the trial has been used.

---

### Edge Cases

- What happens if a referral code belongs to a deleted or suspended user? → Attribution is still recorded for analytics, but no reward is issued. The referred user's registration proceeds normally.
- What happens if both a job share referral and a personal referral code are present? → Job share takes precedence (it's more specific). The personal referral code is logged but not used for attribution.
- What if a referred user downgrades after the referrer received credit? → The credit already applied is not clawed back. Future referral credits from the same user are paused until they re-upgrade.
- What if a workspace owner disables sharing while a user is actively viewing a job dashboard? → The current page session continues (no mid-session interruption), but refreshing the page shows the "sharing paused" message.
- Can a user refer themselves (register a second account with their own code)? → No — referral codes cannot be used by the same email address. If the email already exists in the system, the referral is not attributed.
- What happens to referral credits when an organisation is deleted? → Credits are forfeited. Users are notified before deletion that outstanding credits will be lost.
- Can practice managers see individual advisor referral details or only aggregate stats? → Leaderboard shows aggregate counts per advisor. Clicking an advisor shows their share links and referral counts — not the personal details of referred users.
- What if a user registers via social login (Google/Microsoft) with a referral code in the URL? → The frontend sends the referral code from localStorage alongside the social auth flow. Attribution works identically to email registration.
- What happens to a user's data when their Professional trial expires? → All data is preserved. Gated features (bank feeds, recurring, etc.) become read-only — the user can view but not create new items using those features. They can still use all Free tier features normally.
- Can a referred user who activated a free trial later upgrade and still trigger a reward? → Yes. The reward is triggered by the first paid subscription, regardless of whether a trial was used. Trial activation alone does not trigger rewards.
- What if the same person registers, deletes their account, and re-registers via a different referral code? → The new registration gets the new referral attribution. The original referrer loses the attribution since the original account no longer exists.
- What happens when a Free plan user tries to create a second workspace? → They see an upgrade prompt: "Free plans include 1 workspace. Upgrade to Starter or above for more."

---

## Requirements

### Functional Requirements

**Attribution & Tracking**
- **FR-001**: System MUST capture referral attribution on user registration when a valid referral code is present in the URL or manually entered. Attribution MUST record: referrer user ID, referral source type (job_share, personal_referral), originating token/code, and timestamp.
- **FR-002**: System MUST persist the referral code in the browser for 30 days after first visit using localStorage, so that users who return later to register are still attributed. The stored code MUST survive both page refreshes and social login redirects.
- **FR-003**: System MUST use first-touch attribution only — if a user encounters multiple referral codes, only the first is recorded.
- **FR-004**: System MUST record funnel events at each step: link_viewed, cta_clicked, registration_started, registration_completed, job_imported, trial_activated, plan_upgraded. Each event MUST include session identifier, referral source, and timestamp.
- **FR-005**: System MUST NOT store personally identifiable information in funnel events for anonymous visitors — session identifiers only.

**Personal Referral Links**
- **FR-006**: Every registered user MUST have a unique, permanent personal referral code generated at account creation. The code format MUST be `MQ-` followed by 8 alphanumeric characters (uppercase + digits only, no ambiguous characters like 0/O, 1/I/L).
- **FR-007**: Users MUST be able to view and copy their personal referral link from their profile/settings page. Free plan users see additional messaging encouraging referrals.
- **FR-008**: The registration page MUST include a "Have a referral code?" input field that accepts manually entered codes and validates them in real-time.

**Free Tier & Trial**
- **FR-009**: All new users MUST start on a permanent Free plan regardless of referral source. The Free plan MUST include: 1 workspace, 1 user, basic chart of accounts, journal entries (50 per month), P&L report, balance sheet report, and trial balance report. The Free plan has no expiry date.
- **FR-010**: The Free plan MUST exclude: bank feeds, multi-currency, recurring templates, batch payments, AI assistant, job costing, invoicing, bills, contacts management, fixed assets, loans, quotes, and purchase orders.
- **FR-011**: When a Free plan user reaches their monthly transaction limit, the system MUST display a contextual upgrade prompt — not a hard block. The user cannot create more entries until the next calendar month or they upgrade.
- **FR-012**: When a Free plan user attempts to access a gated feature, the system MUST display a feature-specific upgrade prompt explaining what the feature does and which plan includes it. If the user has not used their one-time trial, the prompt MUST also offer "Try Professional Free for 14 Days."
- **FR-032**: Every organisation MUST be eligible for a one-time 14-day Professional trial. When activated, the organisation gains full Professional features for 14 days. When the trial expires, the organisation reverts to Free. Trial activation does not require a credit card.
- **FR-033**: The monthly journal entry limit (50) MUST reset on the first day of each calendar month (UTC). The count is per workspace, not per user.

**Contextual Onboarding**
- **FR-013**: Users registering via a job share CTA MUST see onboarding that references the job they viewed, identifies the sharing business, and offers a one-click job import.
- **FR-014**: Users registering via a personal referral MUST see onboarding that names the referrer and asks whether they want a personal or business workspace.
- **FR-015**: The onboarding flow MUST provision the correct workspace type (personal or business) based on the user's selection, with an appropriate chart of accounts template seeded.
- **FR-034**: Users registering organically (no referral code) MUST follow the existing account type selection flow (Wealth Holder or Practice) and land on the Free plan.

**Referral Rewards**
- **FR-016**: When a referred user upgrades to a paid plan (Starter, Professional, or Enterprise), the referrer MUST receive a credit equal to one month's subscription value of the plan the referee chose. Activating the free trial does not trigger a reward.
- **FR-017**: When a referred user upgrades to a paid plan, the referred user MUST receive a 30-day billing extension on their first cycle.
- **FR-018**: Referral credits MUST be automatically applied to the referrer's next billing cycle. If the credit exceeds the bill amount, the remainder carries forward.
- **FR-019**: Referral credits MUST expire 12 months from the date earned if not redeemed.
- **FR-020**: Referral rewards MUST only be issued when the referred user completes a paid upgrade — registration alone and trial activation do not trigger a reward.
- **FR-021**: The system MUST enforce anti-abuse rules: no self-referral (same email), rate limit of 50 referral attributions per user per month, and flagging of suspicious patterns (same email domain + similar name, burst signups from same IP). Flagged referrals MUST be auto-held pending admin review — rewards are not issued until an admin approves. The referred user's registration proceeds normally regardless of flag status.
- **FR-035**: Referrers who accumulate 5 or more admin-approved rewards MUST be granted "trusted referrer" status, which auto-approves subsequent rewards without manual review.
- **FR-036**: There MUST be a lifetime cap of 24 referral rewards per referrer per 12-month rolling period. This prevents unbounded liability while still being generous (2x monthly value).

**Growth Analytics**
- **FR-022**: Business users MUST be able to view per-share-link analytics: total views, unique visitors, CTA clicks, registrations, imports, and conversion rates between each funnel step.
- **FR-023**: All users MUST be able to view their personal referral dashboard: total referrals, registered referrals, upgraded referrals, credits earned, and credits remaining.
- **FR-024**: Practice managers MUST be able to view a leaderboard of advisors in their practice ranked by referral-driven client registrations.
- **FR-025**: Platform administrators MUST be able to view platform-wide growth metrics: total referral signups, conversion rates by source, top referrers, monthly recurring revenue attributed to referrals, and a flagged referrals queue for review.

**Workspace Controls**
- **FR-026**: Workspace owners MUST be able to toggle job sharing on/off at the workspace level. When off, all existing share links are suspended (not revoked) and no new links can be generated.
- **FR-027**: Workspace owners MUST be able to set default share policies: require password (yes/no), default expiry period (30/60/90/custom days, or no expiry).
- **FR-028**: Workspace owners MUST be able to bulk-revoke all active share links for the workspace, with a confirmation dialog warning that this action is irreversible.

**Notifications**
- **FR-029**: Referrers MUST be notified (in-app only) when a referred user registers ("Someone signed up using your referral link!").
- **FR-030**: Referrers MUST be notified (in-app + email) when a referred user upgrades to a paid plan ("You earned a referral credit of [amount]!").
- **FR-031**: Referred users MUST be notified (in-app) of their 30-day billing extension when they upgrade ("Welcome bonus: your first 30 days are on us, courtesy of [Referrer Name]!").

### Key Entities

- **Referral Attribution**: A permanent record linking a referred user to their referrer. Captures: referrer user ID, referred user ID, source type (job_share or personal_referral), originating token/code, registration timestamp, IP address hash (for fraud detection). One per user — first-touch only.
- **Referral Code**: A unique, permanent identifier assigned to every user at registration. Format: `MQ-` + 8 alphanumeric characters (uppercase + digits, no ambiguous chars). Stored on the User model. Used in personal referral links and can be entered manually during registration.
- **Funnel Event**: A timestamped record of a growth funnel step. Captures: event type (viewed, clicked, registered, imported, trial_activated, upgraded), session identifier, referral source, associated token. No PII for anonymous events. Stored in a dedicated table, not the event sourcing event_store.
- **Referral Credit**: A monetary credit earned by a referrer when their referred user upgrades. Tracks: amount (integer, cents), earned date, expiry date (12 months), applied date, remaining balance (integer, cents). Automatically applied to billing. Linked to the referral attribution record.
- **Workspace Sharing Policy**: Workspace-level configuration for job sharing. Captures: sharing enabled (boolean), default password requirement, default expiry period. Applies to all new share links generated by any workspace member. Stored as columns on the Workspace model (not a separate table).
- **Free Plan**: A permanent plan tier added to the PlanTier enum. Price: $0. Features: manual_journals only. Limits: 1 workspace, 1 user, 0 bank feeds, 50 journal entries per month. No expiry. Distinct from Trial (which is a time-limited preview of Professional features).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of registrations arriving with a valid referral code have attribution recorded — zero unattributed referral signups.
- **SC-002**: At least 5% of unique job share link viewers click the registration CTA within 6 months of launch.
- **SC-003**: At least 50% of users who click the CTA complete registration and finish onboarding (measured from CTA click to first workspace created).
- **SC-004**: At least 20% of active Free plan users generate and share their personal referral link within their first 30 days.
- **SC-005**: At least 10% of Free plan users upgrade to a paid plan within 90 days of registration.
- **SC-006**: Referral credits are applied to billing cycles with zero manual intervention — fully automated.
- **SC-007**: The referral dashboard loads in under 2 seconds for users with up to 500 referrals.
- **SC-008**: Workspace sharing controls (toggle, bulk revoke) take effect within 5 seconds of the owner's action — verified by immediate inaccessibility on the next visitor page load.
- **SC-009**: Zero instances of referral credit awarded without a confirmed paid upgrade by the referred user.
- **SC-010**: Platform-wide growth metrics are available to administrators with data no more than 1 hour stale.
- **SC-011**: At least 30% of Free plan users activate the one-time Professional trial within 60 days of registration.
- **SC-012**: At least 25% of users who complete their Professional trial convert to a paid plan within 30 days of trial expiry.

---

## Clarifications

The following questions were raised during spec review and resolved with decisions applied to the spec above.

**Q1. [Functional Scope] How does anti-fraud handling work for flagged referrals?**
Decision: Auto-hold with manual release. Flagged referrals are held pending admin review. The referred user's registration proceeds normally. Rewards are only issued after admin approval. Already reflected in FR-021.

**Q2. [Functional Scope] How do Free tier and Trial relate — are they separate concepts?**
Decision: Option C — Free tier for everyone, Trial as upgrade preview. All new users start on a permanent Free plan (no expiry, limited features). Users can activate a one-time 14-day Trial of Professional features at any time as a "test drive." Trial activation does not require a credit card and does not trigger referral rewards. This replaces the old approach where registration created a 14-day trial with full features. Added FR-032 and updated FR-009.

**Q3. [Domain & Data Model] Should the referral code reuse JobShareToken's MQ-{prefix} format or be a separate concept?**
Decision: Separate concept. JobShareToken codes identify a specific job share (token_prefix is 8 chars of the 64-char token). Personal referral codes identify a user and are permanent. They share the `MQ-` prefix for brand consistency but are stored on the User model, not in JobShareToken. The registration endpoint checks both tables to resolve a code.

**Q4. [Domain & Data Model] Where do funnel events live — in the Spatie event store or a separate table?**
Decision: Separate table. Funnel events are analytics data, not domain events that rebuild aggregate state. They have different retention, querying, and privacy requirements. The event_store is for financial domain events only. Funnel events go in a dedicated `funnel_events` table.

**Q5. [Domain & Data Model] Should Workspace Sharing Policy be a separate model or columns on the Workspace model?**
Decision: Columns on the Workspace model. Three fields: `sharing_enabled` (boolean, default true), `default_share_password_required` (boolean, default false), `default_share_expiry_days` (nullable integer). A separate model would be over-engineering for three config values.

**Q6. [Interaction & UX Flow] How does the referral code survive social login redirects (Google/Microsoft)?**
Decision: The frontend stores the referral code in localStorage (not sessionStorage) when the user first arrives. After the social auth redirect completes, the frontend reads the code from localStorage and sends it to the backend as part of the post-auth attribution call. Updated FR-002 and added acceptance scenario S1.7.

**Q7. [Interaction & UX Flow] Where exactly does the referral dashboard live in the navigation?**
Decision: Under Settings > Referrals for all users (personal referral stats and link). For business users with active share links, the share link analytics appear in the same page as a "Share Links" tab. Practice managers access the leaderboard at Practice > Growth. Admin sees growth metrics in the Admin dashboard.

**Q8. [Interaction & UX Flow] What does the registration page say about the plan — "free trial" or "free plan"?**
Decision: "Create your free account" (not "Start free trial"). The current register page says "30-day free trial" which is inaccurate under the new model. Registration creates a permanent Free account. The trial is a separate, optional activation after registration.

**Q9. [Non-Functional Quality] What is the retention period for funnel events?**
Decision: 24 months. Funnel events older than 24 months are aggregated into monthly summary rows and the detailed events are purged. This balances analytics depth with storage efficiency. Aggregated summaries are kept indefinitely.

**Q10. [Non-Functional Quality] Should referral notifications be in-app only, email too, or configurable?**
Decision: Registration notifications (FR-029) are in-app only — they're frequent and low-urgency. Upgrade/reward notifications (FR-030) are in-app + email — they represent earned money and should not be missed. Referred user notifications (FR-031) are in-app only. All follow the existing NotificationPreference system so users can opt out of email.

**Q11. [Integration & Dependencies] Does the Free tier require Stripe integration?**
Decision: No. The Free tier involves no payment processing. Trial activation is also free and requires no payment. Stripe integration is only needed when a user subscribes to a paid plan (Starter/Professional/Enterprise), which is handled by the existing billing epic (009-BIL). Referral credits are tracked internally and applied as discounts when Stripe billing is eventually integrated.

**Q12. [Integration & Dependencies] How does the Free plan integrate with the existing PlanTier enum and FeatureGate?**
Decision: Add `Free` as a new case to the PlanTier enum, positioned below Trial in the tier order. Free includes only `manual_journals` as a feature. FeatureGate already handles tier-based checks. The `isAtLeast()` method order becomes: Free, Trial, Starter, Professional, Enterprise. Free has no expiry check (unlike Trial). Update `CreateNewUser` to default to `plan_tier='free'` instead of `'professional'`.

**Q13. [Edge Cases] What happens when a Professional trial expires and the user has data from gated features?**
Decision: All data is preserved — nothing is deleted. Gated features become read-only: the user can view existing invoices, bank transactions, recurring templates, etc., but cannot create new ones or trigger syncs. Free tier features (journal entries up to 50/month, basic reports) continue to work normally.

**Q14. [Edge Cases] Is there a cap on total referral rewards per referrer?**
Decision: Yes. 24 rewards per referrer per rolling 12-month period. At the Professional plan's $59/month, that caps exposure at $1,416/year per referrer — generous enough to motivate power referrers while preventing unbounded liability. Added FR-036.

**Q15. [Edge Cases] What happens if a referred user upgrades, earns the referrer a reward, then churns and re-subscribes?**
Decision: Only the first upgrade triggers a reward. Subsequent churn/re-subscribe cycles do not generate additional rewards for the same referral pair. The reward is a one-time event per referral attribution.

**Q16. [Constraints & Tradeoffs] Should the 50 journal entry limit count per workspace or per user?**
Decision: Per workspace. A workspace is the billing unit in MoneyQuest. If the limit were per-user, a Free account could create multiple users in one workspace to multiply their limit. Per-workspace is simpler to enforce and aligns with the billing model. Added FR-033.

**Q17. [Constraints & Tradeoffs] Should there be a "trusted referrer" auto-approval threshold?**
Decision: Yes. After 5 admin-approved rewards with no fraud flags, a referrer is granted trusted status and subsequent rewards are auto-approved. This reduces admin burden as the platform scales while keeping new referrers under review. Added FR-035.

**Q18. [Terminology & Consistency] How should the spec distinguish "upgrade" (free-to-paid) from "trial activation"?**
Decision: "Upgrade" always means subscribing to a paid plan (Starter, Professional, or Enterprise) with a billing commitment. "Trial activation" means starting the one-time 14-day Professional preview. Rewards, funnel events, and notifications use precise terminology: `trial_activated` vs `plan_upgraded`. Updated FR-004, FR-016, FR-020.

**Q19. [Completion Signals] How do we know the Free tier is working — what signals indicate it's the right limit?**
Decision: Added SC-011 (trial activation rate) and SC-012 (trial-to-paid conversion rate). If trial activation is below 30% after 60 days, the Free tier may be too generous. If trial-to-paid conversion is below 25%, the trial may not be demonstrating enough value. Both metrics inform future limit adjustments.

**Q20. [Misc] Should the referral code use only uppercase or allow mixed case?**
Decision: Uppercase letters + digits only, excluding ambiguous characters (0/O, 1/I/L). This makes codes easier to read aloud, type manually, and print on business cards or QR codes. The validation endpoint accepts case-insensitive input and normalises to uppercase. Updated FR-006.
