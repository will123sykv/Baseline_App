import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, space, type } from '@/theme';

export function Card({ title, right, children, style }: { title?: string; right?: ReactNode; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {(title || right) && (
        <View style={styles.cardHeader}>
          {title ? <Text style={styles.cardTitle}>{title.toUpperCase()}</Text> : <View />}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

/** A big number with a small unit and an optional line underneath. */
export function Stat({ value, unit, sub, color = colors.text }: { value: string; unit?: string; sub?: string; color?: string }) {
  return (
    <View>
      <Text style={[type.number, { color }]}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Button({ label, onPress, kind = 'primary', disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary'; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        kind === 'secondary' && styles.buttonSecondary,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.buttonText, kind === 'secondary' && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', gap: space.md }, style]}>{children}</View>;
}

export function Dim({ children }: { children: ReactNode }) {
  return <Text style={styles.sub}>{children}</Text>;
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...type.label, color: colors.textDim },
  unit: { fontSize: 14, fontWeight: '500', color: colors.textDim },
  sub: { ...type.small, color: colors.textDim, marginTop: 2 },
  button: {
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: colors.cardRaised, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  buttonText: { ...type.label, color: colors.bg, fontSize: 15 },
});
