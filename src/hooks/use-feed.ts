import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { fetchFeed } from '@/lib/feed';
import { subscribeCommentCount } from '@/lib/post-comments';
import { likePost, unlikePost } from '@/lib/post-likes';
import { deletePost, subscribePostCreated, subscribePostDeleted } from '@/lib/posts';
import { useAuthSession } from '@/hooks/use-auth-session';
import type { FeedSnapshot, Post } from '@/types/post';

type FeedStatus = 'loading' | 'ready' | 'error';

export function useFeed() {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const [snapshot, setSnapshot] = useState<FeedSnapshot>({
    posts: [],
    stories: [],
    schemaReady: false,
  });
  const [status, setStatus] = useState<FeedStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [likingPostIds, setLikingPostIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [deletingPostIds, setDeletingPostIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const hasLoadedRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  const inFlightLikes = useRef(new Set<string>());
  const inFlightDeletes = useRef(new Set<string>());
  snapshotRef.current = snapshot;

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setStatus('loading');
      }

      try {
        const next = await fetchFeed(userId);
        setSnapshot((current) => mergeInFlightLikes(current, next, inFlightLikes.current));
        setError(null);
        setStatus('ready');
        hasLoadedRef.current = true;
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Não foi possível carregar o feed.'
        );
        setStatus('error');
      } finally {
        setRefreshing(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      void load(hasLoadedRef.current ? 'refresh' : 'initial');
    }, [load])
  );

  useEffect(() => {
    const unsubscribeCounts = subscribeCommentCount((postId, delta) => {
      setSnapshot((current) => ({
        ...current,
        posts: current.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                commentCount: Math.max(0, post.commentCount + delta),
              }
            : post
        ),
      }));
    });
    const unsubscribeDeleted = subscribePostDeleted((postId) => {
      setSnapshot((current) => ({
        ...current,
        posts: current.posts.filter((post) => post.id !== postId),
      }));
    });
    const unsubscribeCreated = subscribePostCreated(() => {
      void load('refresh');
    });

    return () => {
      unsubscribeCounts();
      unsubscribeDeleted();
      unsubscribeCreated();
    };
  }, [load]);

  const toggleLike = useCallback(async (postId: string) => {
    if (inFlightLikes.current.has(postId)) {
      return;
    }

    const currentPost = snapshotRef.current.posts.find(
      (post) => post.id === postId
    );

    if (!currentPost) {
      return;
    }

    inFlightLikes.current.add(postId);
    setLikingPostIds((current) => new Set(current).add(postId));
    setSnapshot((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === postId ? withToggledLike(post) : post
      ),
    }));

    try {
      const result = currentPost.likedByMe
        ? await unlikePost(postId)
        : await likePost(postId);

      if (result.error) {
        setSnapshot((current) => ({
          ...current,
          posts: current.posts.map((post) =>
            post.id === postId ? currentPost : post
          ),
        }));
        Alert.alert('Não foi possível atualizar o gosto', result.error);
      }
    } catch (caught) {
      setSnapshot((current) => ({
        ...current,
        posts: current.posts.map((post) =>
          post.id === postId ? currentPost : post
        ),
      }));
      Alert.alert(
        'Não foi possível atualizar o gosto',
        caught instanceof Error
          ? caught.message
          : 'Tenta novamente dentro de momentos.'
      );
    } finally {
      inFlightLikes.current.delete(postId);
      setLikingPostIds((current) => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });
    }
  }, []);

  const removePost = useCallback(async (postId: string) => {
    if (inFlightDeletes.current.has(postId)) {
      return;
    }

    const currentPost = snapshotRef.current.posts.find(
      (post) => post.id === postId
    );

    if (!currentPost) {
      return;
    }

    inFlightDeletes.current.add(postId);
    setDeletingPostIds((current) => new Set(current).add(postId));
    setSnapshot((current) => ({
      ...current,
      posts: current.posts.filter((post) => post.id !== postId),
    }));

    try {
      const result = await deletePost(postId);

      if (result.error) {
        setSnapshot((current) => ({
          ...current,
          posts: [currentPost, ...current.posts.filter((post) => post.id !== postId)],
        }));
        Alert.alert('Não foi possível apagar', result.error);
      }
    } catch (caught) {
      setSnapshot((current) => ({
        ...current,
        posts: [currentPost, ...current.posts.filter((post) => post.id !== postId)],
      }));
      Alert.alert(
        'Não foi possível apagar',
        caught instanceof Error
          ? caught.message
          : 'Tenta novamente dentro de momentos.'
      );
    } finally {
      inFlightDeletes.current.delete(postId);
      setDeletingPostIds((current) => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });
    }
  }, []);

  return {
    ...snapshot,
    status,
    error,
    refreshing,
    likingPostIds,
    deletingPostIds,
    refresh: () => load('refresh'),
    retry: () => load('initial'),
    toggleLike,
    removePost,
    currentUser: session?.user ?? null,
  };
}

function withToggledLike(post: Post): Post {
  const likedByMe = !post.likedByMe;
  return {
    ...post,
    likedByMe,
    likeCount: Math.max(0, post.likeCount + (likedByMe ? 1 : -1)),
  };
}

function mergeInFlightLikes(
  current: FeedSnapshot,
  next: FeedSnapshot,
  inFlight: Set<string>
): FeedSnapshot {
  if (inFlight.size === 0) {
    return next;
  }

  return {
    ...next,
    posts: next.posts.map((post) => {
      if (!inFlight.has(post.id)) {
        return post;
      }

      return current.posts.find((local) => local.id === post.id) ?? post;
    }),
  };
}
