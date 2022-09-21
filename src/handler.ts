import 'source-map-support/register';
import * as AWS from 'aws-sdk';
import logger from './observability/logger';
import MemberDetails from './aad/MemberDetails';
import IDynamoRecord from './dynamo/IDynamoRecord';
import { getMemberDetails } from './aad/getMemberDetails';
import { getDynamoMembers } from './dynamo/getDynamoRecords';
import config from './config';

const {
  NODE_ENV, SERVICE, AWS_PROVIDER_REGION, AWS_PROVIDER_STAGE,
} = process.env;

logger.info(
  `\nRunning Service:\n '${SERVICE}'\n mode: ${NODE_ENV}\n stage: '${AWS_PROVIDER_STAGE}'\n region: '${AWS_PROVIDER_REGION}'\n\n`,
);

const client = new AWS.DynamoDB.DocumentClient();

const handler = async (): Promise<void> => {
  logger.debug('Function triggered\'.');

  const activeList = await getMemberDetails();
  const dynamoList = await getDynamoMembers();

  const stmts = await Promise.allSettled(generateStatements(activeList, dynamoList).map((stmt) => client.put(stmt).promise()));

  const rejectedRecords = stmts.filter((r) => r.status === 'rejected');
  for (const rejection of rejectedRecords) {
      logger.error((<PromiseRejectedResult>rejection).reason)
  }
};

function generateStatements(activeMembers:MemberDetails[], dynamoRecords: IDynamoRecord[]): AWS.DynamoDB.DocumentClient.PutItemInput[] {
  const memberMap = activeMembers.map((am) => <AWS.DynamoDB.DocumentClient.PutItemInput>{
    TableName: config.aws.dynamoTable,
    Item: {
      resourceType: { S: 'USER' },
      resourceKey: { S: am.userPrincipalName },
      name: { S: am.displayName },
    },
  });

  const SECONDS_IN_AN_HOUR = 60 * 60;
  const days = 7;
  const secondsSinceEpoch = Math.round(Date.now() / 1000);
  const expirationTime = secondsSinceEpoch + ((24 * SECONDS_IN_AN_HOUR) * days);

  const drMap = dynamoRecords.filter((dr) => !activeMembers.some((am) => am.userPrincipalName === dr.email)).map((dr) => <AWS.DynamoDB.DocumentClient.PutItemInput>{
    TableName: config.aws.dynamoTable,
    Item: {
      resourceType: { S: 'USER' },
      resourceKey: { S: dr.email },
      name: { S: dr.name },
      ttl: { N: expirationTime },
    },
  });

  return memberMap.concat(drMap);
}

export { handler };
