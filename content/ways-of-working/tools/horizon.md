---
title: "Laravel Horizon"
description: "Queue monitoring and management dashboard"
---

## Overview

Laravel Horizon provides a dashboard and code-driven configuration for Redis queues.

## How We Use It

### Queue Monitoring
- Real-time job processing metrics
- Failed job management
- Queue wait times and throughput

### Job Management
- Retry failed jobs
- View job payloads
- Monitor worker processes

### Supervisors
- Configure worker pools
- Balance queue priorities
- Auto-scaling workers

## Access

Horizon dashboard is available at `/horizon` (admin access required).

## Configuration

Config file: `/config/horizon.php`

## Key Metrics

- Jobs per minute
- Failed jobs
- Queue wait times
- Worker status

## Resources

- [Laravel Horizon Documentation](https://laravel.com/docs/horizon)
