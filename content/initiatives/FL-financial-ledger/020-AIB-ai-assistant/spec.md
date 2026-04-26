---
title: "Feature Specification: AI Assistant"
---

# Feature Specification: AI Assistant

**Feature Branch**: `020-AIB-ai-assistant`
**Created**: 2026-03-14
**Status**: Draft

## Overview

A persistent AI assistant embedded in the ledger application. It serves two roles simultaneously:

1. **Conversational ledger interface** — users ask questions about their finances in plain language and get instant, accurate answers drawn from live workspace data ("What's my biggest outstanding bill?", "How much did we spend on contractors last quarter?")

2. **Document inbox review interface** — when a new document arrives via the AI Document Inbox (`019-AIX`), the assistant surfaces it conversationally, presents its interpretation, and lets the user confirm, correct, or reject it through conversation rather than form-filling

The interface is a persistent slide-in panel — accessible from any page — with a context panel alongside it that shows the document, chart, or record being discussed. There is no dedicated assistant page; the panel is always available via a button or `Cmd/Ctrl + /`. Everything the assistant does is scoped to the current workspace — it cannot see or reference data from other workspaces.

---

## Dependencies

- **019-AIX** (AI Document Inbox) — provides the document processing pipeline and extracted data that the assistant surfaces for review
- **018-ITR** (Attention Queue) — the assistant can surface intray items conversationally as an alternative to the badge/page

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Ask Questions About the Ledger in Plain Language (Priority: P1)

An owner opens the assistant and asks "What's our cash position this month?" The assistant responds with the current balance across all bank accounts, any outstanding receivables due this week, and upcoming bills — all drawn from live workspace data, in a single clear answer.

**Why this priority**: This is the core differentiator. A bookkeeper-quality answer to any financial question in seconds, without needing to navigate to reports or run queries. Highest daily-use value.

**Independent Test**: Seed a workspace with known financial data, ask 5 specific questions (outstanding balance, overdue invoices, top expense category, largest supplier, bank balance), and verify each answer matches the underlying data exactly.

**Acceptance Scenarios**:

1. **Given** a workspace with known financial data, **When** the user asks "What invoices are overdue?", **Then** the assistant lists all overdue invoices with contact name, amount, and days overdue — matching the actual invoice records.
2. **Given** the user asks a question requiring multiple data sources (e.g. "What's my net position this month?"), **When** the assistant responds, **Then** it combines revenue, expenses, and bank data into a single coherent answer.
3. **Given** the user asks a question the assistant cannot answer from available data (e.g. "Will we be profitable next year?"), **When** the assistant responds, **Then** it clearly states the limitation rather than fabricating an answer.
4. **Given** the user asks about data that does not exist in the workspace (e.g. "Show me payroll"), **When** the assistant responds, **Then** it explains the domain is not available in the current workspace rather than returning empty or incorrect data.
5. **Given** the user asks a follow-up question ("And which of those is most urgent?"), **When** the assistant responds, **Then** it maintains context from the previous message and refines the answer accordingly.

---

### User Story 2 — Review Inbox Documents Through Conversation (Priority: P1)

A new supplier invoice arrives in the document inbox. The assistant proactively surfaces it: *"A new invoice arrived from Telstra — $1,240 inc GST, due 30 March. I've matched it to your existing Telstra contact and suggested it goes under Utilities. Want me to create the bill?"* The user replies "Yes" and the bill is created instantly.

**Why this priority**: Eliminates the form-based review queue from `019-AIX` for common cases. Confirmation via conversation is dramatically faster than opening a review panel, checking fields, and clicking confirm. Also establishes the assistant as the primary inbox review surface.

**Independent Test**: Process a standard supplier invoice through `019-AIX`, verify the assistant proactively messages about it, reply "Yes", and confirm a draft bill is created with correct fields.

**Acceptance Scenarios**:

1. **Given** a new inbox item completes AI processing, **When** the user next opens the assistant, **Then** a notification appears within the panel indicating unreviewed inbox items are waiting — without interrupting any active conversation.
2. **Given** the assistant presents an inbox item, **When** the user says "Yes" or "Confirm", **Then** the draft ledger document is created and the inbox item is marked as processed.
3. **Given** the assistant presents an inbox item and the user wants to change a field, **When** the user says "Put it under Telecoms not Utilities", **Then** the assistant updates the category and confirms the change before creating the document.
4. **Given** the assistant presents an inbox item, **When** the user says "Reject" or "That's not right", **Then** the inbox item is archived without creating a ledger document.
5. **Given** there are 3 unreviewed inbox items, **When** the user opens the assistant, **Then** the assistant works through them one at a time, waiting for confirmation before moving to the next.

---

### User Story 3 — Take Actions Through Conversation (Priority: P2)

A user tells the assistant "Create a bill for Officeworks, $250, due next Friday, put it under Office Supplies." The assistant confirms the details and creates the draft bill — no form required.

**Why this priority**: Conversational document creation is a significant time saver for simple, common documents. Lower priority than Q&A and inbox review because it requires more careful guardrails (the assistant must not create incorrect records).

**Independent Test**: Issue a natural language instruction to create a bill with 4 specific fields. Verify the assistant creates a draft bill with exactly those fields and asks for confirmation before posting.

**Acceptance Scenarios**:

1. **Given** the user instructs the assistant to create a bill with all required fields, **When** the assistant processes the request, **Then** it presents a summary of what it will create and asks for confirmation before acting.
2. **Given** the user confirms creation, **When** the assistant acts, **Then** the draft bill appears in the bills list with the correct fields.
3. **Given** the user's instruction is missing required fields (e.g. no due date), **When** the assistant processes it, **Then** it asks only for the missing fields before proceeding.
4. **Given** the user asks the assistant to post a journal entry, **When** the assistant processes it, **Then** it validates that debits equal credits before creating the draft and flags any imbalance.

---

### User Story 4 — Persistent Chat Panel Available Across the App (Priority: P2)

The assistant is accessible from anywhere in the application via a persistent chat button or slide-in panel — the user does not need to navigate to a dedicated page. When the user is viewing an invoice, the assistant is aware of what they're looking at and can answer contextual questions about it.

**Why this priority**: Accessibility is what makes the assistant feel native rather than bolted-on. A dedicated `/assistant` page would require navigation context-switching. Lower priority than core functionality because the panel is a UX enhancement.

**Independent Test**: Open the assistant panel while viewing a specific invoice, ask "Who is this from?", and verify the assistant answers about the invoice currently on screen without the user needing to specify which invoice.

**Acceptance Scenarios**:

1. **Given** the assistant panel is open and the user is viewing an invoice, **When** the user asks "What's the status of this invoice?", **Then** the assistant answers about the invoice currently in view — not a generic answer.
2. **Given** the user navigates to a different page while the chat panel is open, **When** they ask a new question, **Then** the assistant updates its context to the new page.
3. **Given** the user closes and reopens the assistant panel, **When** it reopens, **Then** the conversation history from the current session is preserved.
4. **Given** the user starts a new session (new browser tab or login), **When** they open the assistant, **Then** prior conversation history is accessible and the user can continue from where they left off or start a new conversation.

---

### User Story 5 — Intray Items Surfaced Conversationally (Priority: P3)

When there are attention queue items from `018-ITR` (overdue invoices, unmatched transactions), the assistant can summarise them on request: "What needs my attention today?" The user can then act on items through conversation rather than navigating to the Intray page.

**Why this priority**: Nice-to-have that bridges the inbox and attention queue concepts. Lower priority because `018-ITR` already provides the badge and page; this is an alternative access channel.

**Independent Test**: Seed 3 intray items, ask "What needs my attention?", verify the assistant lists all 3 with correct descriptions and amounts.

**Acceptance Scenarios**:

1. **Given** there are outstanding intray items, **When** the user asks "What needs my attention?", **Then** the assistant lists all pending items grouped by category with amounts and ages.
2. **Given** the assistant lists an overdue invoice, **When** the user says "Send a reminder for that one", **Then** the assistant confirms and performs the action, or explains if the action is not available.

---

### Edge Cases

- What if the AI gives a factually incorrect answer about the user's data? The assistant must always cite which records it is drawing from, so the user can verify. It must never fabricate numbers.
- What if the user asks the assistant to delete records? Deletion should require explicit double-confirmation and only be available to users with delete permissions.
- What if the assistant is processing a request and the user sends another message? The assistant queues the second message and processes it after the first completes.
- What if the workspace has no data yet? The assistant should gracefully explain what data it needs to answer and suggest the user create some records first.
- What if the AI takes more than 10 seconds to respond? A typing indicator with elapsed time is shown; the user can cancel the request.
- Conversation history storage: conversations are retained indefinitely per workspace user as a full audit trail. Data residency follows the workspace's data residency policy.
- What if a batch operation partially fails? (e.g., 12 of 15 approvals succeed, 3 fail) The assistant reports per-item results — which succeeded, which failed and why. It does not roll back the successful items.
- What if the user asks to undo a write action? The assistant explains there is no undo in accounting and offers to help create the appropriate correction (reversal, credit note, or void) instead.
- What if the user switches workspaces while the assistant panel is open? The assistant starts a fresh conversation in the new workspace. The previous workspace's conversation is preserved in its own history.
- What if the primary and fallback LLM providers both fail? The assistant shows a clear error message and suggests the user try again shortly. No partial or cached responses are served.
- What if the workspace is in compliance mode (read-only assistant) and the user asks for a write action? The assistant explains the action needed, identifies the exact page and button in the UI where the user can perform it manually, and does not execute the action.
- What if a conversation reaches 200 messages? The assistant suggests starting a new conversation for better performance. The user can continue if they choose — the limit is advisory, not enforced.
- What if a practice manager in practice view asks about a workspace they don't have access to? The query is scoped to workspaces the user has active access to. Inaccessible workspaces are silently excluded — no error, no acknowledgement of their existence.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The assistant MUST be accessible from anywhere in the application via a persistent UI element (panel or button) and the keyboard shortcut `Cmd/Ctrl + /`.
- **FR-002**: The assistant MUST be scoped to the current workspace — it MUST NOT access or reference data from other workspaces.
- **FR-003**: The assistant MUST answer natural language questions about live workspace data including: bank balances, outstanding invoices, overdue bills, expense totals by category, contact summaries, and journal entry details.
- **FR-004**: The assistant MUST maintain conversational context within a session — follow-up questions must reference prior messages in the same conversation.
- **FR-005**: When answering data questions, the assistant MUST cite the source records it is drawing from (e.g. "Based on 3 overdue invoices: INV-001, INV-002, INV-003").
- **FR-006**: The assistant MUST refuse to fabricate data — if it cannot answer from available workspace data, it MUST say so explicitly.
- **FR-007**: When the user opens the assistant and unreviewed inbox items exist, the assistant MUST display a non-interrupting notification within the panel (e.g. "3 inbox items waiting"). If the user is mid-conversation, the notification MUST NOT interrupt their active thread. The user can tap the notification to enter inbox review mode.
- **FR-008**: The assistant MUST support confirming, correcting, and rejecting inbox items entirely through conversation — without requiring the user to open the `019-AIX` review panel.
- **FR-009**: Field corrections during inbox review (e.g. "Put it under Telecoms") MUST be applied before the document is created, not after.
- **FR-010**: The assistant MUST support conversational document creation for bills, invoices, and journal entries — always asking for confirmation before creating any record.
- **FR-011**: The assistant MUST identify and ask for missing required fields before attempting to create a document.
- **FR-012**: The assistant MUST display a context panel alongside the chat. When a specific record or document is in focus, the panel renders it. When no specific record is in focus, the panel MUST show a live workspace summary — key financial metrics including bank balance, overdue invoice count, and pending bills total.
- **FR-013**: The context panel MUST update automatically when the conversation topic changes to a specific record, and revert to the workspace summary when the topic is general.
- **FR-014**: The assistant MUST be aware of the page the user is currently viewing and use it as implicit context for questions.
- **FR-015**: The assistant MUST be accessible to all workspace roles. Write actions (create, approve, void) are gated by the user's existing role permissions — the assistant MUST NOT perform actions the current user's role does not permit. Read-only Q&A is available to all roles including auditor and client.
- **FR-016**: The assistant MUST show a typing indicator while processing and allow the user to cancel a pending request.
- **FR-017**: The assistant MUST surface intray items from `018-ITR` when the user asks "What needs my attention?" or equivalent.
- **FR-018**: Conversation history MUST be preserved within a browser session and persisted server-side indefinitely per workspace user — providing a full audit trail of all assistant interactions. Users MUST be able to view prior conversations from past sessions.
- **FR-019**: The assistant interface MUST be a slide-in panel (not a dedicated page). The `/chat` page is removed. The panel is accessible from any page via the persistent UI element and `Cmd/Ctrl + /`.
- **FR-020**: Conversations are private to the user who created them. Other workspace members MUST NOT see another user's conversations.
- **FR-021**: Token usage limits MUST be soft-capped per billing tier. The assistant warns the user when approaching the threshold but MUST NOT hard-block mid-conversation. Overages are tracked for billing visibility, not enforcement.
- **FR-022**: If the primary LLM provider fails, the assistant MUST silently retry with a fallback provider. Only if both providers fail is an error shown to the user.
- **FR-023**: When a tool returns a large result set (more than 10 items), the assistant MUST summarise key findings in the chat message and render the full dataset in the context panel.
- **FR-024**: The assistant panel MUST default to a split layout — chat on the left, context panel on the right. The user can toggle the context panel off for full-width chat.
- **FR-025**: Each message MUST include page context — the current URL and any active record data — sent automatically so the assistant is always aware of what the user is looking at.
- **FR-026**: The assistant MUST support a full action toolkit from day one: approve, reject, void, reconcile, send, and mark as paid — in addition to create actions. All write actions are gated by the user's existing role permissions.
- **FR-027**: All write actions (create, approve, void, reconcile, etc.) require a single confirmation step. The assistant presents what it will do and the user confirms. No double-confirmation — the user's role permissions are the guardrail.
- **FR-028**: Operations that affect more than 5 records (e.g., "approve all draft journal entries from last week") MUST run asynchronously. The assistant dispatches the job and streams progress updates as each item is processed. The user can continue chatting while the batch runs.
- **FR-029**: The assistant MUST support batched operations — processing multiple records in a single request (e.g., "approve all 15 draft journal entries"). Batch results MUST report per-item outcomes (succeeded, skipped, failed with reason).
- **FR-030**: When a tool call fails (e.g., trying to approve an already-approved entry), the assistant MUST skip the failed item and report the failure clearly — never silently retry a write action and never block the remaining batch.
- **FR-031**: There is no "undo" for write actions. Accounting corrections follow domain rules — reversals for journal entries, credit notes for invoices, voids for unpaid documents. The assistant can help create the correction, but there is no magic undo.
- **FR-032**: Conversations MUST have a soft limit of 200 messages. When a conversation approaches 200 messages, the assistant suggests starting a new conversation for performance. The user is never hard-blocked from continuing.
- **FR-033**: The assistant MUST remember user preferences within a workspace across conversations (e.g., preferred currency display, favourite report format, common filters). Preferences are stored per user per workspace and applied automatically.
- **FR-034**: Conversations MUST be searchable. Users can search across their conversation history by keyword, finding past discussions about specific contacts, invoices, or topics.
- **FR-035**: When the user switches workspaces, the assistant MUST start a fresh conversation. Cross-workspace threads are not permitted — workspace isolation extends to conversation context.
- **FR-036**: The assistant MAY surface proactive insights in the context panel's workspace summary (e.g., "3 invoices going overdue tomorrow", "Unusual expense detected") — but MUST NOT interrupt an active chat conversation with unsolicited messages.
- **FR-037**: The assistant MUST NOT learn from individual user corrections or adjust its behaviour based on past mistakes. Financial data accuracy comes from the tools and source records, not from learned patterns. Corrections apply to the specific record, not to future behaviour.
- **FR-038**: For practice managers, the assistant MUST support a "practice view" mode that can query across all client workspaces the user has access to (e.g., "Show me overdue invoices across all my clients"). This mode requires explicit opt-in and uses dedicated cross-workspace tools. Standard workspace isolation remains the default.
- **FR-039**: The assistant MUST support image and document attachments as input. Users can drop a photo of a receipt or invoice into the chat and ask the assistant to interpret it. This feeds into the document inbox pipeline for processing.
- **FR-040**: Tool results in chat MUST be collapsible. The default view shows a summary (e.g., "Found 12 overdue invoices totalling $34,200"). The user can expand to see the full data table inline, or view it in the context panel.
- **FR-041**: The context panel MUST support up to 3 tabs, allowing users to keep multiple records open for comparison (e.g., comparing two invoices side by side). Tabs can be closed individually.
- **FR-042**: Assistant conversations MUST be included in workspace data exports for compliance and data portability. Conversations are workspace data.
- **FR-043**: Workspace administrators MUST be able to disable the assistant for their workspace via a feature flag toggle in workspace settings. When disabled, the assistant UI element is hidden and the keyboard shortcut is inactive.
- **FR-044**: Every write action performed by the assistant MUST be logged in a dedicated assistant audit log — separate from conversation history. Each log entry records the action type, affected record(s), the user who confirmed it, and a reference to the triggering conversation message.
- **FR-045**: Workspaces MUST support a "read-only assistant" mode (compliance mode) where the assistant can answer questions and show data but cannot execute any write actions. In this mode, the assistant explains what action would be needed and suggests the user perform it manually.
- **FR-046**: Voice input is deferred. Browser speech-to-text quality is insufficient for financial terminology, amounts, and account codes. Will revisit when speech recognition improves for domain-specific use cases.

### Key Entities

- **Conversation**: A user-private sequence of messages between the user and the assistant within a workspace. Has a start time, workspace context, and page context at each turn. Searchable across history. Soft-limited to 200 messages.
- **Message**: A single turn in a conversation — either from the user or the assistant. Assistant messages may carry structured actions (create bill, confirm inbox item) in addition to text. User messages include page context automatically.
- **Assistant Action**: A structured operation the assistant proposes or executes (e.g. `create_bill`, `approve_journal_entry`, `reconcile_transaction`, `void_invoice`). Always shown to the user before execution except for read-only queries. Logged separately in the assistant audit log.
- **Context Panel**: The visual panel alongside the chat that renders the document, record, or report currently in focus. Supports up to 3 tabs for record comparison. Defaults to a live workspace summary with proactive insights when no specific record is in focus.
- **User Preferences**: Per-user, per-workspace settings remembered across conversations (preferred currency, common filters, report formats). Applied automatically.
- **Assistant Audit Log**: A compliance-focused log of every write action the assistant performs — separate from conversation history. Records action type, affected records, confirming user, timestamp, and originating message reference.
- **Batch Operation**: A group of write actions processed together (e.g. approving 15 journal entries). Runs asynchronously for 6+ items, with per-item outcome reporting (succeeded, skipped, failed).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The assistant answers factual ledger questions (balance, overdue count, top expense) with 100% accuracy against live workspace data, verified across 20 standard question types.
- **SC-002**: A user can confirm a correctly-extracted inbox item through conversation in under 15 seconds — faster than the form-based review panel.
- **SC-003**: The assistant correctly identifies and asks for missing required fields before attempting document creation in 100% of cases where a required field is absent.
- **SC-004**: Zero instances of the assistant fabricating financial data — all answers are traceable to cited source records.
- **SC-005**: The assistant is accessible and functional within 2 seconds of the user triggering it from any page in the application.
- **SC-006**: Zero cross-workspace data leakage — verified by querying the assistant from workspace A about data that only exists in workspace B.

---

## Clarifications

### Session 2026-03-14

- Q: Conversation history retention? → A: Indefinite — full audit trail stored server-side per workspace user. Users can access prior conversations across sessions. Data residency follows workspace policy.
- Q: Which roles can access the assistant? → A: All workspace roles — the assistant is universally accessible. Write actions are gated by each role's existing permissions. Auditors and clients benefit from natural language Q&A on data they can already view.
- Q: Inbox item notification behaviour when assistant is open? → A: Non-interrupting — a notification indicator appears in the panel but does not interrupt an active conversation. User taps to enter inbox review mode.
- Q: What does the context panel show with no specific record in focus? → A: Live workspace summary — key financial metrics (bank balance, overdue invoice count, pending bills total). Switches to the specific record when one is in focus; reverts to summary for general Q&A.
- Q: Keyboard shortcut to open assistant? → A: `Cmd/Ctrl + /` — reserved globally. `Cmd/Ctrl + K` reserved for future command palette.
- Q: Assistant name / persona? → A: Deferred to branding stage — not a functional requirement. The spec refers to it as "the assistant".

### Session 2026-03-21 (Interface & Integration)

- Q1: Should there be a dedicated `/chat` page or is the slide-in panel sufficient? → A: The `/chat` page is removed. The slide-in panel replaces it entirely — the assistant is always available from any page, never a destination.
- Q2: Are conversations shared within a workspace or private per user? → A: Private per user. Other workspace members cannot see your conversations. Conversations are personal working context, not shared records.
- Q3: How should token usage be limited per billing tier? → A: Soft token limits per billing tier. The assistant warns at threshold but never hard-blocks mid-conversation. Overages are tracked for billing visibility, not enforcement.
- Q4: What happens when the primary LLM provider is unavailable? → A: Silent failover — auto-retry with a fallback provider. Both must fail before the user sees an error. No provider selection UI.
- Q5: How should large result sets be handled (e.g., 50+ transactions)? → A: Summarise key findings in the chat message, render the full dataset in the context panel. The chat stays readable; the context panel carries the detail.
- Q6: What is the default panel layout? → A: Split panel — chat on the left, context panel on the right. The context panel is toggleable for users who prefer full-width chat.
- Q7: What page context is sent with each message? → A: The current URL plus any active record data (e.g., the invoice being viewed). Sent automatically with every message so the assistant always knows what the user is looking at.
- Q8: Which write actions should the assistant support? → A: Full action toolkit from day one — approve, reject, void, reconcile, send, mark as paid, plus create. All gated by the user's existing role permissions. The assistant should be able to do anything the user can do.
- Q9: Should all write actions require double-confirmation? → A: Single confirmation for all actions. The assistant presents what it will do, the user confirms once. Role permissions are the guardrail — the confirmation step prevents accidents, not policy violations.
- Q10: Should deferred stories (US2 inbox review, US5 intray) stay in the spec? → A: Yes — keep them in the spec marked as deferred. They define the vision and architecture extensibility even if they ship later.

### Session 2026-03-21 (Architecture, Memory, Intelligence, Security)

**Tool Architecture**

- Q11: How should tools handle long-running operations (e.g., "reconcile all unmatched transactions")? → A: Asynchronous with progress streaming. Operations affecting more than 5 records dispatch a background job and stream per-item progress updates. The user can continue chatting while the batch runs. Blocking the chat for 30+ seconds is unacceptable.
- Q12: Should tools support batched operations (e.g., "approve all 15 draft journal entries")? → A: Yes. Batch operations are a power-user feature that makes the assistant dramatically faster than the UI. Results report per-item outcomes — succeeded, skipped, or failed with reason.
- Q13: When a tool call fails (e.g., trying to approve an already-approved entry), should the agent retry, skip, or ask the user? → A: Skip and report. Never silently retry a write action (could cause double-execution). Never block the batch to ask about one failure. The assistant reports exactly what failed and why, then continues with the remaining items.
- Q14: Should the assistant support "undo" for write actions? → A: No. Accounting does not have undo. Corrections follow domain rules: reversals for journal entries, credit notes for invoices, voids for unpaid documents. The assistant can help create the appropriate correction, but there is no magic undo button. This is a feature, not a limitation — it ensures the audit trail is complete.

**Conversation & Memory**

- Q15: Should conversations have a maximum length before the assistant suggests starting fresh? → A: Soft limit at 200 messages. The assistant suggests starting a new conversation for performance, but the user is never hard-blocked. Very long conversations degrade context quality — a gentle nudge keeps things sharp.
- Q16: Should the assistant remember user preferences across conversations? → A: Yes. The assistant stores preferences per user per workspace (e.g., preferred currency display, common filters, favourite report format). These are applied automatically in future conversations. Preferences are explicit settings, not inferred patterns.
- Q17: Should conversations be searchable? → A: Yes. Conversations are part of the audit trail and contain valuable context. Users can search across their full conversation history by keyword to find past discussions about specific contacts, invoices, or topics.
- Q18: Should the assistant support pinned/starred conversations for quick access? → A: No. Search is sufficient. Pinning adds UI complexity with marginal value. The conversation list already shows recent conversations — if you need an old one, search for it.

**Context & Intelligence**

- Q19: When the user switches workspaces, should the assistant maintain the conversation or start fresh? → A: Fresh conversation. Workspace isolation is non-negotiable and extends to conversation context. A cross-workspace thread is a data leakage vector. Each workspace gets its own conversation history.
- Q20: Should the assistant proactively surface insights without being asked? → A: Yes, but only in the context panel — never interrupting an active conversation. The workspace summary in the context panel can include intelligent callouts ("3 invoices going overdue tomorrow", "Unusual expense detected"). The chat stream remains user-initiated only.
- Q21: Should the assistant learn from corrections? → A: No. Financial data accuracy comes from tools and source records, not from learned patterns. A correction in one context could be wrong in another ("that should be $1,240" applies to one invoice, not all Telstra invoices). Corrections apply to the specific record. The system prompt and tool outputs are the source of truth.
- Q22: Should the assistant support multi-workspace queries for practice managers? → A: Yes — as a dedicated "practice view" mode. Practice managers managing 50+ client workspaces need to ask "show me overdue invoices across all my clients." This requires explicit opt-in, dedicated cross-workspace tools, and separate permission checks. Standard workspace isolation remains the default for all other users.

**UI & Interaction**

- Q23: Should the assistant support voice input (speech-to-text)? → A: Deferred. Browser speech-to-text APIs cannot reliably handle financial terminology, account codes, or precise dollar amounts. The cost of misrecognition in a financial tool is too high. Will revisit when domain-specific speech recognition matures.
- Q24: Should the assistant support image/document input? → A: Yes. Users can drop a photo of a receipt, invoice, or statement into the chat and ask "what's this?" The assistant uses vision capabilities to interpret the document and can feed it into the document inbox pipeline. This is a natural extension of the inbox review workflow.
- Q25: Should tool results in chat be collapsible/expandable? → A: Yes. Default view is collapsed — showing a summary line (e.g., "Found 12 overdue invoices totalling $34,200"). Users expand for the full data table inline, or view it in the context panel. Keeps the chat stream readable even during heavy data queries.
- Q26: Should the context panel support tabs for comparing records? → A: Yes, up to 3 tabs. Comparing two invoices, or viewing a bill alongside the journal entry it created, is a real accounting workflow. Three tabs is enough for comparison without turning the context panel into a browser. Tabs close individually.

**Security & Compliance**

- Q27: Should assistant conversations be included in workspace data exports? → A: Yes. Conversations are workspace data and must be included in data exports for compliance, data portability, and audit purposes. If a workspace's data is exported or migrated, conversation history goes with it.
- Q28: Should admins be able to disable the assistant for specific workspaces? → A: Yes. A feature flag toggle in workspace settings. When disabled, the assistant UI element is hidden and the keyboard shortcut is inactive. This uses the existing Laravel Pennant feature flag pattern. Not per-role — roles already gate what actions are available.
- Q29: Should the assistant log every action in a separate audit log? → A: Yes. Every write action the assistant performs is logged in a dedicated assistant audit log, separate from conversation history. Each entry records: action type, affected record(s), user who confirmed, timestamp, and a reference to the triggering conversation message. Essential for compliance — auditors need to see "who told the AI to approve this, and when."
- Q30: Should there be a "compliance mode" where the assistant is read-only? → A: Yes. A workspace-level toggle that restricts the assistant to queries and analysis only — no write actions. In compliance mode, the assistant explains what action would be needed and directs the user to perform it via the standard UI. Useful for auditor-facing workspaces and regulated environments where AI-initiated mutations are not permitted.
