---
title: "Storyblok (Marketing Website)"
description: "Headless CMS powering the Trilogy Care marketing website"
---

The Trilogy Care marketing website is a separate project from TC Portal, built using [Storyblok](https://www.storyblok.com/) as a headless CMS.

---

## Overview

| Aspect | Details |
|--------|---------|
| **Purpose** | Company brochure/marketing website |
| **CMS** | Storyblok (Headless) |
| **Repository** | Separate from TC Portal |
| **Managed By** | Marketing team |

---

## What is Storyblok?

Storyblok is a headless CMS that separates content management from the frontend presentation layer.

| Feature | Description |
|---------|-------------|
| **Visual Editor** | WYSIWYG editing experience |
| **Component-Based** | Reusable content blocks |
| **API-First** | Content delivered via REST/GraphQL |
| **Multi-Language** | Internationalization support |
| **Preview** | Real-time preview of changes |

---

## Why Headless CMS?

- **Marketing Independence** - Marketing team can update content without developer involvement
- **Flexibility** - Frontend can be built with any technology
- **Performance** - Static site generation for fast load times
- **Scalability** - CDN-delivered content

---

## Relationship to TC Portal

The marketing website and TC Portal are **independent projects**:

| Marketing Website | TC Portal |
|-------------------|-----------|
| Brochure content | Application |
| Storyblok CMS | Laravel backend |
| Marketing team | Engineering team |
| Public-facing | Authenticated users |

The websites may link to each other but share no codebase.

---

## Resources

- [Storyblok Documentation](https://www.storyblok.com/docs)
