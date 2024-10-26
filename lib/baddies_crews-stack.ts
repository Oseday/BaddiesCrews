import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class BaddiesCrewsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC with three public subnets in three availability zones with default NAT gateways and route tables
    const vpc = ec2.Vpc.fromLookup(this, "VPC", {
      isDefault: true,
    });





    // Define the Lambda function resource
    const BaddiesCrewsFunction = new lambda.Function(this, "BaddiesCrews", {
      runtime: lambda.Runtime.NODEJS_20_X, // Provide any supported Node.js runtime
      handler: "index.handler",
      code: lambda.Code.fromAsset("./src/lambdas/crews"), // Code loaded from the "lambda" directory
      timeout: cdk.Duration.seconds(10), // Execution time limit
      currentVersionOptions: {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
      memorySize: 1024, // Memory allocated to the function
      loggingFormat: lambda.LoggingFormat.JSON, // Log format
      systemLogLevelV2: lambda.SystemLogLevel.WARN, // Log level
      applicationLogLevelV2: lambda.ApplicationLogLevel.WARN, // Log level
      tracing: lambda.Tracing.DISABLED, // Tracing mode
      reservedConcurrentExecutions: 100, // Number of concurrent executions
    });

    const prodAlias = new lambda.Alias(this, "prod", {
      aliasName: "prod",
      version: BaddiesCrewsFunction.currentVersion,
    });

    const latestAlias = new lambda.Alias(this, "latest", {
      aliasName: "latest",
      version: BaddiesCrewsFunction.currentVersion,
    });
    
    const BaddiesCrewsFunctionUrlProd = prodAlias.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
  
    new cdk.CfnOutput(this, "BaddiesCrewsFunctionUrlOutput", {
      value: BaddiesCrewsFunctionUrlProd.url,
    });

    const BaddiesCrewsFunctionUrlLatest = latestAlias.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, "BaddiesCrewsFunctionUrlLatestOutput", {
      value: BaddiesCrewsFunctionUrlLatest.url,
    });

    // Define the DynamoDB table resource
    const BaddiesCrewsTable = new dynamodb.Table(this, "BaddiesCrewsTable", {
      partitionKey: { name: "crewId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: true,
      readCapacity: 5,
      writeCapacity: 5,
      billingMode: dynamodb.BillingMode.PROVISIONED,
    });

    // Add scaling policy to the DynamoDB table
    BaddiesCrewsTable.autoScaleWriteCapacity({
      maxCapacity: 250,
      minCapacity: 5,
    });

    BaddiesCrewsTable.autoScaleReadCapacity({
      maxCapacity: 250,
      minCapacity: 5,
    });

    // Grant the Lambda function read/write permissions to the DynamoDB table
    BaddiesCrewsTable.grantReadWriteData(BaddiesCrewsFunction);

    // Add an environment variable to the Lambda function with the DynamoDB table name
    BaddiesCrewsFunction.addEnvironment("BaddiesCrewsTableName", BaddiesCrewsTable.tableName);



  }
}