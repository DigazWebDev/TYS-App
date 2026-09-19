import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Avatar, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/time';
import type { Post } from '@/types/post';

type PostCardProps = {
  post: Post;
  liking?: boolean;
  onLike: (postId: string) => void;
};

export function PostCard({ post, liking = false, onLike }: PostCardProps) {
  const tokens = useThemeTokens();
  const displayName = post.author.displayName ?? post.author.username;

  async function handleShare() {
    await Share.share({
      message: `${displayName}: ${post.body}`,
    });
  }

  function handleMore() {
    Alert.alert(displayName, undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Denunciar', style: 'destructive' },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Avatar name={displayName} uri={post.author.avatarUrl} size="sm" />
        <View style={styles.identity}>
          <Text variant="meta" style={styles.username}>
            {displayName}
          </Text>
          <Text variant="caption" tone="secondary">
            @{post.author.username} · {formatRelativeTime(post.createdAt)}
          </Text>
        </View>
        <Pressable
          onPress={handleMore}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Mais opções"
          style={styles.iconHit}
        >
          <SymbolView
            name={moreIcon}
            size={18}
            tintColor={tokens.text.secondary}
          />
        </Pressable>
      </View>

      {post.body ? (
        <Text variant="body" style={styles.body}>
          {post.body}
        </Text>
      ) : null}

      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={[styles.image, { backgroundColor: tokens.background.elevated }]}
          contentFit="cover"
          accessibilityLabel={`Imagem de ${displayName}`}
        />
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => onLike(post.id)}
          disabled={liking}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={post.likedByMe ? 'Remover gosto' : 'Gostar'}
          accessibilityState={{ busy: liking, selected: post.likedByMe }}
          style={({ pressed }) => [
            styles.action,
            (pressed || liking) && styles.actionPressed,
          ]}
        >
          <SymbolView
            name={post.likedByMe ? heartFillIcon : heartIcon}
            size={20}
            tintColor={
              post.likedByMe ? tokens.accent.teal.default : tokens.text.primary
            }
          />
          <Text
            variant="meta"
            tone={post.likedByMe ? 'accent' : 'secondary'}
          >
            {post.likeCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            Alert.alert('Comentários', 'Os comentários chegam na próxima etapa.')
          }
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Comentários"
          style={styles.action}
        >
          <SymbolView
            name={commentIcon}
            size={20}
            tintColor={tokens.text.primary}
          />
          <Text variant="meta" tone="secondary">
            {post.commentCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleShare}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Partilhar"
          style={styles.action}
        >
          <SymbolView
            name={shareIcon}
            size={20}
            tintColor={tokens.text.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const heartIcon: SymbolViewProps['name'] = {
  ios: 'heart',
  android: 'favorite_border',
  web: 'favorite_border',
};
const heartFillIcon: SymbolViewProps['name'] = {
  ios: 'heart.fill',
  android: 'favorite',
  web: 'favorite',
};
const commentIcon: SymbolViewProps['name'] = {
  ios: 'bubble.right',
  android: 'chat_bubble_outline',
  web: 'chat_bubble_outline',
};
const shareIcon: SymbolViewProps['name'] = {
  ios: 'square.and.arrow.up',
  android: 'share',
  web: 'share',
};
const moreIcon: SymbolViewProps['name'] = {
  ios: 'ellipsis',
  android: 'more_horiz',
  web: 'more_horiz',
};

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  identity: {
    flex: 1,
  },
  username: {
    fontWeight: '600',
  },
  iconHit: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  body: {
    marginTop: Spacing.two,
  },
  image: {
    marginTop: Spacing.three,
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radius.lg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginTop: Spacing.three,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionPressed: {
    opacity: 0.72,
  },
});
