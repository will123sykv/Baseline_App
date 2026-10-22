import * as Updates from 'expo-updates';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Step 0 over-the-air test: change this text, run the `ota-update` workflow,
 * then reopen the app twice. If the new text shows, updates work.
 */
export const OTA_MARKER = 'Build 1 · installed from the first native build';

export interface UpdateInfo {
  enabled: boolean;
  channel: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  createdAt: Date | null;
  embedded: boolean;
}

export function updateInfo(): UpdateInfo {
  return {
    enabled: Updates.isEnabled,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    createdAt: Updates.createdAt,
    embedded: Updates.isEmbeddedLaunch,
  };
}

export type UpdateCheck = 'disabled' | 'none' | 'downloaded' | { error: string };

/** Check, download and stage an update. It applies on the next launch (or call reload). */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!Updates.isEnabled) return 'disabled';
  try {
    const res = await Updates.checkForUpdateAsync();
    if (!res.isAvailable) return 'none';
    await Updates.fetchUpdateAsync();
    return 'downloaded';
  } catch (e) {
    return { error: String(e) };
  }
}

export function reload(): Promise<void> {
  return Updates.reloadAsync();
}

export interface SigningInfo {
  /** When the free signing expires; the app won't open after this until re-signed. */
  expires: Date | null;
  profileName: string | null;
  teamName: string | null;
  daysLeft: number | null;
}

/**
 * Reads the provisioning profile Sideloadly embedded in the app bundle.
 * It's a signed plist; the XML inside is plain text, so a regex is enough.
 */
export function signingInfo(): SigningInfo {
  const empty: SigningInfo = { expires: null, profileName: null, teamName: null, daysLeft: null };
  if (Platform.OS !== 'ios') return empty;
  try {
    const file = new File(Paths.bundle, 'embedded.mobileprovision');
    if (!file.exists) return empty;
    const bytes = file.bytesSync();
    let text = '';
    for (let i = 0; i < bytes.length; i += 4096) {
      text += String.fromCharCode(...bytes.subarray(i, i + 4096));
    }
    const pick = (key: string, tag: 'date' | 'string') =>
      text.match(new RegExp(`<key>${key}</key>\\s*<${tag}>([^<]+)</${tag}>`))?.[1] ?? null;
    const exp = pick('ExpirationDate', 'date');
    const expires = exp ? new Date(exp) : null;
    return {
      expires,
      profileName: pick('Name', 'string'),
      teamName: pick('TeamName', 'string'),
      daysLeft: expires ? Math.floor((expires.getTime() - Date.now()) / 86_400_000) : null,
    };
  } catch {
    return empty;
  }
}
