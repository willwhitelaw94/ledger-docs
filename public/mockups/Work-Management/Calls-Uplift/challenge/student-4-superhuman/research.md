---
title: "Superhuman UX Pattern Research"
description: "Design Student 4 - Research into Superhuman's keyboard-first, speed-obsessed email patterns applied to a Calls Inbox for care coordinators"
---

# Superhuman UX Pattern Research

## Design Student 4 -- Calls Inbox & Call Review

### Executive Summary

Superhuman bills itself as "the fastest email experience ever made." Every pixel, interaction, and animation is engineered around a single metric: **time-to-done**. Their 100ms rule -- every interaction must complete within 100 milliseconds -- has produced a keyboard-first, distraction-free, progress-driven product that consistently helps users reach Inbox Zero.

This research documents five specific Superhuman patterns and explains precisely how each mechanic works, why it creates speed, and what we can extract for a Calls Inbox where care coordinators must review transcribed calls in under 30 seconds each.

---

## Pattern 1: Keyboard-First Triage with J/K Navigation

### How It Works in Superhuman

Superhuman inherits Vim's modal navigation philosophy. The entire application can be operated without a mouse:

- **J** moves the selection cursor down to the next conversation
- **K** moves the selection cursor up to the previous conversation
- **Enter** opens the selected conversation into a focused reading view
- **E** archives the current conversation and auto-advances to the next one
- **R** replies, **F** forwards, **#** deletes

The critical detail is **auto-advance after action**: when you press E to archive, Superhuman immediately moves to the next unread message. There is no "return to list, find next, open it" cycle. The J/K model creates a conveyor belt where the user processes items sequentially without ever needing to re-orient.

Superhuman displays a persistent shortcut hint bar at the bottom of the screen. This bar updates contextually -- when viewing a list it shows navigation shortcuts; when composing it shows formatting shortcuts. This "always teaching" approach accelerates the learning curve so that within a week, most users stop reaching for the mouse entirely.

### Speed Mechanics

| Action | Mouse workflow | Keyboard workflow |
|--------|---------------|-------------------|
| Move to next item | Move mouse, aim, click (~500ms) | Press J (~80ms) |
| Archive and advance | Click archive, move to next, click (~1200ms) | Press E (~80ms, auto-advances) |
| Open item | Double-click or aim + click (~400ms) | Press Enter (~80ms) |

The compounding effect is dramatic: across 50 emails, keyboard navigation saves roughly 30-60 seconds of pure mouse-targeting time. For coordinators processing 20-30 calls per day, J/K navigation eliminates approximately 10-15 minutes of daily friction.

### Sources

- [Speed Up With Shortcuts -- Superhuman Help Center](https://help.superhuman.com/hc/en-us/articles/45191759067411-Speed-Up-With-Shortcuts)
- [Superhuman Keyboard Shortcuts PDF](https://download.superhuman.com/Superhuman%20Keyboard%20Shortcuts.pdf)

---

## Pattern 2: Split Inbox with Category Streams

### How It Works in Superhuman

Split Inbox divides a single overwhelming inbox into distinct category streams. Superhuman auto-classifies incoming mail into:

1. **Important** -- Messages from known contacts, direct replies
2. **Other** -- Newsletters, notifications, automated mail
3. **VIP** -- A user-curated set of priority senders
4. **News & Updates** -- Promotional and informational content

Users switch between streams using number keys (**1** through **5**). Each stream has its own unread count badge. When a user clears a stream, they see a celebration image and "You're all caught up" message before moving to the next stream.

The key insight is **batch processing by type**. Processing all VIP emails in sequence is faster than interleaving VIP with newsletters, because the cognitive context stays consistent. Research in cognitive psychology calls this "task batching" -- switching between task types incurs a 15-25% overhead per switch.

### Visual Design Details

- Each category tab sits in a horizontal row at the top of the inbox list
- The active tab has a bold underline in blue
- Unread counts appear as small pill badges next to tab labels
- Tabs are accessible via number keys (shown as small key hints)
- When a stream reaches zero, a full-screen illustration celebrates the milestone

### Application to Calls Inbox

Split calls into three streams:

| Stream | Key | Description | Badge Colour |
|--------|-----|-------------|-------------|
| **Unlinked** | 1 | Calls with no package match -- requires manual linking | Orange (#E0763C) |
| **Routine** | 2 | Auto-matched calls needing review only | Teal (#007F7E) |
| **Done** | 3 | Completed reviews for reference | Green (#4DC375) |

Coordinators process Unlinked first (highest friction, highest value), then sweep through Routine calls. This ordering matches Superhuman's recommendation to handle Important first, then Other.

### Sources

- [Split Inbox: How to speed up your email with Superhuman triage](https://blog.superhuman.com/how-to-split-your-inbox-in-superhuman/)
- [What is email triage and what does it do?](https://blog.superhuman.com/email-triage/)

---

## Pattern 3: Snippets for Instant Text Expansion

### How It Works in Superhuman

Snippets are pre-built text templates triggered by typing a shortcut. In Superhuman, typing `;` followed by a keyword (e.g., `;thanks`) instantly expands into a full paragraph of text. Key features:

- **Trigger character**: The semicolon `;` activates snippet mode
- **Autocomplete popup**: As you type after `;`, a floating menu shows matching snippets with preview text
- **Variables**: Snippets support dynamic placeholders like `{first_name}`, `{company}`, `{date}` that auto-fill from context
- **Team Snippets**: Shared across the organisation, ensuring consistent messaging
- **Instant expansion**: No confirmation step -- the snippet replaces the trigger text immediately

Superhuman reports that snippets save their users an average of 12 hours per month by eliminating repetitive typing. For sales teams, common snippets include meeting requests, follow-up templates, and introduction scripts.

### Visual Design Details

- The snippet autocomplete popup appears directly below the cursor position
- Each snippet row shows: shortcut name (bold), preview text (truncated, grey)
- The popup has a subtle shadow and rounded corners
- Arrow keys navigate between snippet options
- Enter selects and expands the snippet
- The popup disappears when pressing Escape or clicking outside

### Application to Calls Inbox

Care coordinator call notes are highly repetitive. A snippet library would include:

| Trigger | Expansion | Usage Frequency |
|---------|-----------|-----------------|
| `;routine` | "Routine check-in call. Discussed [topic]. No concerns raised. Next review [date]." | ~60% of calls |
| `;followup` | "Follow-up required: [reason]. Action: [action]. Due: [date]." | ~15% of calls |
| `;medication` | "Medication query regarding [medication]. Confirmed delivery schedule. Next delivery: [date]." | ~10% of calls |
| `;escalate` | "Escalated to clinical supervisor. Concern: [reason]. Priority: [high/medium]." | ~5% of calls |
| `;noaction` | "Informational call only. No clinical action required." | ~10% of calls |

With snippets, note entry drops from 15-20 seconds of typing to 2-3 seconds of trigger + tab through variables.

### Sources

- [Snippets -- Superhuman Help Center](https://help.superhuman.com/hc/en-us/articles/38450007523475-Snippets)
- [Master Email Efficiency with Superhuman Snippets](https://blog.superhuman.com/snippets/)
- [12 Superhuman email snippets for sales teams](https://blog.superhuman.com/12-superhuman-email-snippets-for-sales-teams/)

---

## Pattern 4: Progress Indicators and Inbox Zero Gamification

### How It Works in Superhuman

Superhuman treats Inbox Zero as an achievement worth celebrating. The product includes:

1. **Unread count in tab title** -- Constant ambient awareness of remaining items
2. **Progress bar** -- Visual representation of how close you are to clearing the inbox
3. **Completion celebration** -- When inbox reaches zero, a full-screen illustration appears with an inspirational message and the time it was achieved
4. **Streak tracking** -- Consecutive days of reaching Inbox Zero are tracked and displayed
5. **Time statistics** -- "You processed 47 emails in 23 minutes" feedback after sessions

The gamification is deliberate but tasteful. There are no points, leaderboards, or badges -- just a beautiful moment of completion that provides intrinsic satisfaction. The streak tracker adds a gentle accountability loop without creating anxiety.

### Psychological Mechanics

- **Progress effect**: Showing "7 of 12" creates momentum. Research shows that visible progress increases task completion rates by 20-30%
- **Endowed progress**: The progress bar starts partially filled (you've already done some today), making the remaining work feel achievable
- **Variable reward**: Different celebration images keep the Inbox Zero moment fresh
- **Loss aversion**: Breaking a streak feels worse than the effort of maintaining it

### Application to Calls Inbox

- Top-of-screen progress bar: "Today's Calls: 7 of 12 reviewed" with teal fill
- Percentage complete shown alongside the bar
- When all calls reviewed: celebration state with "All calls reviewed" message
- Daily streak: "5-day review streak" badge
- Session stats: "12 calls reviewed in 8 minutes (avg 40s per call)"

### Sources

- [Achieve Inbox Zero -- Superhuman](https://help.superhuman.com/hc/en-us/articles/45295217605523-Achieve-Inbox-Zero)
- [Why Superhuman Mail is built for speed: applying the 100ms rule](https://blog.superhuman.com/superhuman-is-built-for-speed/)

---

## Pattern 5: Full-Screen Focus Mode with Minimal Chrome

### How It Works in Superhuman

When reading an email in Superhuman, the interface strips away everything except the content. There is:

- **No sidebar** -- The folder/label panel disappears
- **No toolbar clutter** -- Only contextual action buttons remain
- **Full-width content** -- The message occupies the maximum available space
- **Contextual shortcuts** -- Action shortcuts appear only when relevant
- **Smooth transitions** -- Opening an email slides in from the right with a 200ms ease-out animation, creating a sense of spatial movement

The focus mode creates what psychologists call a "flow channel" -- by removing distractions and presenting only the task at hand, users enter a focused state more quickly. Superhuman also uses **auto-advance**: after archiving or acting on an email, the next email immediately slides into view without returning to the inbox list.

### Visual Design Details

- Background: Clean white (or dark mode equivalent)
- Typography: Large, readable body text with generous line height
- Sender info: Compact header with avatar, name, and timestamp
- Actions: Floating action buttons at the bottom or contextual toolbar at the top
- Navigation: Left/right arrows or J/K to move between messages while staying in focus mode
- Progress: A thin bar at the very top showing position in the queue (e.g., "3 of 17")

### Application to Calls Inbox

A focus mode for call review would:

- Remove the call list entirely -- show only the current call
- Display caller info, audio player, and transcript at full width
- Show position indicator: "Call 7 of 12" with arrow navigation
- Auto-advance after completing a review (E key) with a slide animation
- Include only three actions: Skip, Flag, Complete Review
- Show keyboard shortcut ghosts on each button (S, F, E)

### Sources

- [Superhuman Design Philosophy](https://blog.superhuman.com/superhuman-is-built-for-speed/)
- [Getting Started with Superhuman Mail](https://blog.superhuman.com/inbox-zero-in-7-steps/)
- [High Volume Email Management](https://blog.superhuman.com/high-volume-email-management/)

---

## Speed Metrics from Superhuman

| Metric | Value | Source |
|--------|-------|--------|
| Time saved per week | 4+ hours | [High volume email management](https://blog.superhuman.com/high-volume-email-management/) |
| Response time improvement | 12 hours faster | [Snippets](https://blog.superhuman.com/snippets/) |
| Email processing speed | 2x faster than Gmail | [Superhuman Review](https://max-productive.ai/ai-tools/superhuman/) |
| Interaction latency target | Less than 100ms | [Built for speed](https://blog.superhuman.com/superhuman-is-built-for-speed/) |
| Monthly snippet time savings | 12 hours | [Snippets blog](https://blog.superhuman.com/snippets/) |

---

## Key Design Principles Summary

1. **Keyboard-first** -- The mouse is a fallback, never the primary input
2. **100ms rule** -- Every interaction must feel instantaneous
3. **Batch processing** -- Group similar items to reduce context-switching overhead
4. **Decision frameworks** -- Limit actions to reduce decision paralysis (archive, reply, snooze, or trash)
5. **Progress visibility** -- Show remaining work and celebrate completion
6. **Minimal chrome** -- Remove everything that does not serve the current task
7. **Always teaching** -- Show shortcut hints contextually to accelerate learning
8. **Auto-advance** -- After acting on an item, immediately present the next one

---

## Priority Ranking for Calls Inbox

| Priority | Pattern | Estimated Impact on 30-Second Target |
|----------|---------|--------------------------------------|
| 1 | Keyboard Navigation (J/K + auto-advance) | Eliminates mouse travel -- saves 5-10 sec per call |
| 2 | Snippets (`;routine`, `;followup`) | Eliminates repetitive typing -- saves 10-15 sec per call |
| 3 | Split Inbox (Unlinked / Routine / Done) | Batch processing -- reduces context switch overhead |
| 4 | Full-Screen Focus Mode | Removes distractions -- improves comprehension speed |
| 5 | Progress Indicators (bar + streak) | Motivation and pacing -- sustains throughput across sessions |
