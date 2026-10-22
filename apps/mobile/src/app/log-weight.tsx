import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { formatWeight, stoneLbToKg } from '@baseline/core';
import { NumberField } from '@/components/Field';
import { Button, Card, Dim, Row } from '@/components/ui';
import { getHealth } from '@/health';
import { useSettings } from '@/hooks/useSettings';
import { colors, space, type } from '@/theme';

/**
 * Type today's weigh-in. It goes into Apple Health, not into the app's own
 * store, so it survives a reinstall and feeds the weight trend the same way a
 * smart scale would.
 */
export default function LogWeight() {
  const router = useRouter();
  const { settings } = useSettings();
  const imperial = settings.units === 'imperial';

  const [kg, setKg] = useState('');
  const [stone, setStone] = useState('');
  const [lb, setLb] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = imperial
    ? stone.trim() === '' && lb.trim() === ''
      ? null
      : stoneLbToKg(Number(stone) || 0, Number(lb) || 0)
    : kg.trim() === ''
      ? null
      : Number(kg);

  const valid = value !== null && Number.isFinite(value) && value > 20 && value < 400;

  const onSave = async () => {
    if (!valid || value === null) return;
    setSaving(true);
    setError(null);
    try {
      await getHealth().saveWeight(value);
      // Opened straight from a link there may be nothing to go back to.
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <Card title="Today's weigh-in">
        {imperial ? (
          <Row>
            <NumberField label="Weight" value={stone} onChange={setStone} unit="st" placeholder="11" />
            <NumberField label=" " value={lb} onChange={setLb} unit="lb" placeholder="11" decimal />
          </Row>
        ) : (
          <NumberField label="Weight" value={kg} onChange={setKg} unit="kg" placeholder="75.0" decimal />
        )}
        {valid && value !== null && <Dim>Saving {formatWeight(value, settings.units)} to Apple Health.</Dim>}
        {imperial && <Dim>Stored as {value === null ? '–' : `${value.toFixed(2)} kg`}.</Dim>}
      </Card>

      {error && (
        <Card style={{ borderColor: colors.bad }}>
          <Text style={[type.label, { color: colors.bad }]}>COULDN'T SAVE</Text>
          <Dim>{error}</Dim>
        </Card>
      )}

      <Button label={saving ? 'Saving…' : 'Save to Apple Health'} onPress={onSave} disabled={!valid || saving} />
      <Dim>Weigh yourself at the same time each day — first thing, after the loo — so the trend means something.</Dim>
    </ScrollView>
  );
}
