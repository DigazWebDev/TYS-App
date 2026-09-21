import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
  type LayoutChangeEvent,
} from 'react-native';

function reportedKeyboardHeight(event: KeyboardEvent) {
  if (event.endCoordinates.height > 0) {
    return event.endCoordinates.height;
  }

  return Math.max(
    0,
    Dimensions.get('window').height - event.endCoordinates.screenY
  );
}

/**
 * Android chat inset. Uses the keyboard height, then subtracts only the
 * height this view already lost. `window - screenY` stays 0 on edge-to-edge
 * even while the keyboard covers the composer, so it is not the signal.
 */
export function useAndroidChatKeyboardInset() {
  const [inset, setInset] = useState(0);
  const closedHeight = useRef(0);
  const bodyHeight = useRef(0);
  const reportedHeight = useRef(0);
  const keyboardOpen = useRef(false);

  const applyInset = useCallback(() => {
    const alreadyResized = Math.max(0, closedHeight.current - bodyHeight.current);
    setInset(Math.max(0, Math.round(reportedHeight.current - alreadyResized)));
  }, []);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      bodyHeight.current = event.nativeEvent.layout.height;
      if (!keyboardOpen.current) {
        closedHeight.current = bodyHeight.current;
        return;
      }
      applyInset();
    },
    [applyInset]
  );

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardOpen.current = true;
      reportedHeight.current = reportedKeyboardHeight(event);
      applyInset();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardOpen.current = false;
      reportedHeight.current = 0;
      setInset(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [applyInset]);

  return {
    inset: Platform.OS === 'android' ? inset : 0,
    onLayout,
  };
}
