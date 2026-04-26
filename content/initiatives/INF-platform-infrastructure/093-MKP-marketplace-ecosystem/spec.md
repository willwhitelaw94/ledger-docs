---
title: "Feature Specification: Marketplace & App Ecosystem"
---

# Feature Specification: Marketplace & App Ecosystem

**Epic**: 093-MKP | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 045-PUB (Public API & Webhooks)

---

## Problem Statement

MoneyQuest is a closed system. Third-party apps, accountants' tools, and vertical solutions cannot integrate without custom development. Xero's marketplace has 1,000+ apps generating significant ecosystem lock-in and revenue share. A marketplace transforms MoneyQuest from a product into a platform.

## Scope

### In Scope (P1 — Developer Platform)
- App registration portal: developers register apps, get OAuth2 client credentials
- OAuth2 authorization flow: workspace owner grants app access to specific scopes
- App scopes: read:invoices, write:invoices, read:contacts, write:contacts, read:ledger, etc.
- Webhook subscription per app (real-time event notifications)
- Rate limiting per app (tiered by partner level)
- Developer documentation portal (API reference, guides, sandbox)

### In Scope (P2 — Marketplace UI)
- App directory: browse, search, filter by category
- App detail page: description, screenshots, reviews, pricing, install button
- One-click app installation (OAuth consent → redirect → connected)
- Installed apps management page (per workspace)
- App usage analytics (API call volume, active users)
- Revenue share model (MoneyQuest takes 15-20% of app subscription revenue)

### In Scope (P3 — Ecosystem)
- Featured apps and curated collections
- App certification program (security audit, UX review, support SLA)
- Partner tiers (Silver, Gold, Platinum) with benefits
- App-to-app data sharing (with user consent)
- Embedded app UI (iframe within MoneyQuest dashboard)

### Out of Scope
- Building third-party apps ourselves
- App hosting / infrastructure provision
- Payment processing for app subscriptions (use Stripe Connect)

## Key Entities
- `App` — name, developer_id, client_id, client_secret, redirect_uris, scopes, status, listing_details
- `AppInstallation` — workspace_id, app_id, access_token, refresh_token, granted_scopes, installed_at
- `AppReview` — app_id, user_id, rating (1-5), review_text, created_at

## Success Criteria
- 10 partner apps within 6 months of launch
- 50+ apps within 12 months
- App installation < 30 seconds (OAuth flow)
- 99.9% API uptime for marketplace apps
