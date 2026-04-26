---
title: "Feature Specification: Invoice PDF Templates"
---

# Feature Specification: Invoice PDF Templates

**Epic**: 088-IPT | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 005-IAR (Invoicing), 023-EML (Email Infrastructure)

---

## Problem Statement

MoneyQuest creates invoices but has no PDF generation for sending to customers. Professional invoices require branded PDF output with logos, custom colours, payment details, and configurable layouts. Without this, invoices cannot be emailed or printed.

## Scope

### In Scope (P1)
- Default invoice PDF template (professional, clean layout)
- Template sections: header (logo, business details), customer details, line items table, totals, payment terms, bank details, notes/footer
- Brand customisation: logo upload, primary colour, font selection (3 options)
- PDF generation endpoint: `GET /invoices/{uuid}/pdf`
- Email invoice with PDF attachment via 023-EML infrastructure
- Quote and Purchase Order PDF variants (different headers/labels)
- Credit note PDF with "CREDIT NOTE" watermark

### In Scope (P2)
- Multiple template designs (3-5 built-in themes: Modern, Classic, Minimal, Bold)
- Custom template editor (drag-and-drop sections, custom fields)
- Batch PDF generation (bulk download as ZIP)
- Invoice portal link in PDF (customer can view online and pay)
- Multi-currency formatting on PDF
- Payment QR code (PayID / bank transfer details encoded)

### In Scope (P3)
- HTML template engine (custom Blade/HTML templates)
- White-label PDF (remove MoneyQuest branding)
- E-invoicing (Peppol network integration for B2B)
- PDF accessibility (tagged PDF for screen readers)

### Out of Scope
- Physical mail / postal service integration
- Invoice factoring / financing

## Key Entities
- `InvoiceTemplate` — workspace_id, name, theme, logo_path, primary_colour, font, custom_sections (JSON), is_default
- `InvoicePdf` — invoice_id, template_id, file_path, generated_at, file_size

## Success Criteria
- PDF generation < 2 seconds per invoice
- Batch generation of 100 invoices < 30 seconds
- PDF renders identically across Chrome, Safari, Firefox print preview
- Brand settings apply to all document types (invoice, quote, PO, credit note, bill)
