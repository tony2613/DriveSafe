/**
 * DriveSafe SDK - Enterprise Telematics & UI Enforcement Layer
 * Core Type Definitions
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  name?: string;
  radiusMeters?: number;
}

export interface HotspotZone extends GeoCoordinate {
  id: string;
  name: string;
  radiusMeters: number;
  riskWeight: number; // 1-5 scale
}

export interface TelematicsReading {
  timestamp: number;
  speedKmh: number;
  accelerometerG: { x: number; y: number; z: number };
  latitude: number;
  longitude: number;
  headingDeg?: number;
}

export type StrikeSeverity = 'WARNING' | 'RATING_PENALTY' | 'ZERO_TOLERANCE_PENALTY';

export interface InfractionEvent {
  id: string;
  timestamp: number;
  speedKmh: number;
  touchX: number;
  touchY: number;
  blockedTargetId?: string;
  inHotspot: boolean;
  hotspotName?: string;
  strikeNumber: number;
  actionTaken: StrikeSeverity;
}

export interface DriveSafeConfig {
  speedThresholdKmh?: number; // Default: 15 km/h
  stationaryDebounceSeconds?: number; // Default: 4 seconds
  zeroToleranceInHotspots?: boolean; // Default: true
  maxWarningStrikes?: number; // Default: 3
  encryptionPublicKey?: string;
}

export interface TouchShieldState {
  isShieldActive: boolean;
  activeSpeedKmh: number;
  isStationary: boolean;
  debounceRemainingSeconds: number;
  currentStrikes: number;
  isInHotspot: boolean;
  activeHotspot: HotspotZone | null;
  totalInfractionsBlocked: number;
  driverRatingDeductions: number;
  safetyScore: number; // 0-100 scale
}

export interface EncryptedPayload {
  version: string;
  sdkVersion: string;
  driverSessionId: string;
  timestampStart: number;
  timestampEnd: number;
  totalDistanceKm: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  totalInfractions: number;
  strikesRecorded: number;
  ratingPenalties: number;
  hotspotTransits: number;
  infractionLogs: InfractionEvent[];
  signature: string;
  encryptedBlob: string;
}
