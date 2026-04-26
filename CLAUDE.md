# Claude Code Rules

## Markdown Frontmatter Rule

When creating any `.md` file in this repository, always include YAML frontmatter at the top of the file. Content is rendered via `next-mdx-remote`.

### Required Format
```yaml
---
title: "Page Title"
---
```

### Rules
1. `title` is **required** - extract from the first H1 heading or derive from filename
2. Escape quotes in title with backslash: `\"`
3. Add frontmatter before any content

### Optional Fields (add when relevant)
- `description`: Brief page summary for SEO/previews
- `navigation`: Navigation configuration (e.g., `navigation: false` to hide from nav)
- `icon`: Icon for navigation item

---

## Internal Link Rules

When creating links to other pages within this documentation site, **always use absolute paths**.

### Rules

1. **Always use absolute paths** starting with `/` for internal links
2. **Never use relative paths** like `./` or `../` - they break in static site generation

### Examples

```markdown
<!-- Correct - Absolute paths -->
[Initiative One](/initiatives/example-domain-one/initiative-one)
[Architecture](/architecture/overview)

<!-- Wrong - Relative paths (will break) -->
[Initiative One](./initiative-one)
[Architecture](../architecture/)
```

---

## Project Setup & Local Development

### Quick Start

```bash
npm install
npm run dev
```

### Other Scripts

- `npm run build` — production build
- `npm run start` — start production server locally
