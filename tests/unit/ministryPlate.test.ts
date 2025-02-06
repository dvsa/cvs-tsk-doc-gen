// import { ReasonForIssue } from "../../src/enums/reasonForIssue.enum";
import { HGVAxles } from '@dvsa/cvs-type-definitions/types/v3/tech-record/get/hgv/complete';
import { TechRecordType } from '@dvsa/cvs-type-definitions/types/v3/tech-record/tech-record-verb-vehicle-type';
import { DocumentName } from '../../src/enums/documentName.enum';
import { ReasonForIssue } from '../../src/enums/reasonForIssue.enum';
import { MinistryPlateDocument } from '../../src/models/ministryPlate';
import { Request } from '../../src/models/request';
import { generateVehicle } from './unitTestUtils';

describe('Document Model tests', () => {
  let request: Request;

  beforeEach(() => {
    request = {
      documentName: DocumentName.MINISTRY,
      techRecord: generateVehicle(),
      recipientEmailAddress: 'customer@example.com',
      plate: {
        plateSerialNumber: '12345',
        plateIssueDate: '2023-02-27T12:34:56.789Z',
        plateReasonForIssue: ReasonForIssue.DESTROYED,
        plateIssuer: 'user',
      },
    };
  });

  it('should convert a request into a Ministry Plate Document', () => {
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should only populate 4 axles if there are more on the vehicle', () => {
    (request.techRecord as TechRecordType<'hgv', 'get'>).techRecord_axles = [
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 321,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '9',
        tyres_plyRating: '9',
        tyres_fitmentCode: '9',
        weights_gbWeight: 999,
        weights_eecWeight: 999,
        weights_designWeight: 999,
      },
    ] as unknown as HGVAxles[];
    const document = new MinistryPlateDocument(request);
    expect(document.PLATES_DATA.axles.axle4.weights.gbWeight).toBe('321');
  });

  it('should order axles by axle number', () => {
    (request.techRecord as TechRecordType<'hgv', 'get'>).techRecord_axles = [
      {
        axleNumber: 4,
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 4,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        axleNumber: 2,
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 2,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        axleNumber: 1,
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 1,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        axleNumber: 3,
        tyres_tyreSize: '9',
        tyres_plyRating: '9',
        tyres_fitmentCode: '9',
        weights_gbWeight: 3,
        weights_eecWeight: 999,
        weights_designWeight: 999,
      },
    ] as unknown as HGVAxles[];
    const document = new MinistryPlateDocument(request);
    expect(document.PLATES_DATA.axles.axle4.weights.gbWeight).toBe('4');
    expect(document.PLATES_DATA.axles.axle3.weights.gbWeight).toBe('3');
    expect(document.PLATES_DATA.axles.axle2.weights.gbWeight).toBe('2');
    expect(document.PLATES_DATA.axles.axle1.weights.gbWeight).toBe('1');
  });

  it('should remain order if no axle number and not fail', () => {
    (request.techRecord as TechRecordType<'hgv', 'get'>).techRecord_axles = [
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 1,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 2,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 3,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '9',
        tyres_plyRating: '9',
        tyres_fitmentCode: '9',
        weights_gbWeight: 4,
        weights_eecWeight: 999,
        weights_designWeight: 999,
      },
    ] as unknown as HGVAxles[];
    const document = new MinistryPlateDocument(request);
    expect(document.PLATES_DATA.axles.axle4.weights.gbWeight).toBe('4');
    expect(document.PLATES_DATA.axles.axle3.weights.gbWeight).toBe('3');
    expect(document.PLATES_DATA.axles.axle2.weights.gbWeight).toBe('2');
    expect(document.PLATES_DATA.axles.axle1.weights.gbWeight).toBe('1');
  });

  it('should not fail if no axles present', () => {
    (request.techRecord as TechRecordType<'hgv', 'get'>).techRecord_axles = null as unknown as HGVAxles[];
    const document = new MinistryPlateDocument(request);
    expect(document.PLATES_DATA.axles.axle1).toStrictEqual({});
  });

  it('should apply no water mark for prod', () => {
    process.env.BRANCH = 'prod';
    const document = new MinistryPlateDocument(request);
    expect(document.Watermark).toBe('');
  });

  it('should have trl attributes if vehicle is a trailer', () => {
    request.techRecord.techRecord_vehicleType = 'trl';
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should handle 0 axles', () => {
    (request.techRecord as TechRecordType<'hgv', 'get'>).techRecord_axles = [] as HGVAxles[];
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should handle 1 axle', () => {
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should handle 2 axles', () => {
    (request.techRecord as TechRecordType<'hgv', 'get'>).techRecord_axles = [
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
    ] as unknown as HGVAxles[];
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should handle 3 axles', () => {
    (request.techRecord as TechRecordType<'hgv', 'get'>).techRecord_axles = [
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
    ] as unknown as HGVAxles[];
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should handle 4 axles', () => {
    const vehicle = generateVehicle();
    vehicle.techRecord_axles = [
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
      {
        tyres_tyreSize: '1',
        tyres_plyRating: '2',
        tyres_fitmentCode: '3',
        weights_gbWeight: 123,
        weights_eecWeight: 123,
        weights_designWeight: 123,
      },
    ] as unknown as HGVAxles[];
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should create attributes if vehicle is missing properties', () => {
    request.techRecord.techRecord_vehicleType = 'hgv';
    if (request.techRecord.techRecord_vehicleType === 'hgv') {
      request.techRecord.techRecord_manufactureYear = undefined;
      request.techRecord.techRecord_grossGbWeight = undefined;
      request.techRecord.techRecord_grossEecWeight = undefined;
      request.techRecord.techRecord_grossDesignWeight = undefined;
      request.techRecord.techRecord_trainGbWeight = undefined;
      request.techRecord.techRecord_trainEecWeight = undefined;
      request.techRecord.techRecord_trainDesignWeight = undefined;
      request.techRecord.techRecord_maxTrainGbWeight = undefined;
      request.techRecord.techRecord_maxTrainEecWeight = undefined;
      request.techRecord.techRecord_dimensions_length = undefined;
      request.techRecord.techRecord_dimensions_width = undefined;
    }
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should add S3 metadata', () => {
    process.env.DOCUMENT_LINK_URL = 'https://unit-testing.jest.example.com/metadata/documents/';

    const document = new MinistryPlateDocument(request);

    expect(document.metaData['document-type']).toBe(DocumentName.MINISTRY);
    expect(document.metaData['date-of-issue']).toBe('27/02/2023');
    expect(document.metaData.email).toBe(request.recipientEmailAddress);
  });
});
