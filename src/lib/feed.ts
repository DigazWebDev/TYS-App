/**
 * Feed queries against public tables.
 * Schema applied on TYS App: profiles, posts, post_likes, post_comments,
 * stories, story_views. Missing relations still degrade to an empty feed.
 */

import { supabase } from '@/lib/supabase';
import type { FeedSnapshot, Post, ProfilePreview, StoryPreview } from '@/types/post';

function isMissingRelation(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  const haystack = `${error.code ?? ''} ${error.message}`.toLowerCase();
  return (
    haystack.includes('42p01') ||
    haystack.includes('pgrst205') ||
    haystack.includes('does not exist') ||
    haystack.includes('could not find the table') ||
    haystack.includes('schema cache')
  );
}

function profileFromRow(row: {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}): ProfilePreview {
  return {
    id: row.id,
    username: row.username?.replace(/^@/, '') || 'utilizador',
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
  };
}

export async function fetchFeed(userId: string | undefined): Promise<FeedSnapshot> {
  const postsQuery = supabase
    .from('posts')
    .select(
      `
      id,
      body,
      image_url,
      created_at,
      author:profiles!author_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      likes:post_likes (user_id),
      comments:post_comments (id)
    `
    )
    .order('created_at', { ascending: false })
    .limit(50);

  const storiesQuery = supabase
    .from('stories')
    .select(
      `
      id,
      user_id,
      expires_at,
      author:profiles!user_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      views:story_views (viewer_id)
    `
    )
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(30);

  const [postsResult, storiesResult] = await Promise.all([postsQuery, storiesQuery]);

  if (
    isMissingRelation(postsResult.error) ||
    isMissingRelation(storiesResult.error)
  ) {
    return { posts: [], stories: [], schemaReady: false };
  }

  if (postsResult.error) {
    throw new Error(postsResult.error.message);
  }

  if (storiesResult.error) {
    throw new Error(storiesResult.error.message);
  }

  const posts: Post[] = (postsResult.data ?? []).map((row) => {
    const authorRow = Array.isArray(row.author) ? row.author[0] : row.author;
    const likes = Array.isArray(row.likes) ? row.likes : [];
    const comments = Array.isArray(row.comments) ? row.comments : [];

    return {
      id: row.id,
      author: profileFromRow(
        authorRow ?? { id: 'unknown', username: 'utilizador' }
      ),
      body: row.body ?? '',
      imageUrl: row.image_url ?? null,
      createdAt: row.created_at,
      likeCount: likes.length,
      commentCount: comments.length,
      likedByMe: userId
        ? likes.some((like: { user_id: string }) => like.user_id === userId)
        : false,
    };
  });

  const stories: StoryPreview[] = (storiesResult.data ?? []).map((row) => {
    const authorRow = Array.isArray(row.author) ? row.author[0] : row.author;
    const views = Array.isArray(row.views) ? row.views : [];

    return {
      id: row.id,
      author: profileFromRow(
        authorRow ?? { id: row.user_id, username: 'utilizador' }
      ),
      viewed: userId
        ? views.some((view: { viewer_id: string }) => view.viewer_id === userId)
        : false,
    };
  });

  return { posts, stories, schemaReady: true };
}
