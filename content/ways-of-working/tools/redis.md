---
title: "Redis"
description: "In-memory data store for caching and queues"
---

## Overview

Redis is our in-memory data store used for caching, session management, and job queue management.

## How We Use It

### Caching
- Database query caching
- API response caching
- Session storage

### Queue Management
- Background job processing
- Integration with Laravel Horizon
- Priority queue management

### Real-time Features
- Broadcasting events
- Presence channels

## Configuration

Environment variables:
- `REDIS_HOST`
- `REDIS_PASSWORD`
- `REDIS_PORT`

## Related Tools

- [Laravel Horizon](/features/tools/horizon) - Queue monitoring dashboard
