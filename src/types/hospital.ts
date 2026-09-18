/**
 * MED-NET AI - Regional Hospital & Specialized Resource Telemetry Models
 */

export type TraumaCenterLevel = 'Level_I' | 'Level_II' | 'Level_III' | 'Level_IV' | 'Non_Trauma';

export type HospitalOperationalStatus =
  | 'normal'
  | 'surge_phase_1'  // Electives cancelled, minor surge expansion
  | 'surge_phase_2'  // Critical surge, PACU converted to ICU
  | 'divert_code_black' // Divert status, severe physical infrastructure failure / capacity ceiling
  | 'evacuating';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  elevationMeters?: number;
}

export interface SpecializedCapabilities {
  traumaLevel: TraumaCenterLevel;
  burnCenter: boolean;
  pediatricICU: boolean;
  neurosurgeryOnSite: boolean;
  cardiothoracicSurgicalTeam: boolean;
  hyperbaricChamber: boolean;
  decontaminationHazardCapable: boolean;
  massCasualtyDecontaminationThroughputPerHour: number;
  helipadOperational: boolean;
}

export interface BedCapacityTelemetry {
  adultICU: {
    total: number;
    occupied: number;
    available: number;
    surgeExpandable: number;
  };
  pediatricICU: {
    total: number;
    occupied: number;
    available: number;
  };
  emergencyDepartmentBeds: {
    total: number;
    occupied: number;
    available: number;
  };
  negativePressureIsolation: {
    total: number;
    occupied: number;
    available: number;
  };
}

export interface SurgicalSuiteTelemetry {
  totalOperatingRooms: number;
  activeSurgeries: number;
  availableStaffedTraumaTeams: number;
  averageSurgicalTurnaroundMinutes: number;
  scheduledSurgeriesPended: number;
}

export interface BloodBankTelemetry {
  lastUpdated: string;
  unitsOnegativePRBC: number;     // Critical universal emergency release donor
  unitsOpositivePRBC: number;
  unitsFreshFrozenPlasma: number; // FFP
  unitsPlatelets: number;
  unitsCryoprecipitate: number;
  massiveTransfusionProtocolPacksAvailable: number;
}

export interface EquipmentTelemetry {
  mechanicalVentilatorsAvailable: number;
  dialysisMachinesAvailable: number;
  ecmoCircuitsAvailable: number;
  operationalCTScanners: number;
  portableXRayUnits: number;
}

export interface HospitalNode {
  id: string; // e.g. "HOSP-METRO-01"
  fhirLocationId: string;
  name: string;
  shortCode: string;
  address: string;
  coordinates: GeoLocation;
  capabilities: SpecializedCapabilities;
  status: HospitalOperationalStatus;
  capacity: BedCapacityTelemetry;
  surgical: SurgicalSuiteTelemetry;
  bloodBank: BloodBankTelemetry;
  equipment: EquipmentTelemetry;
}
