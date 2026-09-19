import { type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

export type ScreenProps = {
  children: ReactNode;
  edges?: readonly Edge[];
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  edges = ['top', 'right', 'bottom', 'left'],
  padded = false,
  style,
}: ScreenProps) {
  const tokens = useThemeTokens();

  return (
    <SafeAreaView
      edges={[...edges]}
      style={[
        styles.root,
        { backgroundColor: tokens.background.canvas },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: Spacing.three,
  },
});
