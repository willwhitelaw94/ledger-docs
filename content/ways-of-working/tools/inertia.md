---
title: "Inertia.js"
description: "Server-side rendering framework for Vue"
---

## Overview

Inertia.js allows us to build single-page apps using classic server-side routing and controllers, without building an API.

## How We Use It

- Server-side rendering with Vue 3
- Seamless page transitions without full page reloads
- Shared data between Laravel and Vue
- Form handling with automatic validation errors

## Stack

- **Backend**: Laravel controllers return Inertia responses
- **Frontend**: Vue 3 components receive props from server
- **Routing**: Laravel routes, no client-side router needed

## Key Patterns

```php
// Controller
return Inertia::render('Users/Index', [
    'users' => User::all()
]);
```

```vue
<!-- Vue Component -->
<script setup>
defineProps({ users: Array })
</script>
```

## Resources

- [Inertia.js Documentation](https://inertiajs.com)
- [Laravel Adapter](https://inertiajs.com/server-side-setup)
