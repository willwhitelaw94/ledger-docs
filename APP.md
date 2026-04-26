# TC Docs Application

Documentation site built with Nuxt 4 and Nuxt Content 3.

## Stack

- **Framework:** [Nuxt](https://nuxt.com/) v4
- **Content:** [Nuxt Content](https://content.nuxt.com/) v3
- **UI Components:** [Nuxt UI](https://ui.nuxt.com/) v4
- **Search:** [Typesense](https://typesense.org/) Cloud
- **Editor:** [Nuxt Studio](https://nuxt.studio/) (optional)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview Cloudflare build locally
npm run preview
```

## Deployment

The site deploys to two targets:

| Target | Trigger | Workflow |
|--------|---------|----------|
| **Cloudflare Pages** | Push to `main` | `.github/workflows/deploy.yml` |
| **AWS ECS (Chat-Prod)** | Push to `main` | `.github/workflows/build-aws.yml` → `deploy-aws.yml` |

See [infra/README.md](./infra/README.md) for AWS infrastructure details.

## Project Structure

```
tc-docs/
├── app/                 # Nuxt app (pages, components, layouts)
├── content/             # Documentation pages (Markdown)
├── modules/             # Custom Nuxt modules
├── server/              # API routes and plugins
├── public/              # Static files
├── scripts/             # Build/deploy scripts
├── infra/cdk/           # AWS CDK infrastructure
└── .github/workflows/   # CI/CD pipelines
```
