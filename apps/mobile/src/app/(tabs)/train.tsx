import { ComingSoon } from '@/components/ComingSoon';

export default function Train() {
  return (
    <ComingSoon
      title="Train"
      phase="Phase 3 · Training"
      items={[
        'Log sets, reps and kg from templates pre-filled with last time',
        'Effort rating at the end of each session',
        'Weekly volume per muscle group and personal records',
        'Strain: last 7 days vs last 28 days',
      ]}
    />
  );
}
