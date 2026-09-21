import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';

const ROW_COUNT = 4;

export function ConversationSkeleton() {
  const tokens = useThemeTokens();
  const block = { backgroundColor: tokens.background.elevated };

  return (
    <View accessibilityLabel="A carregar conversas">
      {Array.from({ length: ROW_COUNT }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={[styles.avatar, block]} />
          <View style={styles.lines}>
            <View style={[styles.line, block]} />
            <View style={[styles.lineShort, block]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 76,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
  },
  lines: {
    flex: 1,
    gap: Spacing.two,
  },
  line: {
    height: 14,
    borderRadius: Radius.sm,
    width: '46%',
  },
  lineShort: {
    height: 12,
    borderRadius: Radius.sm,
    width: '72%',
  },
});
