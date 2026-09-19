import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { PostCard } from '@/components/feed/PostCard';
import { StoryRail } from '@/components/feed/StoryRail';
import { Button, EmptyState, Header, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useFeed } from '@/hooks/use-feed';
import { useThemeTokens } from '@/hooks/use-theme';
import type { Post, ProfilePreview } from '@/types/post';

export default function FeedScreen() {
  const tokens = useThemeTokens();
  const feed = useFeed();
  const currentUser = profileFromSession(feed.currentUser);

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
        title="O teu feed está pronto"
        description={
          feed.schemaReady
            ? 'Quando seguires pessoas, as publicações delas aparecem aqui.'
            : 'Ainda não há publicações na TYS. Cria a primeira story enquanto o feed de posts fica ligado à base de dados.'
        }
        action={
          <Button onPress={() => router.push('/create-story')}>
            Criar story
          </Button>
        }
      />
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        brand
        showBorder={false}
        right={
          <Pressable
            onPress={() => router.push('/(tabs)/inbox')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mensagens"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <SymbolView
              name={{
                ios: 'paperplane',
                android: 'send',
                web: 'send',
              }}
              size={20}
              tintColor={tokens.text.primary}
            />
          </Pressable>
        }
      />

      <FlatList
        data={feed.posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Post }) => (
          <PostCard post={item} onLike={feed.toggleLike} />
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

function profileFromSession(
  user: { id: string; email?: string } | null
): ProfilePreview {
  const username = user?.email?.split('@')[0] ?? 'tu';
  return {
    id: user?.id ?? 'me',
    username,
    displayName: username,
    avatarUrl: null,
  };
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
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
