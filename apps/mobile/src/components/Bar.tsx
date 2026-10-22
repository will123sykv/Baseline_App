import { StyleSheet, Text, View } from 'react-native';
import { progress } from '@baseline/core';
import { colors, radius, space, type } from '@/theme';

/**
 * A thin progress bar for a macro or a calorie target. The fill stops at the
 * end of the track; going over shows as a colour change, not a longer bar.
 */
export function Bar({
  label,
  eaten,
  target,
  unit = 'g',
  color = colors.food,
}: {
  label: string;
  eaten: number;
  target: number;
  unit?: string;
  color?: string;
}) {
  const ratio = progress(eaten, target);
  const over = ratio > 1;
  return (
    <View style={{ gap: space.xs }}>
      <View style={styles.row}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        <Text style={[styles.value, over && { color: colors.warn }]}>
          {Math.round(eaten).toLocaleString('en-GB')} / {Math.round(target).toLocaleString('en-GB')} {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(100, Math.max(0, ratio * 100))}%`, backgroundColor: over ? colors.warn : color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { ...type.label, color: colors.textDim },
  value: { ...type.small, color: colors.textDim, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: radius.sm, backgroundColor: colors.cardRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.sm },
});
