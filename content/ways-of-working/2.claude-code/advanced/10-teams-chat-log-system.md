---
title: "Teams Chat Log System"
---


## Overview
An automated system that monitors Epic-specific Teams chats and maintains a contextually-aware log of discussions, decisions, and open questions. This log operates independently of the `/iterate` command and provides continuous context capture throughout an Epic's lifecycle.

## Core Concept

Each Epic has a **persistent, evolving log** that:
- Captures ongoing Teams chat discussions automatically
- Summarizes daily activity with contextual awareness of prior discussions
- Extracts decisions and open questions
- Operates independently as a background process
- Can be referenced by `/iterate` command for Epic content updates

---

## Epic-Teams Chat Relationship

### 1:1 Linking
- Each Epic has exactly one dedicated Teams **named group chat** (not a Channel)
- Team exercises discipline to keep discussions on-topic
- Cross-Epic mentions are okay but not critical to capture
- Link established during Epic creation or retroactively

### Chat Type: Named Group Chats
- Epics use **named group chats** in Teams, not Channels
- More flexible than Channels (easier ad-hoc membership, less organizational overhead)
- Still supports webhook/API access via conversation ID
- Simpler for teams to create and manage

### Linking Methods

#### During Epic Creation
Any Epic creation method prompts for Teams chat link:
- `/idea` → `/prd` → `/stories` workflow
- `/jira-sync` (importing existing Epics)
- Any other Epic generation process

**Manual Chat Creation Approach:**
The user creates the Teams chat manually, then provides the link. This approach handles edge cases better:
- PRDs/Epics/Initiatives might exist with different naming conventions
- A Teams chat might already exist for the Epic
- Users have full control over chat membership and naming
- Avoids automated creation complications with existing chats

**Prompt:**
```
Epic IN2 created successfully.

Please create a dedicated Teams named group chat for this Epic and paste the link here.
(Or type 'skip' to link later using /link-chat)
```

**User Workflow:**
1. User manually creates named group chat in Teams (names it as they prefer)
2. User copies chat URL from Teams
3. User pastes URL back to agent
4. Agent validates and processes (see Agent Actions below)

**Agent Actions:**
1. Validates Teams link format
2. Extracts conversation ID from link
3. Stores in `.claude/epics/{epic-key}/metadata.json`
4. Initializes `dumping-ground/teams-chat-log.md`
5. Notifies MCP server to begin monitoring
6. **Backfills existing message history** using two-tier strategy (see below)

#### Retroactive Linking
```
/link-chat IN2
```
For Epics created before this system was implemented.

---

## Message Processing Architecture

### MCP Server Approach (Recommended)

**Why MCP Server:**
- Persistent state management throughout the day
- Webhook receiver for Teams Graph API
- Independent operation (doesn't require planning agent active)
- Clean separation of concerns
- Real-time message collection

**Architecture Flow:**
```
Teams Chat Message → Webhook → MCP Server → Message Collection
                                    ↓
                        (First message of day sets flag)
                                    ↓
                        (Collect all subsequent messages)
                                    ↓
                            10:00 PM Trigger
                                    ↓
                    Read existing teams-chat-log.md
                                    ↓
            Analyze today's messages in context of log history
                                    ↓
                Generate dated summary entry with:
                - General discussion summary
                - Decisions made
                - Open questions/issues
                                    ↓
                    Append to teams-chat-log.md
                                    ↓
                        Reset for next day
```

### Daily Processing Logic

#### Message Collection Trigger
1. **First message of day** in Epic Teams chat → Sets `pending_sync` flag
2. **Subsequent messages same day** → Collected in memory/temp storage
3. **10:00 PM (configurable)** → End-of-day batch processing runs
4. **Generate structured log entry** → Append to teams-chat-log.md
5. **Discard raw message data** → Only the structured log persists
6. **Next day, first message** → Process repeats

#### Data Retention Philosophy
**Log-only storage approach:**
- Raw chat messages are **never permanently stored**
- Messages are ingested, processed into structured logs, then discarded
- Only the distilled log (summaries, decisions, open questions) persists
- Reduces storage overhead and focuses on actionable insights
- For backfills: Historical summary + recent 2 days, then raw data discarded

#### State Tracking
Stored in `.trilogy/initiatives/TP-XXXX-initiative-name/TP-YYYY-epic-name/metadata.json`:
```json
{
  "epic_key": "TP-2403",
  "epic_name": "RAP Roles and Permissions Refactor",
  "initiative_key": "TP-2141",
  "teams_chat_id": "19:abc123def456...",
  "teams_chat_link": "https://teams.microsoft.com/l/chat/...",
  "eod_sync_time": "22:00",
  "last_sync_date": "2025-11-07",
  "pending_sync": false
}
```

---

## Context-Aware Summarization

### Key Principle
Each day's summary is generated with **full awareness of previous log entries**, ensuring:
- Continuity of discussions across days
- Recognition when open questions are resolved
- Tracking of evolving decisions
- Avoidance of redundant information

### Summary Generation Process
1. Read entire existing `teams-chat-log.md`
2. Analyze today's messages in light of historical context
3. Generate entry that:
   - References prior discussions if relevant
   - Notes when open questions are answered
   - Identifies new decisions vs refinements of previous decisions
   - Captures new open questions

---

## Log Format

### File Location
`.trilogy/initiatives/TP-XXXX-initiative-name/TP-YYYY-epic-name/PROGRESS/teams-chat-log.md`

The log is stored in the Epic's `PROGRESS/` folder alongside other Epic tracking artifacts.

### Structure
```markdown
# Teams Chat Log - IN2 (Invoices v2)

**Chat Linked:** 2025-01-10
**Teams Link:** [Open in Teams](https://teams.microsoft.com/...)

---

## 2025-01-16: Payment Gateway Integration Discussion

**Summary:** Team discussed Stripe vs PayPal integration options. Performance concerns raised about webhook reliability. Decision made to proceed with Stripe based on prior discussion about international support needs (see 2025-01-15).

**Decisions:**
- Going with Stripe as primary gateway
- Will implement webhook retry logic with exponential backoff

**Open Questions:**
- How to handle failed payment notifications after 3 retry attempts?
- Multi-currency support timeline TBD

---

## 2025-01-15: Database Schema Review

**Summary:** Reviewed proposed invoice line items table structure. Concerns about tax calculation complexity for international clients. Team leaning toward Stripe for payment processing.

**Decisions:**
- Adding `tax_breakdown` JSON column for flexibility
- Will support multiple line items per invoice

**Open Questions:**
- Payment gateway selection (Stripe vs PayPal) - **RESOLVED 2025-01-16** → Stripe
- International tax calculation service?

---

## 2025-01-10: Epic Kickoff

**Summary:** Initial planning session. Scope defined as rebuilding invoice system with better multi-client support and automated payment processing.

**Decisions:**
- Target Q1 2025 delivery
- Will use existing customer data model
- Focus on automated recurring invoices first

**Open Questions:**
- Payment gateway selection
- Tax calculation approach
```

### Entry Components

#### Summary
- High-level overview of what was discussed
- References to prior log entries when relevant
- Contextual connections (e.g., "builds on prior discussion about...")

#### Decisions
- Clear, actionable decisions made that day
- Can be directly applied to Epic content
- May note if decision refines/overrides prior decision

#### Open Questions
- Unresolved issues requiring further discussion
- Blockers preventing Epic content updates
- Can be marked as **RESOLVED** in future entries with date reference

---

## Backfill Process

### When Linking Existing Chat with History

**User Prompt:**
```
This Teams chat has 150 existing messages from the past 23 days.

Processing full history to build context-aware log...
Generating historical summary and recent detail...
```

**Two-Tier Backfill Strategy:**

This approach balances comprehensive context with storage efficiency:

#### Tier 1: Historical Summary (>2 Days Old)
- All messages older than 2 days are consolidated into a single **robust summary**
- Captures key themes, major decisions, and important context
- Provides essential background without granular day-by-day detail
- Stored as a single entry at the top of the log

**Example:**
```markdown
## Historical Summary (2025-10-15 to 2025-11-04)

**Overview:** Epic kickoff occurred mid-October with initial scope definition for rebuilding the invoice system. Team aligned on using Stripe for payment processing after evaluating multiple gateway options. Database schema underwent several iterations, settling on a flexible JSON-based tax breakdown approach to support international clients. Major architectural decision made to implement event sourcing for audit trail compliance.

**Key Decisions:**
- Stripe selected as payment gateway (replaced earlier PayPal consideration)
- Event sourcing pattern adopted for invoice state management
- Q1 2025 target delivery timeline established
- Multi-currency support deferred to Phase 2

**Resolved Questions:**
- Payment gateway selection → Stripe
- Tax calculation approach → JSON tax_breakdown column
- Audit requirements → Event sourcing pattern

**Carried Forward:**
- International tax calculation service selection pending
- Multi-currency support timeline TBD
```

#### Tier 2: Recent Detail (Last 2 Days)
- Full day-by-day log entries for the last 2 days
- Standard format with Summary, Decisions, and Open Questions
- Provides granular context for current discussions
- Seamlessly transitions into ongoing daily logging

**Backfill Processing Steps:**
1. Retrieve full message history via Teams Graph API
2. Split messages into two groups:
   - Historical: >2 days old
   - Recent: Last 2 days
3. Process historical messages into consolidated summary
4. Process recent messages day-by-day with full detail
5. Generate `teams-chat-log.md` with both tiers
6. Discard raw message data
7. Begin real-time monitoring from current date forward

**Benefits:**
- **Comprehensive context** without massive storage overhead
- **Immediate value** - can reference decisions from weeks ago
- **Smooth transition** from backfill to ongoing logging
- **Efficient processing** - avoids generating 20+ individual daily entries for old discussions
- **Focus on what matters** - recent granular detail where it's most useful

---

## Integration with `/iterate` Command

### Automatic Context Provision
When user runs `/iterate {epic-key}`:

**Option A (Recommended):** Agent automatically shows recent context
```
Agent: "Recent Teams chat activity (last 7 days):
- 2025-01-16: Stripe payment gateway decision
- 2025-01-15: Database schema changes approved

Would you like to incorporate any of these decisions into the Epic content?"
```

**Option B:** Agent asks first
```
Agent: "Would you like to review recent Teams discussions before iterating?"
```

**Option C:** Only shown when choosing "iterate indirect → Teams chat"

### Manual Override
User can force immediate sync:
```
/iterate IN2 --sync-teams-now
```
Triggers EOD processing immediately instead of waiting until 10pm.

---

## MCP Server Tools

The Teams Chat Log MCP server exposes these tools for the planning agent:

### `link-teams-chat`
**Purpose:** Associate Teams chat with Epic
**Parameters:**
- `epic_key`: Epic identifier (e.g., "IN2")
- `teams_chat_link`: Full Teams chat URL
- `backfill`: Boolean (default true)

**Actions:**
- Validates and extracts chat ID
- Stores in Epic metadata
- Initializes log file
- Optionally backfills history
- Begins monitoring

### `force-sync-teams-chat`
**Purpose:** Manual trigger for immediate sync (don't wait for 10pm)
**Parameters:**
- `epic_key`: Epic identifier

**Use Case:** User wants to process important decisions immediately

### `get-teams-chat-log`
**Purpose:** Retrieve log contents for Epic content updates
**Parameters:**
- `epic_key`: Epic identifier
- `days`: Optional, limit to recent N days (default: all)

**Returns:** Markdown content of log, optionally filtered

### `list-open-questions`
**Purpose:** Extract all unresolved questions from log
**Parameters:**
- `epic_key`: Epic identifier

**Returns:** Array of open questions with dates and context

### `mark-question-resolved`
**Purpose:** Mark open question as resolved in log
**Parameters:**
- `epic_key`: Epic identifier
- `question_id`: Identifier for question
- `resolution`: Resolution text
- `resolved_date`: Date resolved

**Actions:** Updates log entry with resolution notation

---

## File Storage Structure

### Storage Location: Epic-Level (Not Initiative-Level)

Since Teams chats are linked to **Epics** (not Initiatives), all chat-related data is stored at the Epic level:

```
.trilogy/initiatives/TP-XXXX-initiative-name/TP-YYYY-epic-name/
├── metadata.json                           # Includes Teams chat link & sync state
├── PRD.md
├── idea.md
├── RACI.md
├── USER-STORIES/
│   └── user-stories.csv
└── PROGRESS/
    ├── teams-chat-log.md                  # Main automated log (Epic-specific)
    └── meetings/                           # Manual meeting transcripts
        └── 2025-01-15-kickoff.txt
```

**Why Epic-level?**
- Each Epic has its own dedicated Teams chat
- Initiatives may contain multiple Epics, each with their own chat
- Log content is specific to Epic scope and decisions
- Keeps chat context tightly coupled with Epic artifacts (PRD, stories, etc.)

---

## Benefits

### Continuous Context Capture
- No manual intervention required after initial linking
- Never lose track of decisions made in chat
- Searchable history across entire Epic lifecycle

### Reduced Cognitive Load
- Team doesn't need to remember to export/summarize chats
- Decisions automatically documented
- Open questions tracked systematically

### Enhanced `/iterate` Workflow
- Recent discussions readily available as context
- Agent can intelligently suggest applying recent decisions
- Eliminates need to manually upload chat exports

### Historical Traceability
- Complete timeline of Epic evolution
- Can trace why decisions were made
- Useful for retrospectives and audits

---

## Edge Cases & Considerations

### No Messages on a Given Day
- If no messages: No log entry created (log remains as-is)
- If messages but no decisions/questions: Optional entry with "General discussion, no decisions"

### Long Gaps in Activity
- Log naturally shows date gaps
- When activity resumes, agent contextually aware of gap
- Summary may note: "First discussion in 2 weeks, revisiting..."

### Spam/Off-Topic Messages
- Agent filters for Epic-relevant content during summarization
- Social chat typically ignored unless decision-adjacent
- Trust team discipline to keep chat focused

### Very Active Days (100+ messages)
- Agent summarizes thematically rather than chronologically
- Groups related discussions together
- Focuses on outcomes (decisions/questions) over play-by-play

### Editing/Deleting Messages
- Teams API provides edit/delete events
- MCP server can handle by noting in next summary: "Prior decision revised..."
- Historical log entries generally not retroactively edited

---

## Future Enhancements (Not Yet Implemented)

- Proactive notifications when significant decisions detected
- Integration with Jira to auto-create tasks for open questions
- Natural language queries: "What did we decide about payments?"
- Summary digests posted back to Teams chat weekly
- Multi-language support for international teams
- Sentiment analysis to detect blockers/frustrations early

---

## Related Documentation

- `/link-chat` command reference
- MCP server setup and configuration guide (TBD)
- Teams Graph API integration guide (TBD)
