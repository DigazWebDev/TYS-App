import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

import { Text } from './Text';

export type DividerProps = {
  inset?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function Divider({ inset = false, label, style }: DividerProps) {
  const tokens = useThemeTokens();

  if (!label) {
    return (
      <View
        accessible={false}
        importantForAccessibility="no"
        style={[
          styles.line,
          {
            backgroundColor: tokens.border.subtle,
            marginHorizontal: inset ? Spacing.three : 0,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.labeled, inset && styles.inset, style]}
    >
      <View
        style={[styles.line, { backgroundColor: tokens.border.subtle, flex: 1 }]}
      />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <View
        style={[styles.line, { backgroundColor: tokens.border.subtle, flex: 1 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  labeled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  inset: {
    marginHorizontal: Spacing.three,
  },
});
