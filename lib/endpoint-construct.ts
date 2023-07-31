import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambda_nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";

import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";

export interface Props {
  resource: apigw.Resource;
  lambdaName: string;
  restApi: apigw.RestApi;
  method: "POST" | "GET";
  entry: string;
  vpc: Vpc;
  env?: Record<string, any>;
  bundling: NodejsFunctionProps["bundling"];
  dbArn: string;
}

export class IntegratedEndpoint extends Construct {
  constructor(scope: Construct, props: Props) {
    super(scope, props.lambdaName+'wsd');

    const fn = new lambda_nodejs.NodejsFunction(
      scope,
      props.lambdaName + "wsdLambda",
      {
        bundling: props.bundling,
        environment: { ...props.env },
        vpc: props.vpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: props.entry,
        handler: "handler",
        functionName: props.lambdaName+ 'wsd',
        memorySize: 256,
        timeout: Duration.seconds(360),
        initialPolicy: [
          new PolicyStatement({
            sid: "allowRds",
            actions: ["rds:*"],
            resources: [props.dbArn],
          }),
        ],
      }
    );

    const integration = new apigw.LambdaIntegration(fn);
    props.resource.addMethod(props.method, integration);
  }
}
