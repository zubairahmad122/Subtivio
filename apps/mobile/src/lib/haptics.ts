import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tap feedback; a no-op on web. */
export function tap() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}
