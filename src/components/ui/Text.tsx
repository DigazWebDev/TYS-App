import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Fonts, Typography } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

export type TextVariant = keyof typeof Typography;
export type TextTone = 'primary' | 'secondary' | 'inverse' | 'accent' | 'onAccent';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

export function Text({
  variant = 'body',
  tone = 'primary',
  style,
  ...rest
}: TextProps) {
  const tokens = useThemeTokens();

  return (
    <RNText
      style={[
        Typography[variant],
        {
          color: tokens.text[tone],
          fontFamily: Fonts.sans,
        },
        style,
      ]}
      {...rest}
    />
  );
}
