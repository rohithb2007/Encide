/**
 * MED-NET AI - Runtime Zod Schemas for HL7 FHIR Disaster Profiles & Field Triage
 */

import { z } from 'zod';

export const FHIRCodingSchema = z.object({
  system: z.string(),
  code: z.string(),
  display: z.string().optional(),
  version: z.string().optional(),
});

export const FHIRCodeableConceptSchema = z.object({
  coding: z.array(FHIRCodingSchema).optional(),
  text: z.string().optional(),
});

export const FHIRIdentifierSchema = z.object({
  use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
  type: FHIRCodeableConceptSchema.optional(),
  system: z.string(),
  value: z.string(),
});

export const FHIRReferenceSchema = z.object({
  reference: z.string(),
  type: z.string().optional(),
  display: z.string().optional(),
});

export const FHIRPeriodSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

export const FHIRQuantitySchema = z.object({
  value: z.number(),
  unit: z.string(),
  system: z.string().optional(),
  code: z.string().optional(),
});

export const FHIRExtensionSchema = z.object({
  url: z.string(),
  valueString: z.string().optional(),
  valueBoolean: z.boolean().optional(),
  valueInteger: z.number().int().optional(),
  valueDecimal: z.number().optional(),
  valueCodeableConcept: FHIRCodeableConceptSchema.optional(),
  valueReference: FHIRReferenceSchema.optional(),
});

/**
 * FHIR Patient Disaster Profile Validator
 */
export const FHIRDisasterPatientSchema = z.object({
  resourceType: z.literal('Patient'),
  id: z.string(),
  identifier: z.array(FHIRIdentifierSchema).min(1),
  active: z.boolean(),
  name: z
    .array(
      z.object({
        use: z.enum(['official', 'temp', 'anonymous']).optional(),
        text: z.string().optional(),
        family: z.string().optional(),
        given: z.array(z.string()).optional(),
      })
    )
    .optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']),
  birthDate: z.string().optional(),
  deceasedBoolean: z.boolean().optional(),
  deceasedDateTime: z.string().optional(),
  extension: z.array(FHIRExtensionSchema).optional(),
});

/**
 * FHIR Encounter Disaster Profile Validator
 */
export const EncounterStatusSchema = z.enum([
  'planned',
  'arrived',
  'triaged',
  'in-progress',
  'onleave',
  'finished',
  'cancelled',
  'entered-in-error',
  'unknown',
]);

export const FHIRDisasterEncounterSchema = z.object({
  resourceType: z.literal('Encounter'),
  id: z.string(),
  identifier: z.array(FHIRIdentifierSchema).optional(),
  status: EncounterStatusSchema,
  class: FHIRCodingSchema,
  priority: FHIRCodeableConceptSchema.optional(),
  subject: FHIRReferenceSchema,
  serviceProvider: FHIRReferenceSchema.optional(),
  period: FHIRPeriodSchema.optional(),
  reasonCode: z.array(FHIRCodeableConceptSchema).optional(),
  extension: z.array(FHIRExtensionSchema).optional(),
});

/**
 * Field Casualty START Triage Schemas
 */
export const TriageTagColorSchema = z.enum(['red', 'yellow', 'green', 'black']);

export const MechanismOfInjurySchema = z.enum([
  'blast_primary',
  'blast_secondary',
  'blast_tertiary',
  'blast_quaternary',
  'blunt_trauma',
  'penetrating_trauma',
  'thermal_burn',
  'chemical_cbrn',
  'radiation_cbrn',
]);

export const GlasgowComaScaleSchema = z.object({
  eyeResponse: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  verbalResponse: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  motorResponse: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  totalScore: z.number().int().min(3).max(15),
});

export const FieldVitalsSchema = z.object({
  respiratoryRate: z.number(),
  heartRate: z.number(),
  systolicBP: z.number(),
  diastolicBP: z.number().optional(),
  spO2: z.number(),
  capillaryRefillSeconds: z.number().optional(),
  radialPulsePresent: z.boolean(),
  gcs: GlasgowComaScaleSchema,
  temperatureCelsius: z.number().optional(),
});

export const FieldInterventionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'tourniquet',
    'hemostatic_packing',
    'needle_thoracostomy',
    'chest_seal',
    'airway_reposition',
    'supraglottic_airway',
    'bag_valve_mask',
    'iv_io_access',
    'txa_administered',
    'decontamination',
  ]),
  appliedAt: z.string(),
  anatomicalLocation: z.string().optional(),
  operatorId: z.string(),
  notes: z.string().optional(),
});

export const BurnAssessmentSchema = z.object({
  totalBodySurfaceAreaPercentage: z.number().min(0).max(100),
  inhalationInjurySuspected: z.boolean(),
  circumferentialBurn: z.boolean(),
  degree: z.enum(['1st', '2nd', '3rd', '4th']),
});

export const FieldCasualtySchema = z.object({
  casualtyId: z.string(),
  triageTag: TriageTagColorSchema,
  triageTimestamp: z.string(),
  triageLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    addressOrSector: z.string().optional(),
  }),
  ageCategory: z.enum(['infant', 'pediatric', 'adult', 'geriatric']),
  approximateAge: z.number().optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']),
  mechanism: MechanismOfInjurySchema,
  vitals: FieldVitalsSchema,
  interventions: z.array(FieldInterventionSchema),
  burn: BurnAssessmentSchema.optional(),
  suspectedHazmatContamination: z.boolean(),
  notes: z.string().optional(),
  estimatedSurvivalProbability: z.number().min(0).max(1),
  urgencyWindowMinutes: z.number(),
});

/**
 * Regional Hospital & Telemetry Schemas
 */
export const TraumaCenterLevelSchema = z.enum([
  'Level_I',
  'Level_II',
  'Level_III',
  'Level_IV',
  'Non_Trauma',
]);

export const HospitalOperationalStatusSchema = z.enum([
  'normal',
  'surge_phase_1',
  'surge_phase_2',
  'divert_code_black',
  'evacuating',
]);

export const HospitalNodeSchema = z.object({
  id: z.string(),
  fhirLocationId: z.string(),
  name: z.string(),
  shortCode: z.string(),
  address: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
    elevationMeters: z.number().optional(),
  }),
  capabilities: z.object({
    traumaLevel: TraumaCenterLevelSchema,
    burnCenter: z.boolean(),
    pediatricICU: z.boolean(),
    neurosurgeryOnSite: z.boolean(),
    cardiothoracicSurgicalTeam: z.boolean(),
    hyperbaricChamber: z.boolean(),
    decontaminationHazardCapable: z.boolean(),
    massCasualtyDecontaminationThroughputPerHour: z.number(),
    helipadOperational: z.boolean(),
  }),
  status: HospitalOperationalStatusSchema,
  capacity: z.object({
    adultICU: z.object({
      total: z.number(),
      occupied: z.number(),
      available: z.number(),
      surgeExpandable: z.number(),
    }),
    pediatricICU: z.object({
      total: z.number(),
      occupied: z.number(),
      available: z.number(),
    }),
    emergencyDepartmentBeds: z.object({
      total: z.number(),
      occupied: z.number(),
      available: z.number(),
    }),
    negativePressureIsolation: z.object({
      total: z.number(),
      occupied: z.number(),
      available: z.number(),
    }),
  }),
  surgical: z.object({
    totalOperatingRooms: z.number(),
    activeSurgeries: z.number(),
    availableStaffedTraumaTeams: z.number(),
    averageSurgicalTurnaroundMinutes: z.number(),
    scheduledSurgeriesPended: z.number(),
  }),
  bloodBank: z.object({
    lastUpdated: z.string(),
    unitsOnegativePRBC: z.number(),
    unitsOpositivePRBC: z.number(),
    unitsFreshFrozenPlasma: z.number(),
    unitsPlatelets: z.number(),
    unitsCryoprecipitate: z.number(),
    massiveTransfusionProtocolPacksAvailable: z.number(),
  }),
  equipment: z.object({
    mechanicalVentilatorsAvailable: z.number(),
    dialysisMachinesAvailable: z.number(),
    ecmoCircuitsAvailable: z.number(),
    operationalCTScanners: z.number(),
    portableXRayUnits: z.number(),
  }),
});

/**
 * Mesh Envelope Schema
 */
export const MeshSyncEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  originNodeId: z.string(),
  sequenceNumber: z.number().int().nonnegative(),
  lamportTimestamp: z.number().int().nonnegative(),
  vectorClock: z.record(z.string(), z.number()),
  wallClockTimestamp: z.string(),
  eventType: z.string(),
  payload: z.unknown(),
  payloadHashSha256: z.string().length(64),
  digitalSignature: z.string().optional(),
  hopCount: z.number().int().min(0).max(15),
  acknowledgedByNodes: z.array(z.string()),
});
