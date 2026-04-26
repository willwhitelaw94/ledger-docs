---
title: "Feature Specification: AI Financial Chatbot"
---

# Feature Specification: AI Financial Chatbot

**Epic**: 021-AIQ
**Created**: 2026-03-14
**Status**: Draft

---

## User Scenarios & Testing

### User Story 1 — Ask a Financial Question and Get an Answer (Priority: P1)

A business owner wants to know how their business is performing without opening reports. They open the chat panel, type a plain-English question about their finances, and receive a clear answer with supporting numbers — rendered as a visual card or table, not a wall of text.

**Why this priority**: This is the core value proposition. Without this working well, nothing else matters.

**Independent Test**: Can be fully tested by typing "What are my top expenses this month?" into the chat and verifying a ranked expense list is returned with real numbers from the workspace.

**Acceptance Scenarios**:

1. **Given** a workspace with journal entries recorded, **When** the user asks "What are my top expenses this month?", **Then** the chat responds with a ranked list of expense accounts showing amounts for the current month
2. **Given** a workspace with transactions, **When** the user asks "How much did I spend on contractors last quarter?", **Then** the chat returns the total spend for the matching account(s) for the previous quarter with a monthly breakdown
3. **Given** a workspace, **When** the user asks "What's my cash position?", **Then** the chat returns the current balance of bank/cash accounts
4. **Given** a workspace with invoices, **When** the user asks "Which invoices are overdue?", **Then** the chat returns a list of overdue invoices with amounts and due dates
5. **Given** a question the AI cannot answer from available data, **When** the user submits it, **Then** the chat responds honestly that the information isn't available rather than making up numbers

---

### User Story 2 — Rich Inline Components in Responses (Priority: P1)

When the AI answers a financial question, the response includes a structured visual component appropriate to the data — not just plain text. A cash position shows a balance card. A spend breakdown shows a bar chart. A list of invoices shows a table with links to each invoice.

**Why this priority**: Plain text answers are functional but not delightful. Rich components are the key differentiator and what makes the chatbot feel native to the app rather than bolted on.

**Independent Test**: Can be tested by asking "Show me my P&L for this year" and verifying that a P&L summary card renders inline in the chat thread showing revenue, expenses, and net profit.

**Acceptance Scenarios**:

1. **Given** a P&L question, **When** the AI responds, **Then** a P&L summary card renders inline showing revenue, expenses, and net profit in a structured layout
2. **Given** a transaction list question, **When** the AI responds, **Then** a table of transactions renders inline with account names, amounts, and dates — rows link to the relevant transaction
3. **Given** a spend-over-time question, **When** the AI responds, **Then** a bar chart renders inline showing the breakdown by period
4. **Given** an invoice question, **When** the AI responds, **Then** an invoice list renders inline with each row linking to the invoice detail page
5. **Given** a simple balance question, **When** the AI responds, **Then** a balance card renders inline showing the account name and current balance

---

### User Story 3 — Chat History Persists Per Workspace (Priority: P2)

A user who asked a question yesterday can scroll back and see the conversation, including the rich components that were rendered. Chat history is scoped to the workspace — switching workspaces shows a different conversation.

**Why this priority**: Without persistence, every session starts cold. Users lose the ability to reference prior answers and build on previous conversations.

**Independent Test**: Can be tested by asking a question, refreshing the page, and verifying the conversation is still visible with rich components intact.

**Acceptance Scenarios**:

1. **Given** a previous chat session, **When** the user returns to the chat page, **Then** the full conversation history is visible including all AI responses and rich components
2. **Given** a user with two workspaces, **When** they switch workspaces and open chat, **Then** they see only the chat history for the current workspace
3. **Given** a long conversation, **When** the user scrolls up, **Then** older messages load and remain readable
4. **Given** a conversation, **When** the user sends a new message, **Then** the AI has context of the recent conversation and can answer follow-up questions (e.g., "break that down by month" after a previous totals answer)

---

### User Story 4 — Workspace AI Agent Configuration (Priority: P2)

A workspace owner can configure their AI agent — giving it a name, setting a custom context prompt ("We're a construction business, focus on project costs"), and choosing which AI features are enabled. This context is automatically applied to every chat response.

**Why this priority**: Generic AI responses miss the nuance of specific business types. Custom context makes every response more relevant. This also lays the foundation for the broader "customise your agent" vision.

**Independent Test**: Can be tested by setting a custom context ("We're a café, focus on food and labour costs") and verifying that subsequent chat responses reference this context appropriately.

**Acceptance Scenarios**:

1. **Given** a workspace with no AI config, **When** the user opens AI settings, **Then** they see a form to set an agent name, custom context prompt, and toggle AI features on/off
2. **Given** a saved custom context prompt, **When** the user asks a financial question, **Then** the AI response reflects the business context (e.g., references relevant industry terms)
3. **Given** an agent name of "Penny", **When** the user opens the chat panel, **Then** the chat header shows "Penny" and greetings reference this name
4. **Given** AI features toggled off for a workspace, **When** a user attempts to use the chat, **Then** they see a message indicating the feature is not enabled for this workspace

---

### User Story 5 — Streaming Responses (Priority: P2)

When the user sends a message, the AI response streams in word by word in real time rather than appearing all at once after a delay. This makes the experience feel responsive even for complex queries that take several seconds.

**Why this priority**: Perceived speed is as important as actual speed. A 5-second delay with no feedback feels broken. Streaming makes it feel alive.

**Independent Test**: Can be tested by asking a complex question and observing text appearing progressively within 1–2 seconds of submission.

**Acceptance Scenarios**:

1. **Given** a submitted question, **When** the AI begins responding, **Then** text starts appearing within 2 seconds and continues streaming until complete
2. **Given** a streaming response, **When** the response includes a rich component, **Then** the text streams first and the component renders when the full response is complete
3. **Given** a streaming response in progress, **When** the user sends another message, **Then** the current stream completes before the new response begins
4. **Given** a network interruption mid-stream, **When** the connection drops, **Then** the partial response is preserved and an error indicator is shown

---

### User Story 6 — Chat Accessible from Anywhere in the App (Priority: P3)

The chat panel is available from any page in the app via a persistent button or sidebar entry. Users don't need to navigate away from what they're doing to ask a question.

**Why this priority**: Accessibility increases usage frequency. If chat requires a full page navigation, users will use it less.

**Independent Test**: Can be tested by opening the Chart of Accounts page and opening the chat panel without navigating away, then asking a question about account balances.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** they click the chat button, **Then** a slide-over chat panel opens without leaving the current page
2. **Given** the chat panel is open, **When** the user interacts with the underlying page, **Then** the panel can be dismissed and the user returns to their previous context
3. **Given** the chat panel is open with an active conversation, **When** the user navigates to another page, **Then** the conversation is preserved when they reopen the panel

---

### Edge Cases

- What happens when the AI query returns no data (e.g., no transactions in the requested period)? → Chat responds with "No transactions found for that period" rather than a blank component
- What happens when the Anthropic API is unavailable? → Chat shows a friendly error and the user can retry
- What happens if a user asks something outside financial data (e.g., "Write me a poem")? → The AI politely redirects to financial questions relevant to their workspace
- What happens when a workspace has no transactions yet? → The AI acknowledges the empty state and suggests what to do next (e.g., "Your ledger is empty — try importing a bank statement")
- What happens when the AI response would include data from another workspace? → Not possible — all data tools are strictly scoped to the authenticated workspace; the AI cannot access cross-workspace data

---

## Requirements

### Functional Requirements

- **FR-001**: The chat interface MUST be accessible from any page in the app without full page navigation
- **FR-002**: The chat MUST accept natural language questions in plain English
- **FR-003**: The AI MUST query real workspace data — it MUST NOT generate or fabricate financial numbers
- **FR-004**: The AI MUST respond using only data from the authenticated workspace — cross-workspace data access is prohibited
- **FR-005**: Responses MUST stream in real time; the first visible output MUST appear within 2 seconds of submission
- **FR-006**: Responses MUST include rich inline components (cards, tables, charts) where appropriate to the data type
- **FR-007**: Rich components MUST include links back to the relevant records (e.g., a transaction row links to the journal entry)
- **FR-008**: Chat history MUST be persisted per workspace and visible on return visits
- **FR-009**: The AI MUST maintain context within a conversation session (follow-up questions work without re-stating context)
- **FR-010**: Workspace owners MUST be able to configure a custom AI context prompt that is applied to every response
- **FR-011**: The AI agent MUST support a custom name configurable per workspace
- **FR-012**: The system MUST gracefully handle AI service unavailability with a user-visible error and retry option
- **FR-013**: The system MUST handle empty data states with informative responses rather than blank components
- **FR-014**: The AI features MUST be gateable per workspace (enabled/disabled by workspace owner)
- **FR-015**: The AI MUST include a disclaimer that responses are informational only and not financial advice

### Key Entities

- **Chat Message**: A single message in a conversation. Has a role (user or assistant), content (text), optional rich component payload, timestamp, and workspace association
- **Chat Conversation**: A sequence of messages within a workspace. Scoped to one workspace. Has a created date and last-active date
- **AI Agent Config**: Per-workspace configuration for the AI assistant. Includes agent name, custom context prompt, and feature toggles
- **Chat Tool Result**: The structured data returned by a financial data tool (e.g., a list of transactions, a P&L summary). Stored with the message for component rendering

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can get an answer to a plain-English financial question in under 10 seconds end-to-end
- **SC-002**: The AI correctly answers financial questions using real workspace data with 100% accuracy (no hallucinated numbers — verified by comparing AI response to raw report data)
- **SC-003**: Rich components render for at least 80% of financial queries (not plain text only)
- **SC-004**: Chat history loads and is readable within 2 seconds of opening the chat panel
- **SC-005**: The feature is available and functional even when the workspace has zero transactions (graceful empty state)
- **SC-006**: No cross-workspace data leakage — verified by testing with multiple workspaces under the same user account
