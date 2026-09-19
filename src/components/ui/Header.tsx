import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BrandWordmark } from '@/components/BrandWordmark';
import { Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

import { Text } from './Text';

export type HeaderProps = {
  title?: string;
  wordmark?: boolean;
  brand?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  showBorder?: boolean;
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Header({
  title,
  wordmark = false,
  brand = false,
  left,
  right,
  onBack,
  showBorder = true,
  safeTop = false,
  style,
}: HeaderProps) {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();

  const leading = onBack ? (
    <Pressable
      onPress={onBack}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [styles.iconHit, pressed && styles.pressed]}
    >
      <SymbolView
        name={{
          ios: 'chevron.left',
          android: 'chevron_left',
          web: 'chevron_left',
        }}
        size={18}
        weight="semibold"
        tintColor={tokens.text.primary}
      />
    </Pressable>
  ) : (
    left
  );

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.background.canvas,
          borderBottomColor: tokens.border.subtle,
          borderBottomWidth: showBorder ? StyleSheet.hairlineWidth : 0,
          paddingTop: safeTop ? insets.top : 0,
        },
        style,
      ]}
    >
      {brand ? (
        <View style={styles.brand} accessibilityRole="header">
          <BrandWordmark size="compact" />
        </View>
      ) : (
        <>
          <View style={styles.side}>{leading}</View>
          <View style={styles.center} accessibilityRole="header">
            {wordmark ? (
              <BrandWordmark style={styles.wordmark} />
            ) : title ? (
              <Text variant="title" numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </View>
        </>
      )}

      <View style={[styles.side, styles.sideEnd]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
  },
  sideEnd: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.one,
  },
  brand: {
    flex: 1,
    justifyContent: 'center',
  },
  iconHit: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.8,
  },
  pressed: {
    opacity: 0.72,
  },
});
