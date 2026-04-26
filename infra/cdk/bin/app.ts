#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TcDocsStack } from '../lib/tc-docs-stack';
import { TcDocsEnvironmentConfig } from '../lib/environment-config';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'prod';
const config = TcDocsEnvironmentConfig.getConfig(environment);

new TcDocsStack(app, 'TcDocsStack', {
  config,
  env: {
    account: config.account,
    region: config.region,
  },
  description: `TC Docs Infrastructure - ${environment}`,
});
