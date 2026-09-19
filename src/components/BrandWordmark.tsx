import { Text, type TextProps } from 'react-native';

import { Fonts, Typography } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

export type BrandWordmarkSize = 'hero' | 'default' | 'compact';

type BrandWordmarkProps = Omit<TextProps, 'children'> & {
  size?: BrandWordmarkSize;
};

const SIZE_STYLES = {
  hero: Typography.hero,
  default: Typography.wordmark,
  compact: {
    ...Typography.wordmark,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.8,
  },
} as const;

export function BrandWordmark({
  style,
  size = 'default',
  ...rest
}: BrandWordmarkProps) {
  const tokens = useThemeTokens();

  return (
    <Text
      accessibilityRole="header"
      accessibilityLabel="TYS"
      style={[
        SIZE_STYLES[size],
        {
          color: tokens.text.primary,
          fontFamily: Fonts.sans,
        },
        style,
      ]}
      {...rest}
    >
      TYS
    </Text>
  );
}
