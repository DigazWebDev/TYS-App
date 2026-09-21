import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';

type ConversationRowProps = {
  name: string;
  handle?: string | null;
  avatarUrl: string | null;
  preview: string;
  timestamp: string;
  placeholder?: boolean;
  onPress: () => void;
};

export function ConversationRow({
  name,
  handle,
  avatarUrl,
  preview,
  timestamp,
  placeholder = false,
  onPress,
}: ConversationRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Conversa com ${name}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={name} uri={avatarUrl} size="md" />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="meta" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {timestamp ? (
            <Text variant="caption" tone="secondary">
              {timestamp}
            </Text>
          ) : null}
        </View>
        {handle ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            @{handle}
          </Text>
        ) : null}
        <Text
          variant="body"
          tone="secondary"
          numberOfLines={1}
          style={placeholder ? styles.placeholder : styles.preview}
        >
          {preview}
        </Text>
      </View>
    </Pressable>
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
  pressed: {
    opacity: 0.72,
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  preview: {
    lineHeight: 22,
  },
  placeholder: {
    lineHeight: 22,
  },
});
