import { fetchPostsByAuthor } from '@/lib/feed';
import { deletePost, subscribePostCreated, subscribePostDeleted } from '@/lib/posts';
import type { Post } from '@/types/post';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';

type Status = 'loading' | 'ready' | 'error';

export function useAuthorPosts(authorId: string | undefined) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingPostIds, setDeletingPostIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const hasLoadedRef = useRef(false);
  const inFlightDeletes = useRef(new Set<string>());
  const postsRef = useRef(posts);
  postsRef.current = posts;

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!authorId) {
        setStatus('error');
        setError('Não encontrámos este perfil.');
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else if (!hasLoadedRef.current) {
        setStatus('loading');
      }

      try {
        const next = await fetchPostsByAuthor(authorId);
        setPosts(next.posts);
        setCount(next.count);
        setError(null);
        setStatus('ready');
        hasLoadedRef.current = true;
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Não foi possível carregar as publicações.'
        );
        if (!hasLoadedRef.current) {
          setStatus('error');
        } else {
          Alert.alert(
            'Não foi possível atualizar',
            caught instanceof Error
              ? caught.message
              : 'Tenta novamente dentro de momentos.'
          );
        }
      } finally {
        setRefreshing(false);
      }
    },
    [authorId]
  );

  useFocusEffect(
    useCallback(() => {
      void load(hasLoadedRef.current ? 'refresh' : 'initial');
    }, [load])
  );

  useEffect(() => {
    const unsubscribeDeleted = subscribePostDeleted((postId) => {
      setPosts((current) => {
        if (!current.some((post) => post.id === postId)) {
          return current;
        }

        setCount((value) => Math.max(0, value - 1));
        return current.filter((post) => post.id !== postId);
      });
    });
    const unsubscribeCreated = subscribePostCreated(() => {
      void load('refresh');
    });

    return () => {
      unsubscribeDeleted();
      unsubscribeCreated();
    };
  }, [load]);

  const removePost = useCallback(async (postId: string) => {
    if (inFlightDeletes.current.has(postId)) {
      return;
    }

    const currentPost = postsRef.current.find((post) => post.id === postId);
    if (!currentPost) {
      return;
    }

    inFlightDeletes.current.add(postId);
    setDeletingPostIds((current) => new Set(current).add(postId));
    setPosts((current) => current.filter((post) => post.id !== postId));
    setCount((current) => Math.max(0, current - 1));

    try {
      const result = await deletePost(postId);
      if (result.error) {
        setPosts((current) => [currentPost, ...current]);
        setCount((current) => current + 1);
        Alert.alert('Não foi possível apagar', result.error);
      }
    } catch (caught) {
      setPosts((current) => [currentPost, ...current]);
      setCount((current) => current + 1);
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
    posts,
    count,
    status,
    error,
    refreshing,
    deletingPostIds,
    refresh: () => load('refresh'),
    retry: () => load('initial'),
    removePost,
  };
}
