import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { getHealth, type ProbeResult } from '@/health';
import { Button, Card, Dim } from '@/components/ui';
import { checkForUpdate, OTA_MARKER, reload, signingInfo, updateInfo, type UpdateCheck } from '@/lib/build';
import { colors, space, type } from '@/theme';

/**
 * Step 0: prove the free path works on this phone.
 * Each check maps to a line of the Step 0 checklist in docs/DESIGN.md.
 * "Share report" copies everything as text to paste into Claude Code.
 */

type Status = 'pass' | 'warn' | 'fail' | 'wait';

function Check({ status, title, detail }: { status: Status; title: string; detail?: string }) {
  const color = status === 'pass' ? colors.ok : status === 'warn' ? colors.warn : status === 'fail' ? colors.bad : colors.textFaint;
  const mark = status === 'pass' ? '✓' : status === 'warn' ? '!' : status === 'fail' ? '✕' : '…';
  return (
    <View style={{ flexDirection: 'row', gap: space.md, paddingVertical: space.xs }}>
      <Text style={{ color, fontSize: 16, fontWeight: '700', width: 18 }}>{mark}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: colors.text }]}>{title}</Text>
        {detail ? <Dim>{detail}</Dim> : null}
      </View>
    </View>
  );
}

function ago(d: Date): string {
  const h = (Date.now() - d.getTime()) / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`;
  if (h < 48) return `${Math.round(h)} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export default function Step0() {
  const health = getHealth();
  const updates = updateInfo();
  const signing = signingInfo();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [authorised, setAuthorised] = useState<boolean | null>(null);
  const [probe, setProbe] = useState<ProbeResult[] | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateCheck | null>(null);

  const run = useCallback(async () => {
    setProbe(null);
    setProbeError(null);
    try {
      const ok = await health.isAvailable();
      setAvailable(ok);
      if (!ok) return;
      setAuthorised(await health.requestAccess());
      setProbe(await health.probe());
    } catch (e) {
      setProbeError(String(e));
    }
  }, [health]);

  useEffect(() => {
    void run();
  }, [run]);

  const heart = probe?.filter((p) => ['HRV', 'Resting heart rate', 'Sleep'].includes(p.label)) ?? [];
  const heartOk = heart.length > 0 && heart.every((p) => p.count > 0);

  const report = () => {
    const lines = [
      `Baseline Step 0 report — ${new Date().toISOString()}`,
      `Health service: ${health.kind}`,
      `HealthKit available: ${available}`,
      `Authorisation requested: ${authorised}`,
      ...(probe ?? []).map(
        (p) =>
          `- ${p.label}: ${p.count} samples in 7 days` +
          (p.latest ? `; latest ${p.latest.value}, ${ago(p.latest.at)}, from ${p.latest.source}` : '') +
          (p.sources.length > 1 ? `; sources: ${p.sources.join(', ')}` : '') +
          (p.error ? `; ERROR ${p.error}` : ''),
      ),
      probeError ? `Probe error: ${probeError}` : '',
      `Updates enabled: ${updates.enabled}; channel ${updates.channel ?? '–'}; runtime ${updates.runtimeVersion ?? '–'}`,
      `Running: ${updates.embedded ? 'embedded build' : `update ${updates.updateId}`}${updates.createdAt ? ` from ${updates.createdAt.toISOString()}` : ''}`,
      `OTA marker: ${OTA_MARKER}`,
      `Last update check: ${typeof update === 'object' && update ? `error ${update.error}` : update ?? 'not run'}`,
      `Signing: ${signing.expires ? `expires ${signing.expires.toISOString()} (${signing.daysLeft} days), team ${signing.teamName}` : 'no profile found'}`,
    ].filter(Boolean);
    void Share.share({ message: lines.join('\n') });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <Card title="1 · Install and signing">
        <Check status="pass" title="The app opened" detail="So the build installed and the profile is trusted." />
        <Check
          status={signing.expires ? (signing.daysLeft !== null && signing.daysLeft >= 0 ? 'pass' : 'fail') : 'warn'}
          title="Signing"
          detail={
            signing.expires
              ? `Expires ${signing.expires.toLocaleString('en-GB')} · ${signing.daysLeft} days left · ${signing.teamName ?? ''}`
              : 'No provisioning profile found (normal on the web preview).'
          }
        />
      </Card>

      <Card title="2 · Apple Health">
        <Check
          status={available === null ? 'wait' : available ? 'pass' : 'fail'}
          title="HealthKit available"
          detail={health.kind === 'fake' ? 'Using sample data, not the real Apple Health.' : undefined}
        />
        <Check status={authorised === null ? 'wait' : authorised ? 'pass' : 'fail'} title="Permission sheet answered" />
        <Check
          status={probe === null ? (probeError ? 'fail' : 'wait') : heartOk ? 'pass' : 'warn'}
          title="Helio data arriving (HRV, resting HR, sleep)"
          detail={probeError ?? (probe && !heartOk ? 'Missing types below. Check Zepp → Profile → Add accounts → Health.' : undefined)}
        />
        {probe?.map((p) => (
          <Check
            key={p.identifier}
            status={p.error ? 'fail' : p.count > 0 ? 'pass' : 'warn'}
            title={`${p.label} · ${p.count} in 7 days`}
            detail={p.error ?? (p.latest ? `${p.latest.value} · ${ago(p.latest.at)} · ${p.sources.join(', ')}` : 'Nothing yet')}
          />
        ))}
        <Button label="Run again" kind="secondary" onPress={run} />
      </Card>

      <Card title="3 · Over-the-air updates">
        <Text style={[type.body, { color: colors.text }]}>{OTA_MARKER}</Text>
        <Check
          status={updates.enabled ? 'pass' : 'warn'}
          title={updates.enabled ? 'Updates are switched on' : 'Updates are off in this build'}
          detail={
            updates.enabled
              ? `Channel ${updates.channel ?? '–'} · runtime ${updates.runtimeVersion?.slice(0, 12) ?? '–'}`
              : 'Normal for a development build. Use a release build for this test.'
          }
        />
        <Check
          status={updates.embedded ? 'wait' : 'pass'}
          title={updates.embedded ? 'Running the code built into the app' : 'Running an over-the-air update'}
          detail={updates.createdAt ? `Published ${updates.createdAt.toLocaleString('en-GB')}` : undefined}
        />
        {update !== null && (
          <Check
            status={update === 'downloaded' ? 'pass' : update === 'none' ? 'wait' : 'warn'}
            title={
              update === 'downloaded' ? 'Update downloaded' : update === 'none' ? 'No newer update' : update === 'disabled' ? 'Updates disabled' : 'Check failed'
            }
            detail={typeof update === 'object' ? update.error : undefined}
          />
        )}
        <Button label="Check for update" kind="secondary" onPress={async () => setUpdate(await checkForUpdate())} />
        {update === 'downloaded' && <Button label="Restart to apply" onPress={() => void reload()} />}
      </Card>

      <Button label="Share report" onPress={report} />
      <Dim>Paste the report into Claude Code so it can see exactly what your phone returned.</Dim>
    </ScrollView>
  );
}
