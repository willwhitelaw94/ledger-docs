# Design Challenge Comparison: Calls Uplift

## Students & Variations

| Student | Paradigm | Variation A | Variation B |
|---------|----------|-------------|-------------|
| **1. Linear Lisa** | Linear App | Triage View (full-screen inbox, expand-in-place, 4 single-key actions) | Split View (320px list + detail panel with audio, transcription, notes) |
| **2. Notion Nick** | Notion | Table + Side Peek (sortable columns, inline property chips, batch bar) | Kanban Board (4 status columns + full-page overlay detail) |
| **3. GitHub Gary** | GitHub | Issues List (status tabs with counts, checkboxes, AI labels on hover) | PR Review (breadcrumbs, timeline, three-state radio submission, sidebar) |
| **4. Superhuman Sam** | Superhuman | Split Inbox (categories, J/K nav, snippets, progress bar, waveform audio) | Focus Mode (zero chrome, progress dots, large audio, slide-in animation) |

**Viewer:** Open `index.html` in a local server to browse all 8 mockups interactively with keyboard shortcuts.

---

## Pattern Comparison

### List / Inbox Layout

| Pattern | Used By | Approach | Speed (Routine) | Info Density |
|---------|---------|----------|-----------------|-------------|
| Triage inbox (expand in place) | Linear A | Click row to expand detail inline; 4 constrained actions | ~3s | High |
| Split pane (list + detail) | Linear B, Notion A, Sam A | Fixed list + side panel updates on selection | 5-15s | Medium |
| Tab-filtered issue list | GitHub A | Status tabs (Unlinked/Review/Completed) with counts | ~18s | High |
| Kanban board | Notion B | 4 columns, drag to change status | 15-20s | Low |
| Focus mode (single item) | Sam B | One call fills the screen, auto-advance | 13-19s | N/A |

**Consensus:** Split pane appears in 3 of 4 students -- it's the natural layout for call review. Status tabs with counts (GitHub, Linear) give instant workload visibility.

---

### Package Linking

| Pattern | Used By | Approach | Discoverability | Power-User Speed |
|---------|---------|----------|-----------------|-----------------|
| Command palette (`Cmd+K`) | Linear | Fuzzy search, bulk link, navigation | Moderate | Fastest |
| Inline property chip | Notion | Click "Unlinked" chip, search popup in-place | Excellent | Good |
| AI suggestion in sidebar | GitHub B | "Suggested: PKG-4521 (85% match)" with one-click confirm | Good | Fast |
| `L` key shortcut | Sam | Press L, type name, Enter | Low | Fast |

**Best combination:** AI-suggested matching (GitHub) for repeat callers + inline chip search (Notion) for discoverability + keyboard shortcut (Sam) for power users.

---

### Notes Entry

| Pattern | Used By | Approach | Time per Note |
|---------|---------|----------|---------------|
| Notes field in detail panel | Linear B, GitHub B | Standard textarea | 15-20s |
| Inline table cell editing | Notion A | Click cell, type, auto-save | 10-15s |
| Snippet autocomplete (`;routine`) | Sam A, Sam B | Type trigger, expand template, tab through variables | 2-3s |

**Clear winner:** Snippets (Sam) save 13-17 seconds per noted call -- the single largest time saving across all patterns. Also enforces consistent clinical language for compliance.

---

### Review Completion

| Pattern | Used By | Approach |
|---------|---------|----------|
| Single-key shortcuts (`1`/`2`/`3`) | Linear A | 1=Link+Complete, 2=Complete, 3=Flag |
| Batch action bar | GitHub A, Notion A | Select multiple, one-click batch action |
| Three-state review submission | GitHub B | Note / Complete / Flag (radio + submit button) |
| `E` key with auto-advance | Sam | Single keystroke, next call loads automatically |

**Best combination:** Three-state review (GitHub) for explicit auditable decisions + auto-advance (Sam/Linear) to eliminate dead time + batch actions (GitHub/Notion) for end-of-day bulk completion.

---

### Progress & Motivation

| Pattern | Used By | Approach |
|---------|---------|----------|
| Count badge in sidebar | Linear | "12 pending" badge |
| Tab counts | GitHub, Notion | "Unlinked (12) / Review (5) / Completed (47)" |
| Progress bar + counter | Sam | "7 of 12 reviewed" with filling teal bar |

**Best combination:** Tab counts (GitHub) for workload shape + progress bar (Sam) for sustained throughput via Zeigarnik Effect.

---

### Audit / Compliance

| Pattern | Used By | Approach |
|---------|---------|----------|
| Append-only timeline | GitHub B | Chronological event log: timestamps, actors, system events |
| Property change history | Notion | Relation/status changes logged per record |
| None explicit | Linear, Sam | Speed-focused, no audit trail UI |

**Clear winner:** Timeline (GitHub B) is uniquely valuable for aged care compliance. Every action timestamped and attributed. Nothing deleted.

---

## Trade-off Matrix

| Dimension | Linear | Notion | GitHub | Superhuman |
|-----------|:------:|:------:|:------:|:----------:|
| **Raw speed** | Excellent | Good | Good | Excellent |
| **Learnability** | Good | Excellent | Good | Moderate |
| **Batch processing** | Excellent | Good | Excellent | Moderate |
| **Visual progress** | Moderate | Good (Board) | Good (Tabs) | Excellent |
| **Audit trail** | Weak | Moderate | Excellent | Weak |
| **Flexibility** | Moderate | Excellent | Moderate | Moderate |
| **Discoverability** | Moderate | Excellent | Good | Moderate |
| **Desktop optimisation** | Excellent | Excellent | Excellent | Excellent |

---

## Cherry-Pick Recommendations

### Adopt

| Pattern | Source | Rationale |
|---------|--------|-----------|
| **Split pane layout** (list + detail) | Linear B / Notion A / Sam A | Consensus layout; balances context + focus |
| **Status tabs with counts** | GitHub A | Instant workload shape; clear priority ordering |
| **Snippet autocomplete for notes** | Sam | Biggest single time saving (13-17s per note) |
| **AI-suggested package linking** | GitHub B / Linear | One-click confirm for repeat callers |
| **Inline property chips** | Notion A | Most discoverable linking UI for new users |
| **Three-state review** (Complete/Note/Flag) | GitHub B | Explicit auditable decisions |
| **Progress indicator** ("7 of 12") | Sam | Drives throughput via Zeigarnik Effect |
| **Keyboard shortcuts with hint bar** | Sam / Linear | Speed for power users; visible hints for learners |
| **Timeline audit trail** | GitHub B | Aged care compliance requirement |
| **Auto-advance** | Linear A / Sam | Eliminates dead time between calls |

### Skip

| Pattern | Source | Rationale |
|---------|--------|-----------|
| Kanban board as primary | Notion B | Too low-density for 50+ calls; useful as secondary view later |
| Command palette (`Cmd+K`) | Linear | Overlaps with inline search; adds complexity for limited gain |
| Full-screen focus mode as default | Sam B | Loses list context; better as opt-in toggle for power users |
| Expand-in-place rows | Linear A | Less room for transcription than a side panel |

---

## Implementation Phases

### Phase 1: Core Workflow
- Split pane layout (call list + detail panel)
- Status tabs: Unlinked / Pending Review / Completed with counts
- Basic call review: view transcript, add note, complete
- Package search and linking in detail panel

### Phase 2: Speed Optimisations
- Keyboard navigation (J/K to move, E to complete)
- Snippet autocomplete for notes (`;routine`, `;followup`, etc.)
- AI-suggested package matching
- Auto-advance after completion
- Progress indicator ("7 of 12")

### Phase 3: Power Features
- Batch selection and bulk actions
- Three-state review (Complete/Note/Flag)
- Timeline audit trail
- Saved view presets
- Keyboard shortcut hint bar with `?` reference

---

## Next Steps

- [ ] Review mockups in viewer (`index.html`) with Product/Design stakeholders
- [ ] Select final pattern combination from cherry-pick list
- [ ] Generate unified mockup based on chosen patterns
- [ ] Create Figma prototypes for user testing
- [ ] Run `/speckit-plan` for technical architecture
