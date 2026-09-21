import { useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { PostCard } from '@/components/feed/PostCard';
import { Avatar, Button, EmptyState, Header, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useAuthorPosts } from '@/hooks/use-author-posts';
import { useOwnProfile } from '@/hooks/use-own-profile';
import { useThemeTokens } from '@/hooks/use-theme';
import { publicLabel } from '@/lib/identity';
import { openEditProfile } from '@/lib/navigation';
import { likePost, unlikePost } from '@/lib/post-likes';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/types/post';

export default function OwnProfileScreen() {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const tokens = useThemeTokens();
  const profile = useOwnProfile();
  const [signingOut, setSigningOut] = useState(false);
  const signingOutRef = useRef(false);
  const authorPosts = useAuthorPosts(userId);
  const [likingPostIds, setLikingPostIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const displayName = publicLabel({
    displayName: profile?.display_name,
    username: profile?.username,
  });

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

  async function signOut() {
    if (signingOutRef.current) {
      return;
    }

    signingOutRef.current = true;
    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      signingOutRef.current = false;
      setSigningOut(false);
      Alert.alert('Erro ao terminar sessão', error.message);
      return;
    }

    router.replace('/login');
  }

  function confirmSignOut() {
    if (signingOutRef.current) {
      return;
    }

    Alert.alert('Terminar sessão', 'Vais sair da TYS neste dispositivo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar sessão',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Perfil" showBorder={false} />
      <FlatList
        data={authorPosts.posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Post }) => (
          <PostCard
            post={item}
            currentUserId={userId}
            liking={likingPostIds.has(item.id)}
            deleting={authorPosts.deletingPostIds.has(item.id)}
            onLike={toggleLike}
            onDelete={authorPosts.removePost}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Avatar name={displayName} uri={profile?.avatar_url} size="xl" />
            <Text variant="title" style={styles.name}>
              {displayName}
            </Text>
            {profile?.display_name && profile.username ? (
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
            <View style={styles.actions}>
              <Button
                variant="secondary"
                onPress={openEditProfile}
                accessibilityLabel="Editar perfil"
              >
                Editar perfil
              </Button>
              <Button
                variant="ghost"
                loading={signingOut}
                onPress={confirmSignOut}
                accessibilityLabel="Terminar sessão"
              >
                Terminar sessão
              </Button>
            </View>
          </View>
        }
        ListEmptyComponent={
          authorPosts.status === 'loading' ? (
            <EmptyState title="A carregar" description="A trazer as tuas histórias." />
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
              title="Ainda não publicaste"
              description="A tua primeira história aparece aqui e no feed."
              action={
                <Button onPress={() => router.push('/(tabs)/create')}>
                  Criar publicação
                </Button>
              }
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
    gap: Spacing.two,
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
