---
title: "Typesense"
description: "Full-text search engine"
---

## Overview

Typesense is our full-text search engine, providing fast and typo-tolerant search across the portal.

## Searchable Models

- Bills
- Packages
- Notes
- Suppliers
- Care Coordinators

## How We Use It

- Instant search results
- Typo tolerance
- Faceted filtering
- Geo-search for location-based queries

## Integration

Uses Laravel Scout with custom Typesense driver.

## Configuration

Environment variables:
- `SCOUT_DRIVER=typesensecustom`
- `TYPESENSE_HOST`
- `TYPESENSE_API_KEY`
- `TYPESENSE_PORT`
- `TYPESENSE_PROTOCOL`

## Resources

- [Typesense Documentation](https://typesense.org/docs/)
- [Laravel Scout](https://laravel.com/docs/scout)
