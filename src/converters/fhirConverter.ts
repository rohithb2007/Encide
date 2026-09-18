/**
 * MED-NET AI - FHIR R4 Bidirectional Converter
 * Converts lightweight edge triage events into standard HL7 FHIR R4 bundles
 * and vice-versa for hospital EHR / HIE interoperability.
 */

import {
  FHIRDisasterPatient,
  FHIRDisasterEncounter,
  FHIRDisasterObservation,
  FHIRDisasterBundle,
} from '../types/fhir.js';
import { FieldCasualty } from '../types/triage.js';

export class FHIRDisasterConverter {
  /**
   * Converts a FieldCasualty edge record into an HL7 FHIR R4 transaction bundle
   */
  public static toFHIRBundle(casualty: FieldCasualty): FHIRDisasterBundle {
    const patientId = `pat-${casualty.casualtyId.toLowerCase()}`;
    const encounterId = `enc-${casualty.casualtyId.toLowerCase()}`;
    const obsVitalsId = `obs-vitals-${casualty.casualtyId.toLowerCase()}`;
    const obsTraumaId = `obs-trauma-${casualty.casualtyId.toLowerCase()}`;

    // 1. FHIR Patient
    const fhirPatient: FHIRDisasterPatient = {
      resourceType: 'Patient',
      id: patientId,
      active: true,
      identifier: [
        {
          use: 'temp',
          system: 'urn:mednet:triage-barcode',
          value: casualty.casualtyId,
        },
      ],
      gender: casualty.gender,
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/patient-ageCategory',
          valueString: casualty.ageCategory,
        },
        {
          url: 'urn:mednet:estimatedSurvivalProbability',
          valueDecimal: casualty.estimatedSurvivalProbability,
        },
      ],
    };

    if (casualty.approximateAge) {
      fhirPatient.extension?.push({
        url: 'urn:mednet:approximateAgeYears',
        valueInteger: casualty.approximateAge,
      });
    }

    // 2. FHIR Encounter (Emergency Triage)
    const fhirEncounter: FHIRDisasterEncounter = {
      resourceType: 'Encounter',
      id: encounterId,
      identifier: [
        {
          use: 'temp',
          system: 'urn:mednet:encounter-id',
          value: encounterId,
        },
      ],
      status: 'triaged',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'EMER',
        display: 'Emergency',
      },
      priority: {
        coding: [
          {
            system: 'urn:mednet:start-triage-category',
            code: casualty.triageTag.toUpperCase(),
            display: `START Triage Priority ${casualty.triageTag.toUpperCase()}`,
          },
        ],
        text: `Triage Tag: ${casualty.triageTag}`,
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: `Casualty ${casualty.casualtyId}`,
      },
      reasonCode: [
        {
          coding: [
            {
              system: 'urn:mednet:injury-mechanism',
              code: casualty.mechanism,
              display: casualty.mechanism.replace(/_/g, ' '),
            },
          ],
        },
      ],
      extension: [
        {
          url: 'urn:mednet:urgencyWindowMinutes',
          valueInteger: casualty.urgencyWindowMinutes,
        },
      ],
    };

    // 3. FHIR Observation (Field Physiological Vitals Panel)
    const fhirVitalsObservation: FHIRDisasterObservation = {
      resourceType: 'Observation',
      id: obsVitalsId,
      status: 'preliminary',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '85353-1',
            display: 'Vital signs, weight, height, head circumference, and oxygen saturation panel',
          },
        ],
        text: 'Disaster Field Vitals Panel',
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      encounter: {
        reference: `Encounter/${encounterId}`,
      },
      component: [
        {
          code: {
            coding: [{ system: 'http://loinc.org', code: '9279-1', display: 'Respiratory rate' }],
          },
          valueQuantity: {
            value: casualty.vitals.respiratoryRate,
            unit: 'breaths/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min',
          },
        },
        {
          code: {
            coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }],
          },
          valueQuantity: {
            value: casualty.vitals.heartRate,
            unit: 'beats/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min',
          },
        },
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8480-6',
                display: 'Systolic blood pressure',
              },
            ],
          },
          valueQuantity: {
            value: casualty.vitals.systolicBP,
            unit: 'mmHg',
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
          },
        },
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '59408-5',
                display: 'Oxygen saturation in Arterial blood by Pulse oximetry',
              },
            ],
          },
          valueQuantity: {
            value: casualty.vitals.spO2,
            unit: '%',
            system: 'http://unitsofmeasure.org',
            code: '%',
          },
        },
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '9269-2',
                display: 'Glasgow coma score total',
              },
            ],
          },
          valueQuantity: {
            value: casualty.vitals.gcs.totalScore,
            unit: 'score',
            system: 'urn:mednet:gcs',
            code: '{score}',
          },
        },
      ],
    };

    // 4. Construct Transaction Bundle
    const bundle: FHIRDisasterBundle = {
      resourceType: 'Bundle',
      id: `bundle-mci-${casualty.casualtyId.toLowerCase()}`,
      type: 'transaction',
      timestamp: casualty.triageTimestamp || new Date().toISOString(),
      entry: [
        {
          fullUrl: `urn:uuid:${patientId}`,
          resource: fhirPatient,
          request: {
            method: 'POST',
            url: 'Patient',
          },
        },
        {
          fullUrl: `urn:uuid:${encounterId}`,
          resource: fhirEncounter,
          request: {
            method: 'POST',
            url: 'Encounter',
          },
        },
        {
          fullUrl: `urn:uuid:${obsVitalsId}`,
          resource: fhirVitalsObservation,
          request: {
            method: 'POST',
            url: 'Observation',
          },
        },
      ],
    };

    return bundle;
  }
}
