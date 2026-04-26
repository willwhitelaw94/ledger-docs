import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './environment-config';

const LOG_RETENTION_MAP: Record<number, logs.RetentionDays> = {
  7: logs.RetentionDays.ONE_WEEK,
  14: logs.RetentionDays.TWO_WEEKS,
  30: logs.RetentionDays.ONE_MONTH,
  90: logs.RetentionDays.THREE_MONTHS,
};

export interface TcDocsStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class TcDocsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TcDocsStackProps) {
    super(scope, id, props);

    const { config } = props;
    const env = config.environment;
    const prefix = `tc-docs-${env}`;

    // Tags — consistent with tc-applications and tc-accounts
    cdk.Tags.of(this).add('project', 'tc-docs');
    cdk.Tags.of(this).add('environment', config.environment);
    cdk.Tags.of(this).add('managedBy', 'cdk');

    // Reference ECR repository in the DevOps account (images built by CI/CD)
    const repository = ecr.Repository.fromRepositoryAttributes(this, 'TcDocsRepo', {
      repositoryArn: `arn:aws:ecr:${config.region}:${config.devopsAccountId}:repository/${config.ecrRepository}`,
      repositoryName: config.ecrRepository,
    });

    // VPC — 2 AZs, public subnets only (no NAT Gateway to save cost)
    const vpc = new ec2.Vpc(this, 'TcDocsVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // ECS Cluster — follows tc-{app}-{env}-cluster convention
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: `${prefix}-cluster`,
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENHANCED,
    });

    // Reference pre-existing Secrets Manager secret
    // Create manually: aws secretsmanager create-secret --name tc-docs/env --secret-string '{...}'
    const appSecrets = secretsmanager.Secret.fromSecretNameV2(
      this, 'TcDocsSecrets', 'tc-docs/env'
    );

    // Fargate task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TcDocsTask', {
      family: `${prefix}-task`,
      memoryLimitMiB: config.fargate.memory,
      cpu: config.fargate.cpu,
    });

    // Grant cross-account ECR pull permissions (consistent with tc-accounts)
    taskDefinition.executionRole?.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: [
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
      ],
      resources: [`arn:aws:ecr:${config.region}:${config.devopsAccountId}:repository/${config.ecrRepository}`],
    }));
    taskDefinition.executionRole?.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['ecr:GetAuthorizationToken'],
      resources: ['*'],
    }));

    taskDefinition.addContainer('app', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'tc-docs-app',
        logRetention: LOG_RETENTION_MAP[config.logRetentionDays] ?? logs.RetentionDays.TWO_WEEKS,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      secrets: {
        // TCID (tc-accounts) OAuth authentication
        NUXT_TCID_CLIENT_ID: ecs.Secret.fromSecretsManager(appSecrets, 'NUXT_TCID_CLIENT_ID'),
        NUXT_TCID_CLIENT_SECRET: ecs.Secret.fromSecretsManager(appSecrets, 'NUXT_TCID_CLIENT_SECRET'),
        NUXT_TCID_ISSUER_URL: ecs.Secret.fromSecretsManager(appSecrets, 'NUXT_TCID_ISSUER_URL'),
        NUXT_PUBLIC_APP_URL: ecs.Secret.fromSecretsManager(appSecrets, 'NUXT_PUBLIC_APP_URL'),
        // Usage dashboard (Neon PostgreSQL)
        DATABASE_URL: ecs.Secret.fromSecretsManager(appSecrets, 'DATABASE_URL'),
      },
      portMappings: [{ containerPort: 3000 }],
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/auth/tcid/session || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 3,
        startPeriod: cdk.Duration.seconds(120),
      },
    });

    // ALB Security Group
    const albSg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      securityGroupName: `${prefix}-alb-sg`,
      description: 'Security group for tc-docs ALB',
      allowAllOutbound: true,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
    if (config.certificateArn) {
      albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
    }

    // ECS Security Group
    const ecsSg = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      securityGroupName: `${prefix}-ecs-sg`,
      description: 'Security group for tc-docs ECS tasks',
      allowAllOutbound: true,
    });
    ecsSg.addIngressRule(albSg, ec2.Port.tcp(3000), 'Allow traffic from ALB');

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      loadBalancerName: `${prefix}-alb`,
      vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: albSg,
    });

    // Target group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      targetGroupName: `${prefix}-tg`,
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/api/auth/tcid/session',
        healthyHttpCodes: '200',
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    if (config.certificateArn) {
      // HTTPS listener — ACM wildcard certificate
      const httpsListener = alb.addListener('HttpsListener', {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [
          elbv2.ListenerCertificate.fromArn(config.certificateArn),
        ],
      });
      httpsListener.addTargetGroups('TargetGroup', {
        targetGroups: [targetGroup],
      });

      // HTTP listener — redirect to HTTPS
      const httpListener = alb.addListener('HttpListener', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
      });
      httpListener.addAction('HttpRedirect', {
        action: elbv2.ListenerAction.redirect({
          protocol: 'HTTPS',
          port: '443',
          permanent: true,
        }),
      });
    } else {
      // HTTP only (no certificate)
      const httpListener = alb.addListener('HttpListener', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
      });
      httpListener.addTargetGroups('TargetGroup', {
        targetGroups: [targetGroup],
      });
    }

    // Fargate service — follows tc-{app}-{env}-service convention
    const fargateService = new ecs.FargateService(this, 'FargateService', {
      cluster,
      taskDefinition,
      serviceName: `${prefix}-service`,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [ecsSg],
      healthCheckGracePeriod: cdk.Duration.seconds(120),
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      enableExecuteCommand: true,
      circuitBreaker: { rollback: true },
    });

    fargateService.attachToApplicationTargetGroup(targetGroup);

    // Auto-scaling
    const scaling = fargateService.autoScaleTaskCount({
      minCapacity: config.fargate.minCapacity,
      maxCapacity: config.fargate.maxCapacity,
    });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: alb.loadBalancerDnsName,
      description: `CNAME this to ${config.domainName} in CloudFlare`,
    });
    new cdk.CfnOutput(this, 'ApplicationURL', {
      value: config.certificateArn
        ? `https://${config.domainName}`
        : `http://${alb.loadBalancerDnsName}`,
    });
    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
    });
    new cdk.CfnOutput(this, 'ServiceName', {
      value: fargateService.serviceName,
    });
  }
}
