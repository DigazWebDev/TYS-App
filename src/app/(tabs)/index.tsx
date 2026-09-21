import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { PostCard } from '@/components/feed/PostCard';
import { StoryRail } from '@/components/feed/StoryRail';
import { Button, EmptyState, Header, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useFeed } from '@/hooks/use-feed';
import { useOwnProfile } from '@/hooks/use-own-profile';
import { useThemeTokens } from '@/hooks/use-theme';
import { openCreatePost, openProfile } from '@/lib/navigation';
import type { Post } from '@/types/post';

export default function FeedScreen() {
  const tokens = useThemeTokens();
  const feed = useFeed();
  const ownProfile = useOwnProfile();
  const currentUser = {
    id: feed.currentUser?.id ?? 'me',
    username: ownProfile?.username ?? 'tu',
    displayName: ownProfile?.display_name ?? null,
    avatarUrl: ownProfile?.avatar_url ?? null,
  };

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
      <Header brand showBorder={false} />

      <FlatList
        data={feed.posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Post }) => (
          <PostCard
            post={item}
            currentUserId={feed.currentUser?.id}
            liking={feed.likingPostIds.has(item.id)}
            deleting={feed.deletingPostIds.has(item.id)}
            onLike={feed.toggleLike}
            onDelete={feed.removePost}
            onOpenProfile={(userId) =>
              openProfile(userId, feed.currentUser?.id)
            }
          />
        )}
        ListHeaderComponent={
          <View>
            <StoryRail stories={feed.stories} currentUser={currentUser} />
            <View style={styles.composer}>
              <Text variant="overline" tone="secondary">
                CONTA A TUA HISTÓRIA
              </Text>
              <Button onPress={openCreatePost} style={styles.composerButton}>
                Criar publicação
              </Button>
            </View>
          </View>
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
  composer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  composerButton: {
    marginTop: Spacing.two,
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
