import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MEAL_SLOTS,
  copyEntriesTo,
  entriesForDate,
  groupByMeal,
  localIsoDate,
  macroProgress,
  type FoodEntry,
  type MealSlot,
} from '@baseline/core';
import { Bar } from '@/components/Bar';
import { Button, Card, Dim, Row, Stat } from '@/components/ui';
import { addEntries, newId, removeEntry, useFood } from '@/hooks/useFood';
import { useLastWeight, useSettings } from '@/hooks/useSettings';
import { colors, space, type } from '@/theme';

const MEAL_NAMES: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

function time(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function EntryRow({ entry, onRemove }: { entry: FoodEntry; onRemove: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs }}>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: colors.text }]}>{entry.name}</Text>
        <Dim>
          {time(entry.eatenAt)}
          {entry.grams === null ? '' : ` · ${Math.round(entry.grams)} g`} · P {Math.round(entry.proteinG)} C{' '}
          {Math.round(entry.carbsG)} F {Math.round(entry.fatG)}
        </Dim>
      </View>
      <Text style={[type.body, { color: colors.text, fontVariant: ['tabular-nums'] }]}>{Math.round(entry.kcal)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${entry.name}`}
        onPress={onRemove}
        hitSlop={10}
        style={({ pressed }) => [pressed && { opacity: 0.5 }]}
      >
        <Text style={{ color: colors.textFaint, fontSize: 20 }}>×</Text>
      </Pressable>
    </View>
  );
}

export default function Food() {
  const router = useRouter();
  const { settings } = useSettings();
  const { entries, saved, loading } = useFood();
  const weightKg = useLastWeight();

  const today = localIsoDate(new Date());
  const todays = entriesForDate(entries, today);
  const byMeal = groupByMeal(todays);
  const progress = macroProgress(todays, settings.targets.kcal, weightKg);

  const yesterday = localIsoDate(new Date(Date.now() - 86_400_000));
  const yesterdays = entriesForDate(entries, yesterday);

  const onCopyYesterday = () => addEntries(copyEntriesTo(yesterdays, today, newId));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
        <Text style={[type.title, { color: colors.text }]}>Food</Text>

        <Card title="Calories remaining">
          {progress ? (
            <>
              <Stat
                value={Math.round(progress.remaining.kcal).toLocaleString('en-GB')}
                unit="kcal left"
                color={progress.remaining.kcal < 0 ? colors.warn : colors.food}
                sub={`${Math.round(progress.eaten.kcal).toLocaleString('en-GB')} of ${progress.targets.kcal.toLocaleString('en-GB')} eaten`}
              />
              <View style={{ gap: space.sm, marginTop: space.sm }}>
                <Bar label="Protein" eaten={progress.eaten.proteinG} target={progress.targets.proteinG} />
                <Bar label="Carbs" eaten={progress.eaten.carbsG} target={progress.targets.carbsG} />
                <Bar label="Fat" eaten={progress.eaten.fatG} target={progress.targets.fatG} />
              </View>
            </>
          ) : (
            <>
              <Stat value={Math.round(todays.reduce((a, e) => a + e.kcal, 0)).toLocaleString('en-GB')} unit="kcal eaten" color={colors.food} />
              <Dim>
                Your protein target scales with body weight, so log a weigh-in and the targets and bars appear.
              </Dim>
              <Button label="Log weight" kind="secondary" onPress={() => router.push('/log-weight')} />
            </>
          )}
        </Card>

        <Button label="Add food" onPress={() => router.push('/food-add')} />

        {MEAL_SLOTS.map((slot) => {
          const list = byMeal[slot];
          if (list.length === 0) return null;
          const kcal = Math.round(list.reduce((a, e) => a + e.kcal, 0));
          return (
            <Card
              key={slot}
              title={MEAL_NAMES[slot]}
              right={<Text style={[type.label, { color: colors.textDim }]}>{kcal.toLocaleString('en-GB')} kcal</Text>}
            >
              {list.map((e) => (
                <EntryRow key={e.id} entry={e} onRemove={() => removeEntry(e.id)} />
              ))}
            </Card>
          );
        })}

        {!loading && todays.length === 0 && (
          <Card title="Nothing logged yet">
            <Dim>Add your first meal with the button above. Saved foods and yesterday's meals are one tap each.</Dim>
          </Card>
        )}

        {saved.length > 0 && (
          <Card title="Saved foods">
            <Dim>Tap to add a usual portion to {MEAL_NAMES[mealNow()].toLowerCase()}.</Dim>
            <Row style={{ flexWrap: 'wrap' }}>
              {saved.map((f) => (
                <Pressable
                  key={f.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/food-add', params: { savedId: f.id } })}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.cardRaised,
                      borderRadius: 8,
                      paddingVertical: space.sm,
                      paddingHorizontal: space.md,
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[type.body, { color: colors.text }]}>{f.name}</Text>
                </Pressable>
              ))}
            </Row>
          </Card>
        )}

        {yesterdays.length > 0 && (
          <Button
            label={`Copy yesterday (${yesterdays.length} item${yesterdays.length === 1 ? '' : 's'})`}
            kind="secondary"
            onPress={onCopyYesterday}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function mealNow(): MealSlot {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 21) return 'dinner';
  return 'snack';
}
