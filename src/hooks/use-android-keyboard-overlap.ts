import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/**
 * Android edge-to-edge often ignores adjustResize, so the window stays full
 * height and the keyboard covers the bottom. This returns only the overlap
 * that the window did not already absorb. When resize works, the value is 0.
 */
export function useAndroidKeyboardOverlap() {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      const windowHeight = Dimensions.get('window').height;
      const covered = windowHeight - event.endCoordinates.screenY;
      setOverlap(covered > 0 ? Math.round(covered) : 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setOverlap(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return overlap;
}
