import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Avatar, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/time';
import type { Post } from '@/types/post';

type PostCardProps = {
  post: Post;
  currentUserId?: string;
  liking?: boolean;
  deleting?: boolean;
  onLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onOpenProfile?: (userId: string) => void;
};

export function PostCard({
  post,
  currentUserId,
  liking = false,
  deleting = false,
  onLike,
  onDelete,
  onOpenProfile,
}: PostCardProps) {
  const tokens = useThemeTokens();
  const displayName = post.author.displayName ?? post.author.username;
  const isOwn = Boolean(currentUserId && currentUserId === post.author.id);

  async function handleShare() {
    await Share.share({
      message: `${displayName}: ${post.body}`,
    });
  }

  function handleMore() {
    if (!isOwn || !onDelete) {
      return;
    }

    Alert.alert(
      'Apagar publicação',
      'Esta história desaparece do feed e do teu perfil.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => onDelete(post.id),
        },
      ]
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Avatar name={displayName} uri={post.author.avatarUrl} size="sm" />
        <Pressable
          onPress={() => onOpenProfile?.(post.author.id)}
          disabled={!onOpenProfile}
          accessibilityRole={onOpenProfile ? 'button' : undefined}
          accessibilityLabel={
            onOpenProfile ? `Abrir perfil de ${displayName}` : undefined
          }
          style={styles.identity}
        >
          <Text variant="meta" style={styles.username}>
            {displayName}
          </Text>
          <Text variant="caption" tone="secondary">
            @{post.author.username} · {formatRelativeTime(post.createdAt)}
          </Text>
        </Pressable>
        {isOwn && onDelete ? (
          <Pressable
            onPress={handleMore}
            disabled={deleting}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Mais opções"
            accessibilityState={{ busy: deleting, disabled: deleting }}
            style={({ pressed }) => [
              styles.iconHit,
              (pressed || deleting) && styles.actionPressed,
            ]}
          >
          <SymbolView
            name={moreIcon}
            size={18}
            tintColor={tokens.text.secondary}
          />
        </Pressable>
        ) : null}
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
          onPress={() => router.push(`/post/${post.id}` as Href)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            post.commentCount === 1
              ? '1 comentário'
              : `${post.commentCount} comentários`
          }
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
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
