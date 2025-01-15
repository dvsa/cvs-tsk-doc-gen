import { InvokeCommandOutput, LambdaClient } from '@aws-sdk/client-lambda';
import { PutObjectCommandOutput, S3 } from '@aws-sdk/client-s3';
import { SQSBatchResponse } from 'aws-lambda';
import { DocumentName } from '../../src/enums/documentName.enum';
import { ReasonForIssue } from '../../src/enums/reasonForIssue.enum';
import * as Handler from '../../src/handler';
import * as DocumentGeneration from '../../src/models/documentModel.factory';
import { MinistryPlateDocument } from '../../src/models/ministryPlate';
import { Request } from '../../src/models/request';
import { invokePdfGenLambda } from '../../src/services/Lamba.service';
import { uploadPdfToS3 } from '../../src/services/S3.service';
import pass from '../resources/sqsPass.json';
import { addMiddleware, generateVehicle } from './unitTestUtils';

describe('handler tests', () => {
  const request: Request = {
    documentName: DocumentName.MINISTRY,
    techRecord: generateVehicle(),
    recipientEmailAddress: 'customer@example.com',
    plate: {
      plateSerialNumber: '12345',
      plateIssueDate: new Date().toISOString(),
      plateReasonForIssue: ReasonForIssue.DESTROYED,
      plateIssuer: 'user',
    },
  };

  beforeEach(() => {
    process.env.DOC_GEN_NAME = 'test';
  });

  it('should throw an error for empty sqs event', async () => {
    const sqsEvent = {};
    try {
      await Handler.handler(sqsEvent, undefined, () => true);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(err.message).toBe('Event is empty');
    }
  });

  it('should return failed records', async () => {
    const sqsEvent = pass;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const batchFails : SQSBatchResponse = await Handler.handler(sqsEvent, undefined, () => true);
    expect(batchFails.batchItemFailures[0].itemIdentifier).toEqual(sqsEvent.Records[0].messageId);
  });

  it('should throw an error if document type not supported', async () => {
    const sqsEvent = pass;
    sqsEvent.Records[0].body = JSON.stringify({
      documentName: 'NOTSUPPORTED',
      vehicle: {},
      plate: {},
    });
    try {
      await Handler.handler(sqsEvent, undefined, () => true);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(err.message).toBe('Document Type is not supported');
    }
  });

  it('should generate the plate object', async () => {
    const sqsEvent = pass;
    sqsEvent.Records[0].body = JSON.stringify({
      documentName: 'VTG6_VTG7',
      techRecord: generateVehicle(),
      plate: request.plate,
    });

    const ministryPlateSpy = jest.spyOn(DocumentGeneration, 'getDocumentFromRequest');
    await Handler.handler(sqsEvent, undefined, () => true);
    expect(ministryPlateSpy).toHaveBeenCalledTimes(1);
  });

  describe('invokePdfGenLambda', () => {
    it('should return a 200 on successful pdf generation', async () => {
      const lambdaClient = new LambdaClient({ region: 'eu-west-1' });
      lambdaClient.middlewareStack.add(addMiddleware(<InvokeCommandOutput>{ StatusCode: 200 }));
      const res = await invokePdfGenLambda(new MinistryPlateDocument(request), 'VTG6_VTG7', lambdaClient);
      expect(res.StatusCode).toBe(200);
    });
  });

  describe('uploadPdfToS3', () => {
    it('should return a PutObjectCommandOutput on success', async () => {
      const s3Client = new S3({ region: 'eu-west-1' });
      s3Client.middlewareStack.add(addMiddleware(<PutObjectCommandOutput>{ VersionId: '1' }));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const res = await uploadPdfToS3('', {}, 'test', s3Client);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.VersionId).toBe('1');
    });
  });
});
