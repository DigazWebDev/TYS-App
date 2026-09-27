import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { CreateMenu } from '@/components/create/CreateMenu';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { PostCard } from '@/components/feed/PostCard';
import { StoryRail } from '@/components/feed/StoryRail';
import { Button, EmptyState, Header, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useFeed } from '@/hooks/use-feed';
import { useOwnProfile } from '@/hooks/use-own-profile';
import { useThemeTokens } from '@/hooks/use-theme';
import { openCreatePost, openNotifications, openProfile } from '@/lib/navigation';
import { demoFeedPosts, SHOW_POST_MEDIA_DEMO } from '@/lib/post-media-demo';
import type { Post } from '@/types/post';

export default function FeedScreen() {
  const tokens = useThemeTokens();
  const feed = useFeed();
  const ownProfile = useOwnProfile();
  const currentUser = {
    id: feed.currentUser?.id ?? 'me',
    username: ownProfile?.username ?? '',
    displayName: ownProfile?.display_name ?? null,
    avatarUrl: ownProfile?.avatar_url ?? null,
  };

  const posts =
    feed.status === 'ready' && SHOW_POST_MEDIA_DEMO
      ? [...demoFeedPosts(), ...feed.posts]
      : feed.posts;
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  function renderEmpty() {
    if (feed.status === 'loading') {
      return <FeedSkeleton />;
    }

    if (feed.status === 'error') {
      return (
        <EmptyState
          title="Não foi possível carregar"
          description={feed.error ?? 'Tenta novamente dentro de momentos.'}
          action={
            <Button onPress={feed.retry} variant="secondary">
              Tentar novamente
            </Button>
          }
        />
      );
    }

    return (
      <EmptyState
        title="Ainda não há histórias"
        description="O feed está ligado. Conta a tua e ela aparece aqui para toda a gente."
        action={
          <Button onPress={openCreatePost}>Criar publicação</Button>
        }
      />
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        brand
        showBorder={false}
        left={
          <Pressable
            onPress={() => setCreateMenuOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Criar"
            accessibilityState={{ expanded: createMenuOpen }}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconPressed,
            ]}
          >
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              size={22}
              tintColor={tokens.text.primary}
            />
          </Pressable>
        }
        right={
          <Pressable
            onPress={openNotifications}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notificações"
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconPressed,
            ]}
          >
            <SymbolView
              name={{
                ios: 'bell',
                android: 'notifications_none',
                web: 'notifications_none',
              }}
              size={20}
              tintColor={tokens.text.primary}
            />
          </Pressable>
        }
      />
      <CreateMenu visible={createMenuOpen} onClose={() => setCreateMenuOpen(false)} />

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Post }) => (
          <PostCard
            post={item}
            currentUserId={feed.currentUser?.id}
            liking={feed.likingPostIds.has(item.id)}
            deleting={feed.deletingPostIds.has(item.id)}
            onLike={(postId) => {
              if (postId.startsWith('demo-')) {
                return;
              }
              feed.toggleLike(postId);
            }}
            onDelete={feed.removePost}
            onOpenProfile={(userId) =>
              openProfile(userId, feed.currentUser?.id)
            }
          />
        )}
        ListHeaderComponent={
          <StoryRail stories={feed.stories} currentUser={currentUser} />
        }
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => (
          <View
            style={[styles.separator, { backgroundColor: tokens.border.subtle }]}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={feed.refresh}
            tintColor={tokens.accent.teal.default}
            colors={[tokens.accent.teal.default]}
          />
        }
        contentContainerStyle={
          feed.posts.length === 0 ? styles.emptyList : styles.list
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: {
    opacity: 0.72,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four,
  },
  list: {
    paddingBottom: Spacing.five,
  },
  emptyList: {
    flexGrow: 1,
    paddingBottom: Spacing.five,
  },
});
