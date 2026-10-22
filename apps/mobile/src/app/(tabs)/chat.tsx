import { ComingSoon } from '@/components/ComingSoon';

export default function Chat() {
  return (
    <ComingSoon
      title="Chat"
      phase="Phase 3 · AI"
      items={[
        'A morning note on how recovered you are and what to do today',
        'Ask questions about your own data',
        'Off until you add an API key, with a monthly spending cap',
      ]}
    />
  );
}
