# Calls Uplift Mockups - Summary

## Components Mocked

1. **Calls Inbox** (6 variations) - `calls-inbox-variations.txt`
2. **Call Review Panel** (5 variations) - `call-review-variations.txt`
3. **Package Search/Link** (5 variations) - `package-search-variations.txt`

---

## Calls Inbox Recommendations

| Option | Style | Pros | Cons |
|--------|-------|------|------|
| **A** | Email-style list | Familiar, scannable, shows transcription preview | Requires click to review |
| **B** | Kanban columns | Visual status grouping, drag-and-drop potential | Takes more space |
| **C** | Table view | Data-dense, sortable, batch actions | Less readable on mobile |
| **D** | Split view | List + preview, no modal needed | Needs wider screen |
| **E** | Timeline feed | Chronological context, familiar social pattern | Less efficient for bulk |
| **F** | Compact cards | Inline actions, minimal clicks | Can feel busy |

**Recommendation: Option D (Split View)**
- Matches existing Portal patterns (master-detail)
- Efficient for reviewing multiple calls
- No modal context switching
- Transcription visible without extra click

---

## Call Review Recommendations

| Option | Style | Pros | Cons |
|--------|-------|------|------|
| **A** | Modal overlay | Focused attention, full detail | Blocks inbox view |
| **B** | Slide-over panel | Context preserved, familiar pattern | Narrower space |
| **C** | Inline expansion | No context switch, fast | Can get long/cluttered |
| **D** | Full page | Maximum space, all details | Navigation required |
| **E** | Quick review mode | Fastest workflow, progress bar | Less detail visible |

**Recommendation: Option B (Slide-Over Panel)**
- Keeps inbox visible for context
- Sufficient space for transcription + note
- Matches existing CommonSplitPanel component
- Fast to dismiss and move to next call

---

## Package Search/Link Recommendations

| Option | Style | Pros | Cons |
|--------|-------|------|------|
| **A** | Command palette modal | Familiar search pattern, keyboard-friendly | Extra modal layer |
| **B** | Inline in card | No modal, stays in context | Limited space |
| **C** | Two-step confirm | Clear confirmation, relationship preview | More clicks |
| **D** | Quick pick | Suggestions first, minimal typing | May miss edge cases |
| **E** | Multi-match resolution | Clear when shared numbers | Only for edge case |

**Recommendation: Option D (Quick Pick) with Option E for multi-match**
- AI/suggestions reduce typing
- Recent packages are often correct
- Falls back to search when needed
- Multi-match screen handles shared phone numbers

---

## Combined Recommendation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CALLS INBOX (Split View D)                                                  │
├───────────────────────────────┬─────────────────────────────────────────────┤
│                               │                                             │
│  Call List                    │  SLIDE-OVER PANEL (B)                      │
│  (email-style from A)         │  - Transcription                           │
│                               │  - Audio player                            │
│  ▶ Selected call              │  - Quick pick search (D)                   │
│    Other calls...             │  - Note field                              │
│                               │  - Complete button                         │
│                               │                                             │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

---

## Open Questions for Stakeholders

1. **Batch review**: Should coordinators be able to select multiple calls and complete them in one action?
2. **Flash alerts**: How prominent should the notification be when a new transcription arrives?
3. **Non-package calls**: What percentage are expected? Should there be a quick "dismiss" action?
4. **Audio playback**: Is scrubbing/seeking important, or just play/pause?

---

## Next Steps

- [ ] Review with Product/Design
- [ ] Select preferred variations
- [ ] Run `/trilogy-design` to create design.md
- [ ] Run `/speckit-plan` for technical planning
