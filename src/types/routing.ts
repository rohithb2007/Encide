/**
 * MED-NET AI - Routing Recommendations & Explainable AI (XAI) Schema
 */

import { TriageTagColor } from './fhir.js';
import { HospitalNode } from './hospital.js';

export interface FactorBreakdown {
  factor: string;
  weight: number;
  scoreContribution: number; // Positive = favorable, Negative = penalty
  humanReadableNote: string;
}

export interface RoutingJustificationXAI {
  primaryRationale: string;
  contributingFactors: FactorBreakdown[];
  criticalAlerts: string[];  // E.g., "O-neg blood below safety threshold at destination"
  alternativeHospitalConsidered?: {
    hospitalId: string;
    hospitalName: string;
    rejectionReason: string;
  };
}

export interface RankedHospitalRecommendation {
  rank: number;                  // 1 = Top recommended
  hospitalId: string;
  hospitalName: string;
  hospitalTraumaLevel: string;
  estimatedTransitTimeMinutes: number;
  transitDistanceKm: number;
  routeCongestionLevel: 'clear' | 'moderate' | 'heavy' | 'road_damaged';
  availableTargetBeds: number;
  availableTargetORs: number;
  bloodStockStatus: 'adequate' | 'strained' | 'critical_low';
  compositeSuitabilityScore: number; // Normalized 0 - 100
  xaiJustification: RoutingJustificationXAI;
}

export type CommanderDecisionStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'OVERRIDDEN'
  | 'DIVERTED_IN_TRANSIT';

export interface IncidentCommanderDispatchOrder {
  orderId: string;
  casualtyId: string;
  triageTag: TriageTagColor;
  recommendedRankings: RankedHospitalRecommendation[];
  selectedHospitalId: string;
  commanderStatus: CommanderDecisionStatus;
  commanderId?: string;
  commanderOverrideReason?: string;
  orderTimestamp: string;
  decidedTimestamp?: string;
  assignedAmbulanceUnitId?: string;
}
