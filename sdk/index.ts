/**
 * DriveSafe SDK - Public Entry Point
 */
export * from './types';
export * from './hotspots';
export * from './engine';

import { DriveSafeEngine } from './engine';
import { DriveSafeConfig } from './types';

export function createDriveSafeSDK(config?: DriveSafeConfig): DriveSafeEngine {
  return new DriveSafeEngine(config);
}
