import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  DEFAULT_TARGETS,
  cmToFtIn,
  ftInToCm,
  profileIsComplete,
  type Sex,
  type Units,
  type UserSettings,
} from '@baseline/core';
import { NumberField, Segmented } from '@/components/Field';
import { Button, Card, Dim, Row } from '@/components/ui';
import { saveSettings, useSettings } from '@/hooks/useSettings';
import { colors, space, type } from '@/theme';

/**
 * Profile and targets. Resting energy can't be worked out without sex, height
 * and age, so until these are filled in the Today screen can't show calories
 * out. Everything is stored in metric; `units` only changes how it's shown.
 */

/** Draft values live as text while you type, so a half-typed number is fine. */
interface Draft {
  sex: Sex | null;
  units: Units;
  birthYear: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  kcal: string;
  proteinPerKg: string;
  steps: string;
  sleepHours: string;
}

function toDraft(s: UserSettings): Draft {
  const ftIn = s.heightCm === null ? null : cmToFtIn(s.heightCm);
  return {
    sex: s.sex,
    units: s.units,
    birthYear: s.birthYear === null ? '' : String(s.birthYear),
    heightCm: s.heightCm === null ? '' : String(Math.round(s.heightCm)),
    heightFt: ftIn === null ? '' : String(ftIn.ft),
    heightIn: ftIn === null ? '' : String(ftIn.inches),
    kcal: String(s.targets.kcal),
    proteinPerKg: String(s.targets.proteinPerKg),
    steps: String(s.targets.steps),
    sleepHours: String(Math.round((s.targets.sleepMin / 60) * 10) / 10),
  };
}

function num(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function fromDraft(d: Draft): UserSettings {
  const heightCm =
    d.units === 'imperial'
      ? d.heightFt.trim() === '' && d.heightIn.trim() === ''
        ? null
        : ftInToCm(num(d.heightFt) ?? 0, num(d.heightIn) ?? 0)
      : num(d.heightCm);
  const sleepHours = num(d.sleepHours);
  return {
    sex: d.sex,
    birthYear: num(d.birthYear),
    heightCm,
    units: d.units,
    targets: {
      kcal: num(d.kcal) ?? DEFAULT_TARGETS.kcal,
      proteinPerKg: num(d.proteinPerKg) ?? DEFAULT_TARGETS.proteinPerKg,
      steps: num(d.steps) ?? DEFAULT_TARGETS.steps,
      sleepMin: sleepHours === null ? DEFAULT_TARGETS.sleepMin : Math.round(sleepHours * 60),
    },
  };
}

/** Keep the two height representations in step when the units change. */
function switchUnits(d: Draft, units: Units): Draft {
  if (units === d.units) return d;
  if (units === 'imperial') {
    const cm = num(d.heightCm);
    const ftIn = cm === null ? null : cmToFtIn(cm);
    return { ...d, units, heightFt: ftIn ? String(ftIn.ft) : '', heightIn: ftIn ? String(ftIn.inches) : '' };
  }
  const hasImperial = d.heightFt.trim() !== '' || d.heightIn.trim() !== '';
  const cm = hasImperial ? ftInToCm(num(d.heightFt) ?? 0, num(d.heightIn) ?? 0) : null;
  return { ...d, units, heightCm: cm === null ? '' : String(Math.round(cm)) };
}

export default function Settings() {
  const router = useRouter();
  const { settings, loading } = useSettings();
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));

  // The saved settings arrive a moment after the screen opens.
  useEffect(() => {
    if (!loading) setDraft(toDraft(settings));
  }, [loading, settings]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const next = fromDraft(draft);
  const complete = profileIsComplete(next);

  const onSave = async () => {
    await saveSettings(next);
    close();
  };

  // Opened straight from a link there may be nothing to go back to.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      {!complete && (
        <Card style={{ borderColor: colors.warn }}>
          <Text style={[type.label, { color: colors.warn }]}>FINISH YOUR PROFILE</Text>
          <Dim>
            Calories out needs your sex, height and birth year to estimate resting energy. Without them the Today screen can only show
            what Apple Health already has.
          </Dim>
        </Card>
      )}

      <Card title="You">
        <Segmented
          label="Sex"
          value={draft.sex}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
          onChange={(v) => set('sex', v)}
        />
        <Dim>Used only for the resting-energy formula.</Dim>

        <NumberField label="Birth year" value={draft.birthYear} onChange={(v) => set('birthYear', v)} placeholder="1996" />

        {draft.units === 'metric' ? (
          <NumberField label="Height" value={draft.heightCm} onChange={(v) => set('heightCm', v)} unit="cm" placeholder="178" />
        ) : (
          <Row>
            <View style={{ flex: 1 }}>
              <NumberField label="Height" value={draft.heightFt} onChange={(v) => set('heightFt', v)} unit="ft" placeholder="5" />
            </View>
            <View style={{ flex: 1 }}>
              <NumberField label=" " value={draft.heightIn} onChange={(v) => set('heightIn', v)} unit="in" placeholder="10" />
            </View>
          </Row>
        )}
      </Card>

      <Card title="Units">
        <Segmented
          label="Weight and height"
          value={draft.units}
          options={[
            { value: 'metric', label: 'kg / cm' },
            { value: 'imperial', label: 'st / ft' },
          ]}
          onChange={(v) => setDraft((d) => switchUnits(d, v))}
        />
      </Card>

      <Card title="Daily targets">
        <NumberField label="Calories" value={draft.kcal} onChange={(v) => set('kcal', v)} unit="kcal" placeholder="2500" />
        <NumberField
          label="Protein"
          value={draft.proteinPerKg}
          onChange={(v) => set('proteinPerKg', v)}
          unit="g/kg"
          placeholder="1.6"
          decimal
        />
        <Dim>1.6 g per kg of body weight is the usual starting point.</Dim>
        <NumberField label="Steps" value={draft.steps} onChange={(v) => set('steps', v)} unit="steps" placeholder="8000" />
        <NumberField label="Sleep" value={draft.sleepHours} onChange={(v) => set('sleepHours', v)} unit="hours" placeholder="8" decimal />
      </Card>

      <Button label="Save" onPress={onSave} />
    </ScrollView>
  );
}
