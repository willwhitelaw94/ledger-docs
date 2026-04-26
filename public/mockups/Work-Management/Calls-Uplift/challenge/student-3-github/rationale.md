---
title: "Design Rationale: GitHub Patterns for Calls Inbox"
description: "Why GitHub's review, triage, and audit patterns are the right fit for care coordination call review"
---

# Design Rationale: GitHub Patterns for TC Portal Calls Inbox

## Why GitHub Patterns Work for Care Coordinators

### The Core Insight

GitHub's Pull Request review workflow solves the exact same structural problem as the Calls Inbox: a high volume of items arrive, each needs human review, and that review must result in an explicit, auditable decision. The workflow is always: **review, decide, ship**.

Care coordinators process hundreds of calls daily. Each call needs to be reviewed, linked to a patient package, and completed for billing. GitHub's patterns provide a proven framework for exactly this kind of structured triage work.

### Jakob's Law Connection

While care coordinators are not developers, GitHub's patterns have become enterprise-wide standards. The same status tabs appear in Jira, Zendesk, Salesforce, and Microsoft Teams. The same batch-select checkboxes appear in Gmail, Outlook, and every file manager. Coordinators already know these patterns -- they just do not know them as "GitHub patterns."

---

## Pattern Rationale: Why Each Pattern Was Selected

### 1. Three-State Review Maps Perfectly to Call Review

**The Problem**: Coordinators currently have ambiguous call states. Was a call "looked at" or "properly reviewed"? Did someone flag it for follow-up, or just forget about it?

**GitHub's Solution**: Force an explicit three-state decision at review submission time.

**How It Maps**:

| GitHub | Calls Inbox | What It Means |
|---|---|---|
| Comment | Add Note | "I have something to say but I am not done reviewing" |
| Approve | Complete Review | "This call is fully processed, linked, and logged" |
| Request Changes | Flag for Follow-up | "Someone else needs to act on this -- callback needed, escalation required" |

**Why Three States (Not Two, Not Five)**:
- **Two states** (Complete / Not Complete) loses the critical "needs follow-up" signal
- **Five+ states** creates decision paralysis and slows down the 30-second target
- **Three states** covers every real scenario while keeping the decision instant

**Design Decision**: The "Complete Review" option is visually prominent (green, pre-selected for linked calls) because 80%+ of reviews should result in completion. Flagging is red to communicate severity. Adding a note is neutral gray.

---

### 2. Status Tabs Give Instant Workload Visibility

**The Problem**: Coordinators start their shift and need to know: "How much work do I have? Where should I start?"

**GitHub's Solution**: Tabs with counts directly above the list.

**Why This Works for Coordinators**:
- **Unlinked (12)**: Tells the coordinator "12 calls need linking before anything else." This is the highest-priority queue because unlinked calls cannot be billed.
- **Review (5)**: These are linked and ready -- the fast-track queue. A coordinator can burn through 5 reviews in under 3 minutes.
- **Completed (47)**: Provides a sense of progress and a reference archive. Coordinators often need to revisit a completed call when a patient calls back.

**Tab Ordering Reflects Priority**: Unlinked first (most urgent), Review second (actionable), Completed last (reference). This left-to-right priority mapping matches natural reading flow.

**Trade-off Considered**: We considered a dashboard with charts instead of tabs. Rejected because tabs are actionable (click to filter), while charts are informational. Coordinators need to *work*, not *observe*.

---

### 3. Timeline Provides the Audit Trail Aged Care Compliance Demands

**The Problem**: Aged care compliance requires a clear record of who did what, when, and why. If a call is linked to the wrong package, or a follow-up is missed, auditors need to trace the full history.

**GitHub's Solution**: An append-only, chronological timeline of every event.

**Why This Works for Compliance**:
- **Every action is timestamped and attributed**: "Sarah C. linked to PKG-4521 at 9:42am"
- **Nothing is deleted**: If a link is changed, both the original and updated link appear in the timeline
- **Automated events are distinct**: System events (transcription ready, AI suggestion) are visually different from human actions
- **Full context in one place**: No need to cross-reference multiple screens to understand a call's history

**Regulatory Value**: The Aged Care Quality Standards require documentation of care coordination activities. A timeline view provides exactly the evidence needed for audits without requiring coordinators to manually write log entries.

**Design Decision**: The timeline appears in the detail/review view (Variation B), not the list view (Variation A). This keeps the list view fast for scanning while providing full context when needed.

---

### 4. Batch Actions Enable Efficient Multi-Call Review

**The Problem**: At end-of-day, a coordinator might have 15 calls that are linked and ready to complete. Clicking into each one individually, pressing Complete, and going back takes 60+ seconds per call.

**GitHub's Solution**: Checkbox selection with a floating batch action bar.

**Why This Works for Coordinators**:
- **Select all linked calls**: One click on "Select all" in the Review tab
- **Batch Complete Review**: One click to complete all selected calls
- **Total time**: 3 clicks for 15 calls, instead of 45+ clicks

**Specific Batch Scenarios**:

| Scenario | Without Batch | With Batch |
|---|---|---|
| Complete 15 reviewed calls | 45 clicks (open, complete, back x15) | 3 clicks (select all, complete, confirm) |
| Link 4 calls from same number | 12 clicks (open, search, link x4) | 6 clicks (select 4, link to package, confirm) |
| Flag 3 calls for team lead | 9 clicks | 5 clicks |

**Safety Consideration**: Batch actions always show a confirmation count ("Complete review for 15 calls?") to prevent accidental mass-completion. This mirrors GitHub's bulk close confirmation.

**Trade-off Considered**: We considered auto-completing calls that meet all criteria (linked, transcription viewed). Rejected because explicit human confirmation is required for billing compliance.

---

### 5. Explicit State Changes Create Accountability

**The Problem**: In the current workflow, it is unclear who reviewed a call, when, and whether they actually read the transcription. This creates gaps in accountability and makes it hard to investigate issues.

**GitHub's Solution**: Every state change is a deliberate, logged action with the actor's identity.

**Why This Works for Care Coordination**:
- **No silent state changes**: A call does not become "completed" by being opened. It requires an explicit "Submit Review" action.
- **Actor visibility**: The timeline shows "Sarah C. completed review" -- not just "Review completed"
- **Decision reasoning**: The note field captures *why* (same as GitHub's review comment)
- **Reversibility with history**: If a review is reopened, the original completion and the reopen are both visible

**Design Decision**: The "Submit Review" button is a single, prominent action at the bottom of the review panel (Variation B). It is intentionally separate from browsing -- you do not accidentally complete a review by viewing a call.

---

## Addressing the 30-Second Review Target

The GitHub-inspired workflow is designed to hit the 30-second target through four speed factors:

### Speed Factor 1: Minimal Navigation (Variation A)
- Status tabs let coordinators go directly to their work queue
- No drilling through menus or dashboards
- Click a tab, see actionable items immediately

### Speed Factor 2: Progressive Disclosure (Both Variations)
- **Simple case** (linked call, clear transcription): Scan transcript, click Complete (10 seconds)
- **Medium case** (unlinked but AI-suggested): Accept suggestion, scan, complete (20 seconds)
- **Complex case** (unlinked, no suggestion): Search package, link, review, complete (45-60 seconds)

### Speed Factor 3: AI-Assisted Linking (Variation B Sidebar)
- AI suggestion appears proactively: "Suggested: PKG-4521 Mary Wilson (85% match)"
- One-click accept removes the search step entirely
- Reduces the most time-consuming part of the workflow (package search) to a single click

### Speed Factor 4: Batch Processing (Variation A)
- End-of-day: Select 15 completed calls, batch complete in 3 clicks
- Per-call time for batch: effectively 0.2 seconds per call

### Estimated Workflow Timing

| Step | Time (Simple) | Time (Complex) |
|---|---|---|
| Select call from list | 2s | 2s |
| Scan transcript | 5s | 15s |
| Link package (AI-suggested) | 3s | -- |
| Link package (manual search) | -- | 20s |
| Add note | 5s | 10s |
| Submit review | 3s | 3s |
| **Total** | **18s** | **50s** |

The 30-second target is achievable for 80%+ of calls (linked or AI-suggested cases).

---

## Variation A vs Variation B: When to Use Each

### Variation A: Issue List View
**Best for**: High-volume triage, scanning workload, batch operations.
- Use when coordinator has 20+ calls to process
- Optimised for speed and throughput
- Status tabs and batch actions shine here

### Variation B: PR Review Interface
**Best for**: Detailed review, complex calls, training/audit scenarios.
- Use for calls needing careful transcript review
- Timeline provides full audit context
- Three-state review panel ensures deliberate decisions

### Recommended Implementation
Both variations should exist as views within the same feature:
1. **Default view**: Variation A (list) for daily triage
2. **Detail view**: Variation B opens when clicking a call from the list
3. **Quick actions**: Simple calls can be completed from Variation A without opening Variation B

---

## Why NOT Other Patterns?

### Kanban Board
- Good for: Visualising workflow stages
- Bad for: Lists with 50+ items (cards take too much space)
- **Verdict**: Tabs with counts provide the same stage awareness in 1/10th the space

### Chat/Thread Interface
- Good for: Ongoing conversations
- Bad for: Triage workflow where each item needs independent action
- **Verdict**: Calls are discrete items to process, not conversations to continue

### Card Grid
- Good for: Visual scanning of images or rich content
- Bad for: Dense information and batch selection
- **Verdict**: A list row packs more scannable data than a card

---

## Success Metrics to Validate

1. **Time to complete review**: Target less than 30 seconds (simple calls)
2. **Clicks per review**: Target less than 5 clicks for linked calls
3. **Unlinked call backlog**: Same-day processing (no calls left unlinked overnight)
4. **Coordinator satisfaction**: "The interface feels familiar" (Jakob's Law validation)
5. **Audit pass rate**: 100% of completed reviews have timestamp, actor, and decision logged

---

## References

- [GitHub Primer Design System](https://primer.style/)
- [Managing Notifications from Your Inbox -- GitHub Docs](https://docs.github.com/en/subscriptions-and-notifications/how-tos/viewing-and-triaging-notifications/managing-notifications-from-your-inbox)
- [Filtering and Searching Issues -- GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/filtering-and-searching-issues-and-pull-requests)
- [The GitHub PR Review Workflow -- Graphite](https://graphite.com/guides/github-pull-request-review-workflow)
- [State Label -- Primer](https://primer.style/design/components/state-label/)
