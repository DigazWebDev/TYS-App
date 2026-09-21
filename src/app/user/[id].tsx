import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { PostCard } from '@/components/feed/PostCard';
import { Avatar, Button, EmptyState, Header, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useAuthorPosts } from '@/hooks/use-author-posts';
import { useThemeTokens } from '@/hooks/use-theme';
import { createOrGetDirectConversation } from '@/lib/messages';
import { openDirectConversation } from '@/lib/navigation';
import { likePost, unlikePost } from '@/lib/post-likes';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/types/post';

type ProfileRow = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const userId = firstParam(id);
  const tokens = useThemeTokens();
  const { session } = useAuthSession();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const authorPosts = useAuthorPosts(userId);
  const [likingPostIds, setLikingPostIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [openingConversation, setOpeningConversation] = useState(false);
  const openingConversationRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setProfileError('Não encontrámos este perfil.');
      return;
    }

    let active = true;

    supabase
      .from('profiles')
      .select('username, display_name, avatar_url, bio')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          setProfileError(error.message);
          return;
        }
        if (!data) {
          setProfileError('Este perfil não existe.');
          return;
        }
        setProfile(data);
        setProfileError(null);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const displayName = profile?.display_name ?? profile?.username ?? 'utilizador';
  const canMessage = Boolean(
    profile && userId && session?.user.id && session.user.id !== userId
  );

  async function sendMessage() {
    if (!userId || !canMessage || openingConversationRef.current) {
      return;
    }

    openingConversationRef.current = true;
    setOpeningConversation(true);

    try {
      const conversationId = await createOrGetDirectConversation(userId);
      openDirectConversation(conversationId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir a conversa. Tenta novamente.';
      Alert.alert('Mensagem', message);
    } finally {
      openingConversationRef.current = false;
      setOpeningConversation(false);
    }
  }

  async function toggleLike(postId: string) {
    const post = authorPosts.posts.find((item) => item.id === postId);
    if (!post || likingPostIds.has(postId)) {
      return;
    }

    setLikingPostIds((current) => new Set(current).add(postId));
    const result = post.likedByMe
      ? await unlikePost(postId)
      : await likePost(postId);
    setLikingPostIds((current) => {
      const next = new Set(current);
      next.delete(postId);
      return next;
    });

    if (result.error) {
      Alert.alert('Não foi possível atualizar o gosto', result.error);
      return;
    }

    void authorPosts.refresh();
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title={profile ? `@${profile.username}` : 'Perfil'}
        onBack={() => router.back()}
        showBorder={false}
      />
      <FlatList
        data={authorPosts.posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Post }) => (
          <PostCard
            post={item}
            currentUserId={session?.user.id}
            liking={likingPostIds.has(item.id)}
            deleting={authorPosts.deletingPostIds.has(item.id)}
            onLike={toggleLike}
            onDelete={
              session?.user.id === userId ? authorPosts.removePost : undefined
            }
          />
        )}
        ListHeaderComponent={
          profileError ? null : (
            <View style={styles.header}>
              <Avatar
                name={displayName}
                uri={profile?.avatar_url}
                size="xl"
              />
              <Text variant="title" style={styles.name}>
                {displayName}
              </Text>
              {profile ? (
                <Text variant="meta" tone="secondary">
                  @{profile.username}
                </Text>
              ) : null}
              {profile?.bio ? (
                <Text variant="body" tone="secondary" style={styles.bio}>
                  {profile.bio}
                </Text>
              ) : null}
              <Text variant="caption" tone="secondary" style={styles.count}>
                {authorPosts.count === 1
                  ? '1 publicação'
                  : `${authorPosts.count} publicações`}
              </Text>
              {canMessage ? (
                <View style={styles.actions}>
                  <Button
                    loading={openingConversation}
                    onPress={sendMessage}
                    accessibilityLabel="Enviar mensagem"
                  >
                    Enviar mensagem
                  </Button>
                </View>
              ) : null}
            </View>
          )
        }
        ListEmptyComponent={
          profileError ? (
            <EmptyState
              title="Perfil indisponível"
              description={profileError}
            />
          ) : authorPosts.status === 'loading' ? (
            <EmptyState title="A carregar" description="A trazer as histórias." />
          ) : authorPosts.status === 'error' ? (
            <EmptyState
              title="Não foi possível carregar"
              description={authorPosts.error ?? 'Tenta novamente.'}
              action={
                <Button onPress={authorPosts.retry} variant="secondary">
                  Tentar novamente
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Ainda não há histórias"
              description="Este perfil ainda não publicou na TYS."
            />
          )
        }
        ItemSeparatorComponent={() => (
          <View
            style={[styles.separator, { backgroundColor: tokens.border.subtle }]}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={authorPosts.refreshing}
            onRefresh={authorPosts.refresh}
            tintColor={tokens.accent.teal.default}
            colors={[tokens.accent.teal.default]}
          />
        }
        contentContainerStyle={
          authorPosts.posts.length === 0 ? styles.emptyList : styles.list
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  name: {
    marginTop: Spacing.three,
  },
  bio: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  count: {
    marginTop: Spacing.two,
  },
  actions: {
    width: '100%',
    marginTop: Spacing.four,
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
