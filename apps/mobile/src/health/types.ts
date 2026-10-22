import type { DayHealth } from '@baseline/core';

export type { DayHealth };

/**
 * Everything the app knows about Apple Health goes through this interface.
 * Two implementations: real HealthKit on an iPhone, and a fake with sample
 * data for the web preview on Windows and for tests.
 */
export interface HealthService {
  readonly kind: 'healthkit' | 'fake';
  isAvailable(): Promise<boolean>;
  /** Shows Apple's permission sheet. Resolves once the user has answered. */
  requestAccess(): Promise<boolean>;
  /** One entry per local calendar day, oldest first, today last. */
  getDays(count: number): Promise<DayHealth[]>;
  /** Step 0: which types arrive, from which app, and how recently. */
  probe(): Promise<ProbeResult[]>;
}

export interface ProbeResult {
  label: string;
  identifier: string;
  /** Samples in the last 7 days. */
  count: number;
  latest: { value: string; at: Date; source: string } | null;
  /** Apps that wrote this type in the last 7 days. */
  sources: string[];
  error?: string;
}
