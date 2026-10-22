import { useCallback, useEffect, useState } from 'react';
import { summarizeToday, type TodaySummary } from '@baseline/core';
import { getHealth } from '@/health';

/** 30 days of baseline plus today. */
const DAYS = 31;

export type TodayState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; summary: TodaySummary; source: 'healthkit' | 'fake' }
  | { kind: 'error'; message: string };

export function useToday() {
  const [state, setState] = useState<TodayState>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const health = getHealth();
    try {
      if (!(await health.isAvailable())) {
        setState({ kind: 'unavailable' });
        return;
      }
      // Apple only shows the sheet once; later calls return straight away.
      await health.requestAccess();
      const days = await health.getDays(DAYS);
      const summary = summarizeToday(days);
      setState(summary ? { kind: 'ready', summary, source: health.kind } : { kind: 'error', message: 'No days returned' });
    } catch (e) {
      setState({ kind: 'error', message: String(e) });
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, refresh, refreshing };
}
