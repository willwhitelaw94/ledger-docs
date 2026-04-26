# Infrastructure

AWS infrastructure for TC Docs, deployed to the **Chat-Prod** account (`075540751014`, `ap-southeast-2`).

## Architecture

```
GitHub Actions (CodeBuild runner)
  ├── build-aws.yml → Docker build → ECR (DevOps: 967883357946)
  └── deploy-aws.yml → assume ChatProdDeploymentRole → ECS update
                                                          ↓
                                                   ALB (public)
                                                          ↓
                                               Fargate (public subnet)
                                               256 CPU / 512 MB
                                               Port 3000
```

- **ECR** — `trilogycare/tc-docs-main` in DevOps account (`967883357946`)
- **VPC** — 2 AZs, public subnets only (no NAT Gateway)
- **ECS Cluster** — `tc-docs-prod-cluster`
- **ECS Service** — `tc-docs-prod-service` (Fargate, 1-3 tasks with auto-scaling)
- **ALB** — Public, port 80
- **Secrets Manager** — `tc-docs/env` (TYPESENSE_SEARCH_KEY, Studio creds, etc.)

## CDK

Infrastructure is defined using AWS CDK v2 (TypeScript) in `infra/cdk/`.

```bash
cd infra/cdk
npm install

# Preview changes
npx cdk diff

# Deploy
npx cdk deploy

# First-time setup (once per account/region)
npx cdk bootstrap aws://075540751014/ap-southeast-2
```

## Pre-requisites

1. **Secrets Manager** — Create `tc-docs/env` secret:
   ```bash
   aws secretsmanager create-secret --name tc-docs/env --secret-string '{
     "TYPESENSE_SEARCH_KEY": "...",
     "STUDIO_GITHUB_CLIENT_ID": "...",
     "STUDIO_GITHUB_CLIENT_SECRET": "...",
     "GITHUB_TARGET_BRANCH": "main"
   }'
   ```

2. **ECR Repository** — `trilogycare/tc-docs-main` in DevOps account with cross-account pull permissions for Chat-Prod

3. **IAM Role** — `ChatProdDeploymentRole` must allow ECS and CloudWatch actions (same pattern as tc-applications)

4. **CDK Bootstrap** — Run `cdk bootstrap` in Chat-Prod account
