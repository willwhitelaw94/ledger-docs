---
title: "Mailtrap"
description: "Email testing and delivery platform"
---

[Mailtrap](https://mailtrap.io/) is an email testing and delivery platform for development and QA.

---

## What It Does

Mailtrap captures outgoing emails in development/staging so they never reach real users.

| Feature | Description |
|---------|-------------|
| **Email Sandbox** | Capture all outgoing emails safely |
| **HTML Preview** | View emails as recipients would see them |
| **Spam Analysis** | Check spam score before sending |
| **API Access** | Programmatic email testing |
| **Team Inboxes** | Shared testing environments |

---

## Our Usage

We use Mailtrap for:

- Development email testing (no real emails sent)
- QA verification of email templates
- Debugging email delivery issues
- Staging environment email capture

---

## Configuration

In your `.env` file for development:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
```

---

## Resources

- [Mailtrap Documentation](https://mailtrap.io/blog/laravel-send-email/)
