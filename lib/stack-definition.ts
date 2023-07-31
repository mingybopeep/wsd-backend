import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { IntegratedEndpoint } from "./endpoint-construct";

import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { DatabaseInstance, DatabaseInstanceEngine } from "aws-cdk-lib/aws-rds";
import { Duration } from "aws-cdk-lib";

import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as lambda_nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class StackDefinition extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // vpc

    const vpc = new Vpc(this, "VPC", {
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Private",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: "PrivateWithEgress",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: "Public",
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });

    const bundling: NodejsFunctionProps["bundling"] = {
      nodeModules: ["prisma", "@prisma/client"],
      commandHooks: {
        beforeInstall: (i, o) => [
          // Copy prisma directory to Lambda code asset
          // the directory must be located at the same directory as your Lambda code
          // `echo "ls ${i}"`,
          `cp -r ${i}/prisma ${o}`,
        ],
        beforeBundling: (i, o) => [],
        afterBundling: (i, o) => [
          `cd ${o}`,
          "npx prisma generate",
          "rm -rf node_modules/@prisma/engines",
          "rm -rf node_modules/@prisma/client/node_modules node_modules/.bin node_modules/prisma",
        ],
      },
    };

    //rds
    const db = new DatabaseInstance(this, "database", {
      engine: DatabaseInstanceEngine.MYSQL,
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      multiAz: false,
      allowMajorVersionUpgrade: true,
      autoMinorVersionUpgrade: true,
      backupRetention: Duration.days(21),
    });

    //apigw
    const api = new apigw.RestApi(this, "wsd-api", {
      restApiName: "wsd-api",
      description: "This api serves wsd endpoints.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
      },
    });

    new lambda_nodejs.NodejsFunction(this, "seed", {
      bundling,
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: "resources/endpoint/seed.ts",
      handler: "handler",
      functionName: "wsd-seed",
      memorySize: 512,
      timeout: Duration.seconds(360),
      initialPolicy: [
        new PolicyStatement({
          sid: "allowRds",
          actions: ["rds:*"],
          resources: [db.instanceArn],
        }),
      ],
    });

    const user = api.root.addResource("user");
    new IntegratedEndpoint(this, {
      lambdaName: "login",
      resource: user,
      restApi: api,
      method: "POST",
      entry: `resources/endpoint/user/login.ts`,
      vpc,
      env: {},
      bundling,
      dbArn: db.instanceArn,
    });
    const userRefresh = user.addResource("refresh");
    new IntegratedEndpoint(this, {
      lambdaName: "refresh",
      resource: userRefresh,
      restApi: api,
      method: "POST",
      entry: `resources/endpoint/user/refresh.ts`,
      vpc,
      env: {},
      bundling,
      dbArn: db.instanceArn,
    });

    const fixture = api.root.addResource("fixture");
    new IntegratedEndpoint(this, {
      lambdaName: "getFixtures",
      resource: fixture,
      restApi: api,
      method: "GET",
      entry: `resources/endpoint/fixture/get.ts`,
      vpc,
      env: {},
      bundling,
      dbArn: db.instanceArn,
    });

    const odds = fixture.addResource("{fixtureId}").addResource("odds");
    new IntegratedEndpoint(this, {
      lambdaName: "getOdds",
      resource: odds,
      restApi: api,
      method: "GET",
      entry: `resources/endpoint/fixture/get-odds.ts`,
      vpc,
      env: {},
      bundling,
      dbArn: db.instanceArn,
    });
  }
}
