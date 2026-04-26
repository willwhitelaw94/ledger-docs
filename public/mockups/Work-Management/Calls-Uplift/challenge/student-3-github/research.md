---
title: "GitHub UX Pattern Research for Calls Inbox"
description: "Research into GitHub's UI patterns and how they translate to a care coordination Calls Inbox workflow"
---

# GitHub UX Pattern Research for Calls Inbox & Call Review

## Executive Summary

GitHub's interface patterns are battle-tested by over 100 million developers worldwide for reviewing code changes, managing notifications, and triaging work items. These patterns translate directly to the Calls Inbox workflow where care coordinators need to review call transcriptions, link calls to packages, and complete reviews efficiently. GitHub's core strength is turning a high-volume review workload into a structured, auditable, three-state workflow.

---

## Pattern 1: Pull Request Review Workflow (Three-State Actions)

### What It Is
GitHub's code review has exactly three completion states: **Comment** (neutral feedback), **Approve** (positive completion), and **Request Changes** (blocking action required). This tri-state model eliminates ambiguity about what a reviewer decided.

### How GitHub Implements It
- **Single "Review changes" button** opens a submission panel with all three radio options
- **Clear visual distinction**: Green for Approve, Red for Request Changes, Gray for Comment
- **Required context**: Each action requires a summary comment explaining the decision
- **Collapsible review threads**: Individual file comments roll up into the overall review
- **State persistence**: The PR header permanently displays the latest review state from each reviewer
- **Dismissable**: A maintainer can dismiss a stale review if circumstances change

### Why It Works
- **Decision clarity**: Forces reviewer to make an explicit decision -- not just "look at it"
- **Audit trail**: Every review action creates a timestamped, attributed record
- **Progress visibility**: PR shows clearly whether it is approved, has changes requested, or is still awaiting review
- **Reduced cognitive load**: Only 3 choices prevents decision paralysis
- **Accountability**: Each state change is logged with who, when, and why

### Application to Calls Inbox
| GitHub State | Calls Inbox State | Meaning |
|---|---|---|
| Comment | Add Note | Leave a note without completing the review |
| Approve | Complete Review | Call reviewed, linked, activity logged for billing |
| Request Changes | Flag for Follow-up | Needs escalation, callback, or another coordinator |

### Sources
- [Approving a pull request with required reviews -- GitHub Docs](https://docs.github.com/articles/approving-a-pull-request-with-required-reviews)
- [The GitHub pull request review workflow -- Graphite](https://graphite.com/guides/github-pull-request-review-workflow)
- [5 Ways to Use GitHub to Approve a Pull Request -- LinearB](https://linearb.io/blog/github-approve-pull-request)

---

## Pattern 2: Status Tabs with Counts (Issues/PRs List)

### What It Is
GitHub's Issues and Pull Requests lists use horizontal filter tabs that display the count of items in each state. The classic example is the **Open (42) / Closed (318)** tabs at the top of the issues list.

### How GitHub Implements It
- **Bold count numbers** in each tab so you can scan workload at a glance
- **Active tab indicator**: Underline or filled background distinguishes the selected tab
- **URL persistence**: Each tab updates the URL query string for bookmarking and sharing
- **Consistent placement**: Tabs always appear directly above the list, between search/filters and results
- **Dynamic counts**: Numbers update in real time as items change state
- **Sort options nested under tabs**: Newest, Oldest, Most commented, Recently updated

### Why It Works
- **Instant workload visibility**: A coordinator knows immediately "I have 12 unlinked calls to process"
- **Progressive workflow**: Tabs map to a natural work sequence (Unlinked first, then Review, then verify Completed)
- **Recognition over recall**: Users see counts without querying or searching
- **Shared mental model**: The pattern is identical across GitHub Issues, PRs, Discussions, and Projects

### Application to Calls Inbox
| Tab | Count | Meaning |
|---|---|---|
| Unlinked | 12 | Calls without a package link -- highest priority |
| Review | 5 | Linked but not yet reviewed/completed |
| Completed | 47 | Fully reviewed and logged -- reference only |
| All | 64 | Unfiltered view |

### Sources
- [Filtering and searching issues and pull requests -- GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/filtering-and-searching-issues-and-pull-requests)
- [Filter Pull Requests by Status -- GitHub Blog](https://github.blog/2015-06-02-filter-pull-requests-by-status/)

---

## Pattern 3: Timeline / Activity Feed

### What It Is
GitHub displays a chronological timeline of all events on a PR or Issue: comments, status changes, commits, reviews, label changes, and automated actions. This creates a complete, append-only audit trail visible to all participants.

### How GitHub Implements It
- **Vertical timeline**: Events flow top-to-bottom chronologically with a thin connector line
- **Event type differentiation**: Each event type has a unique icon (comment bubble, commit dot, review checkmark, label tag, merge icon)
- **Actor attribution**: Every event shows the avatar and username of who performed it
- **Relative timestamps**: "2 hours ago" displayed with exact ISO timestamp on hover
- **Collapsible sections**: Large commit lists or resolved review threads can be collapsed
- **Cross-references**: Mentions of other issues/PRs become clickable links with status preview
- **Bot vs human distinction**: Automated events are visually distinct from human actions

### Why It Works
- **Complete context**: Reviewer sees full history without hunting across multiple screens
- **Audit compliance**: Every action is logged with timestamp and actor -- critical for aged care compliance
- **Conversation threading**: Comments can be replies to specific events
- **Non-destructive**: History is append-only; nothing is ever lost or overwritten
- **Chronological clarity**: No ambiguity about what happened in what order

### Application to Calls Inbox
A call timeline could show:
1. Call received (timestamp, caller ID, duration)
2. Transcription completed (auto-generated)
3. AI package suggestion offered (85% confidence)
4. Package linked by coordinator (manual action)
5. Notes added by coordinator
6. Review completed (activity logged for billing)

### Sources
- [REST API endpoints for timeline events -- GitHub Docs](https://docs.github.com/en/rest/issues/timeline)
- [Issue event types -- GitHub Docs](https://docs.github.com/en/rest/using-the-rest-api/issue-event-types)

---

## Pattern 4: Batch Operations with Checkbox Selection

### What It Is
GitHub allows users to select multiple issues or PRs via checkboxes and apply bulk actions. A "select all" checkbox in the header selects all visible items. When items are selected, a batch action toolbar appears.

### How GitHub Implements It
- **Per-row checkboxes**: Each item has a checkbox on the left edge
- **Select all header**: A checkbox in the table header selects/deselects all visible items
- **Floating action bar**: When 1+ items are selected, a toolbar appears showing "N selected" with action dropdowns
- **Available bulk actions**: Assign, Label, Milestone, Mark as read, Close/Reopen
- **Undo support**: Bulk close can be reversed with bulk reopen
- **Keyboard support**: `x` toggles the current item's checkbox

### Why It Works
- **Efficiency at scale**: Processing 10 identical calls individually takes 10x the clicks; batch reduces to N+2
- **End-of-day cleanup**: Coordinators can select all completed calls and mark them in one action
- **Consistent with expectations**: Every spreadsheet, email client, and file manager uses this pattern
- **Progressive disclosure**: Batch toolbar only appears when relevant (items selected)

### Application to Calls Inbox
- Select multiple reviewed calls and batch "Complete Review"
- Select unlinked calls from the same caller and batch "Link to Package"
- Select flagged calls and batch "Assign to Team Lead"

### Sources
- [Managing notifications from your inbox -- GitHub Docs](https://docs.github.com/en/subscriptions-and-notifications/how-tos/viewing-and-triaging-notifications/managing-notifications-from-your-inbox)
- [Inbox filters -- GitHub Docs](https://docs.github.com/en/subscriptions-and-notifications/reference/inbox-filters)

---

## Pattern 5: Status Labels and Badges (Primer Design System)

### What It Is
GitHub's Primer design system uses colour-coded "State Labels" to instantly communicate item status. The visual language is consistent across the entire platform: colour + icon + text work together to convey state in milliseconds.

### How GitHub Implements It
- **Draft**: Gray badge with a dashed circle icon -- work in progress
- **Open**: Green badge with an open circle-dot icon -- active, needs action
- **Closed**: Purple badge with a checkmark icon -- resolved
- **Merged**: Purple badge with a merge icon -- successfully incorporated
- **Dual encoding**: Every badge uses both colour AND icon shape for accessibility (colourblind users)
- **Consistent vocabulary**: Green always means "active/open", purple always means "done"
- **Inline placement**: Badges appear directly in list rows, in headers, and in cross-reference previews

### Why It Works
- **Pre-attentive processing**: Colour is processed before conscious reading -- coordinators spot orange "Unlinked" badges instantly
- **Scannable lists**: Users can visually scan a list of 50+ items and identify the 3 that need attention
- **Consistent vocabulary**: Same colours mean the same thing everywhere in the app
- **Accessible**: Dual encoding (colour + icon) serves colourblind users

### Application to Calls Inbox
| Badge | Colour | Icon | Meaning |
|---|---|---|---|
| Unlinked | Orange (#E0763C) | Open circle | No package linked -- needs immediate attention |
| Ready for Review | Teal (#43C0BE) | Circle-dot | Linked, transcript ready, awaiting review |
| Completed | Green (#4DC375) | Checkmark | Review done, activity logged |
| Flagged | Red (#E04B51) | Flag | Needs follow-up or escalation |

### Sources
- [State label -- Primer Design System](https://primer.style/design/components/state-label/)
- [Label -- Primer Components](https://primer.style/components/label/)
- [Smart Interface Design Patterns -- Badges vs Tags](https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/)

---

## Summary: Pattern-to-Feature Mapping

| GitHub Pattern | TC Portal Application | Primary User Benefit |
|---|---|---|
| Three-State PR Review | Complete / Note / Flag actions | Clear decision workflow with audit trail |
| Status Tabs with Counts | Unlinked / Review / Completed tabs | Instant workload visibility |
| Timeline Activity Feed | Call event history | Compliance-ready audit trail |
| Batch Checkbox Selection | Multi-call review and linking | Efficient high-volume processing |
| Primer Status Badges | Call state labels | Millisecond status recognition |

---

## References

- [GitHub Primer Design System](https://primer.style/)
- [GitHub Documentation](https://docs.github.com/)
- [Filtering and Searching Issues -- GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/filtering-and-searching-issues-and-pull-requests)
- [Managing Notifications -- GitHub Docs](https://docs.github.com/en/subscriptions-and-notifications/how-tos/viewing-and-triaging-notifications/managing-notifications-from-your-inbox)
- [The GitHub PR Review Workflow -- Graphite](https://graphite.com/guides/github-pull-request-review-workflow)
- [State Label -- Primer](https://primer.style/design/components/state-label/)
