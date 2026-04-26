---
title: "Sentry"
description: "Error tracking and performance monitoring"
---

[Sentry](https://sentry.io/) is an application monitoring platform that helps us track errors and performance issues in real-time.

---

## What It Does

Sentry captures and reports errors, exceptions, and performance issues across our applications.

| Feature | Description |
|---------|-------------|
| **Error Tracking** | Automatic exception capture with stack traces |
| **Performance Monitoring** | Transaction tracing, slow query detection |
| **Release Tracking** | Link errors to specific deployments |
| **Alerts** | Real-time notifications for new issues |
| **User Context** | See which users are affected |
| **Source Maps** | Readable JavaScript stack traces |

---

## Our Usage

We use Sentry for:

- Production error monitoring
- Performance bottleneck identification
- Release health monitoring
- Debugging customer-reported issues

---

## Configuration

Laravel integration via the Sentry SDK:

```env
SENTRY_LARAVEL_DSN=https://your-dsn@sentry.io/project
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## Best Practices

- **Add context**: Include user IDs, package IDs in error reports
- **Set release version**: Tag deployments for tracking
- **Configure alerts**: Set up Slack notifications for new issues
- **Review weekly**: Triage and resolve recurring errors

---

## Resources

- [Sentry Laravel Documentation](https://docs.sentry.io/platforms/php/guides/laravel/)
- [Sentry Vue Documentation](https://docs.sentry.io/platforms/javascript/guides/vue/)
