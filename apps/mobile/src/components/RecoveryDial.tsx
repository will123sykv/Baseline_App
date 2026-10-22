import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, recoveryColor, type } from '@/theme';
import type { RecoveryResult } from '@baseline/core';

const SIZE = 168;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Recovery as a ring that fills to the score, coloured by band. */
export function RecoveryDial({ recovery, hrvDays }: { recovery: RecoveryResult; hrvDays: number }) {
  const color = recoveryColor(recovery.band);
  const pct = recovery.score === null ? 0 : recovery.score / 100;
  const label =
    recovery.status === 'calibrating'
      ? `Calibrating · ${Math.min(hrvDays, 14)}/14 days`
      : recovery.status === 'partial'
        ? 'Partial · no HRV today'
        : 'Recovery';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Recovery ${recovery.score ?? 'not ready'}`}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.border} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * pct} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={[type.hero, { color: recovery.score === null ? colors.textFaint : colors.text }]}>
          {recovery.score === null ? '–' : recovery.score}
        </Text>
        <Text style={{ ...type.small, color: colors.textDim }}>{label}</Text>
      </View>
    </View>
  );
}
