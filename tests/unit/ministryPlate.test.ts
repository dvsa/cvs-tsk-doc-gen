// import { ReasonForIssue } from "../../src/enums/reasonForIssue.enum";
import { DocumentName } from '../../src/enums/documentName.enum';
import { ReasonForIssue } from '../../src/enums/reasonForIssue.enum';
import { MinistryPlateDocument } from '../../src/models/ministryPlate';
import { Request } from '../../src/models/request';
import { IAxle } from '../../src/models/vehicleTechRecord';
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
    request.techRecord.techRecord_axles = [
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
      {
        tyres_tyreSize: '9',
        tyres_plyRating: '9',
        tyres_fitmentCode: '9',
        weights_gbWeight: 999,
        weights_eecWeight: 999,
        weights_designWeight: 999,
      },
    ] as IAxle[];
    const document = new MinistryPlateDocument(request);
    expect(document.PLATES_DATA.axles.axle4.weights.gbWeight).toBe('123');
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
    request.techRecord.techRecord_axles = [] as IAxle[];
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should handle 1 axle', () => {
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should handle 2 axles', () => {
    request.techRecord.techRecord_axles = [
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
    ] as IAxle[];
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should handle 3 axles', () => {
    request.techRecord.techRecord_axles = [
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
    ] as IAxle[];
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
    ] as IAxle[];
    const document = new MinistryPlateDocument(request);
    expect(document).toBeTruthy();
  });

  it('should create attributes if vehicle is missing properties', () => {
    request.techRecord.techRecord_vehicleType = 'trl';
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
