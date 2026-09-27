import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { PostMediaCarousel } from '@/components/feed/PostMediaCarousel';
import { PostMediaViewer } from '@/components/feed/PostMediaViewer';
import { Avatar, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import { publicHandle, publicLabel } from '@/lib/identity';
import { formatRelativeTime } from '@/lib/time';
import type { Post, PostMedia } from '@/types/post';

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
  const label = publicLabel(post.author);
  const handle = post.author.displayName?.trim()
    ? publicHandle(post.author.username)
    : null;
  const publishedAt = formatRelativeTime(post.createdAt);
  const meta = handle ? `${handle} · ${publishedAt}` : publishedAt;
  const media = [...(post.media ?? [])].sort(
    (left, right) => left.position - right.position,
  );
  const singleImage =
    media.length === 1 && media[0]?.mediaType === 'image' && media[0].url
      ? media[0].url
      : media.length === 0
        ? post.imageUrl
        : null;
  const showCarousel =
    media.length > 1 || (media.length === 1 && singleImage === null);
  const isOwn = Boolean(currentUserId && currentUserId === post.author.id);
  const viewerItems: PostMedia[] =
    media.length > 0
      ? media
      : post.imageUrl
        ? [
            {
              id: `${post.id}-image`,
              postId: post.id,
              storagePath: post.imageUrl,
              mediaType: 'image',
              position: 0,
              url: post.imageUrl,
            },
          ]
        : [];
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  async function handleShare() {
    await Share.share({
      message: `${label}: ${post.body}`,
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
        <Avatar name={label} uri={post.author.avatarUrl} size="sm" />
        <Pressable
          onPress={() => onOpenProfile?.(post.author.id)}
          disabled={!onOpenProfile}
          accessibilityRole={onOpenProfile ? 'button' : undefined}
          accessibilityLabel={
            onOpenProfile ? `Abrir perfil de ${label}` : undefined
          }
          style={styles.identity}
        >
          <Text variant="meta" style={styles.username}>
            {label}
          </Text>
          <Text variant="caption" tone="secondary">
            {meta}
          </Text>
          {post.isDemo ? (
            <Text variant="overline" tone="accent">
              DEMONSTRAÇÃO
            </Text>
          ) : null}
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

      {showCarousel ? (
        <PostMediaCarousel
          items={media}
          onOpen={(index) => setViewerIndex(index)}
        />
      ) : null}

      {singleImage ? (
        <Pressable
          onPress={() => setViewerIndex(0)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir fotografia de ${label}`}
        >
          <Image
            source={{ uri: singleImage }}
            style={[styles.image, { backgroundColor: tokens.background.elevated }]}
            contentFit="cover"
            accessibilityLabel={`Imagem de ${label}`}
          />
        </Pressable>
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
          onPress={() => {
            if (post.isDemo) {
              Alert.alert(
                'Demonstração',
                'Esta publicação existe só neste ecrã.',
              );
              return;
            }
            router.push(`/post/${post.id}` as Href);
          }}
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
      {viewerIndex !== null && viewerItems.length > 0 ? (
        <PostMediaViewer
          items={viewerItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
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
