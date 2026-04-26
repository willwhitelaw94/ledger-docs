---
title: "Databricks"
description: "Data analytics, warehousing, and AI/ML platform"
---

## Overview

Databricks is our unified data analytics platform, providing data warehousing, ETL pipelines, and machine learning capabilities. It serves as the backbone for business intelligence, reporting, and AI-powered features across Trilogy Care.

## How We Use It

### Data Warehousing
- **Centralised data lake** – Aggregates data from TC Portal, MYOB, CRM, and other sources
- **Business reporting** – Powers dashboards and analytics for operations, finance, and compliance
- **Historical analysis** – Maintains historical data for trend analysis and forecasting

### ETL Pipelines
- **Data synchronisation** – Keeps warehouse in sync with production systems
- **Data transformation** – Cleans and structures data for analytics consumption
- **Scheduled jobs** – Automated data refresh for real-time dashboards

### AI/ML Workloads
- **Invoice classification models** – AI-powered categorisation of supplier invoices
- **Predictive analytics** – Budget utilisation forecasting and client behavior analysis
- **Natural language processing** – Document parsing and information extraction

## Cost Optimisation

We've undertaken significant cost optimisation on our Databricks infrastructure:

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| **Daily cost** | ~$450 AUD | ~$60 AUD | 87% reduction |
| **Annual savings** | - | - | ~$290,000 AUD |

Key optimisations included:
- Cluster auto-scaling and right-sizing
- Query optimisation and caching strategies
- Moving infrequent workloads to scheduled jobs
- Negotiated pricing (targeting additional 5% discount)

## Integration with TC Portal

### Data Flows

```
TC Portal (MySQL) → Databricks → Dashboards/Reports
                  ↓
              ML Models → TC Portal (predictions)
```

### Key Data Sources
- **TC Portal** – Client records, budgets, bills, transactions
- **MYOB** – Financial data, GL accounts, invoices
- **Zoho CRM** – Lead and sales pipeline data
- **Care Vicinity** – Workforce and job data

### Consumers
- **Finance dashboards** – Cash burn, revenue, collections
- **Operations dashboards** – Budget reviews, utilisation rates
- **Compliance reporting** – Regulatory submissions, audit trails
- **AI features** – Invoice classification, anomaly detection

## Access & Permissions

| Role | Access Level |
|------|--------------|
| Data Engineers | Full workspace access |
| Data Analysts | SQL warehouse + dashboards |
| Engineering | Read access for debugging |
| Finance/Ops | Dashboard consumers only |

## Key Resources

- **Workspace**: Contact Data Engineering for access
- **Documentation**: [Databricks Docs](https://docs.databricks.com/)
- **Internal wiki**: Data Engineering Confluence space

## Best Practices

### For Engineers
- Use parameterised queries to leverage caching
- Avoid `SELECT *` – specify only needed columns
- Test queries in dev workspace before production

### For Dashboard Consumers
- Use scheduled refreshes rather than real-time for cost efficiency
- Report data issues to Data Engineering promptly
- Don't share dashboard links externally without approval

## Related Tools

- [Redis](/features/tools/redis) – Application-level caching
- [PostHog](/features/tools/posthog) – Product analytics (different purpose)
