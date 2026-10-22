import { ComingSoon } from '@/components/ComingSoon';

export default function Trends() {
  return (
    <ComingSoon
      title="Trends"
      phase="Phases 1–3"
      items={[
        'Weight trend and weekly rate',
        'Real maintenance calories (TDEE) from intake and weight',
        'HRV and resting heart rate against your normal range',
        'Sleep regularity and debt',
      ]}
    />
  );
}
