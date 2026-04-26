---
title: "Design Brief: Gamification — Streaks, Challenges & Rewards"
status: Draft
created: 2026-03-19
---

# Design Brief: Gamification — Streaks, Challenges & Rewards

**Epic:** 036-GMF
**Spec:** [spec.md](/initiatives/FL-financial-ledger/036-GMF-gamification/spec.md)
**Business Case:** [business.md](/initiatives/FL-financial-ledger/036-GMF-gamification/business.md)

---

## User Context

| Aspect | Answer | Impact on Design |
|--------|--------|------------------|
| Primary User | Sole trader / business owner | Needs motivation, not management tools. Language is personal ("your streak"), not corporate ("compliance rate") |
| Secondary User | Bookkeeper (power user) | "All Clear" is their dopamine hit. Progress rings fill faster for daily users. Design for satisfaction at scale |
| Tertiary User | Practice manager | Sees workspace flames on practice dashboard. Operational framing, not celebratory |
| Device Priority | Desktop-first, mobile-aware | Work happens on desktop. Streak checking, nudge responses must work on mobile. Progress rings must look good at phone-screen sizes |
| Usage Frequency | Weekly (sole traders), daily (bookkeepers) | Weekly users need the nudge at 75% period. Daily users need "Perfect Day" to feel achievable |
| Context | Procrastinating, needs motivation, time-pressured | Gamification must feel rewarding, not like homework. Low-friction completion (any activity counts). Quick visual scan (rings, flames) over text-heavy dashboards |

---

## Design Principles

**North Star:** "Discipline feels good"

The emotional reward of consistency, not competition. Streaks feel like a personal win, not a corporate KPI. The difference between "you must reconcile" and "you've reconciled 12 weeks straight — that's impressive."

**Supporting Principles:**

1. **Ambient, not intrusive** — gamification surfaces passively (rings, flames, sidebar badges). Users encounter it in their natural workflow, not on a dedicated "gamification page" they have to remember to visit.
2. **Celebrate, don't punish** — a broken streak gets a recovery option, not a shame message. At-risk states use gentle framing ("2 days left") not urgent framing ("STREAK EXPIRING").
3. **Honest value** — Money/Time Saved counter shows real formulas. No inflated numbers. Trust is earned through transparency.
4. **Professional, not playful** — progress rings (Apple Watch), not XP bars (RPG). Health glow, not leaderboard rankings. This is a professional accounting tool with satisfying mechanics, not a game with accounting bolted on.

---

## Build Size

**Size:** Medium-Large

**Rationale:**
- 4-5 new screens/views (dashboard widget, challenges page, badges view, "All Clear" overlay, Money/Time Saved detail)
- 3 new components with significant visual polish (progress rings, streak flame, celebration animation)
- Heavy integration work (achievement event bus connecting to notifications, intray, goals, anomaly detection)
- Ambient UI changes across 10+ existing pages (flame icons on nav items, sidebar badges, `/home` aggregation)

---

## Scope

### Phase 1: Minimum Lovable Gamification (~3 weeks)

| Feature | New Screens | New Components |
|---------|-------------|----------------|
| Progress rings dashboard widget | Dashboard widget (embedded) | `ProgressRings` — 3 concentric animated rings |
| Automatic streak tracking | None (backend + existing dashboard) | `StreakCounter` — compact streak display with flame icon |
| Badge system + milestones | Badges section on profile/streaks page | `BadgeCard` — earned badge with tier, date, animation |
| "All Clear" celebration | Full-screen overlay | `AllClearCelebration` — dismissible overlay with animation and session stats |
| Ambient UI hints | None (modifications to existing) | Flame icons on sidebar nav, streak count badges |

**Reusing Existing:**
- Dashboard layout and widget grid
- Sidebar navigation structure (adding badges/icons)
- Notification system (024-NTF) for at-risk alerts
- Intray (018-ITR) for streak-at-risk items
- Toast notification component for milestone celebrations

### Phase 2: Personalisation + Value

| Feature | New Screens | New Components |
|---------|-------------|----------------|
| Custom challenges | `/challenges` page with create modal | `ChallengeCard`, `CreateChallengeModal` |
| Practice-suggested templates | Section on challenges page | `SuggestedChallenge` — "Suggested by [Practice]" card |
| Money/Time Saved counter | Dashboard widget + drill-down panel | `ValueCounter`, `ValueBreakdownPanel` |
| Workspace health indicator | Dashboard widget (owner), practice dashboard (manager) | `HealthGlow` (owner), `WorkspaceFlame` (practice) |

### Phase 3: Team & Polish

| Feature | New Screens | New Components |
|---------|-------------|----------------|
| Streak recovery | Modal triggered on streak break | `StreakRecoveryModal` |
| Practice leaderboard | Section on practice dashboard | `WorkspaceStreakBoard` |

### Deferred (not in any phase)

- Accounting quizzes (content problem, marginal uplift)
- RPG elements (levels, XP — too playful for professional tool)
- Social sharing of badges (revisit based on user demand)
- Gamified onboarding quest (separate epic)

---

## Constraints

### Accessibility

- **WCAG Target:** Level AA
- **Keyboard navigation:** Full integration with existing shortcut system
  - Celebrations MUST be Escape-dismissible and not trap focus
  - Challenges page uses J/K navigation pattern (consistent with other list pages)
  - New keyboard chord for streaks/challenges page (e.g., `G then K` — "G then Streaks" conflicts with `G then S` for Settings)
  - Progress rings must have aria-labels announcing current streak status
- **Screen reader:** Milestone achievements announced via aria-live region. "All Clear" celebration announced then auto-dismissed after 5 seconds (or Escape).
- **Reduced motion:** Respect `prefers-reduced-motion` — skip ring animations and celebration particles, show static completion states instead.

### Security & Privacy

- Streak data is workspace-scoped (no cross-tenant leakage)
- User streaks visible only to the user and practice managers connected to the workspace
- Practice-suggested challenge adoption is private — practices see aggregate adoption rates, not individual opt-in/decline decisions
- Money/Time Saved calculations use workspace data only — no cross-workspace aggregation visible to practice managers

### Dependencies

**Depends on:**
- 024-NTF (Notifications) — for streak-at-risk nudges
- 018-ITR (Intray) — for streak-at-risk items in attention queue

**Integrates with (but does not block on):**
- 037-GLS (Goals) — goal milestones feed into achievement event bus
- 040-AND (Anomaly Detection) — duplicate payments caught feeds Money Saved counter
- 027-PMV (Practice Management V2) — practice-suggested templates, workspace flame on practice dashboard

**Feature flags:**
- `gamification` — master toggle, gates all gamification UI. ON by default for all tiers.
- Individual mechanics don't need separate flags — the opt-out toggle (FR-024) handles user preference.

---

## Edge Cases

| Edge Case | How to Handle | Priority |
|-----------|---------------|----------|
| New workspace, no data | Hide progress rings. Show "Connect your bank to start tracking" prompt | P1 |
| No bank account connected | Hide reconciliation ring. Show only applicable rings (Invoice, Review) | P1 |
| User opts out of gamification | Hide all gamification UI. Store preference per user. Reversible in settings | P1 |
| "All Clear" with zero items (nothing to clear) | Don't show celebration. Only trigger when transitioning from >0 to 0 | P1 |
| Streak period boundary during session | Complete the action in the period it was started. Don't penalise if user starts at 23:55 and finishes at 00:05 | P2 |
| Multiple users completing same workspace task | First completion triggers workspace streak increment. Subsequent completions in same period are no-ops for workspace streak | P1 |
| Practice manager views workspace with gamification disabled | Show workspace health flame on practice dashboard regardless of user opt-out (it's operational, not motivational) | P2 |
| User with 50+ badges | Paginate or group badges by category. Don't render all inline | P3 |
| Celebration fires during form submission | Queue celebration, show after form completes. Never interrupt active work | P1 |
| Mobile viewport with progress rings | Rings stack vertically or show as a horizontal strip below dashboard header. Not hidden — mobile-aware | P2 |
| Dark mode progress rings | Rings use theme-aware colours from CSS variables. Bright fill on dark background | P1 |

---

## Visual References

| Mechanic | Reference | What to Take |
|----------|-----------|-------------|
| Progress Rings | Apple Watch Activity Rings | 3 concentric rings, smooth fill animation, colour-coded per habit |
| Streak Counter | Duolingo streak flame | Flame icon + number, "at risk" state, recovery prompt |
| "All Clear" Celebration | Linear empty states, Superhuman Inbox Zero | Full-screen moment, satisfying animation, session stats, quick dismiss |
| Workspace Health | Abstract "glow" or "pulse" | Owner: warm glow (bright = healthy). Practice manager: flame icon with severity states |
| Badges | GitHub achievements | Clean badge cards with tier, date earned, subtle icon |
| Money/Time Saved | Credit Karma value display | Single prominent number, drill-down on click, transparent formula |

---

## Analytics & Measurement

| Event | When | What to Track |
|-------|------|---------------|
| `streak.incremented` | User action satisfies a streak | streak_type, scope (user/workspace), new_count, is_perfect_period |
| `streak.broken` | Period ends without completion | streak_type, final_count, was_at_risk |
| `streak.recovered` | User uses recovery | streak_type, recovered_count |
| `challenge.created` | Custom challenge created | frequency, task_type |
| `challenge.suggested.activated` | Client opts into practice template | template_id, practice_id |
| `badge.earned` | Milestone hit | badge_type, source (streak/goal/all_clear), milestone_threshold |
| `all_clear.triggered` | Queue reaches zero | queue_type (reconciliation/intray/invoices), items_cleared_count |
| `celebration.dismissed` | User dismisses celebration | method (escape/click/auto), time_visible_ms |
| `gamification.opted_out` | User disables gamification | — |
| `value_counter.drilldown` | User clicks Money/Time Saved | — |

---

## Unified Design Direction

**Decided**: 2026-03-19 (from Design Challenge — 3 students: Ring Rachel, Feed Frankie, Ambient Alex)

### Foundation: Ring Rachel + Ambient Alex Badges

The ring is the universal symbol of MoneyQuest gamification. Every gamification surface uses circular progress as its primary visual metaphor.

### Pattern Decisions

| Element | Source | Pattern |
|---------|--------|---------|
| Dashboard widget | Ring Rachel | 3 concentric progress rings (Reconcile=teal, Invoice=amber, Review=violet) as hero visual. Stat rings for time/money saved below. |
| "All Clear" celebration | Ring Rachel | Ring animates from current progress to 100% with glow pulse + confetti rings. Deeply satisfying completion moment. |
| Practice dashboard | Ring Rachel | Health ring gauges per workspace — teal (90%+), amber (50-89%), gray (<50%). Scannable across 30+ workspaces. |
| `/home` aggregation | Ring Rachel | Aggregated rings across all user workspaces. The ring is the symbol everywhere. |
| Streak history | Ring Rachel | Row of 20 small circles — filled (completed), empty (missed), dashed (recovered). Compact, scannable. |
| Badges display | Ambient Alex | Badges in user profile dropdown (sidebar avatar click). Badge icons grid with hover tooltips showing name + date earned. Stats row: badge count, streak, hours saved. No dedicated badges page for MVP. |
| Ambient sidebar hints | Ambient Alex | Flame icons (🔥) next to nav items with active streaks. Badge count on user avatar. Pulsing amber dot on at-risk items. |
| Challenge management | Ambient Alex | Slide-out panel from right for MVP. Ring card grid deferred to Phase 2. |

### Rejected Patterns

| Pattern | Source | Why Rejected |
|---------|--------|-------------|
| Activity feed as primary surface | Feed Frankie | Less at-a-glance than rings. Good for `/home` aggregation but not workspace dashboard. |
| Full-screen ring celebration | Ring Rachel | Interrupts workflow. Using the ring-completion animation is enough without taking over the whole screen. |
| Chronological badge timeline | Feed Frankie | Less scannable than a grid. Icon grid in dropdown is more compact. |
| Multi-workspace activity feed | Feed Frankie | Too noisy for 30+ workspaces. Health ring gauges are more scannable. |
| Profile dropdown as only badge surface | Ambient Alex | Will need a full page eventually for 50+ badges, but dropdown works for MVP. |

### Design System Notes

- Rings use SVG `<circle>` with `stroke-dasharray` and `stroke-dashoffset` for progress
- Ring colors: Reconcile=teal (#007F7E), Invoice=amber (#D97706), Review=violet (#7C3AED)
- Health ring gradient: teal (#007F7E→#43C0BE), amber (#D97706→#F59E0B), gray (#4B5563→#6B7280)
- Celebration: CSS keyframe animation for ring fill + glow pulse + confetti particles (small circles)
- Badge tiers: Diamond=cyan glow, Gold=amber glow, Silver=gray glow, Bronze=orange glow
- Dark mode throughout: bg-gray-950 base, gray-900 cards, gray-800 borders

---

## Next Steps

- [x] `/trilogy-clarify design` — Skipped (decisions made during challenge)
- [x] `/trilogy-design-research` — Competitive research done implicitly via challenge paradigms
- [x] `/trilogy-mockup` — Design challenge completed (Ring Rachel + Ambient Alex unified)
- [ ] `/trilogy-design-handover` — Gate 2 (Design → Dev)
- [ ] Next.js implementation — real components in frontend/
