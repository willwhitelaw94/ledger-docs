---
title: "Feature Specification: Accessibility & Compliance"
---

# Feature Specification: Accessibility & Compliance

**Epic**: 095-A11 | **Created**: 2026-04-01 | **Status**: Draft

---

## Problem Statement

MoneyQuest has no formal accessibility compliance. Australian government and enterprise customers increasingly require WCAG 2.1 AA compliance. Keyboard navigation exists (CLAUDE.md mandates keyboard-first UX) but screen reader support, colour contrast, focus management, and ARIA attributes are untested.

## Scope

### In Scope (P1 — Foundation)
- WCAG 2.1 AA audit across all pages (automated + manual)
- Fix critical violations: colour contrast ratios, missing alt text, form labels, focus indicators
- Screen reader compatibility: ARIA landmarks, live regions for dynamic content, role attributes
- Keyboard navigation audit: ensure all interactive elements reachable, logical tab order
- Skip-to-content links on all pages
- Reduced motion support (prefers-reduced-motion media query)

### In Scope (P2 — Enhancement)
- High contrast theme option
- Font size scaling (accessibility settings panel)
- Focus trap management in modals and dialogs
- Error announcement for form validation (aria-live assertive)
- Data table accessibility: column headers, row headers, sort state announced
- Chart accessibility: data tables as alternative to visual charts

### In Scope (P3 — Certification)
- VPAT (Voluntary Product Accessibility Template) documentation
- Annual third-party WCAG audit
- Accessibility statement published on marketing site
- User testing with assistive technology users

### Out of Scope
- WCAG 2.2 AAA compliance (aspirational, not required)
- Braille display optimisation
- Cognitive accessibility beyond WCAG requirements

## Key Entities
- No new database entities. This is a cross-cutting UI/UX initiative.

## Success Criteria
- Zero WCAG 2.1 AA violations on axe-core automated scan
- All forms operable via keyboard only
- Screen reader can navigate all pages and complete all workflows
- Colour contrast ratio >= 4.5:1 for normal text, >= 3:1 for large text
