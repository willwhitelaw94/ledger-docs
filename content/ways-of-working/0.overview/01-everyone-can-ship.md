---
title: Everyone Can Ship
description: Business stakeholders, designers, and engineers all contributing to continuous improvement
---

At Trilogy, shipping isn't just for engineers. With the right tools and guardrails, **anyone can contribute** to continuous improvement - whether you're in CS, Product, Design, or walking your dog.

Test.

---

## The Philosophy

Traditional software development creates a bottleneck: every change, no matter how small, flows through the dev team. A typo fix? Dev team. A missing field? Dev team. A label change? Dev team.

**That doesn't scale.**

With Claude Code, we're enabling a different model:

| Change Type         | Who Ships           | Review Required     |
| ------------------- | ------------------- | ------------------- |
| Typo/label fix      | Anyone              | Light review        |
| Display a new field | Anyone with context | Standard review     |
| Small UI tweak      | Designer or dev     | Standard review     |
| Logic change        | Engineer            | Thorough review     |
| Architecture        | Senior engineer     | Design review first |

The key insight: **small changes are low risk**. If Zoe in CS notices a field is missing from the supplier portal, she can open Claude, describe what she wants, and push a PR. Engineers review it - they're not bypassed, just not bottlenecked.

---

## Real Example: CS Pushing a Fix

From the January 2026 BRP:

> "I've seen CS people push little bug fixes through Claude... Zoe, if you had an issue on supplier portal and it's just a little trivial thing, you can ultimately go toward... ask for what you want, it'll spin up something and make a change. Those changes are little... engineers aren't going to be too concerned because you're probably making pulling a variable to the front - it's not a big deal."

This already happened in practice:

> "Yesterday it was about the contacts not having the phone number in it. So I just pick the phone up, type it into a little... but it's a little bug fix or UI change on my mobile... and it's merged."

**3 minutes. From phone. While walking dogs. Merged.**

---

## Who Can Ship What

### Business Stakeholders (CS, Ops, Product)

**Good candidates:**

- Missing fields in tables/views
- Label/copy changes
- Typo fixes
- Simple validation messages
- Reordering columns

**How to do it:**

1. Open Claude Code (desktop or mobile)
2. Describe what you want in plain English
3. Let Claude find the files and make the change
4. Create a PR
5. Tag an engineer for review

**Example prompt:**

> "The supplier portal contacts table should show phone numbers next to email addresses"

### Designers

**Good candidates:**

- CSS/styling tweaks
- Spacing adjustments
- Color changes
- Icon swaps
- Responsive fixes

**How to do it:**
Same workflow, but you can be more specific about styling:

> "The button padding on the budget page is too tight - increase it to match our standard spacing"

### Engineers

**Everything**, but use judgment on complexity. Save architectural decisions for focused desktop time.

---

## The Guardrails

This only works with proper guardrails:

1. **PR Review Required** - Nothing merges without engineer approval
2. **Tests Must Pass** - CI catches breaking changes
3. **Small Changes Only** - If it feels big, escalate to an engineer
4. **Domain Context** - Only ship in areas you understand

If you're unsure, ask. The goal is velocity, not chaos.

---

## Mobile Workflow: Ship While Walking the Dog

The ultimate expression of "everyone can ship" - pushing PRs from your phone during dead time.

### The Scenario

You're walking the dog. Someone mentions that the contacts table should show phone numbers. Instead of adding it to your mental backlog (where it'll get lost), you pull out your phone and get it done.

![Image](/Image.jpeg)

3 minutes later: PR created, ready for review.

## Real Example: Adding Phone Numbers to Contacts Table

Here's an actual mobile workflow from start to PR.

\--- Unknown node: image-picker ---

### Step 1: Describe What You Want

Open Claude Code on your phone and type your request:

> "We want to see the phone number in package care circle contacts in table with the email."

That's it. No need for perfect grammar or technical specs - Claude figures out the intent.

### Step 2: Claude Explores

Claude immediately starts investigating:

- **Explores the codebase** - finds the care circle contacts table
- **Reads the Vue component** - `ContactTable.vue`
- **Checks the backend** - `PackageContactsTable.php` to see what data is available

You don't need to know file paths or remember where things are. Claude finds them.

### Step 3: Todo List Appears

Claude creates a task list:

- Add phone and email to the contacts table cell
- Run Pint to format code
- Run tests to verify the changes
- Commit and push changes

![Todo list tracking progress](/images/ways-of-working/mobile-pr-workflow/02-todos-and-edit.png)

This is your progress tracker. Watch items get checked off as Claude works.

### Step 4: Claude Makes the Change

Claude edits the Vue template to display email and phone number below the contact name. Uses `phone_formatted` for nice formatting. Only shows the section if email or phone exists.

The backend was already passing `email` and `phone_formatted` to the frontend - no backend changes needed.

### Step 5: Format and Verify

Claude attempts to run formatters. If the environment doesn't have dependencies installed (common in cloud environments), Claude adapts - it knows the change is straightforward and can verify it visually.

### Step 6: Commit and Push

Claude runs through the git workflow:

```text
git status
git diff
git add resources/js/Pages/Packages/Contacts/ContactTable.vue
git commit -m "feat: display phone and email in contacts table"
git push -u origin claude/add-phone-to-contacts-table
```

![Committing and pushing changes](/images/ways-of-working/mobile-pr-workflow/03-commit-push.png)

### Step 7: Create PR

One tap on "Create PR" and you get:

> **Add phone and email to package care circle contacts table**
>
> Display email and phone number below the contact name in the contacts table for better visibility of contact information.

PR created. Total time: \~3 minutes.

## Why This Works on Mobile

### Voice Input

Pair with [voice input](/ways-of-working/claude-code-advanced/06-whisper-flow) for even faster interaction. Dictate your request while walking - no need to type on a tiny keyboard.

### Todo Tracking

The visual todo list shows exactly what Claude is doing. Glance at your phone occasionally to see progress. You're not babysitting - you're casually monitoring.

### Autonomous Operation

Claude handles the boring parts:

- Finding the right files
- Understanding the codebase structure
- Running formatters and tests
- Writing commit messages
- Creating PR descriptions

You just approve and move on.

## Best Use Cases for Mobile

### Quick Wins

- Display a new field in a table
- Fix a typo in the UI
- Add a simple validation
- Update copy or labels
- Small CSS tweaks

### Investigation

- "Why is this endpoint slow?"
- "Where is this error coming from?"
- "How does feature X work?"

Claude can explore and report back - read the findings when convenient.

### PR Reviews

- Review a diff Claude summarizes for you
- Ask questions about specific changes
- Request modifications to open PRs

## What to Avoid on Mobile

- **Large refactors** - Save for desktop where you can review properly
- **Complex architectural decisions** - Need focused attention
- **Anything requiring manual testing** - Can't run the app on mobile

## Tips for Mobile Success

### Keep Requests Focused

"Add phone number to contacts table" is better than "Improve the contacts feature with better information display and also maybe add some sorting."

### Trust the Todo List

Don't micromanage. Let Claude work through the list. Check back when you see tasks completing.

### Use "Create PR" Liberally

Even if you're not sure the change is perfect, create the PR. You can review properly later on desktop. The work is captured and visible to the team.

### Set Expectations with Your Team

Let people know you're shipping from mobile. Quick PRs with "Created on mobile - please review carefully" in the description sets the right context.

## The Philosophy

Dead time doesn't have to be dead. Walking the dog, waiting in line, commuting - these moments add up. Mobile Claude Code turns them into shipping opportunities.

You're not trying to do deep work on your phone. You're capturing and executing quick wins that would otherwise pile up.

The dog gets walked. The PR gets shipped. Everyone wins.

## When You've Gone Too Far

![Vision Pro dog walking - you've gone too far](/images/ways-of-working/mobile-pr-workflow/06-gone-too-far.png)

If you find yourself walking the dogs in a suit wearing a Vision Pro, you've officially crossed the line. A phone in your pocket is casual productivity. Spatial computing while dog-walking is a cry for help.

Stick to the phone. Keep it casual. The dogs will thank you.

## Key Takeaways

- Claude Code on mobile enables shipping during "dead time"
- Simple changes (display fields, fix typos, small features) work great
- Voice input pairs well for hands-free interaction
- Todo list provides passive progress monitoring
- Create PRs liberally - review properly later on desktop
- Avoid complex work - save architectural decisions for focused time

## Further Reading

- [Voice Input with Whisper Flow](/ways-of-working/claude-code-advanced/06-whisper-flow) - Speak instead of type
- [Git with Claude](/ways-of-working/claude-code/08-git-with-claude) - How Claude handles version control
- [Claude Code Models](/ways-of-working/claude-code/03-models) - Which model to use for quick tasks
