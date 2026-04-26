---
title: "Feature Specification: Items Catalogue (Products & Services)"
---

# Feature Specification: Items Catalogue (Products & Services)

**Epic**: 062-ITM
**Created**: 2026-03-21
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 5 (Experience Layer)
**Design Direction**: Xero-inspired item catalogue with richer search and unit of measure

---

## Context

Every time a user creates an invoice or bill, they manually type the line item description, price, tax code, and GL account. The same product or service gets described differently across invoices. Pricing is inconsistent. There's no way to report on revenue by product or service.

An **Items catalogue** is a master list of products and services that auto-populates line items on invoices, bills, quotes, and credit notes. When a user selects an item, the description, unit price, tax code, and GL account pre-fill — they just enter the quantity.

This is also the prerequisite for future inventory tracking (063-INV). Items defines *what* is sold and bought. Inventory will add *how many* are in stock.

### What Xero Does Well

- Simple flat model with separate sell/buy configurations
- Item code search on invoice lines (type code, press Tab, line auto-fills)
- Optional inventory tracking flag (service businesses don't see stock complexity)
- Inline item creation from the invoice form ("+ New Item")

### Where MoneyQuest Will Improve Over Xero

- **Search by description** — Xero only searches code/name, not description text
- **Item categories** — Xero has no categories for grouping/reporting
- **Unit of measure** — Xero has no unit field (everything is "units")
- **Faster autocomplete** — search across code, name, AND description simultaneously

### Existing System Readiness

The frontend LineItemGrid already has an `item_code` column stubbed in (visible on invoice and credit variants). The `LineItem` TypeScript interface includes `item_code?: string`. The column visibility system supports toggling it. The backend has **zero item concept** — no model, no migration, no `item_id` on `InvoiceLine`. This epic fills that gap.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE | Workspace context, chart of accounts |
| **Depends on** | 005-IAR | Invoice/bill line model |
| **Depended on by** | 063-INV | Inventory tracks quantities against Items |
| **Enhances** | 024-RPT | Recurring templates can reference items |
| **Enhances** | 025-CRN | Credit note lines can reference items |

---

## User Scenarios & Testing

### User Story 1 — Create an Item (Priority: P1)

A bookkeeper needs to set up their commonly invoiced services. They navigate to the Items page, click "New Item", enter the item name ("Website Design"), set the sell price ($150/hr), unit of measure ("hours"), default tax code (GST), and default revenue account (Service Revenue 42000). They save and the item appears in their catalogue.

**Why this priority**: Without items in the catalogue, no other feature works. This is the foundation.

**Independent Test**: Can be tested by creating an item, verifying it appears in the list, and checking all fields are saved correctly.

**Acceptance Scenarios**:

1. **Given** a user on the Items page, **When** they click "New Item", **Then** a form opens with fields: name (required), code (optional), description, item type (Service/Product), sell price, buy price, unit of measure, default sell account, default buy account, default sell tax code, default buy tax code, category, and active status.
2. **Given** the user fills in the form and clicks "Save", **Then** the item is created and appears in the Items list.
3. **Given** an item with a code, **When** another item is created with the same code in the same workspace, **Then** a validation error is shown ("Code already exists").
4. **Given** an item is created as type "Service", **When** the user views it, **Then** the "Is Sold" flag defaults to true and "Is Purchased" defaults to true.
5. **Given** an item is saved, **When** the user views the list, **Then** the item shows: code, name, sell price, buy price, item type, and status.

---

### User Story 2 — Select Item on Invoice Line (Priority: P1)

A user creates a new invoice and clicks into the "Item" column on a line. They start typing "web" and see an autocomplete dropdown showing matching items. They select "Website Design" and the line auto-fills with the description ("Website design and development"), unit price ($150), tax code (GST), and GL account (Service Revenue 42000). They just need to enter the quantity.

**Why this priority**: This is the core value — fast, consistent line item entry.

**Independent Test**: Can be tested by creating an item, then creating an invoice and selecting that item on a line — verifying all fields auto-fill correctly.

**Acceptance Scenarios**:

1. **Given** a user is entering a line on an invoice, **When** they click the Item column, **Then** an autocomplete dropdown appears showing available items.
2. **Given** the user types into the Item field, **When** they type "web", **Then** the dropdown filters to items matching "web" in code, name, OR description.
3. **Given** the user selects an item from the dropdown, **Then** the line auto-fills: description (from item's sell description or name), unit price (from item's sell price), tax code (from item's sell tax code), and GL account (from item's sell account).
4. **Given** a line has been auto-filled from an item, **When** the user edits any field (e.g. changes the price), **Then** the override is accepted — item defaults are suggestions, not constraints.
5. **Given** a line references an item, **When** the invoice is saved, **Then** the `item_id` is stored on the line for reporting, but the description/price/tax/account are stored as copies (not live references).
6. **Given** the user is on a **bill** (not invoice), **When** they select an item, **Then** the line auto-fills with the item's **buy** configuration (buy description, buy price, buy tax code, buy account) — not the sell configuration.

---

### User Story 3 — Edit and Deactivate Items (Priority: P1)

A business owner needs to update the price of "Website Design" from $150 to $165/hr. They go to the Items page, find the item, click it, update the sell price, and save. All future invoices using this item will show the new price. Existing invoices are unchanged.

They also want to retire an old item "Logo Design" that they no longer offer. They deactivate it so it no longer appears in the autocomplete dropdown but historical invoices still show it.

**Acceptance Scenarios**:

1. **Given** a user clicks an item in the list, **When** the edit form opens, **Then** all fields are pre-filled with current values and editable.
2. **Given** the user changes the sell price and saves, **When** they create a new invoice and select this item, **Then** the new price auto-fills. Existing invoices with this item retain the old price.
3. **Given** a user deactivates an item, **When** they create a new invoice and search for that item, **Then** it does not appear in the autocomplete dropdown.
4. **Given** an inactive item was used on a historical invoice, **When** the user views that invoice, **Then** the item name and details are still visible — deactivation does not affect historical data.
5. **Given** a user views the Items list, **When** they filter by status, **Then** they can see "Active" items (default), "Inactive" items, or "All" items via StatusTabs.

---

### User Story 4 — Items List with Search and Filters (Priority: P2)

A user with 200+ items needs to find and manage their catalogue. The Items page shows a searchable, filterable table with columns: code, name, sell price, buy price, type, category, and status. They can search by name/code, filter by type (Service/Product) and category, and sort by any column.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Items page, **Then** a paginated table shows all active items with columns: code, name, sell price, buy price, type, and status.
2. **Given** items exist in the catalogue, **When** the user types in the search bar, **Then** the table filters by code, name, or description match.
3. **Given** items have categories assigned, **When** the user filters by category, **Then** only items in that category are shown.
4. **Given** the user clicks a column header, **Then** the table sorts by that column (ascending/descending toggle).
5. **Given** StatusTabs at the top, **Then** tabs show counts: "Active (N)", "Inactive (N)", "All (N)".

---

### User Story 5 — Import Items from CSV (Priority: P2)

A bookkeeper is onboarding a new client who has 150 products in a spreadsheet. They click "Import" on the Items page, upload a CSV file, map columns, review the preview, and import all items at once.

**Acceptance Scenarios**:

1. **Given** the user clicks "Import" on the Items page, **Then** a dialog opens with a file upload area accepting CSV files.
2. **Given** the user uploads a valid CSV, **Then** a column mapping step shows detected columns and lets the user map them to item fields (name, code, sell price, buy price, etc.).
3. **Given** the mapping is confirmed, **Then** a preview table shows the first 10 rows with validation status (green = valid, red = errors).
4. **Given** validation passes, **When** the user clicks "Import", **Then** all items are created and a success message shows the count.
5. **Given** the CSV has duplicate codes, **Then** the preview flags them as errors and the user can fix or skip duplicates before importing.

---

### User Story 6 — Inline Item Creation from Invoice (Priority: P2)

A user is creating an invoice and needs to add a line for a new service they haven't catalogued yet. Instead of leaving the invoice, they click "+ New Item" in the autocomplete dropdown, fill in the quick form (name, price, tax code), and the item is created and immediately selected on the line.

**Acceptance Scenarios**:

1. **Given** a user is typing in the Item autocomplete on an invoice line, **When** no match is found, **Then** a "+ New Item" option appears at the bottom of the dropdown.
2. **Given** the user clicks "+ New Item", **Then** a compact inline form or dialog appears with essential fields: name (required), sell price, sell tax code, sell account.
3. **Given** the user fills in the quick form and saves, **Then** the item is created in the catalogue AND immediately selected on the current invoice line, auto-filling the line fields.
4. **Given** the user creates an item inline, **When** they later visit the Items page, **Then** the item appears in the full list and can be edited with additional details (code, buy config, category, etc.).

---

### User Story 7 — Item Revenue/Cost Reporting (Priority: P3)

An accountant wants to know which services generate the most revenue. They view a report showing revenue by item across a date range, with totals and counts of invoices per item.

**Acceptance Scenarios**:

1. **Given** invoices have been created with items selected, **When** the user views the "Revenue by Item" report, **Then** a table shows each item with: total revenue, invoice count, and average price — for the selected date range.
2. **Given** items have categories, **When** the report is grouped by category, **Then** items are grouped under their category headings with subtotals.
3. **Given** a date range is selected, **Then** only invoices within that range are included in the totals.

---

### Edge Cases

- **Item deleted**: Items use soft delete (deactivate). `item_id` on invoice lines uses `SET NULL` on delete — the line data (description, price, etc.) is preserved as copied values.
- **Item with no code**: Code is optional. Items can be created with just a name. Code is for power users who want fast code-based search.
- **Multi-currency**: Item prices are stored in the workspace's base currency (cents). Multi-currency invoices apply the exchange rate at the line level, not on the item.
- **Recurring templates**: Recurring templates that reference items store `item_id` in their template line data. When a recurring invoice is generated, the item's **current** defaults are used (not the defaults at template creation time).
- **Credit notes**: When creating a credit note from an invoice, item references carry over to the credit note lines.
- **Bills vs invoices**: The same item can have different sell and buy configurations. Invoices use sell config, bills use buy config. The autocomplete dropdown shows the appropriate description/price based on the document type.

---

## Requirements

### Functional Requirements

#### Item Catalogue

- **FR-001**: The system MUST provide an Items page listing all products and services for the workspace.
- **FR-002**: Each item MUST have: name (required), and optionally: code (unique per workspace), description, item type (Service/Product), unit of measure.
- **FR-003**: Each item MUST have a sell configuration: sell description (optional override), sell price (cents), default sell GL account, default sell tax code.
- **FR-004**: Each item MUST have a buy configuration: buy description (optional override), buy price (cents), default buy GL account, default buy tax code.
- **FR-005**: Items MUST support soft delete (deactivate/reactivate) — inactive items are hidden from autocomplete but preserved for historical data.
- **FR-006**: Item codes MUST be unique within a workspace — no two active items can share the same code.
- **FR-007**: Items MUST support a free-text category field for grouping and reporting.
- **FR-008**: The Items list MUST use StatusTabs (Active/Inactive/All) with counts.

#### Line Item Integration

- **FR-010**: Invoice, bill, quote, and credit note lines MUST support an optional item reference.
- **FR-011**: When an item is selected on a line, the line MUST auto-fill with the item's defaults (description, price, tax code, GL account) based on the document type (invoices use sell config, bills use buy config).
- **FR-012**: Auto-filled values MUST be editable — the item provides defaults, not constraints.
- **FR-013**: Line items MUST store copies of the values at creation time — changing an item's price later MUST NOT affect existing invoices.
- **FR-014**: The item autocomplete MUST search across code, name, AND description simultaneously.
- **FR-015**: The item autocomplete MUST show a "+ New Item" option for inline creation.
- **FR-016**: Only active items MUST appear in the autocomplete dropdown.

#### Import

- **FR-020**: Users MUST be able to import items from a CSV file with column mapping and validation preview.
- **FR-021**: Duplicate codes in the import MUST be flagged as errors before importing.

#### Reporting

- **FR-030**: The system MUST support a "Revenue by Item" report showing total revenue, invoice count, and average price per item for a date range.
- **FR-031**: The report MUST support grouping by item category.

### Key Entities

- **Item**: A product or service in the catalogue. Attributes: name, code, description, item_type, sell/buy configurations (description, price, account, tax code), unit_of_measure, category, is_active, is_sold, is_purchased.
- **InvoiceLine** (existing, modified): Gains an optional item_id reference. Stores copies of item values at creation time.

---

## Success Criteria

- **SC-001**: Users can create an item and use it on an invoice in under 30 seconds (create item → create invoice → select item → enter quantity → save).
- **SC-002**: Item autocomplete returns results in under 200ms for a catalogue of 500+ items.
- **SC-003**: Auto-filled line values match the item's current defaults — zero cases of wrong price/tax/account being populated.
- **SC-004**: Changing an item's price does not affect any previously saved invoice — verified across 100+ test invoices.
- **SC-005**: CSV import successfully imports 500 items without errors in under 10 seconds.
- **SC-006**: Revenue by Item report totals match the sum of individual invoice line amounts for each item — 100% accuracy.
