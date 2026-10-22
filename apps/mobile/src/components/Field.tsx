import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space, type } from '@/theme';

/** Form controls for Settings and food entry. Dark theme tokens only. */

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text.toUpperCase()}</Text>;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Label text={label} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.sleep}
      />
    </View>
  );
}

/**
 * A number you type. Held as text while editing so a half-typed "17." doesn't
 * jump about, and reported as null when the box is empty.
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  placeholder,
  decimal = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  unit?: string;
  placeholder?: string;
  decimal?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Label text={label} />
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={value}
          onChangeText={(t) => onChange(decimal ? t.replace(/[^0-9.]/g, '') : t.replace(/[^0-9]/g, ''))}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          inputMode={decimal ? 'decimal' : 'numeric'}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.sleep}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export interface Option<T> {
  value: T;
  label: string;
}

/** A row of mutually exclusive choices, e.g. male / female or kg / stone. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: readonly Option<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Label text={label} />
      <View style={styles.segmented}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(o.value)}
              style={({ pressed }) => [styles.segment, selected && styles.segmentOn, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.segmentText, selected && { color: colors.bg }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: { ...type.label, color: colors.textDim },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  unit: { ...type.body, color: colors.textDim, minWidth: 34 },
  segmented: { flexDirection: 'row', gap: space.sm },
  segment: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: space.md,
  },
  segmentOn: { backgroundColor: colors.text, borderColor: colors.text },
  segmentText: { ...type.label, color: colors.text, fontSize: 15 },
});
