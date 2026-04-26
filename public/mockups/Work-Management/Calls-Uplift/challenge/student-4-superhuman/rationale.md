---
title: "Design Rationale - Superhuman Patterns for Calls Inbox"
description: "Why Superhuman's keyboard-first, speed-obsessed email patterns are the right model for a 30-second call review workflow"
---

# Design Rationale: Superhuman Patterns for Calls Inbox

## Design Student 4 -- Pattern Application Analysis

---

## The Core Analogy: Email Triage = Call Triage

Care coordinators reviewing calls face the same fundamental challenge that Superhuman solved for email: **a queue of items that must be processed quickly, accurately, and completely, dozens of times per day.**

The structural parallels are precise:

| Email Triage (Superhuman) | Call Review (TC Portal) |
|---------------------------|------------------------|
| Read the email body | Read the transcript / listen to audio |
| Decide: reply, archive, snooze, delegate | Decide: complete, link, note, flag |
| Batch emails by category (VIP, Other, News) | Batch calls by type (Unlinked, Routine, Done) |
| Keyboard shortcuts eliminate mouse travel | Keyboard shortcuts eliminate mouse travel |
| Snippets speed up repetitive replies | Snippets speed up repetitive note entry |
| Progress toward Inbox Zero motivates throughput | Progress toward "Calls Zero" motivates throughput |
| Full-screen focus removes distraction during reading | Full-screen focus removes distraction during review |

The analogy is not superficial -- it is structural. Both workflows are **sequential triage of queued items with repetitive actions**. Superhuman has spent years optimising this exact interaction pattern. We can inherit their solutions directly.

---

## Pattern-by-Pattern Rationale

### 1. J/K Keyboard Navigation -- Why It Fits Coordinators

**The workflow match:**
Coordinators review calls sequentially. They do not randomly access calls or work on multiple calls simultaneously. This linear pattern is identical to email scanning -- you start at the top, work down, and act on each item in turn.

J/K navigation is the optimal interface for sequential processing because:

- **Hands never leave the home row.** Coordinators are already typing notes. Moving to the mouse and back costs 500-800ms per transition, and it breaks the typist's flow state. J/K keeps them in position.
- **Auto-advance eliminates dead time.** After pressing E to complete a review, the next call loads instantly. There is no "return to list, scan for next item, click to open" cycle. This alone saves 3-5 seconds per call.
- **No targeting required.** Mouse-based interfaces require users to aim at specific UI targets (buttons, list items). Fitts's Law tells us that smaller and more distant targets take longer to click. A keystroke has zero targeting cost.

**The learning curve concern:**
The most common objection to keyboard-first interfaces is learnability. Superhuman addresses this with a persistent shortcut hint bar at the bottom of the screen that contextually updates. We replicate this pattern: a fixed bar showing J/K/E/L/N/Space shortcuts that is always visible. Within 2-3 sessions, coordinators build muscle memory and the hints become confirmation rather than instruction.

**Speed impact:** Saves 5-10 seconds per call in navigation and action execution.

---

### 2. Split Inbox Categories -- Why Batching Matters for Calls

**The cognitive science:**
Task switching has a measurable cost. Research from the American Psychological Association shows that switching between task types incurs a 15-25% time overhead per switch. When a coordinator processes an unlinked call (which requires package search and matching), then a routine call (which requires only review), then another unlinked call, they switch cognitive modes three times. Grouping by type eliminates this.

**The calls-specific split:**

| Category | Cognitive Load | Action Required | Why It Is Separate |
|----------|---------------|----------------|-------------------|
| **Unlinked** (orange badge) | High -- requires search and matching | Find package, link, review, complete | Different workflow from routine calls. Cannot bill without linking. Highest urgency. |
| **Routine** (teal badge) | Low -- just review | Skim transcript, add note, complete | Simple confirmation workflow. Can be processed very quickly. |
| **Done** (green badge) | Reference only | None -- already completed | Available for audit, supervisor review, or re-checking. Archived feel. |

Coordinators process Unlinked first because these are the highest-friction, highest-value items (calls that cannot be billed until linked). Once the hard work is done, they sweep through Routine calls at high speed. This matches Superhuman's recommendation to handle "Important" before "Other."

**The number key access (1/2/3):**
Superhuman lets users switch categories with number keys. This means a coordinator can process all unlinked calls, press 2 to switch to Routine, and process those in a separate pass. No mouse, no tab clicking.

**Speed impact:** Saves 10-15 seconds per session from reduced context switching.

---

### 3. Snippets -- Why Pre-Built Notes Transform Speed

**The repetition reality:**
Call notes in care coordination are highly formulaic. An analysis of call notes would likely reveal that 60-70% fall into a handful of templates:

- "Routine check-in call. No concerns raised."
- "Follow-up required regarding [X]."
- "Medication query. Confirmed schedule."
- "Escalated to supervisor."

Typing these notes manually takes 15-20 seconds. With a snippet triggered by `;routine`, the entire note expands in under 1 second. The coordinator then tabs through placeholder variables ([topic], [date]) to customise.

**Why semicolon trigger works:**
The semicolon is not commonly typed in natural prose, making it an ideal trigger character. The moment the coordinator types `;`, an autocomplete popup appears showing available snippets with preview text. This is visually identical to code editor autocomplete -- a pattern that feels instant and discoverable.

**Designed snippets for TC Portal:**

| Trigger | Full Expansion | Coordinator Action |
|---------|---------------|-------------------|
| `;routine` | "Routine check-in call. Discussed [topic]. No concerns raised. Next review [date]." | Tab to [topic], type "wellbeing", tab to [date], type "14/02" |
| `;followup` | "Follow-up required: [reason]. Action: [action]. Due: [date]." | Fill three variables |
| `;medication` | "Medication query regarding [medication]. Confirmed delivery schedule. Next delivery: [date]." | Fill two variables |
| `;escalate` | "Escalated to clinical supervisor. Concern: [reason]. Priority: [high/medium]." | Fill two variables |
| `;noaction` | "Informational call only. No clinical action required." | No variables -- instant |

**Compliance benefit:**
Snippets enforce consistent clinical language. Instead of coordinators writing freeform notes with varying levels of detail, snippets ensure every note meets documentation standards. This is a significant risk-reduction benefit beyond speed.

**Speed impact:** Saves 10-15 seconds per call with notes (the largest single time saving).

---

### 4. Progress Indicators -- Why "7 of 12" Drives Throughput

**The psychological mechanism:**
The Zeigarnik Effect tells us that incomplete tasks create cognitive tension. Showing "7 of 12 reviewed" makes the remaining 5 calls feel like an open loop that the brain wants to close. Combined with a visual progress bar filling with teal, this creates natural momentum.

**Superhuman's approach vs. gamification traps:**
Superhuman does not use points, badges, or leaderboards. These extrinsic motivators often backfire in professional contexts -- they feel patronising or create anxiety. Instead, Superhuman uses:

- A simple count ("7 of 12") that respects the user's intelligence
- A visual bar that fills, providing ambient progress awareness
- A celebration moment at zero (a beautiful image and timestamp) that feels earned, not manufactured

We replicate this exactly for the Calls Inbox:

- **Top bar:** "Today's Calls: 7 of 12 reviewed" with a teal-700 progress bar
- **Completion state:** When all calls are reviewed, a clean "All calls reviewed" message
- **No gamification gimmicks:** No streaks, no points, no rankings. Just honest progress.

**Speed impact:** Psychological -- maintains flow state, prevents mid-session fatigue slowdown, and creates a natural end-of-task satisfaction that resets energy for the next batch.

---

### 5. Full-Screen Focus Mode -- Why Less Chrome Means Faster Review

**The distraction cost:**
Every visible UI element that is not relevant to the current task is a potential distraction. Sidebars, navigation menus, notification badges, and unrelated counts all compete for visual attention. In a split-pane view, the call list on the left is useful for orientation but becomes noise during the actual review of a specific call.

**The focus mode solution:**
Variation B removes everything except:
- The current call's information (caller, duration, direction)
- The audio player
- The transcript
- The note field
- Three action buttons (Skip, Flag, Complete)

No sidebar. No call list. No navigation menu. Just the task at hand.

**When to use which variation:**
- **Split View (Variation A):** Best for new coordinators or when calls are complex and require frequent reference to the list. Provides orientation and context.
- **Focus Mode (Variation B):** Best for experienced coordinators during high-volume periods. Maximum speed for routine reviews.

Superhuman itself offers both modes -- a split pane for scanning and a full-screen mode for reading. The user toggles between them based on their current need. We mirror this with a keyboard shortcut to switch modes.

**Speed impact:** Removes cognitive distraction, improves transcript reading speed by 10-15% (estimated from distraction research).

---

## How These Patterns Achieve 30-Second Reviews

### Time Budget: Simple Routine Call

| Step | Without Patterns | With Patterns | Saving |
|------|-----------------|---------------|--------|
| Navigate to call | 3-5 sec (mouse click) | 0.5 sec (J key) | 3-4 sec |
| Open call detail | 2-3 sec (click to open) | 0 sec (inline/auto) | 2-3 sec |
| Skim transcript | 10-15 sec | 10-15 sec (unchanged) | 0 sec |
| Add note | 15-20 sec (typing) | 2-3 sec (`;routine`) | 13-17 sec |
| Complete review | 2-3 sec (find button, click) | 0.5 sec (E key) | 2 sec |
| **Total** | **32-46 sec** | **13-19 sec** | **19-27 sec** |

### Time Budget: Unlinked Call Requiring Package Match

| Step | Without Patterns | With Patterns | Saving |
|------|-----------------|---------------|--------|
| Navigate to call | 3-5 sec | 0.5 sec (J key) | 3-4 sec |
| Open call detail | 2-3 sec | 0 sec | 2-3 sec |
| Skim transcript | 10-15 sec | 10-15 sec | 0 sec |
| Search and link package | 15-30 sec (navigate to search, type, scan results, click) | 3-5 sec (L, type name, Enter) | 12-25 sec |
| Add note | 15-20 sec | 2-3 sec (`;routine`) | 13-17 sec |
| Complete review | 2-3 sec | 0.5 sec (E key) | 2 sec |
| **Total** | **47-76 sec** | **16-24 sec** | **31-52 sec** |

Both scenarios land well under 30 seconds for the non-transcript portion of the review. The transcript reading/audio listening time is irreducible, but for short routine calls (which are the majority), coordinators can skim in 10-15 seconds and achieve total review times of 13-24 seconds.

---

## Trade-offs Acknowledged

### What We Optimise For
1. **Speed** -- Primary design goal
2. **Accuracy** -- Snippets and structured workflows prevent errors
3. **Learnability** -- Persistent hints and mouse fallbacks reduce the learning curve

### What We Accept as Trade-offs

| Trade-off | Mitigation |
|-----------|------------|
| Keyboard shortcuts have a learning curve | Persistent hint bar, contextual tooltips, full mouse fallback |
| Split inbox adds navigational complexity | Clear count badges, number key switching, familiar tab pattern |
| Snippets risk "template fatigue" (notes feeling impersonal) | Variable placeholders require human input, custom snippets allowed |
| Focus mode loses list context | One-key toggle back to split view, progress indicator shows position |
| Audio review time is irreducible | Speed controls (1.5x, 2x playback), AI-generated transcript summary |

---

## Variation Recommendations

### Variation A: Split View with Keyboard Nav
**Target user:** All coordinators, especially those new to the system
**Strengths:** Familiar split-pane layout provides orientation; call list visible for context; category tabs visible for batch awareness
**Use when:** Processing a mixed queue, onboarding, or when calls require referencing the list

### Variation B: Full-Screen Focus Mode
**Target user:** Experienced coordinators in high-volume review sessions
**Strengths:** Maximum speed; zero distraction; auto-advance creates conveyor-belt flow
**Use when:** Processing routine calls quickly, end-of-day catch-up, batch review sessions

### Recommendation
Ship Variation A as the default experience. Provide a keyboard shortcut (Tab or F) to toggle into Variation B focus mode. This mirrors Superhuman's own approach: a sensible default with power features accessible to those who seek speed.

---

## Success Metrics

| Metric | Target | How We Measure |
|--------|--------|---------------|
| Average review time (routine call) | Under 30 seconds | Timer from call open to complete action |
| Average review time (unlinked call) | Under 45 seconds | Timer from call open to complete action |
| Keyboard shortcut adoption rate | Over 50% of all actions within 2 weeks | Analytics: keystroke vs click ratio |
| Daily "Calls Zero" achievement rate | Over 80% of coordinators | Count of coordinators clearing their queue daily |
| Snippet usage rate | Over 60% of notes use snippets | Analytics: snippet trigger events vs manual note entries |
| Wrong package link error rate | Under 1% | Audit trail review of link corrections |
| Coordinator satisfaction score | Over 4 out of 5 | Post-implementation survey |
