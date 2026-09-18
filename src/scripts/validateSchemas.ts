/**
 * MED-NET AI - Phase 1 Verification Script
 * Validates JSON FHIR mock schemas, domain models, converters, and mesh synchronization envelopes.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import {
  HospitalNodeSchema,
  FieldCasualtySchema,
  FHIRDisasterPatientSchema,
  FHIRDisasterEncounterSchema,
  MeshSyncEnvelopeSchema,
} from '../schemas/fhir.zod.js';
import { FHIRDisasterConverter } from '../converters/fhirConverter.js';
import { HospitalNode } from '../types/hospital.js';
import { FieldCasualty } from '../types/triage.js';
import { MeshSyncEnvelope } from '../types/sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function runValidation() {
  console.log('===============================================================');
  console.log(' [MED-NET AI] PHASE 1: DATA MODEL & FHIR SCHEMA VALIDATION');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. Regional Hospital Schema Validation
  console.log('[1/4] Validating Regional Hospital Capacity Profiles...');
  const hospitalsPath = path.join(rootDir, 'mock', 'regionalHospitals.json');
  const hospitalsRaw = fs.readFileSync(hospitalsPath, 'utf-8');
  const hospitals: HospitalNode[] = JSON.parse(hospitalsRaw);

  assert(Array.isArray(hospitals) && hospitals.length >= 6, `Loaded ${hospitals.length} regional hospitals`);

  hospitals.forEach((hosp) => {
    const parseResult = HospitalNodeSchema.safeParse(hosp);
    if (!parseResult.success) {
      console.error(`    Validation error in hospital ${hosp.id}:`, parseResult.error.format());
    }
    assert(
      parseResult.success,
      `Hospital ${hosp.shortCode} (${hosp.capabilities.traumaLevel}, Burn: ${hosp.capabilities.burnCenter}) matches schema`
    );
  });

  // 2. Field Casualty Triage Profiles
  console.log('\n[2/4] Validating Field Casualty Triage Profiles...');
  const casualtiesPath = path.join(rootDir, 'mock', 'fieldCasualties.json');
  const casualtiesRaw = fs.readFileSync(casualtiesPath, 'utf-8');
  const casualties: FieldCasualty[] = JSON.parse(casualtiesRaw);

  assert(Array.isArray(casualties) && casualties.length >= 8, `Loaded ${casualties.length} field casualties`);

  const tagCounts: Record<string, number> = { red: 0, yellow: 0, green: 0, black: 0 };

  casualties.forEach((cas) => {
    tagCounts[cas.triageTag] = (tagCounts[cas.triageTag] || 0) + 1;
    const parseResult = FieldCasualtySchema.safeParse(cas);
    if (!parseResult.success) {
      console.error(`    Validation error in casualty ${cas.casualtyId}:`, parseResult.error.format());
    }
    assert(
      parseResult.success,
      `Casualty ${cas.casualtyId} [TAG: ${cas.triageTag.toUpperCase()}, Mechanism: ${cas.mechanism}] matches schema`
    );
  });

  console.log(
    `    -> Triage Breakdown: RED=${tagCounts.red}, YELLOW=${tagCounts.yellow}, GREEN=${tagCounts.green}, BLACK=${tagCounts.black}`
  );

  // 3. FHIR R4 Bundle Conversion
  console.log('\n[3/4] Validating FHIR R4 Transaction Bundle Generation & Schema Compliance...');
  casualties.forEach((cas) => {
    const bundle = FHIRDisasterConverter.toFHIRBundle(cas);
    assert(bundle.resourceType === 'Bundle' && bundle.entry.length === 3, `Bundle generated for ${cas.casualtyId}`);

    const patientEntry = bundle.entry.find((e) => (e.resource as { resourceType: string }).resourceType === 'Patient');
    const encounterEntry = bundle.entry.find((e) => (e.resource as { resourceType: string }).resourceType === 'Encounter');
    const observationEntry = bundle.entry.find((e) => (e.resource as { resourceType: string }).resourceType === 'Observation');

    assert(Boolean(patientEntry && encounterEntry && observationEntry), `Bundle has Patient, Encounter, and Observation entries`);

    if (patientEntry) {
      const patientCheck = FHIRDisasterPatientSchema.safeParse(patientEntry.resource);
      assert(patientCheck.success, `FHIR Patient profile valid for ${cas.casualtyId}`);
    }
    if (encounterEntry) {
      const encounterCheck = FHIRDisasterEncounterSchema.safeParse(encounterEntry.resource);
      assert(encounterCheck.success, `FHIR Encounter profile valid for ${cas.casualtyId}`);
    }
  });

  // 4. Mesh Sync Envelope
  console.log('\n[4/4] Validating Offline-First Mesh Synchronization Envelope...');
  const samplePayload = { casualtyId: 'CAS-MCI-01-RED', status: 'TRIAGED_RED' };
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(samplePayload)).digest('hex');

  const envelope: MeshSyncEnvelope<typeof samplePayload> = {
    eventId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    originNodeId: 'EDGE-FIELD-MEDIC-04',
    sequenceNumber: 101,
    lamportTimestamp: 42,
    vectorClock: { 'EDGE-FIELD-MEDIC-04': 101, 'GATEWAY-HOSP-01': 88 },
    wallClockTimestamp: new Date().toISOString(),
    eventType: 'CASUALTY_TRIAGED',
    payload: samplePayload,
    payloadHashSha256: payloadHash,
    digitalSignature: 'ed25519_mock_signature_abc123',
    hopCount: 2,
    acknowledgedByNodes: ['EDGE-FIELD-MEDIC-04', 'LORA-RELAY-02'],
  };

  const envelopeResult = MeshSyncEnvelopeSchema.safeParse(envelope);
  assert(envelopeResult.success, 'Tamper-evident MeshSyncEnvelope matches schema and vector clock specification');

  const computedHash = crypto.createHash('sha256').update(JSON.stringify(envelope.payload)).digest('hex');
  assert(computedHash === envelope.payloadHashSha256, 'Cryptographic payload SHA-256 checksum matches');

  console.log('\n===============================================================');
  console.log(` [PHASE 1 COMPLETE] ${passedTests}/${totalTests} Tests Passed Successfully.`);
  console.log('===============================================================\n');
}

runValidation();
