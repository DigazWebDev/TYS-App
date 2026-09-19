import { useCallback, useEffect, useState } from 'react';

import { fetchFeed } from '@/lib/feed';
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

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setStatus('loading');
      }

      try {
        const next = await fetchFeed(userId);
        setSnapshot(next);
        setError(null);
        setStatus('ready');
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

  useEffect(() => {
    void load('initial');
  }, [load]);

  const toggleLike = useCallback((postId: string) => {
    setSnapshot((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === postId ? withToggledLike(post) : post
      ),
    }));
  }, []);

  return {
    ...snapshot,
    status,
    error,
    refreshing,
    refresh: () => load('refresh'),
    retry: () => load('initial'),
    toggleLike,
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
