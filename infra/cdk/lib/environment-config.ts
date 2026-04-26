import * as cdk from 'aws-cdk-lib';

export interface EnvironmentConfig extends cdk.StackProps {
  environment: string;
  account: string;
  region: string;

  // Domain & TLS
  domainName: string;
  certificateArn?: string;

  // ECR
  devopsAccountId: string;
  ecrRepository: string;

  // ECS
  fargate: {
    cpu: number;
    memory: number;
    minCapacity: number;
    maxCapacity: number;
  };

  // Logging
  logRetentionDays: number;
}

export class TcDocsEnvironmentConfig {
  static getConfig(environment: string): EnvironmentConfig {
    switch (environment) {
      case 'prod':
        return TcDocsEnvironmentConfig.getProdConfig();
      default:
        throw new Error(`Unknown environment: ${environment}`);
    }
  }

  static getProdConfig(): EnvironmentConfig {
    return {
      environment: 'prod',
      account: '075540751014',
      region: 'ap-southeast-2',

      domainName: 'docs.trilogycare.com.au',
      // CloudFlare Origin Certificate (same as tc-accounts, tc-applications)
      certificateArn: 'arn:aws:acm:ap-southeast-2:075540751014:certificate/e5a704bd-4d75-40fa-a3c6-3c9940d5112d',

      devopsAccountId: '967883357946',
      ecrRepository: 'trilogycare/tc-docs-main',

      fargate: {
        cpu: 512,
        memory: 1024,
        minCapacity: 1,
        maxCapacity: 3,
      },

      logRetentionDays: 14,
    };
  }
}
