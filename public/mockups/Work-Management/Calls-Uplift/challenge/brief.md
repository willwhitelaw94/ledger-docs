# Design Challenge Brief: Calls Inbox & Review

## Challenge Overview

Design the **Calls Inbox** and **Call Review** experience for TC Portal care coordinators. Apply Jakob's Law - use familiar patterns from products users already know.

## Feature Summary

Care coordinators make hundreds of calls daily. After each call ends, a transcription arrives. Coordinators need to:
1. See their pending calls in an inbox
2. Review each call (read transcription, optionally play audio)
3. Link unmatched calls to packages
4. Add notes
5. Complete the review (logs activity for billing)

## User Stories to Address

### US3 - Complete Call Reviews from Inbox (P1 - Phase 1)
- Calls appear with transcription, duration, caller info, linked package
- Click "Complete Call Review" to log as care management activity
- Review one-by-one or batch review multiple
- If not linked, prompt to link or mark "Non-package call"

### US2 - Manually Link Unmatched Calls (P1 - Phase 1)
- Search by recipient name, package number, or TC customer number
- Select package from results → call linked → context shows
- Future calls from that number suggested to match

## Key Interactions to Design

1. **Inbox List** - View all pending calls, filter by status
2. **Call Selection** - Select a call to review
3. **Transcription View** - Read/scan the transcription
4. **Audio Playback** - Play/pause recording
5. **Package Search** - Find and link to package
6. **Note Entry** - Add quick note
7. **Complete Action** - Mark reviewed, log activity
8. **Batch Actions** - Review multiple at once

## Constraints

- Desktop-first (coordinators use desktop Portal)
- Must work with existing components: CommonTable, CommonCard, CommonModal, CommonSplitPanel
- Must handle: unlinked calls, multi-match (shared phone numbers), batch review
- Target: Complete a review in under 30 seconds

## Evaluation Criteria

1. **Familiarity** - How recognizable are the patterns?
2. **Speed** - How fast can a coordinator complete reviews?
3. **Clarity** - Is the status/action obvious at each step?
4. **Scalability** - Does it work for 5 calls or 50 calls?

## Students

| Student | Theme | Focus |
|---------|-------|-------|
| 1 | **Linear** | Clean minimal UI, command palette, keyboard shortcuts |
| 2 | **Notion** | Database views, inline editing, flexible layouts |
| 3 | **GitHub** | Review workflow, timeline, status badges, batch actions |
| 4 | **Superhuman** | Speed-first, triage workflow, keyboard navigation |

## Deliverables Per Student

1. `research.md` - 3-5 patterns researched with sources
2. `mockups.txt` - ASCII wireframes (2-3 variations)
3. `rationale.md` - Why these patterns work for TC Portal
