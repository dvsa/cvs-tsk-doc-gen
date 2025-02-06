import {
  Handler, SQSBatchItemFailure, SQSBatchResponse, SQSEvent,
} from 'aws-lambda';
import { TextDecoder } from 'util';
import { DocumentModel } from './models/documentModel';
import { getDocumentFromRequest } from './models/documentModel.factory';
import { Request } from './models/request';
import logger from './observability/logger';
import { invokePdfGenLambda } from './services/Lamba.service';
import { uploadPdfToS3 } from './services/S3.service';

export const handler: Handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  logger.debug("Function triggered'.");
  if (!event || !event.Records || !event.Records.length) {
    logger.error('ERROR: event is not defined.');
    throw new Error('Event is empty');
  }
  const batchItemFailures: SQSBatchItemFailure[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const sqsRecord of event.Records) {
    try {
      const request = JSON.parse(sqsRecord.body) as Request;
      const document: DocumentModel = getDocumentFromRequest(request);
      // eslint-disable-next-line no-await-in-loop
      await generateAndUpload(document, request);
    } catch (error) {
      console.error(error);
      batchItemFailures.push({ itemIdentifier: sqsRecord.messageId });
    }
  }
  return { batchItemFailures };
};

const generateAndUpload = async (document: DocumentModel, request: Request) => {
  logger.info(`Starting lambda to lambda invoke (data): ${JSON.stringify(document)}`);
  const response = await invokePdfGenLambda(document, request.documentName);
  logger.info('Finished lambda to lambda invoke, checking response');

  if (response.StatusCode !== 200) {
    throw new Error(`Error invoking doc gen (lambda call failed with ${response.StatusCode}`);
  }
  const responseString: string = new TextDecoder().decode(response.Payload);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const responseJson: any = JSON.parse(responseString);
  if (responseJson.statusCode !== 200) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Error returned from doc gen (${responseJson.statusCode}): ${responseJson.body}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const responseBuffer: Buffer = Buffer.from(responseJson.body, 'base64');
  document.setFileSize(responseBuffer.byteLength);

  logger.info(`Starting s3 upload for file: ${process.env.BRANCH}/${document.filename}`);
  await uploadPdfToS3(responseBuffer, document.metaData, document.filename);
  logger.info('Finished s3 upload');
};
