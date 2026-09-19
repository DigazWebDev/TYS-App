import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

export function FeedSkeleton() {
  const tokens = useThemeTokens();
  const block = { backgroundColor: tokens.background.elevated };

  return (
    <View style={styles.wrap} accessibilityLabel="A carregar o feed">
      <ActivityIndicator color={tokens.accent.teal.default} />
      <View style={[styles.line, block]} />
      <View style={[styles.lineShort, block]} />
      <View style={[styles.media, block]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.three,
    alignItems: 'center',
  },
  line: {
    alignSelf: 'stretch',
    height: 14,
    borderRadius: Radius.sm,
  },
  lineShort: {
    alignSelf: 'stretch',
    width: '60%',
    height: 14,
    borderRadius: Radius.sm,
  },
  media: {
    alignSelf: 'stretch',
    height: 180,
    borderRadius: Radius.lg,
  },
});
