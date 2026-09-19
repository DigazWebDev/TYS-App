import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text variant="title" style={styles.center}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="secondary" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
  },
  center: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  action: {
    marginTop: Spacing.four,
    alignSelf: 'stretch',
  },
});
