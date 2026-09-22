import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { PostCard } from '@/components/feed/PostCard';
import { FollowButton } from '@/components/social/FollowButton';
import { ProfileStats } from '@/components/social/ProfileStats';
import { Avatar, Button, EmptyState, Header, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useAuthorPosts } from '@/hooks/use-author-posts';
import { useThemeTokens } from '@/hooks/use-theme';
import {
  fetchFollowCounts,
  fetchIsFollowing,
  type FollowChangeReason,
} from '@/lib/follows';
import { publicHandle, publicLabel } from '@/lib/identity';
import { createOrGetDirectConversation } from '@/lib/messages';
import { openDirectConversation, openFollowers, openFollowing } from '@/lib/navigation';
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
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followReady, setFollowReady] = useState(false);
  const authorPosts = useAuthorPosts(userId);
  const [likingPostIds, setLikingPostIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [openingConversation, setOpeningConversation] = useState(false);
  const openingConversationRef = useRef(false);
  const followTouched = useRef(false);
  const countDelta = useRef(0);
  const viewerId = session?.user.id;
  const isOwnProfile = Boolean(viewerId && viewerId === userId);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfileError('Não encontrámos este perfil.');
      return;
    }

    const [profileResult, counts, following] = await Promise.all([
      supabase
        .from('profiles')
        .select('username, display_name, avatar_url, bio')
        .eq('id', userId)
        .maybeSingle(),
      fetchFollowCounts(userId),
      viewerId && viewerId !== userId ? fetchIsFollowing(userId) : Promise.resolve(false),
    ]);

    if (profileResult.error) {
      setProfileError('Não foi possível carregar este perfil.');
      return;
    }
    if (!profileResult.data) {
      setProfileError('Este perfil não existe.');
      return;
    }

    setProfile(profileResult.data);
    setProfileError(null);
    if (!followTouched.current) {
      setFollowers(counts.followers);
      setFollowingCount(counts.following);
      setIsFollowing(following);
      setFollowReady(true);
    }
  }, [userId, viewerId]);

  useFocusEffect(
    useCallback(() => {
      followTouched.current = false;
      void loadProfile();
    }, [loadProfile])
  );

  const label = publicLabel({
    displayName: profile?.display_name,
    username: profile?.username,
  });
  const handle = profile?.display_name?.trim()
    ? publicHandle(profile.username)
    : null;
  const canMessage = Boolean(profile && userId && viewerId && !isOwnProfile);

  function onFollowChange(following: boolean, reason: FollowChangeReason) {
    followTouched.current = true;
    setIsFollowing(following);
    setFollowReady(true);

    if (reason === 'optimistic') {
      countDelta.current = following ? 1 : -1;
      setFollowers((count) => Math.max(0, count + countDelta.current));
      return;
    }

    if (reason === 'rollback') {
      setFollowers((count) => Math.max(0, count - countDelta.current));
      countDelta.current = 0;
      return;
    }

    if (reason === 'already' && userId) {
      void fetchFollowCounts(userId).then((counts) => {
        if (!counts.error) {
          setFollowers(counts.followers);
          setFollowingCount(counts.following);
        }
      });
    }
  }

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

  async function refresh() {
    followTouched.current = false;
    await Promise.all([authorPosts.refresh(), loadProfile()]);
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title={profile ? label : 'Perfil'}
        onBack={() => router.back()}
        showBorder={false}
      />
      <FlatList
        data={authorPosts.posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Post }) => (
          <PostCard
            post={item}
            currentUserId={viewerId}
            liking={likingPostIds.has(item.id)}
            deleting={authorPosts.deletingPostIds.has(item.id)}
            onLike={toggleLike}
            onDelete={isOwnProfile ? authorPosts.removePost : undefined}
          />
        )}
        ListHeaderComponent={
          profileError ? null : (
            <View style={styles.header}>
              <Avatar
                name={label}
                uri={profile?.avatar_url}
                size="xl"
              />
              <Text variant="title" style={styles.name}>
                {label}
              </Text>
              {handle ? (
                <Text variant="meta" tone="secondary">
                  {handle}
                </Text>
              ) : null}
              {profile?.bio ? (
                <Text variant="body" tone="secondary" style={styles.bio}>
                  {profile.bio}
                </Text>
              ) : null}
              {userId ? (
                <ProfileStats
                  posts={authorPosts.count}
                  followers={followers}
                  following={followingCount}
                  onFollowers={() => openFollowers(userId)}
                  onFollowing={() => openFollowing(userId)}
                />
              ) : null}
              {canMessage && userId ? (
                <View style={styles.actions}>
                  <FollowButton
                    profileId={userId}
                    label={label}
                    following={isFollowing}
                    onChange={onFollowChange}
                    busy={!followReady}
                    style={styles.actionButton}
                  />
                  <Button
                    variant="secondary"
                    loading={openingConversation}
                    onPress={sendMessage}
                    accessibilityLabel="Enviar mensagem"
                    style={styles.actionButton}
                  >
                    Mensagem
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
            onRefresh={() => void refresh()}
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
  actions: {
    width: '100%',
    marginTop: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
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
