import { Platform } from 'react-native';
import { fakeHealthService } from './fake';
import type { HealthService } from './types';

export type { DayHealth, HealthService, ProbeResult } from './types';

let service: HealthService | null = null;

/**
 * Real HealthKit on an iPhone; sample data everywhere else (the web preview
 * on Windows), or when EXPO_PUBLIC_FAKE_HEALTH=1.
 * HealthKit is loaded lazily so the web bundle never imports native code.
 */
export function getHealth(): HealthService {
  if (service) return service;
  const useFake = Platform.OS !== 'ios' || process.env.EXPO_PUBLIC_FAKE_HEALTH === '1';
  service = useFake ? fakeHealthService : (require('./healthkit') as typeof import('./healthkit')).healthKitService;
  return service;
}
