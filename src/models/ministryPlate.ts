import { HGVAxles } from '@dvsa/cvs-type-definitions/types/v3/tech-record/get/hgv/complete';
import { TRLAxles } from '@dvsa/cvs-type-definitions/types/v3/tech-record/get/trl/complete';
import { DocumentName } from '../enums/documentName.enum';
import { VehicleType } from '../enums/vehicleType.enum';
import { DocumentModel } from './documentModel';
import { Request } from './request';
import { VehicleConfiguration } from './vehicleTechRecord';

export type MinistryPlate = {
  plateSerialNumber: string;
  dtpNumber: string;
  primaryVrm: string;
  vin: string;
  variantNumber: string;
  approvalTypeNumber: string;
  make: string;
  model: string;
  speedLimiterMrk: string;
  functionCode: string;
  regnDate: string;
  manufactureYear: string;
  grossGbWeight: string;
  grossEecWeight: string;
  grossDesignWeight: string;
  trainGbWeight: string;
  trainEecWeight: string;
  trainDesignWeight: string;
  maxTrainGbWeight: string;
  maxTrainEecWeight: string;
  maxLoadOnCoupling: string;
  dimensionLength: string;
  dimensionWidth: string;
  frontVehicleTo5thWheelCouplingMin: string;
  frontVehicleTo5thWheelCouplingMax: string;
  couplingCenterToRearTrlMax: string;
  couplingCenterToRearTrlMin: string;
  plateIssueDate: string;
  tyreUseCode: string;
  axles: Axles;
};

export type Axles = {
  axle1: Axle;
  axle2: Axle;
  axle3: Axle;
  axle4: Axle;
};

type Axle = {
  weights: Weight;
  tyres: Tyre;
};

type Weight = {
  gbWeight: string;
  eecWeight: string;
  designWeight: string;
};

type Tyre = {
  tyreSize: string;
  plyRating: string;
  fitmentCode: string;
};

export class MinistryPlateDocument extends DocumentModel {
  constructor(request: Request) {
    super(request.recipientEmailAddress);
    const { techRecord, plate } = request;

    this.setDocumentType(DocumentName.MINISTRY);
    this.filename = `plate_${plate.plateSerialNumber}`;
    this.setDateOfIssue(plate.plateIssueDate);

    const generateTrlEec = techRecord.techRecord_vehicleType === VehicleType.HGV
      || !!(
        techRecord.techRecord_vehicleType === VehicleType.TRL
        && techRecord.techRecord_couplingCenterToRearAxleMax <= this.trlEecWeightLimit
      );

    const plateData: Partial<MinistryPlate> = techRecord.techRecord_vehicleType !== VehicleType.LGV
      ? {
        plateSerialNumber: plate.plateSerialNumber,
        dtpNumber: techRecord.techRecord_brakes_dtpNumber,
        primaryVrm: techRecord.techRecord_vehicleType === 'hgv' ? techRecord.primaryVrm : techRecord.trailerId,
        vin: techRecord.vin,
        variantNumber: techRecord.techRecord_variantNumber,
        approvalTypeNumber: techRecord.techRecord_approvalTypeNumber,
        functionCode: this.calculateFunctionCode(
          techRecord.techRecord_vehicleType,
          techRecord.techRecord_roadFriendly,
          techRecord.techRecord_vehicleConfiguration,
        ),
        make: techRecord.techRecord_make,
        model: techRecord.techRecord_model,
        regnDate: techRecord.techRecord_regnDate,
        manufactureYear: techRecord.techRecord_manufactureYear?.toString(),
        grossGbWeight: techRecord.techRecord_grossGbWeight?.toString(),
        grossEecWeight: generateTrlEec ? techRecord.techRecord_grossEecWeight?.toString() : null,
        grossDesignWeight: techRecord.techRecord_grossDesignWeight?.toString(),
        trainGbWeight:
              techRecord.techRecord_vehicleType === 'hgv' ? techRecord.techRecord_trainGbWeight?.toString() : null,
        trainEecWeight:
              generateTrlEec && techRecord.techRecord_vehicleType === 'hgv'
                ? techRecord.techRecord_trainEecWeight?.toString()
                : null,
        trainDesignWeight:
              techRecord.techRecord_vehicleType === 'hgv' ? techRecord.techRecord_trainDesignWeight?.toString() : null,
        maxTrainGbWeight:
              techRecord.techRecord_vehicleType === 'hgv' ? techRecord.techRecord_maxTrainGbWeight?.toString() : null,
        maxTrainEecWeight:
              generateTrlEec && techRecord.techRecord_vehicleType === 'hgv'
                ? techRecord.techRecord_maxTrainEecWeight?.toString()
                : null,
        dimensionLength: techRecord.techRecord_dimensions_length?.toString(),
        dimensionWidth: techRecord.techRecord_dimensions_width?.toString(),
        plateIssueDate: plate.plateIssueDate,
        tyreUseCode: techRecord.techRecord_tyreUseCode,
        axles: this.populateAxles(
          techRecord.techRecord_vehicleType === 'hgv'
            ? (techRecord.techRecord_axles as HGVAxles[]) ?? []
            : (techRecord.techRecord_axles as TRLAxles[]) ?? [],
          generateTrlEec,
        ),
      }
      : {};

    if (techRecord.techRecord_vehicleType === VehicleType.HGV) {
      plateData.frontVehicleTo5thWheelCouplingMin = techRecord.techRecord_frontVehicleTo5thWheelCouplingMin?.toString();
      plateData.frontVehicleTo5thWheelCouplingMax = techRecord.techRecord_frontVehicleTo5thWheelCouplingMax?.toString();
      plateData.speedLimiterMrk = techRecord.techRecord_speedLimiterMrk ? 'Yes' : 'No';
    }

    if (techRecord.techRecord_vehicleType === VehicleType.TRL) {
      plateData.maxLoadOnCoupling = techRecord.techRecord_maxLoadOnCoupling?.toString();
      plateData.couplingCenterToRearTrlMax = techRecord.techRecord_couplingCenterToRearTrlMax?.toString();
      plateData.couplingCenterToRearTrlMin = techRecord.techRecord_couplingCenterToRearTrlMin?.toString();
    }

    this.PLATES_DATA = plateData as MinistryPlate;
    this.Reissue = { Reason: plate.plateReasonForIssue };

    // S3 metadata
    this.metaData.vrm = techRecord.techRecord_vehicleType === 'trl' ? techRecord.trailerId : techRecord.primaryVrm;
  }

  private trlEecWeightLimit = 12000;

  private populateAxles = (axles: HGVAxles[] | TRLAxles[], generateTrlEec: boolean): Axles => {
    const plateAxles: Axles = {
      axle1: {},
      axle2: {},
      axle3: {},
      axle4: {},
    } as Axles;
    const terminatingCondition = Math.min(axles.length, 4);
    const sortedAxles = axles.sort((a, b) => a.axleNumber - b.axleNumber);
    for (let i = 0; i < terminatingCondition; i++) {
      plateAxles[`axle${i + 1}`] = {
        weights: {
          gbWeight: sortedAxles[i].weights_gbWeight?.toString(),
          eecWeight: generateTrlEec ? sortedAxles[i].weights_eecWeight?.toString() : null,
          designWeight: sortedAxles[i].weights_designWeight?.toString(),
        },
        tyres: {
          tyreSize: sortedAxles[i].tyres_tyreSize,
          plyRating: sortedAxles[i].tyres_dataTrAxles ?? sortedAxles[i].tyres_plyRating,
          fitmentCode: sortedAxles[i].tyres_fitmentCode,
        },
      };
    }
    return plateAxles;
  };

  private calculateFunctionCode(vehicleType, roadFriendlySuspension, vehicleConfiguration): string {
    if (vehicleType === VehicleType.TRL && roadFriendlySuspension) {
      return 'R';
    }

    if (vehicleType === VehicleType.HGV) {
      let functionCode: string | null;

      if (vehicleConfiguration === VehicleConfiguration.ARTICULATED) {
        functionCode = 'ARTIC';
      }

      if (vehicleConfiguration === VehicleConfiguration.RIGID) {
        functionCode = 'RIGID';
      }

      if (roadFriendlySuspension) {
        functionCode += ' R';
      }
      return functionCode;
    }

    return null;
  }

  Reissue?: {
    Reason: string;
  };

  PLATES_DATA: MinistryPlate;

  Watermark: string;
}
