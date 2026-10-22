import { ComingSoon } from '@/components/ComingSoon';

export default function Food() {
  return (
    <ComingSoon
      title="Food"
      phase="Phase 1 · Calories"
      items={[
        'Photo a meal and get an AI estimate you confirm',
        'Barcode scan and search with Open Food Facts (free)',
        'Quick add, saved meals and copy yesterday',
        'Calories remaining, protein and macros for today',
      ]}
    />
  );
}
