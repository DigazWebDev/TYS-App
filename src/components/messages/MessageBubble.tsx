import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/time';

type MessageBubbleProps = {
  body: string;
  createdAt: string;
  isOwn: boolean;
};

export function MessageBubble({ body, createdAt, isOwn }: MessageBubbleProps) {
  const tokens = useThemeTokens();
  const time = formatRelativeTime(createdAt);

  return (
    <View style={[styles.row, isOwn ? styles.ownRow : styles.theirRow]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isOwn
              ? tokens.accent.teal.default
              : tokens.background.elevated,
          },
        ]}
      >
        <Text
          variant="body"
          tone={isOwn ? 'onAccent' : 'primary'}
          style={styles.body}
        >
          {body}
        </Text>
        {time ? (
          <Text
            variant="caption"
            tone={isOwn ? 'onAccent' : 'secondary'}
            style={[styles.time, isOwn && styles.ownTime]}
          >
            {time}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  ownRow: {
    alignItems: 'flex-end',
  },
  theirRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  body: {
    lineHeight: 22,
  },
  time: {
    marginTop: Spacing.one,
  },
  ownTime: {
    opacity: 0.82,
  },
});
