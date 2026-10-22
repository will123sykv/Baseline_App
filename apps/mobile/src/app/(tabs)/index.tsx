import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TodaySummary } from '@baseline/core';
import { RecoveryDial } from '@/components/RecoveryDial';
import { Button, Card, Dim, Row, Stat } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { signingInfo } from '@/lib/build';
import { colors, space, type } from '@/theme';

function hm(min: number | null): string {
  if (min === null) return '–';
  return `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}`;
}

function n(x: number | null | undefined): string {
  return x === null || x === undefined ? '–' : Math.round(x).toLocaleString('en-GB');
}

function SigningBanner() {
  // Reads a file from the app bundle, so do it once per mount, not every render.
  const s = useMemo(signingInfo, []);
  if (s.daysLeft === null || s.daysLeft > 2) return null;
  return (
    <Card style={{ borderColor: colors.warn }}>
      <Text style={[type.label, { color: colors.warn }]}>RE-SIGN SOON</Text>
      <Dim>
        Free signing ends in {Math.max(0, s.daysLeft)} day{s.daysLeft === 1 ? '' : 's'}. Connect to your PC so Sideloadly can refresh it.
      </Dim>
    </Card>
  );
}

function Cards({ s }: { s: TodaySummary }) {
  return (
    <>
      <Card title="Recovery" style={{ alignItems: 'center' }}>
        <RecoveryDial recovery={s.recovery} hrvDays={s.hrvDays} />
        {s.recovery.components.length > 0 && (
          <Dim>
            {s.recovery.components
              .map((c) => `${c.input.toUpperCase()} ${c.z >= 0 ? '+' : ''}${c.z.toFixed(1)}σ`)
              .join('   ')}
          </Dim>
        )}
      </Card>

      {s.illness.warning && (
        <Card style={{ borderColor: colors.warn }}>
          <Text style={[type.label, { color: colors.warn }]}>ILLNESS OR OVERREACHING?</Text>
          <Dim>Resting heart rate is up and HRV is down against your normal. Take it easy today. This is a nudge, not a diagnosis.</Dim>
        </Card>
      )}

      <Row>
        <Card title="Sleep" style={{ flex: 1 }}>
          <Stat value={s.sleep.score === null ? '–' : String(s.sleep.score)} color={colors.sleep} sub={`${hm(s.sleep.asleepMin)} asleep`} />
          <Dim>Debt {s.sleep.debtHours} h (7 nights)</Dim>
        </Card>
        <Card title="Steps" style={{ flex: 1 }}>
          <Stat value={n(s.steps.today)} color={colors.steps} sub={`7-day avg ${n(s.steps.avg7)}`} />
        </Card>
      </Row>

      <Card title="Calories out">
        {s.caloriesOut ? (
          <>
            <Stat value={n(s.caloriesOut.total)} unit="kcal" color={colors.strain} />
            <Dim>
              Active {n(s.caloriesOut.active)} · Resting {n(s.caloriesOut.resting)}
              {s.caloriesOut.restingEstimated ? ' (estimated)' : ''}
            </Dim>
          </>
        ) : (
          <Dim>No resting energy in Apple Health yet. Calories in and out arrive in Phase 1.</Dim>
        )}
      </Card>

      <Card title="Weight trend">
        <Stat
          value={s.weight.trendKg === null ? '–' : s.weight.trendKg.toFixed(1)}
          unit="kg"
          sub={s.weight.weeklyRateKg === null ? 'Log weight in Apple Health to start a trend' : `${s.weight.weeklyRateKg > 0 ? '+' : ''}${s.weight.weeklyRateKg.toFixed(2)} kg this week`}
        />
      </Card>
    </>
  );
}

export default function Today() {
  const router = useRouter();
  const { state, refresh, refreshing } = useToday();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textDim} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={[type.title, { color: colors.text }]}>Today</Text>
          {state.kind === 'ready' && state.source === 'fake' && <Dim>Sample data</Dim>}
        </View>

        <SigningBanner />

        {state.kind === 'loading' && <Dim>Reading Apple Health…</Dim>}
        {state.kind === 'unavailable' && (
          <Card title="Apple Health">
            <Dim>Apple Health isn't available on this device.</Dim>
          </Card>
        )}
        {state.kind === 'error' && (
          <Card title="Something went wrong">
            <Dim>{state.message}</Dim>
            <Button label="Try again" kind="secondary" onPress={refresh} />
          </Card>
        )}
        {state.kind === 'ready' && <Cards s={state.summary} />}

        <Button label="Open Step 0 check" kind="secondary" onPress={() => router.push('/step0')} />
      </ScrollView>
    </SafeAreaView>
  );
}
