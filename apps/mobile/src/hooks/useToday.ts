import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { bodyProfile, summarizeToday, type DayHealth, type SummaryOptions, type TodaySummary } from '@baseline/core';
import { getHealth } from '@/health';
import { useSettings } from './useSettings';

/** 30 days of baseline plus today. */
const DAYS = 31;

export type TodayState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; summary: TodaySummary; source: 'healthkit' | 'fake'; latestWeightKg: number | null }
  | { kind: 'error'; message: string };

/** The most recent weigh-in in the window, for the resting-energy formula. */
function latestWeight(days: readonly DayHealth[]): number | null {
  for (let i = days.length - 1; i >= 0; i--) {
    const kg = days[i]?.weightKg;
    if (typeof kg === 'number' && Number.isFinite(kg)) return kg;
  }
  return null;
}

export function useToday() {
  const { settings, loading: settingsLoading } = useSettings();
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

      const weightKg = latestWeight(days);
      const profile = bodyProfile(settings, weightKg);
      // Built up field by field so an absent profile stays absent rather than
      // being passed as undefined.
      const opts: SummaryOptions = { sleepTargetMin: settings.targets.sleepMin };
      if (profile) opts.profile = profile;

      const summary = summarizeToday(days, opts);
      setState(
        summary
          ? { kind: 'ready', summary, source: health.kind, latestWeightKg: weightKg }
          : { kind: 'error', message: 'No days returned' },
      );
    } catch (e) {
      setState({ kind: 'error', message: String(e) });
    }
  }, [settings]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Reload whenever Today comes back into view, so a weigh-in or a meal logged
  // on another screen shows up without a pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (!settingsLoading) void load();
    }, [load, settingsLoading]),
  );

  return { state, refresh, refreshing };
}
