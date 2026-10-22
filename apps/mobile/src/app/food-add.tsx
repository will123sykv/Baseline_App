import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import {
  MEAL_SLOTS,
  entryFromSaved,
  mealForTime,
  scalePer100g,
  type FoodEntry,
  type MealSlot,
} from '@baseline/core';
import { NumberField, Segmented, TextField } from '@/components/Field';
import { Button, Card, Dim, Row } from '@/components/ui';
import { addEntry, newId, saveFood, useFood } from '@/hooks/useFood';
import { colors, space, type } from '@/theme';

/**
 * Add one item of food. Either type the numbers in (quick add), or start from
 * something you saved earlier and just say how much of it you ate.
 */

const MEAL_OPTIONS = MEAL_SLOTS.map((slot) => ({
  value: slot,
  label: slot === 'snack' ? 'Snack' : slot.charAt(0).toUpperCase() + slot.slice(1),
}));

function num(text: string): number {
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

export default function FoodAdd() {
  const router = useRouter();
  const { savedId } = useLocalSearchParams<{ savedId?: string }>();
  const { saved } = useFood();
  const from = savedId ? saved.find((f) => f.id === savedId) : undefined;

  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [meal, setMeal] = useState<MealSlot>(mealForTime(new Date()));
  const [favourite, setFavourite] = useState(false);
  const [saving, setSaving] = useState(false);

  // Saved foods arrive from the store a moment after this screen opens, so
  // the usual portion is filled in once it's known rather than at first render.
  useEffect(() => {
    if (from?.usualGrams) setGrams(String(from.usualGrams));
  }, [from?.id, from?.usualGrams]);

  // From a saved food the macros follow the portion; otherwise you type them.
  const portion = from && num(grams) > 0 ? scalePer100g(from.per100g, num(grams)) : null;
  const line = portion ?? { kcal: num(kcal), proteinG: num(protein), carbsG: num(carbs), fatG: num(fat) };
  // A saved food brings its own name; there is no name box to fill in.
  const finalName = (from?.name ?? name).trim();
  const valid = finalName !== '' && line.kcal > 0;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/food'));

  const onSave = async () => {
    if (!valid) return;
    setSaving(true);
    const at = new Date();
    const gramsValue = grams.trim() === '' ? null : num(grams);

    const entry: FoodEntry =
      from && portion
        ? entryFromSaved(from, num(grams), meal, at, newId())
        : {
            id: newId(),
            eatenAt: at.toISOString(),
            meal,
            source: 'quick',
            name: finalName,
            grams: gramsValue,
            ...line,
          };

    await addEntry(entry);
    // Saving a favourite needs a portion size to work back to 100 g.
    if (favourite && !from && gramsValue !== null && gramsValue > 0) {
      const f = 100 / gramsValue;
      await saveFood({
        name: finalName,
        barcode: null,
        per100g: {
          kcal: Math.round(line.kcal * f),
          proteinG: Math.round(line.proteinG * f * 10) / 10,
          carbsG: Math.round(line.carbsG * f * 10) / 10,
          fatG: Math.round(line.fatG * f * 10) / 10,
        },
        usualGrams: gramsValue,
      });
    }
    close();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <Card title={from ? `${from.name} — how much?` : 'What did you eat?'}>
        {from ? (
          <>
            <NumberField label="Portion" value={grams} onChange={setGrams} unit="g" placeholder="150" decimal />
            <Dim>
              Per 100 g: {from.per100g.kcal} kcal · P {from.per100g.proteinG} C {from.per100g.carbsG} F {from.per100g.fatG}
            </Dim>
            {portion && (
              <Text style={[type.body, { color: colors.food }]}>
                {portion.kcal} kcal · P {portion.proteinG} C {portion.carbsG} F {portion.fatG}
              </Text>
            )}
          </>
        ) : (
          <>
            <TextField label="Name" value={name} onChange={setName} placeholder="Porridge with milk" />
            <NumberField label="Portion (optional)" value={grams} onChange={setGrams} unit="g" placeholder="60" decimal />
            <NumberField label="Calories" value={kcal} onChange={setKcal} unit="kcal" placeholder="220" />
            <Row>
              <NumberField label="Protein" value={protein} onChange={setProtein} unit="g" placeholder="8" decimal />
              <NumberField label="Carbs" value={carbs} onChange={setCarbs} unit="g" placeholder="38" decimal />
              <NumberField label="Fat" value={fat} onChange={setFat} unit="g" placeholder="4" decimal />
            </Row>
          </>
        )}
      </Card>

      <Card title="Meal">
        <Segmented label="When" value={meal} options={MEAL_OPTIONS} onChange={setMeal} />
      </Card>

      {!from && (
        <Card title="Save for next time">
          <Segmented
            label="Add to saved foods"
            value={favourite ? 'yes' : 'no'}
            options={[
              { value: 'no', label: 'No' },
              { value: 'yes', label: 'Yes' },
            ]}
            onChange={(v) => setFavourite(v === 'yes')}
          />
          {favourite && num(grams) <= 0 && <Dim>Add a portion size so the amounts can be stored per 100 g.</Dim>}
        </Card>
      )}

      <Button label={saving ? 'Saving…' : 'Add'} onPress={onSave} disabled={!valid || saving} />
    </ScrollView>
  );
}
