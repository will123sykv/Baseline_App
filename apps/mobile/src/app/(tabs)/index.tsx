import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { formatWeight, formatWeightChange, profileIsComplete, type TodaySummary, type UserSettings } from '@baseline/core';
import { RecoveryDial } from '@/components/RecoveryDial';
import { Button, Card, Dim, Row, Stat } from '@/components/ui';
import { useSettings } from '@/hooks/useSettings';
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

function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={onPress} hitSlop={12}>
      <SymbolView
        name="person.crop.circle"
        tintColor={colors.textDim}
        size={26}
        fallback={<Text style={{ color: colors.textDim, fontSize: 20 }}>☰</Text>}
      />
    </Pressable>
  );
}

function Cards({
  s,
  settings,
  latestWeightKg,
  onSettings,
  onLogWeight,
}: {
  s: TodaySummary;
  settings: UserSettings;
  latestWeightKg: number | null;
  onSettings: () => void;
  onLogWeight: () => void;
}) {
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
          <Stat value={n(s.steps.today)} color={colors.steps} sub={`Target ${n(settings.targets.steps)}`} />
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
          <>
            <Dim>
              Apple Health has no resting energy, and your profile isn't finished, so there's nothing to add the active calories to.
            </Dim>
            <Button label="Finish your profile" kind="secondary" onPress={onSettings} />
          </>
        )}
      </Card>

      <Card title="Weight trend">
        <Stat
          value={s.weight.trendKg === null ? '–' : formatWeight(s.weight.trendKg, settings.units)}
          sub={
            s.weight.weeklyRateKg === null
              ? latestWeightKg === null
                ? 'Log a weigh-in to start a trend'
                : 'A few more days and a weekly rate appears'
              : `${formatWeightChange(s.weight.weeklyRateKg, settings.units)} this week`
          }
        />
        <Button label="Log weight" kind="secondary" onPress={onLogWeight} />
      </Card>
    </>
  );
}

export default function Today() {
  const router = useRouter();
  const { settings } = useSettings();
  const { state, refresh, refreshing } = useToday();

  const onSettings = () => router.push('/settings');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textDim} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[type.title, { color: colors.text }]}>Today</Text>
          <Row style={{ alignItems: 'center' }}>
            {state.kind === 'ready' && state.source === 'fake' && <Dim>Sample data</Dim>}
            <SettingsButton onPress={onSettings} />
          </Row>
        </View>

        <SigningBanner />

        {!profileIsComplete(settings) && state.kind === 'ready' && (
          <Card style={{ borderColor: colors.warn }}>
            <Text style={[type.label, { color: colors.warn }]}>FINISH YOUR PROFILE</Text>
            <Dim>Add your sex, height and birth year so Baseline can work out resting energy and your calorie targets.</Dim>
            <Button label="Open Settings" kind="secondary" onPress={onSettings} />
          </Card>
        )}

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
        {state.kind === 'ready' && (
          <Cards
            s={state.summary}
            settings={settings}
            latestWeightKg={state.latestWeightKg}
            onSettings={onSettings}
            onLogWeight={() => router.push('/log-weight')}
          />
        )}

        <Button label="Open Step 0 check" kind="secondary" onPress={() => router.push('/step0')} />
      </ScrollView>
    </SafeAreaView>
  );
}
