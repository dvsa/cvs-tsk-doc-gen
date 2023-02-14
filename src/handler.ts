import { Handler, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { TextDecoder } from 'util';
import logger from './observability/logger';
import { generateMinistryDocumentModel } from './models/document';
import { Request } from './models/request';
import { DocumentType } from './models/documentName.enum';
import { invokePdfGenLambda } from './services/Lamba.service';
import { uploadPdfToS3 } from './services/S3.service';

const handler: Handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  logger.debug("Function triggered'.");
  if (!event || !event.Records || !event.Records.length) {
    logger.error('ERROR: event is not defined.');
    throw new Error('Event is empty');
  }

  const altPromiseArray = event.Records.map((sqsRecord) => {
    const request = JSON.parse(sqsRecord.body) as Request;
    let documentData;
    let fileName: string;
    if (request.documentName === DocumentType.MINISTRY || request.documentName === DocumentType.MINISTRY_TRL) {
      documentData = generateMinistryDocumentModel(request.vehicle, request.plate);
      fileName = `plate_${request.plate.plateSerialNumber}`;
    } else {
      throw new Error('Document Type not supported');
    }
    return generateAndUpload(documentData, request, fileName);
  });

  const results = await Promise.allSettled(altPromiseArray);
  const ids = results
    .map((result, index) => (result.status === 'fulfilled' ? null : event.Records[index].messageId))
    .filter((item) => item !== null);
  return {
    batchItemFailures: ids.map((id) => ({ itemIdentifier: id })),
  };
};

const generateAndUpload = async (documentData, request: Request, fileName: string) => {
  try {
    logger.info('Starting lambda to lambda invoke');
    const response = await invokePdfGenLambda(documentData, request.documentName);
    logger.info('Finished lambda to lambda invoke, checking response');

    const responseString: string = new TextDecoder().decode(response.Payload);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const responseJson: any = JSON.parse(responseString);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const responseBuffer: Buffer = Buffer.from(responseJson.body, 'base64');

    const metaData = {
      'date-of-issue': Date.now().toString(),
      'cert-type': request.documentName,
      'file-format': 'pdf',
      'file-size': responseBuffer.byteLength.toString(),
      'should-email-certificate': 'false',
    };
    logger.info(`Starting s3 upload for file: ${process.env.BRANCH}/${fileName}`);
    await uploadPdfToS3(responseBuffer, metaData, fileName);
    logger.info('Finished s3 upload');
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

export { handler, generateAndUpload };
