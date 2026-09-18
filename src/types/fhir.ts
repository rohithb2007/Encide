/**
 * MED-NET AI - Core FHIR R4 Definitions & Disaster Profiles
 * Compliant with HL7 FHIR Release 4 (R4) with Mass Casualty Incident (MCI) Extensions.
 */

export type FHIRResourceType =
  | 'Bundle'
  | 'Patient'
  | 'Encounter'
  | 'Observation'
  | 'Location'
  | 'Device'
  | 'SupplyDelivery'
  | 'Provenance';

export interface FHIRCoding {
  system: string;
  code: string;
  display?: string;
  version?: string;
}

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

export interface FHIRIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FHIRCodeableConcept;
  system: string;
  value: string;
}

export interface FHIRReference {
  reference: string;
  type?: FHIRResourceType | string;
  display?: string;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRQuantity {
  value: number;
  unit: string;
  system?: string;
  code?: string;
}

export interface FHIRExtension {
  url: string;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueDecimal?: number;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueReference?: FHIRReference;
}

/**
 * FHIR Patient Disaster Profile
 * Accommodates anonymous disaster tags, estimated age brackets, and biological sex
 */
export interface FHIRDisasterPatient {
  resourceType: 'Patient';
  id: string;
  identifier: FHIRIdentifier[];
  active: boolean;
  name?: Array<{
    use?: 'official' | 'temp' | 'anonymous';
    text?: string;
    family?: string;
    given?: string[];
  }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  extension?: FHIRExtension[];
}

/**
 * START / SALT Triage Acuity Tagging
 */
export type TriageTagColor = 'red' | 'yellow' | 'green' | 'black';

export type EncounterStatus =
  | 'planned'
  | 'arrived'
  | 'triaged'
  | 'in-progress'
  | 'onleave'
  | 'finished'
  | 'cancelled'
  | 'entered-in-error'
  | 'unknown';

export interface FHIRDisasterEncounter {
  resourceType: 'Encounter';
  id: string;
  identifier?: FHIRIdentifier[];
  status: EncounterStatus;
  class: FHIRCoding;
  priority?: FHIRCodeableConcept;
  subject: FHIRReference; // Ref to Patient
  serviceProvider?: FHIRReference; // Ref to Location/Hospital
  period?: FHIRPeriod;
  reasonCode?: FHIRCodeableConcept[];
  extension?: FHIRExtension[];
}

export interface FHIRDisasterObservation {
  resourceType: 'Observation';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  valueQuantity?: FHIRQuantity;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueString?: string;
  component?: Array<{
    code: FHIRCodeableConcept;
    valueQuantity?: FHIRQuantity;
    valueCodeableConcept?: FHIRCodeableConcept;
  }>;
}

export interface FHIRDisasterBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'transaction' | 'collection' | 'batch' | 'document';
  timestamp: string;
  total?: number;
  entry: Array<{
    fullUrl: string;
    resource: FHIRDisasterPatient | FHIRDisasterEncounter | FHIRDisasterObservation | unknown;
    request?: {
      method: 'POST' | 'PUT' | 'GET';
      url: string;
    };
  }>;
}
