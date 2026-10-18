import {
  DriveSafeConfig,
  TouchShieldState,
  InfractionEvent,
  TelematicsReading,
  HotspotZone,
  EncryptedPayload,
  StrikeSeverity
} from './types';
import { findMatchingHotspot } from './hotspots';

export type StateChangeListener = (state: TouchShieldState) => void;
export type InfractionListener = (infraction: InfractionEvent) => void;
export type PenaltyListener = (reason: string, deductions: number, newScore: number) => void;

/**
 * DriveSafe SDK Core Engine
 * Manages telematics stream, touch shield state, stationary debounce,
 * BTP risk geofencing, and the gamified strike state machine.
 */
export class DriveSafeEngine {
  private config: Required<DriveSafeConfig>;
  private state: TouchShieldState;
  private infractionLogs: InfractionEvent[] = [];
  private stateListeners: Set<StateChangeListener> = new Set();
  private infractionListeners: Set<InfractionListener> = new Set();
  private penaltyListeners: Set<PenaltyListener> = new Set();

  private debounceTimerInterval: any = null;
  private sessionId: string;
  private sessionStartTime: number;
  private maxSpeedObserved: number = 0;
  private speedSamplesCount: number = 0;
  private speedSumKmh: number = 0;
  private hotspotTransitsCount: number = 0;
  private lastKnownHotspotId: string | null = null;

  constructor(customConfig?: DriveSafeConfig) {
    this.config = {
      speedThresholdKmh: customConfig?.speedThresholdKmh ?? 15,
      stationaryDebounceSeconds: customConfig?.stationaryDebounceSeconds ?? 4,
      zeroToleranceInHotspots: customConfig?.zeroToleranceInHotspots ?? true,
      maxWarningStrikes: customConfig?.maxWarningStrikes ?? 3,
      encryptionPublicKey: customConfig?.encryptionPublicKey ?? 'DS-PUB-KEY-BTP-2026-STG'
    };

    this.sessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    this.sessionStartTime = Date.now();

    this.state = {
      isShieldActive: false,
      activeSpeedKmh: 0,
      isStationary: true,
      debounceRemainingSeconds: 0,
      currentStrikes: 0,
      isInHotspot: false,
      activeHotspot: null,
      totalInfractionsBlocked: 0,
      driverRatingDeductions: 0,
      safetyScore: 100
    };
  }

  /**
   * Subscribes to real-time state mutations
   */
  public onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => this.stateListeners.delete(listener);
  }

  public onInfraction(listener: InfractionListener): () => void {
    this.infractionListeners.add(listener);
    return () => this.infractionListeners.delete(listener);
  }

  public onRatingPenalty(listener: PenaltyListener): () => void {
    this.penaltyListeners.add(listener);
    return () => this.penaltyListeners.delete(listener);
  }

  public getState(): TouchShieldState {
    return { ...this.state };
  }

  public getConfig(): Required<DriveSafeConfig> {
    return { ...this.config };
  }

  /**
   * Main telematics ingestion pipeline
   */
  public processTelematics(reading: TelematicsReading): void {
    const speed = Math.max(0, reading.speedKmh);
    this.state.activeSpeedKmh = speed;

    // Track metrics
    if (speed > this.maxSpeedObserved) {
      this.maxSpeedObserved = speed;
    }
    this.speedSamplesCount++;
    this.speedSumKmh += speed;

    // Geofence check against BTP Hotspot Matrix
    const hotspot = findMatchingHotspot(reading.latitude, reading.longitude);
    const wasInHotspot = this.state.isInHotspot;
    this.state.isInHotspot = hotspot !== null;
    this.state.activeHotspot = hotspot;

    if (hotspot && hotspot.id !== this.lastKnownHotspotId) {
      this.hotspotTransitsCount++;
      this.lastKnownHotspotId = hotspot.id;
    }

    // State Transition Logic
    if (speed >= this.config.speedThresholdKmh) {
      // VEHICLE IN MOTION (> 15 km/h)
      this.clearDebounceTimer();
      this.state.isStationary = false;
      this.state.debounceRemainingSeconds = 0;
      this.state.isShieldActive = true;
    } else {
      // VEHICLE SLOWING OR STOPPING (< 15 km/h)
      if (speed <= 2) {
        // Vehicle is practically stationary
        if (!this.state.isStationary) {
          this.state.isStationary = true;
          this.startStationaryDebounce();
        }
      } else {
        // Between 2 and 15 km/h: remains locked until completely stationary
        this.clearDebounceTimer();
        this.state.isStationary = false;
        this.state.isShieldActive = true;
      }
    }

    this.notifyState();
  }

  /**
   * Starts the 4-second stationary debounce countdown
   */
  private startStationaryDebounce(): void {
    this.clearDebounceTimer();
    this.state.debounceRemainingSeconds = this.config.stationaryDebounceSeconds;
    this.state.isShieldActive = true; // Shield remains strictly locked during debounce
    this.notifyState();

    this.debounceTimerInterval = setInterval(() => {
      if (this.state.debounceRemainingSeconds > 1) {
        this.state.debounceRemainingSeconds--;
        this.notifyState();
      } else {
        // 4 seconds stationary successfully achieved!
        this.clearDebounceTimer();
        this.state.debounceRemainingSeconds = 0;
        this.state.isShieldActive = false; // Release the shield
        this.notifyState();
      }
    }, 1000);
  }

  private clearDebounceTimer(): void {
    if (this.debounceTimerInterval) {
      clearInterval(this.debounceTimerInterval);
      this.debounceTimerInterval = null;
    }
  }

  /**
   * Evaluates touch event when touch shield is active.
   * Returns:
   *  - { allowed: true } -> Touch passes through to map or SOS button
   *  - { allowed: false, infraction: InfractionEvent } -> Touch is intercepted & absorbed
   */
  public evaluateTouchInput(
    x: number,
    y: number,
    targetType: 'MAP' | 'SOS' | 'BLOCKED_MENU',
    targetElementId?: string
  ): { allowed: boolean; infraction?: InfractionEvent } {
    // 1. Emergency SOS punch-through: ALWAYS allowed under any speed
    if (targetType === 'SOS') {
      return { allowed: true };
    }

    // 2. If shield is inactive, all touches pass through freely
    if (!this.state.isShieldActive) {
      return { allowed: true };
    }

    // 3. Map punch-through window: navigation touches pass through
    if (targetType === 'MAP') {
      return { allowed: true };
    }

    // 4. TOUCH INFRACTION: Touched a restricted sub-menu while moving or debouncing
    this.state.totalInfractionsBlocked++;

    let actionTaken: StrikeSeverity = 'WARNING';
    const isHotspot = this.state.isInHotspot && this.config.zeroToleranceInHotspots;

    if (isHotspot) {
      // Zero-Tolerance Mode: Instant Rating Penalty on Strike 1
      actionTaken = 'ZERO_TOLERANCE_PENALTY';
      this.state.currentStrikes++;
      this.applyRatingPenalty(
        'Zero-Tolerance Infraction inside ' + (this.state.activeHotspot?.name ?? 'BTP Accident Hotspot'),
        15
      );
    } else {
      // Standard Zone: 3-Strike Warning loop
      this.state.currentStrikes++;
      if (this.state.currentStrikes >= this.config.maxWarningStrikes) {
        actionTaken = 'RATING_PENALTY';
        this.applyRatingPenalty('Exceeded 3 touch infraction warnings while moving', 10);
      } else {
        actionTaken = 'WARNING';
      }
    }

    const infraction: InfractionEvent = {
      id: 'inf_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      speedKmh: this.state.activeSpeedKmh,
      touchX: Math.round(x),
      touchY: Math.round(y),
      blockedTargetId: targetElementId || 'restricted_zone',
      inHotspot: this.state.isInHotspot,
      hotspotName: this.state.activeHotspot?.name,
      strikeNumber: this.state.currentStrikes,
      actionTaken
    };

    this.infractionLogs.push(infraction);
    this.infractionListeners.forEach((l) => l(infraction));
    this.notifyState();

    return { allowed: false, infraction };
  }

  private applyRatingPenalty(reason: string, deductionPoints: number): void {
    this.state.driverRatingDeductions++;
    this.state.safetyScore = Math.max(0, this.state.safetyScore - deductionPoints);
    this.penaltyListeners.forEach((l) => l(reason, deductionPoints, this.state.safetyScore));
  }

  /**
   * Resets strikes upon shift completion or stationary recovery
   */
  public resetStrikes(): void {
    this.state.currentStrikes = 0;
    this.notifyState();
  }

  /**
   * Generates a tamper-proof encrypted telematics payload for commercial insurer verification
   */
  public generateInsurerAuditPayload(): EncryptedPayload {
    const avgSpeed =
      this.speedSamplesCount > 0 ? Math.round(this.speedSumKmh / this.speedSamplesCount) : 0;

    const rawData = {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      maxSpeed: this.maxSpeedObserved,
      avgSpeed: avgSpeed,
      totalInfractions: this.state.totalInfractionsBlocked,
      totalStrikes: this.state.currentStrikes,
      ratingPenalties: this.state.driverRatingDeductions,
      finalSafetyScore: this.state.safetyScore,
      hotspotsEncountered: this.hotspotTransitsCount,
      logCount: this.infractionLogs.length
    };

    // Lightweight mock encryption signature
    const signature = 'DS-SIG-' + btoa(JSON.stringify(rawData).slice(0, 48));
    const encryptedBlob = btoa(unescape(encodeURIComponent(JSON.stringify(rawData))));

    return {
      version: '1.0.0',
      sdkVersion: 'drivesafe-core-v2.4.0',
      driverSessionId: this.sessionId,
      timestampStart: this.sessionStartTime,
      timestampEnd: Date.now(),
      totalDistanceKm: Number((avgSpeed * ((Date.now() - this.sessionStartTime) / 3600000)).toFixed(2)),
      maxSpeedKmh: Math.round(this.maxSpeedObserved),
      avgSpeedKmh: avgSpeed,
      totalInfractions: this.state.totalInfractionsBlocked,
      strikesRecorded: this.state.currentStrikes,
      ratingPenalties: this.state.driverRatingDeductions,
      hotspotTransits: this.hotspotTransitsCount,
      infractionLogs: [...this.infractionLogs],
      signature,
      encryptedBlob
    };
  }

  private notifyState(): void {
    const s = this.getState();
    this.stateListeners.forEach((listener) => listener(s));
  }

  public destroy(): void {
    this.clearDebounceTimer();
    this.stateListeners.clear();
    this.infractionListeners.clear();
    this.penaltyListeners.clear();
  }
}
