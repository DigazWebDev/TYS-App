import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Avatar, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/time';
import type { PostComment } from '@/types/post';

type CommentRowProps = {
  comment: PostComment;
  canDelete?: boolean;
  deleting?: boolean;
  onDelete?: (commentId: string) => void;
};

export function CommentRow({
  comment,
  canDelete = false,
  deleting = false,
  onDelete,
}: CommentRowProps) {
  const tokens = useThemeTokens();
  const displayName = comment.author.displayName ?? comment.author.username;

  function confirmDelete() {
    if (!onDelete || deleting) {
      return;
    }

    Alert.alert(
      'Apagar comentário',
      'Este comentário desaparece da conversa.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ]
    );
  }

  return (
    <View style={styles.row}>
      <Avatar name={displayName} uri={comment.author.avatarUrl} size="sm" />
      <View style={styles.content}>
        <View style={styles.meta}>
          <Text variant="meta" style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text variant="caption" tone="secondary">
            {formatRelativeTime(comment.createdAt)}
          </Text>
        </View>
        <Text variant="body">{comment.body}</Text>
      </View>
      {canDelete ? (
        <Pressable
          onPress={confirmDelete}
          disabled={deleting}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Apagar comentário"
          accessibilityState={{ busy: deleting, disabled: deleting }}
          style={({ pressed }) => [
            styles.deleteHit,
            (pressed || deleting) && styles.pressed,
          ]}
        >
          <SymbolView
            name={{
              ios: 'trash',
              android: 'delete',
              web: 'delete',
            }}
            size={16}
            tintColor={tokens.text.secondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  content: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    marginBottom: Spacing.half,
  },
  name: {
    flexShrink: 1,
    fontWeight: '600',
  },
  deleteHit: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
