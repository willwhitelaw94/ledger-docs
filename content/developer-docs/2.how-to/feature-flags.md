---
title: "Feature Flags"
description: "How we use feature flags to incrementally ship features"
---

Feature flags let us turn features on or off without releasing new code. Think of them like light switches:

- **On** → Feature is visible and active for users
- **Off** → Feature is hidden, but the code is still there

---

## Why We Use Feature Flags

Feature flags let us **incrementally ship features** with control and confidence:

| Benefit | Description |
|---------|-------------|
| **Gradual Rollout** | Release to a small group before everyone gets it |
| **A/B Testing** | Experiment with different versions of a feature |
| **Quick Disable** | Turn off a feature instantly if something goes wrong |
| **Safe Deployment** | Ship code to production without exposing it to users |

---

## Our Stack

| Tool | Purpose |
|------|---------|
| **PostHog** | Feature flag management and A/B testing |
| **Pennant** | Laravel package for backend flag checks |

### How It Works

- In **production**, PostHog is the source of truth for which features are enabled
- In **development**, use PostHog cloud's local environment or set up PostHog locally

This keeps feature flag management consistent across environments and gives developers and product teams a shared tool for controlling rollouts.

---

## Setting Up Your Environment

To test feature flags locally in a "production-like" environment, update your `.env` file:

```env
POSTHOG_KEY=
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_ENABLED=true
PENNANT_STORE=posthog
VITE_POSTHOG_KEY=
```

::callout{icon="i-lucide-info"}
By default, Pennant uses the database driver. To use PostHog locally, set `PENNANT_STORE=posthog`.
::

---

## Creating a New Feature Flag

1. Create the feature flag in PostHog (or your local PostHog project)
2. Use the same flag name consistently in both backend and frontend code
3. Follow naming conventions: `feature-name` or `feature-name-v2`

---

## Using Feature Flags

### Backend (Laravel + Pennant)

```php
use Laravel\Pennant\Feature;

if (Feature::active('new-feature-flag-name')) {
    // Code that runs when the feature is enabled
} else {
    // Fallback or default behavior
}
```

### Frontend (Vue + PostHog)

**Simple feature toggle:**

```typescript
const { posthog } = usePostHog();

posthog.onFeatureFlags(() => {
    if (posthog.isFeatureEnabled('new-feature-flag-name')) {
        // Show new feature
    } else {
        // Show default behavior
    }
});
```

**A/B testing (experiments):**

```typescript
const { posthog } = usePostHog();

posthog.onFeatureFlags(() => {
    if (posthog.getFeatureFlag('budgets-v2') === 'test') {
        showSkip.value = true;
    } else {
        showSkip.value = false;
    }
});
```

---

## Best Practices

| Practice | Why |
|----------|-----|
| **Design for flag off** | Don't rely on frontend and backend being perfectly in sync—the happy path should work with the flag off |
| **Keep flags temporary** | Once a feature is rolled out to 100%, remove the flag and clean up the code |
| **Name clearly** | Use consistent names like `budgets-v2`, `new-dashboard` so they're easy to track |
| **Document flags** | Track active flags so the team knows what's in flight |

---

## Feature Flag Lifecycle

```
1. Create     → Define the flag in PostHog
2. Implement  → Add checks in backend and/or frontend code
3. Test       → Verify locally and in staging
4. Rollout    → Gradually enable in production
5. Remove     → Clean up code once fully released
```

::callout{icon="i-lucide-trash-2" color="amber"}
**Don't forget cleanup!** Stale feature flags add complexity. Once a feature is 100% rolled out, remove the flag from PostHog and delete the conditional code.
::

---

## Related

- [PostHog](https://posthog.com/docs/feature-flags) - Feature flag documentation
- [Laravel Pennant](https://laravel.com/docs/pennant) - Backend feature flag package
