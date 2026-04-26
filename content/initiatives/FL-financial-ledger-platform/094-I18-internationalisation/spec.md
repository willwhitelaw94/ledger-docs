---
title: "Feature Specification: Internationalisation & Multi-Country"
---

# Feature Specification: Internationalisation & Multi-Country

**Epic**: 094-I18 | **Created**: 2026-04-01 | **Status**: Draft

---

## Problem Statement

MoneyQuest is hardcoded for Australian accounting (GST, ATO, AUD, ABN). Xero operates in AU, NZ, UK, US, SG, HK, and ZA with localised tax engines, chart of accounts, compliance, and date/number formatting per jurisdiction. International expansion requires a pluggable country engine.

## Scope

### In Scope (P1 — Architecture)
- Country/jurisdiction abstraction layer: pluggable tax engine, CoA templates, compliance rules
- Locale-aware formatting: date (DD/MM/YYYY vs MM/DD/YYYY), currency symbol, number separators
- Multi-language UI framework (i18n with next-intl or similar)
- English translations: en-AU, en-NZ, en-GB, en-US (terminology differences: GST vs VAT vs Sales Tax)
- Country-specific CoA templates: AU (current), NZ, UK, US
- Tax engine interface: `TaxEngine` with `calculateTax()`, `getTaxCodes()`, `getReportingPeriods()`

### In Scope (P2 — NZ + UK)
- NZ GST engine (15% flat rate, GST return periods)
- NZ IRD integration pathway (payday filing)
- UK VAT engine (standard 20%, reduced 5%, zero-rated, exempt)
- UK Making Tax Digital (MTD) VAT return submission
- UK PAYE payroll engine (NI contributions, student loan, pension auto-enrolment)
- Country-specific chart of accounts and report formats

### In Scope (P3 — US + Global)
- US Sales Tax engine (state-level nexus, tax rates by ZIP code)
- US payroll: federal withholding, state withholding, FICA, W-2/1099
- Singapore GST (9% from 2025)
- Multi-language: Japanese, Mandarin, Spanish, German (community translations)

### Out of Scope
- Country-specific industry regulations (e.g., HIPAA for US healthcare)
- Local payment methods per country (handled by 089-PGW)
- Currency exchange rate providers per country (handled by 011-MCY)

## Key Entities
- `Jurisdiction` — code (AU, NZ, UK, US), name, currency, tax_engine_class, coa_template, locale
- `TaxEngine` — Interface: calculateTax(amount, taxCode, date), getTaxCodes(), validateTaxNumber(number)
- `LocaleConfig` — date_format, number_format, currency_symbol, currency_position, fiscal_year_default

## Success Criteria
- NZ workspace fully operational within 3 months of P2 start
- UK workspace fully operational within 6 months
- Zero AU regression when adding new countries
- Country switching per workspace (not per organisation)
