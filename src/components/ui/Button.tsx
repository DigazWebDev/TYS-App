import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { FontWeight, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const tokens = useThemeTokens();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => {
        const backgroundColor =
          variant === 'primary'
            ? pressed
              ? tokens.accent.teal.pressed
              : tokens.accent.teal.default
            : variant === 'secondary'
              ? tokens.background.surface
              : 'transparent';

        return [
          styles.base,
          size === 'lg' ? styles.lg : styles.md,
          {
            backgroundColor,
            borderColor:
              variant === 'secondary' ? tokens.border.subtle : 'transparent',
            borderWidth: variant === 'secondary' ? 1 : 0,
            opacity: isDisabled ? 0.4 : 1,
          },
          style,
        ];
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' ? tokens.text.onAccent : tokens.text.primary
          }
        />
      ) : (
        <Text
          variant="body"
          tone={variant === 'primary' ? 'onAccent' : 'primary'}
          style={styles.label}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  md: {
    height: 52,
  },
  lg: {
    height: 56,
  },
  label: {
    fontWeight: FontWeight.semibold,
    lineHeight: Typography.body.lineHeight,
  },
});
