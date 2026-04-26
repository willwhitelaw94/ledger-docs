---
title: "Intercom"
description: "Customer support platform and bug workflow"
---

Intercom is our customer support platform, handling inbound queries from care recipients, coordinators, and providers. When issues require engineering attention, they flow into Jira.

---

## Support Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| **External Support Docs** | [portal.support.trilogycare.com.au](https://portal.support.trilogycare.com.au/) | Customer-facing help articles |
| **Internal Training** | [Scribe Workspace](https://scribehow.com/workspace#documents) | Staff training and documentation |

---

## Support → Engineering Workflow

```
Customer reports issue in Intercom
        ↓
Support team triages and investigates
        ↓
Bug confirmed? → Create Jira ticket
        ↓
Engineering prioritises and fixes
        ↓
Support notifies customer when resolved
```

### When to Create a Jira Ticket

Create a Jira ticket when:
- It's a confirmed bug (reproducible, not user error)
- It requires code changes to fix
- It's a feature request that needs product review
- It's blocking customer operations

Don't create a Jira ticket for:
- User education issues (password resets, how-to questions)
- Data issues that can be fixed in the CRM/admin
- Duplicate reports of known issues

---

## Common Support Queries

### "Where is this package in the portal?"

Packages sync every 5 minutes. Wait 5 minutes after making changes.

**If still missing:**
- Check if the package is terminated in both Portal and CRM
- If terminated, remove the termination date on the care plan in Zoho CRM
- Wait 5 minutes for sync

---

### "User can't login to the portal"

**Troubleshooting steps:**

1. **Check email address** - Verify the correct email is associated with the home care package (as recipient or package contact)

2. **Check invitation status** - Has the user been invited to the portal?
   - If not → Send invitation
   - If yes but never logged in → Resend invitation

3. **Password issues** - If they've set a password but can't login:
   - Direct them to reset: [portal.trilogycare.com.au/forgot-password](https://portal.trilogycare.com.au/forgot-password)

4. **Account locked** - If locked out, have them reset their password

---

### "Package level has been updated - what now?"

When a package level changes:

1. A **red dot** appears next to the level on the Package Overview page
2. Hover to see tooltip with the MAC committed date
3. The upgraded level won't display until the **monthly claim is processed** (usually mid-month)

---

## Bug Report Template

When creating a Jira ticket from Intercom, include:

```
**Summary:** [Brief description]

**Reported by:** [Customer name/ID from Intercom]
**Intercom conversation:** [Link]

**Steps to reproduce:**
1. ...
2. ...
3. ...

**Expected behaviour:** ...
**Actual behaviour:** ...

**Environment:** Production / Staging
**Browser/Device:** [if relevant]

**Screenshots/Recording:** [attach if available]
```

---

## Escalation Path

| Severity | Response Time | Examples |
|----------|---------------|----------|
| **Critical** | Immediate | Portal down, claims failing, data loss |
| **High** | Same day | Login issues affecting multiple users, invoice errors |
| **Medium** | Within sprint | UI bugs, minor workflow issues |
| **Low** | Backlog | Enhancement requests, cosmetic issues |

---

## Related

- [Jira](/features/tools/jira) - Issue tracking and spec-driven development
- [Sentry](/features/tools/sentry) - Error tracking (check for related errors)
- [PostHog](/features/tools/posthog) - User session recordings for debugging
