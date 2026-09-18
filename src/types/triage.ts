/**
 * MED-NET AI - START / SALT Field Triage & Injury Mechanics Models
 */

import { TriageTagColor } from './fhir.js';

export type MechanismOfInjury =
  | 'blast_primary'       // Overpressure wave (blast lung, perforated tympanic membrane, bowel rupture)
  | 'blast_secondary'     // Shrapnel / penetrating fragmentation
  | 'blast_tertiary'      // Blunt impact from bodily displacement against structures
  | 'blast_quaternary'    // Toxic inhalation, thermal flash burns, crush
  | 'blunt_trauma'        // MVA, structural collapse, falls
  | 'penetrating_trauma'  // Gunshot, stab, shrapnel
  | 'thermal_burn'        // Fire, radiant heat
  | 'chemical_cbrn'       // Industrial chemical spill, HazMat agent
  | 'radiation_cbrn';

export interface GlasgowComaScale {
  eyeResponse: 1 | 2 | 3 | 4;          // 1: None -> 4: Spontaneous
  verbalResponse: 1 | 2 | 3 | 4 | 5;   // 1: None -> 5: Oriented
  motorResponse: 1 | 2 | 3 | 4 | 5 | 6;// 1: None -> 6: Obeys commands
  totalScore: number;                  // 3 - 15
}

export interface FieldVitals {
  respiratoryRate: number;             // Breaths per min (Normal 12-20; START threshold >= 30)
  heartRate: number;                   // Beats per min
  systolicBP: number;                  // mmHg (START threshold: radial pulse absent or CRT > 2s)
  diastolicBP?: number;
  spO2: number;                        // Percentage (e.g., 94)
  capillaryRefillSeconds?: number;     // Seconds (<=2 is normal)
  radialPulsePresent: boolean;
  gcs: GlasgowComaScale;
  temperatureCelsius?: number;
}

export interface FieldIntervention {
  id: string;
  type:
    | 'tourniquet'
    | 'hemostatic_packing'
    | 'needle_thoracostomy'
    | 'chest_seal'
    | 'airway_reposition'
    | 'supraglottic_airway'
    | 'bag_valve_mask'
    | 'iv_io_access'
    | 'txa_administered'
    | 'decontamination';
  appliedAt: string; // ISO timestamp
  anatomicalLocation?: string;
  operatorId: string;
  notes?: string;
}

export interface BurnAssessment {
  totalBodySurfaceAreaPercentage: number; // Rule of Nines
  inhalationInjurySuspected: boolean;
  circumferentialBurn: boolean;
  degree: '1st' | '2nd' | '3rd' | '4th';
}

export interface FieldCasualty {
  casualtyId: string; // e.g. "CAS-MCI-01-RED"
  triageTag: TriageTagColor;
  triageTimestamp: string;
  triageLocation: {
    latitude: number;
    longitude: number;
    addressOrSector?: string;
  };
  ageCategory: 'infant' | 'pediatric' | 'adult' | 'geriatric';
  approximateAge?: number;
  gender: 'male' | 'female' | 'other' | 'unknown';
  mechanism: MechanismOfInjury;
  vitals: FieldVitals;
  interventions: FieldIntervention[];
  burn?: BurnAssessment;
  suspectedHazmatContamination: boolean;
  notes?: string;
  estimatedSurvivalProbability: number; // 0.0 - 1.0
  urgencyWindowMinutes: number;         // Minutes until irreversible decompensation
}
