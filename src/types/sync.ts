/**
 * MED-NET AI - Offline-First Mesh Synchronization Protocol
 * Designed for degraded network conditions, ad-hoc LoRa/mesh radios, and store-and-forward edge gateways.
 */

export type MeshEventType =
  | 'CASUALTY_TRIAGED'
  | 'VITALS_STREAM_UPDATE'
  | 'FIELD_INTERVENTION_LOGGED'
  | 'ROUTING_RECOMMENDATION_GENERATED'
  | 'DISPATCH_APPROVED_BY_COMMANDER'
  | 'DISPATCH_DIVERTED'
  | 'AMBULANCE_EN_ROUTE'
  | 'PATIENT_ARRIVED_ED'
  | 'HOSPITAL_CAPACITY_HEARTBEAT';

export interface VectorClock {
  [nodeId: string]: number;
}

/**
 * Tamper-evident CRDT Event Envelope for distributed edge reconciliation
 */
export interface MeshSyncEnvelope<T = unknown> {
  eventId: string;                 // UUID v4
  originNodeId: string;            // E.g. "EDGE-FIELD-MEDIC-04" or "GATEWAY-HOSP-01"
  sequenceNumber: number;          // Monotonic integer per node
  lamportTimestamp: number;        // Logical clock for causal ordering
  vectorClock: VectorClock;        // Distributed causality vector
  wallClockTimestamp: string;      // ISO-8601 UTC
  eventType: MeshEventType;
  payload: T;
  payloadHashSha256: string;       // Verification hash
  digitalSignature?: string;       // Ed25519 or HMAC-SHA256 signature
  hopCount: number;                // Routing TTL over mesh hops (e.g. max 7)
  acknowledgedByNodes: string[];   // Nodes that have gossiped/ACKed
}

/**
 * Synchronization Sync Batch for P2P reconciliation
 */
export interface MeshReconciliationRequest {
  requestingNodeId: string;
  knownVectorClock: VectorClock;
  sinceLamportTimestamp: number;
}

export interface MeshReconciliationResponse {
  responderNodeId: string;
  envelopesToApply: MeshSyncEnvelope[];
  latestVectorClock: VectorClock;
}
