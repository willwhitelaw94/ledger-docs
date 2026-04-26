---
title: "AWS Lambda (Sidecar)"
description: "Serverless functions for PDF generation"
---

## Overview

We use AWS Lambda via the Sidecar package for serverless function execution, primarily for PDF and screenshot generation.

## How We Use It

### PDF Generation
- Bill printing
- Statement generation
- Document exports

### Screenshot Generation
- Browsershot via Lambda
- Headless Chrome execution

## Package

`hammerstone/sidecar` with `wnx/sidecar-browsershot`

## Configuration

Environment variables:
- `SIDECAR_LAMBDA_PREFIX`
- `SIDECAR_REGION`
- `SIDECAR_ACCESS_KEY_ID`
- `SIDECAR_SECRET_ACCESS_KEY`
- `SIDECAR_ARTIFACT_BUCKET_NAME`
- `SIDECAR_EXECUTION_ROLE`

## Benefits

- No server resources consumed for heavy PDF generation
- Scales automatically with demand
- Consistent rendering environment
