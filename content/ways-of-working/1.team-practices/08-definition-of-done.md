---
title: "Definition of Done"
description: "Quality checklist for completed work"
---

The Definition of Done (DoD) ensures consistent quality and completeness for all deliverables.

**Stories that do not meet this Definition of Done remain "In Progress" or "In Review" until resolved.**

---

## Story & Scope

- [ ] User Story is mapped to a defined component
- [ ] User Story is allocated to a planned release
- [ ] Technical resources are assigned and accountable
- [ ] Acceptance criteria are clear, agreed, and measurable

---

## Development Standards

- [ ] Code changes have been peer reviewed
- [ ] Code passes the code coverage threshold
- [ ] Code passes unit/component tests
- [ ] Code passes static code analysis
- [ ] Comments are added to the story referencing key commits and technical decisions

---

## Cross-Browser & Device Testing

- [ ] Verified on top 3 desktop browsers
- [ ] Verified on top 3 mobile devices (iOS + Android)
- [ ] Functionality confirmed responsive and accessible

---

## CI/CD & Environments

- [ ] Configurations are deployed to all non-prod environments
- [ ] Released via automated pipeline—no manual deployment
- [ ] Infrastructure settings (e.g. redirects, caching) are confirmed

---

## Testing

- [ ] Functional and non-functional test cases are defined
- [ ] Test coverage mapped to story acceptance criteria
- [ ] Test results documented and traceable
- [ ] Accessibility (WCAG 2.1 AA) testing completed
- [ ] SEO best practices validated (metadata, heading tags, alt text)
- [ ] Tag Manager triggers and GA4 events validated

---

## Defects

- [ ] No open Severity 1–3 defects remain
- [ ] Lower severity issues documented and accepted by Product Owner

---

## Sign-Off & Acceptance

- [ ] Product Owner has reviewed and accepted the story
- [ ] Implementation meets all defined acceptance criteria
- [ ] Any exceptions are documented and approved
- [ ] Global Acceptance Criteria (e.g. performance, SEO, responsiveness) are met where applicable

---

## Quick Reference

| Category | Key Checks |
|----------|------------|
| **Code** | Reviewed, tested, passes CI |
| **Testing** | Browsers, devices, accessibility |
| **Deployment** | Automated, all environments |
| **Quality** | No Sev 1-3 defects |
| **Sign-off** | PO accepted, criteria met |

---

## Related

- [Pull Request Manifesto](/overview/team-practices/01-pull-request-manifesto) - Code review standards
- [Story Kick Offs and Desk Checks](/overview/team-practices/10-story-kick-offs-desk-checks) - Starting and finishing well
- [Jira](/features/tools/jira) - Issue tracking workflow
