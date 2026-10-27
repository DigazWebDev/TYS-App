import { Platform, Vibration } from 'react-native';

export type StudioPulse = 'grab' | 'trash' | 'confirm';

/** Short platform vibration. expo-haptics is not installed. */
export function studioPulse(kind: StudioPulse) {
  if (Platform.OS === 'web') {
    return;
  }
  Vibration.vibrate(kind === 'confirm' || kind === 'trash' ? 16 : 8);
}
