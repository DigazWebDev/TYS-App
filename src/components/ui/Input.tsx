import { type ReactNode, forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

export type InputProps = TextInputProps & {
  invalid?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    invalid = false,
    left,
    right,
    style,
    containerStyle,
    onFocus,
    onBlur,
    placeholderTextColor,
    multiline = false,
    ...rest
  },
  ref
) {
  const tokens = useThemeTokens();
  const [focused, setFocused] = useState(false);

  const borderColor = invalid
    ? tokens.border.strong
    : focused
      ? tokens.accent.teal.default
      : tokens.border.subtle;

  return (
    <View
      style={[
        styles.container,
        multiline ? styles.multilineContainer : styles.singleLine,
        {
          backgroundColor: tokens.background.surface,
          borderColor,
        },
        containerStyle,
      ]}
    >
      {left ? <View style={styles.adornmentStart}>{left}</View> : null}
      <TextInput
        ref={ref}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={placeholderTextColor ?? tokens.text.secondary}
        selectionColor={tokens.accent.teal.default}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.field,
          {
            color: tokens.text.primary,
            fontFamily: Fonts.sans,
          },
          style,
        ]}
        {...rest}
      />
      {right ? <View style={styles.adornmentEnd}>{right}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  singleLine: {
    height: 52,
    alignItems: 'center',
  },
  multilineContainer: {
    minHeight: 180,
    alignItems: 'flex-start',
    paddingVertical: Spacing.three,
  },
  field: {
    flex: 1,
    paddingVertical: 0,
    fontSize: Typography.body.fontSize,
  },
  adornmentStart: {
    marginRight: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adornmentEnd: {
    marginLeft: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
